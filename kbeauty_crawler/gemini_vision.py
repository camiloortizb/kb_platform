"""
Multimodal Vision / OCR Extraction Engine (Feature F6).
Utilizes Google Gemini Vision (gemini-3.6-flash with fallback to gemini-2.5-flash)
to process sliced infographic banners and extract structured technical specifications:
- Full Korean INCI ingredients list (화장품전성분)
- Step-by-step usage instructions (사용방법) formatted in Spanish
- Target skin types and dermatological concerns (피부타입) formatted in Spanish
- Core benefits and claims (효능/효과) formatted in Spanish
- Full rich technical summary (description_full)
- OCR confidence score (0.0 to 1.0)
"""
import os
import io
import json
import re
import time
import logging
from typing import Dict, Any, List, Optional, Union
import httpx
from dotenv import load_dotenv

from .models import ImageSlice, CosmeticVisionExtraction

try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

load_dotenv()
logger = logging.getLogger('kbeauty_crawler.gemini_vision')

VISION_SYSTEM_PROMPT = """
Eres un químico cosmético y perito técnico de K-Beauty especializado en formulaciones INCI y fichas técnicas oficiales.
Tu tarea es analizar las imágenes de la infografía del producto cosmético coreano y extraer con máxima fidelidad técnica la información.

Debes responder ÚNICAMENTE con un objeto JSON válido con la siguiente estructura:
{
  "key_ingredients_korean": "Transcripción textual exacta en Hangul de la sección '화장품전성분' o '전성분' visible en la infografía (o null si no aparece).",
  "inci_completo": "Lista completa de ingredientes estandarizada en nomenclatura internacional INCI en latín/inglés, separada por comas.",
  "ingredientes_clave": ["Ingrediente activo 1 con % o ppm", "Ingrediente activo 2"],
  "modo_de_uso": "Instrucciones de aplicación paso a paso traducidas a español neutro profesional.",
  "tipo_de_piel": "Tipos de piel indicados (ej. Todo tipo de piel, Piel sensible, Piel con tendencia acneica) en español.",
  "beneficios": ["Beneficio 1", "Beneficio 2", "Beneficio 3"],
  "formato": "Volumen o peso detectado (ej. 250ml, 50ml, 11g, 30 parches) o null si no se observa.",
  "advertencias": "Precauciones de uso en español o null.",
  "ocr_confidence": 0.95
}
Reglas estrictas:
1. NO inventes ingredientes que no aparezcan en la infografía.
2. Si un campo no está presente en la imagen, devuelve null o una lista vacía.
3. Responde exclusivamente con el JSON sin bloques de texto explicativo exterior.
"""


class GeminiVisionAgent:
    """
    Multimodal Vision agent using Gemini 3.6 Flash (with automatic fallback to 2.5 Flash).
    """
    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: str = "gemini-3.6-flash",
        fallback_model: str = "gemini-2.5-flash",
        max_retries: int = 3,
        timeout: float = 45.0,
    ):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            logger.warning("GEMINI_API_KEY is not set. Vision calls will fail unless provided.")

        self.model_name = model_name
        self.fallback_model = fallback_model
        self.max_retries = max_retries
        self.timeout = timeout
        self.http_client = httpx.Client(timeout=timeout)

        if GENAI_AVAILABLE and self.api_key:
            try:
                self.genai_client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.warning(f"Failed to initialize google.genai Client: {e}")
                self.genai_client = None
        else:
            self.genai_client = None

    def clean_json_response(self, raw_text: str) -> Dict[str, Any]:
        """
        Cleans markdown code fences, extracts embedded JSON object via regex,
        sanitizes trailing commas, and handles formatting artifacts.
        """
        if not raw_text:
            return {}

        text = raw_text.strip()
        text = re.sub(r'^```(?:json)?\s*', '', text, flags=re.IGNORECASE)
        text = re.sub(r'\s*```$', '', text)
        text = text.strip()

        json_match = re.search(r'(\{.*\})', text, re.DOTALL)
        if json_match:
            text = json_match.group(1)
        else:
            start_idx = text.find('{')
            end_idx = text.rfind('}')
            if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                text = text[start_idx:end_idx + 1]

        text = re.sub(r',\s*([\]}])', r'\1', text)

        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            logger.warning(f"Initial JSON parse failed: {e}. Attempting recovery...")
            try:
                fixed = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', text)
                return json.loads(fixed)
            except Exception:
                return {}

    def _call_gemini_api_direct_http(
        self,
        model: str,
        image_parts: List[Dict[str, Any]],
        prompt: str
    ) -> Optional[str]:
        """Direct REST HTTP call to Gemini Generative Language API as resilient fallback."""
        if not self.api_key:
            return None

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.api_key}"
        parts = []
        for img in image_parts:
            parts.append({
                "inline_data": {
                    "mime_type": img.get("mime_type", "image/jpeg"),
                    "data": img["base64_data"]
                }
            })
        parts.append({"text": prompt})

        payload = {
            "contents": [{"parts": parts}],
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json"
            }
        }

        try:
            response = self.http_client.post(url, json=payload)
            if response.status_code == 200:
                data = response.json()
                candidates = data.get("candidates", [])
                if candidates:
                    content = candidates[0].get("content", {})
                    content_parts = content.get("parts", [])
                    if content_parts:
                        return content_parts[0].get("text", "")
            elif response.status_code in (429, 500, 502, 503, 504):
                logger.warning(f"Gemini HTTP {response.status_code} retryable error: {response.text[:200]}")
                raise httpx.HTTPStatusError(f"HTTP {response.status_code}", request=response.request, response=response)
            else:
                logger.warning(f"Direct Gemini HTTP call failed ({response.status_code}): {response.text[:200]}")
        except httpx.HTTPStatusError:
            raise
        except Exception as e:
            logger.warning(f"Error during direct Gemini HTTP call: {e}")
            raise

        return None

    def _generate_with_retry(
        self,
        contents_parts: List[Any],
        prompt: str,
        raw_image_parts_http: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Executes Gemini Vision generation with exponential backoff retry and model fallback.
        """
        models_to_try = [self.model_name, self.fallback_model]

        for model in models_to_try:
            for attempt in range(self.max_retries):
                try:
                    if self.genai_client is not None:
                        response = self.genai_client.models.generate_content(
                            model=model,
                            contents=contents_parts + [prompt]
                        )
                        text_resp = response.text if hasattr(response, 'text') else str(response)
                        cleaned = self.clean_json_response(text_resp)
                        if cleaned:
                            return cleaned
                    elif raw_image_parts_http and self.api_key:
                        text_resp = self._call_gemini_api_direct_http(model, raw_image_parts_http, prompt)
                        if text_resp:
                            cleaned = self.clean_json_response(text_resp)
                            if cleaned:
                                return cleaned
                except Exception as e:
                    wait_time = (2 ** attempt) + (0.1 * attempt)
                    logger.warning(
                        f"Gemini call attempt {attempt + 1}/{self.max_retries} with {model} failed ({e}). "
                        f"Retrying in {wait_time:.1f}s..."
                    )
                    time.sleep(wait_time)

        return {}

    def extract_from_slices(self, slices: List[ImageSlice]) -> CosmeticVisionExtraction:
        """
        Extracts structured product specifications from a list of ImageSlice objects.
        """
        if not slices:
            return CosmeticVisionExtraction(ocr_confidence=0.0)

        import base64

        contents_parts = []
        http_parts = []

        target_slices = slices if len(slices) <= 16 else (slices[:4] + slices[-10:])

        for s in target_slices:
            if GENAI_AVAILABLE:
                contents_parts.append(
                    types.Part.from_bytes(data=s.image_bytes, mime_type=s.mime_type)
                )
            b64 = base64.b64encode(s.image_bytes).decode('utf-8')
            http_parts.append({"mime_type": s.mime_type, "base64_data": b64})

        extracted_dict = self._generate_with_retry(
            contents_parts=contents_parts,
            prompt=VISION_SYSTEM_PROMPT,
            raw_image_parts_http=http_parts
        )

        if not extracted_dict:
            return CosmeticVisionExtraction(ocr_confidence=0.0)

        return CosmeticVisionExtraction(
            key_ingredients_korean=extracted_dict.get("key_ingredients_korean"),
            inci_completo=extracted_dict.get("inci_completo") or "",
            ingredientes_clave=extracted_dict.get("ingredientes_clave") or [],
            modo_de_uso=extracted_dict.get("modo_de_uso") or "",
            tipo_de_piel=extracted_dict.get("tipo_de_piel") or "",
            beneficios=extracted_dict.get("beneficios") or [],
            formato=extracted_dict.get("formato"),
            advertencias=extracted_dict.get("advertencias"),
            ocr_confidence=float(extracted_dict.get("ocr_confidence", 0.95))
        )

    def extract_from_image_bytes(self, image_bytes: bytes, mime_type: str = "image/jpeg") -> CosmeticVisionExtraction:
        """Processes raw un-sliced image bytes."""
        import base64
        contents_parts = []
        if GENAI_AVAILABLE:
            contents_parts.append(types.Part.from_bytes(data=image_bytes, mime_type=mime_type))
        b64 = base64.b64encode(image_bytes).decode('utf-8')
        http_parts = [{"mime_type": mime_type, "base64_data": b64}]

        extracted_dict = self._generate_with_retry(
            contents_parts=contents_parts,
            prompt=VISION_SYSTEM_PROMPT,
            raw_image_parts_http=http_parts
        )

        return CosmeticVisionExtraction(
            key_ingredients_korean=extracted_dict.get("key_ingredients_korean"),
            inci_completo=extracted_dict.get("inci_completo") or "",
            ingredientes_clave=extracted_dict.get("ingredientes_clave") or [],
            modo_de_uso=extracted_dict.get("modo_de_uso") or "",
            tipo_de_piel=extracted_dict.get("tipo_de_piel") or "",
            beneficios=extracted_dict.get("beneficios") or [],
            formato=extracted_dict.get("formato"),
            advertencias=extracted_dict.get("advertencias"),
            ocr_confidence=float(extracted_dict.get("ocr_confidence", 0.95)) if extracted_dict else 0.0
        )


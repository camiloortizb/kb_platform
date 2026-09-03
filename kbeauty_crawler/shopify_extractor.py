"""
High-Speed Shopify JSON API Extractor.
Extracts products via unauthenticated public endpoints (/products.json?limit=250&page=N)
with variant EAN-13/UPC parsing, SKU hierarchy, high-res image un-scaling,
HTTP 429 rate limit exponential backoff, and infinite pagination loop prevention.
"""
import time
import random
import asyncio
import httpx
from typing import List, Optional, Dict, Any, Set
from urllib.parse import urlparse
from .models import ProductIntermediate
from .cleaner import clean_title, clean_ean, clean_sku, normalize_image_url, classify_technical_route

DEFAULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8',
}

class ShopifyFastExtractor:
    def __init__(self, brand_name: Optional[str] = None, timeout: float = 30.0, max_retries: int = 4):
        self.brand_name = brand_name
        self.timeout = timeout
        self.max_retries = max_retries

    async def _fetch_page_with_backoff(self, client: httpx.AsyncClient, endpoint: str) -> Optional[Dict[str, Any]]:
        """Fetch Shopify JSON page with exponential backoff for HTTP 429 rate limits."""
        for attempt in range(self.max_retries):
            try:
                res = await client.get(endpoint)
                if res.status_code == 200:
                    try:
                        return res.json()
                    except Exception:
                        return None
                elif res.status_code == 429:
                    # Rate limited: check Retry-After header
                    retry_after_hdr = res.headers.get('Retry-After')
                    if retry_after_hdr and retry_after_hdr.isdigit():
                        wait_sec = float(retry_after_hdr) + random.uniform(0.1, 0.5)
                    else:
                        wait_sec = (2 ** attempt) + random.uniform(0.1, 0.5)
                    wait_sec = min(wait_sec, 10.0)
                    await asyncio.sleep(wait_sec)
                    continue
                elif res.status_code in (404, 403, 500, 502, 503):
                    # End of pagination or server error
                    return None
            except Exception:
                if attempt < self.max_retries - 1:
                    await asyncio.sleep((2 ** attempt) * 0.5)
                    continue
                return None
        return None

    async def extract_all(
        self,
        base_url: str,
        max_pages: int = 50,
        split_variants: bool = False
    ) -> List[ProductIntermediate]:
        """
        Fast unauthenticated pagination extracting complete technical sheets across all pages.
        """
        base_url = base_url.rstrip('/')
        domain_name = urlparse(base_url).netloc.replace('www.', '').split('.')[0].capitalize()
        default_brand = self.brand_name or domain_name

        products_list: List[ProductIntermediate] = []
        seen_product_ids: Set[int] = set()
        page = 1

        async with httpx.AsyncClient(headers=DEFAULT_HEADERS, timeout=self.timeout, follow_redirects=True) as client:
            while page <= max_pages:
                endpoint = f"{base_url}/products.json?limit=250&page={page}"
                data = await self._fetch_page_with_backoff(client, endpoint)
                
                if not data or not isinstance(data, dict):
                    break
                
                items = data.get('products', [])
                if not items:
                    break

                # Infinite loop dedup guard (for proxies that repeat page 1)
                page_ids = {item.get('id') for item in items if item.get('id') is not None}
                if page_ids and page_ids.issubset(seen_product_ids):
                    break
                seen_product_ids.update(page_ids)

                for item in items:
                    if not isinstance(item, dict):
                        continue
                    handle = item.get('handle') or ''
                    item_id = str(item.get('id') or '')
                    product_url = f"{base_url}/products/{handle}" if handle else f"{base_url}/products/{item_id}"
                    raw_title = item.get('title') or ''
                    clean_name = clean_title(raw_title)
                    
                    brand = self.brand_name or item.get('vendor') or default_brand
                    
                    # Variants & Barcodes
                    variants = item.get('variants') or []
                    primary_variant = variants[0] if (variants and isinstance(variants, list) and isinstance(variants[0], dict)) else {}
                    
                    raw_sku = primary_variant.get('sku') if isinstance(primary_variant, dict) else None
                    sku = clean_sku(raw_sku, default_fallback=str((primary_variant.get('id') if isinstance(primary_variant, dict) else None) or item_id or handle))
                    
                    # Clean EAN barcode with fallback across variants
                    raw_ean = primary_variant.get('barcode') if isinstance(primary_variant, dict) else None
                    ean = clean_ean(raw_ean)
                    if not ean and variants and len(variants) > 1:
                        for v in variants[1:]:
                            if isinstance(v, dict):
                                aux_ean = clean_ean(v.get('barcode'))
                                if aux_ean:
                                    ean = aux_ean
                                    break
                                
                    price = str(primary_variant.get('price', '')) if (isinstance(primary_variant, dict) and primary_variant.get('price') is not None) else None
                    
                    # Format extraction from variant title or product title
                    formato = None
                    v_title = primary_variant.get('title', '') if isinstance(primary_variant, dict) else ''
                    import re
                    fmt_match = re.search(r'\b(\d+(?:[\.,]\d+)?\s*(?:ml|g|kg|l|oz|fl\.?\s*oz|sheets?|pads?|pcs?|ea))\b', v_title, re.I)
                    if not fmt_match:
                        fmt_match = re.search(r'\b(\d+(?:[\.,]\d+)?\s*(?:ml|g|kg|l|oz|fl\.?\s*oz|sheets?|pads?|pcs?|ea))\b', raw_title, re.I)
                    if fmt_match:
                        formato = fmt_match.group(1).strip()
                    
                    # Gallery images with high-res un-scaling
                    images = item.get('images') or []
                    gallery_urls: List[str] = []
                    for img in images:
                        src = img.get('src') if isinstance(img, dict) else str(img) if img else ''
                        if src:
                            norm = normalize_image_url(src, base_url)
                            if norm and norm not in gallery_urls:
                                gallery_urls.append(norm)
                    
                    # Technical HTML and Route Classification
                    body_html = item.get('body_html') or ''
                    ruta, raw_html, infografias = classify_technical_route(body_html, base_url)
                    
                    # Parse description & INCI if available in HTML
                    from bs4 import BeautifulSoup
                    soup = BeautifulSoup(body_html, 'html.parser')
                    desc_text = soup.get_text(separator=' ', strip=True)
                    
                    # Construct product record
                    product_obj = ProductIntermediate(
                        marca=brand.strip(),
                        brand_name=brand.strip(),
                        url_producto=product_url,
                        source_url=product_url,
                        sku=sku,
                        titulo=clean_name,
                        title=clean_name,
                        nombre_completo=raw_title,
                        formato=formato,
                        format_raw=formato,
                        ruta_tecnica=ruta,
                        descripcion_completa=desc_text,
                        description_full=desc_text,
                        raw_html_tecnico=raw_html or body_html,
                        urls_infografias=infografias,
                        infographic_images=infografias,
                        imagenes_galeria=gallery_urls,
                        gallery_images=gallery_urls,
                        ean=ean,
                        precio_raw=price,
                        variantes=variants,
                        plataforma_origen='Shopify_FastEndpoint'
                    )
                    products_list.append(product_obj)
                    
                if len(items) < 250:
                    break
                page += 1

        return products_list

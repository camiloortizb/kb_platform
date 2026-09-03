import os
import re
import httpx
from typing import List, Dict, Any, Optional, Tuple
from dotenv import load_dotenv
from .models import ProductIntermediate

load_dotenv()

class SupabaseSink:
    def __init__(self, url: Optional[str] = None, key: Optional[str] = None):
        self.url = (url or os.getenv('SUPABASE_URL', '')).rstrip('/')
        self.key = key or os.getenv('SUPABASE_KEY', '')
        if not self.url or not self.key:
            raise ValueError('SUPABASE_URL and SUPABASE_KEY must be provided or set in environment / .env')
        
        self.headers = {
            'apikey': self.key,
            'Authorization': f'Bearer {self.key}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation,resolution=merge-duplicates'
        }
        self.client = httpx.Client(timeout=30.0)
        self._brand_cache: Dict[str, int] = {}
        self._ean_cache: Dict[str, Dict[str, Any]] = {}
        self._load_master_ean_cache()

    def _load_master_ean_cache(self):
        try:
            res = self.client.get(
                f'{self.url}/rest/v1/products?select=id,sku,ean,name,brand_id',
                headers=self.headers
            )
            if res.status_code == 200:
                for row in res.json():
                    if row.get('ean'):
                        self._ean_cache[str(row['ean']).strip()] = row
        except Exception:
            pass

    def get_brand_sources(self, brand: Optional[str] = None) -> List[Dict[str, Any]]:
        query = f'{self.url}/rest/v1/brand_sources?select=id,brand_id,brand_name,url,source_type,crawl_status'
        if brand:
            query += f'&brand_name=ilike.*{brand}*'
        res = self.client.get(query, headers=self.headers)
        return res.json() if res.status_code == 200 else []

    def get_or_create_brand(self, brand_name: str) -> int:
        brand_name = brand_name.strip().upper()
        if brand_name in self._brand_cache:
            return self._brand_cache[brand_name]
        
        # Check existing brand
        res = self.client.get(f'{self.url}/rest/v1/brands?name=ilike.{brand_name}&select=id', headers=self.headers)
        if res.status_code == 200 and res.json():
            brand_id = res.json()[0]['id']
            self._brand_cache[brand_name] = brand_id
            return brand_id
        
        # Insert new brand
        payload = {'name': brand_name, 'type': 'B2B', 'priority': 'Media'}
        res = self.client.post(f'{self.url}/rest/v1/brands', headers=self.headers, json=payload)
        if res.status_code in (200, 201) and res.json():
            brand_id = res.json()[0]['id']
            self._brand_cache[brand_name] = brand_id
            return brand_id
        
        return 1

    def find_master_match(self, prod: ProductIntermediate, brand_id: int) -> Optional[Dict[str, Any]]:
        # 1. Match by EAN
        if prod.ean and str(prod.ean).strip() in self._ean_cache:
            return self._ean_cache[str(prod.ean).strip()]
        
        # 2. Match by SKU
        if prod.sku:
            res = self.client.get(f'{self.url}/rest/v1/products?sku=eq.{prod.sku}&select=id,sku,ean,name', headers=self.headers)
            if res.status_code == 200 and res.json():
                return res.json()[0]
        
        return None

    def upsert_product(self, prod: ProductIntermediate) -> Dict[str, Any]:
        brand_id = self.get_or_create_brand(prod.marca)
        master_match = self.find_master_match(prod, brand_id)
        
        target_sku = master_match['sku'] if master_match else prod.sku
        target_ean = master_match.get('ean') if master_match else prod.ean
        
        product_payload = {
            'sku': target_sku,
            'name': prod.nombre_completo or prod.titulo,
            'brand_id': brand_id,
            'ean': target_ean,
            'format': prod.formato,
            'description_full': prod.descripcion_completa or prod.raw_html_tecnico or prod.titulo,
            'description_short': prod.titulo,
            'key_ingredients': prod.inci_completo or (', '.join(prod.ingredientes_clave) if prod.ingredientes_clave else None),
            'usage_instructions': prod.modo_de_uso or None,
            'skin_types': prod.tipo_de_piel or None,
            'benefits': ('\n'.join(prod.beneficios) if prod.beneficios else None),
            'url_origen': prod.url_producto,
            'ruta_tecnica': prod.ruta_tecnica,
            'raw_html_tecnico': prod.raw_html_tecnico,
            'verification_status': 'VERIFICADO_OFICIAL_DOM'
        }
        
        url = f'{self.url}/rest/v1/products?on_conflict=sku'
        res = self.client.post(url, headers=self.headers, json=product_payload)
        
        if res.status_code not in (200, 201):
            return {'success': False, 'sku': target_sku, 'error': f'Product upsert failed: {res.status_code} {res.text}'}
        
        product_data = res.json()[0] if res.json() else {}
        product_id = product_data.get('id')
        
        if not product_id:
            q_res = self.client.get(f'{self.url}/rest/v1/products?sku=eq.{target_sku}&select=id', headers=self.headers)
            if q_res.status_code == 200 and q_res.json():
                product_id = q_res.json()[0]['id']
            else:
                return {'success': False, 'sku': target_sku, 'error': 'Could not retrieve product_id after upsert'}

        # Insert / Update gallery images
        if prod.imagenes_galeria:
            images_payload = []
            for idx, img_url in enumerate(prod.imagenes_galeria):
                images_payload.append({
                    'product_id': product_id,
                    'sku': target_sku,
                    'ean': target_ean,
                    'image_url': img_url,
                    'display_order': idx + 1,
                    'is_primary': (idx == 0)
                })
            self.client.post(f'{self.url}/rest/v1/product_images', headers=self.headers, json=images_payload)

        # Insert / Update infographic labels
        if prod.urls_infografias:
            labels_payload = []
            for info_url in prod.urls_infografias:
                labels_payload.append({
                    'product_id': product_id,
                    'sku': target_sku,
                    'ean': target_ean,
                    'label_url': info_url
                })
            self.client.post(f'{self.url}/rest/v1/product_labels', headers=self.headers, json=labels_payload)

        return {'success': True, 'sku': target_sku, 'product_id': product_id, 'matched_master': bool(master_match)}

    def batch_upsert(self, products: List[ProductIntermediate]) -> Dict[str, Any]:
        results = {'total': len(products), 'success': 0, 'failed': 0, 'matched_master_count': 0, 'errors': []}
        for prod in products:
            res = self.upsert_product(prod)
            if res.get('success'):
                results['success'] += 1
                if res.get('matched_master'):
                    results['matched_master_count'] += 1
            else:
                results['failed'] += 1
                results['errors'].append(res)
        return results


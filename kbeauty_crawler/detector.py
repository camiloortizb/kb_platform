"""
Multi-Platform Store Architecture Detector.
Supports fast REST API probing (/products.json) and HTML signature inspection for:
Shopify, Cafe24, Imweb, Makeshop, Godomall, Sixshop, WooCommerce, PrestaShop, VTEX, Custom SPAs, and Custom DOM.
"""
import httpx
from urllib.parse import urlparse, urljoin
from typing import Tuple, Dict, Any, Optional

DEFAULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
}

class PlatformDetector:
    def __init__(self, timeout: float = 12.0):
        self.timeout = timeout

    def normalize_base_url(self, target: str) -> str:
        target = target.strip()
        if not target.startswith(('http://', 'https://')):
            target = 'https://' + target
        parsed = urlparse(target)
        return f"{parsed.scheme}://{parsed.netloc}"

    def get_subpath_url(self, target: str) -> str:
        target = target.strip()
        if not target.startswith(('http://', 'https://')):
            target = 'https://' + target
        parsed = urlparse(target)
        path = parsed.path.rstrip('/')
        return f"{parsed.scheme}://{parsed.netloc}{path}"

    async def detect(self, target_url: str) -> Tuple[str, Dict[str, Any]]:
        target_url = target_url.strip()
        if not target_url.startswith(('http://', 'https://')):
            target_url = 'https://' + target_url
            
        base_url = self.normalize_base_url(target_url)
        subpath_url = self.get_subpath_url(target_url)
        
        info: Dict[str, Any] = {
            'target_url': target_url,
            'base_url': base_url,
            'subpath_url': subpath_url,
            'endpoint_json': None,
            'detected_platform': 'custom_dom'
        }

        async with httpx.AsyncClient(headers=DEFAULT_HEADERS, timeout=self.timeout, follow_redirects=True) as client:
            # 1. Fast Shopify Endpoint Check (probe target subpath and base_url)
            endpoints_to_probe = [f"{base_url}/products.json?limit=1"]
            if subpath_url != base_url and len(subpath_url) > len(base_url):
                endpoints_to_probe.insert(0, f"{subpath_url}/products.json?limit=1")
                
            for endpoint in endpoints_to_probe:
                try:
                    res = await client.get(endpoint)
                    if res.status_code == 200:
                        try:
                            data = res.json()
                            if isinstance(data, dict) and 'products' in data:
                                json_endpoint = endpoint.split('?')[0]
                                info['detected_platform'] = 'shopify'
                                info['endpoint_json'] = json_endpoint
                                return 'shopify', info
                        except Exception:
                            pass
                except Exception:
                    pass

            # 2. Deep HTML & Header Signature Inspection
            try:
                probe_url = subpath_url if subpath_url != base_url else base_url
                res = await client.get(probe_url)
                body = res.text.lower()
                headers_str = str(res.headers).lower()

                # Shopify DOM (e.g. if JSON is blocked by Cloudflare or requires theme assets)
                if any(k in body for k in ['myshopify', 'cdn.shopify.com', 'shopify-buy', 'shopify.theme', 'data-shopify', 'shopify-section']):
                    info['detected_platform'] = 'shopify_dom'
                    return 'shopify_dom', info

                # Cafe24 Korean E-commerce
                if any(k in body for k in ['cafe24', 'ec_front_root', 'cafe24shop', 'ec-base-tab', 'ec-base-product', 'ecimg.cafe24img.com']) or 'cafe24' in headers_str or 'x-cafe24-' in headers_str:
                    info['detected_platform'] = 'cafe24'
                    return 'cafe24', info

                # Imweb Korean Builder
                if any(k in body for k in ['imweb', 'imweb.me', 'cdn.imweb.me', '_detail_content', 'imweb_tab_content', 'shop_view_body']):
                    info['detected_platform'] = 'imweb'
                    return 'imweb', info

                # Makeshop Korean E-commerce
                if any(k in body for k in ['makeshop.co.kr', 'makeshop', 'makeshop_domain', 'ms_detail', 'mk_']):
                    info['detected_platform'] = 'makeshop'
                    return 'makeshop', info

                # Godomall / NHN Commerce / Godo5
                if any(k in body for k in ['godomall.com', 'goods_view.php', 'data-goods-no', 'godo5', 'nhn commerce', 'nhn godo']):
                    info['detected_platform'] = 'godomall'
                    return 'godomall', info

                # Sixshop Korean Builder
                if any(k in body for k in ['sixshop.com', '_sixshop', 'sixshop-']):
                    info['detected_platform'] = 'sixshop'
                    return 'sixshop', info

                # WooCommerce / WordPress
                if any(k in body for k in ['wp-content', 'woocommerce', 'wc-block', 'woocommerce-product']):
                    info['detected_platform'] = 'woocommerce'
                    return 'woocommerce', info

                # PrestaShop
                if any(k in body for k in ['prestashop', 'modules/ps_', 'ps_shoppingcart']):
                    info['detected_platform'] = 'prestashop'
                    return 'prestashop', info

                # VTEX
                if any(k in body for k in ['vtexcommercestable', 'vtex.render-runtime', 'vtex-product-summary', 'vtex']):
                    info['detected_platform'] = 'vtex'
                    return 'vtex', info

                # Modern Single-Page App (SPA) / React / Nuxt / Next.js
                if any(k in body for k in ['__next_data__', '__nuxt__', 'div#___gatsby', '<div id="__next">', '<div id="app">', '<div id="root">']):
                    info['detected_platform'] = 'spa_dom'
                    return 'spa_dom', info

            except Exception as e:
                info['error'] = str(e)

        return 'custom_dom', info

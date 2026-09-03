"""
Master Dual-Engine Crawler Orchestrator.
Coordinates PlatformDetector, ShopifyFastExtractor, BrowserManager, DomExtractor,
DomainCircuitBreaker, concurrency semaphores, and bounded timeouts.
"""
import time
import asyncio
from typing import Optional, List, Dict, Any
from urllib.parse import urlparse

from .models import ProductIntermediate, CrawlResult
from .detector import PlatformDetector
from .shopify_extractor import ShopifyFastExtractor
from .dom_extractor import DomExtractor
from .browser_manager import BrowserManager
from .circuit_breaker import DomainCircuitBreaker, CircuitBreakerOpenException
from .supabase_sink import SupabaseSink

class KBeautyCrawler:
    def __init__(
        self,
        brand: Optional[str] = None,
        sync_supabase: bool = False,
        concurrency: int = 4,
        timeout: float = 35.0
    ):
        self.brand = brand
        self.sync_supabase = sync_supabase
        self.timeout = timeout
        self.detector = PlatformDetector()
        self.shopify_extractor = ShopifyFastExtractor(brand_name=brand)
        self.dom_extractor = DomExtractor(brand_name=brand)
        self.circuit_breaker = DomainCircuitBreaker(failure_threshold=3, cooldown_seconds=60.0)
        self.semaphore = asyncio.Semaphore(concurrency)
        self.sink = SupabaseSink() if sync_supabase else None

    async def crawl_store(self, target_url: str, max_pages: int = 50) -> CrawlResult:
        start_time = time.time()
        base_domain = urlparse(target_url).netloc.lower() or target_url
        
        # Check circuit breaker
        if not self.circuit_breaker.can_execute(target_url):
            error_msg = f"Circuit breaker OPEN for domain '{base_domain}'. Bypassing crawl."
            print(f"[!] {error_msg}")
            return CrawlResult(
                dominio=target_url,
                marca=self.brand or base_domain,
                plataforma='CIRCUIT_OPEN',
                total_productos=0,
                tiempo_segundos=0.0,
                productos=[],
                errores=[{'error': error_msg}]
            )

        platform, info = await self.detector.detect(target_url)
        base_url = info.get('base_url', target_url)
        brand_name = self.brand or urlparse(base_url).netloc.replace('www.', '').split('.')[0].capitalize()

        products: List[ProductIntermediate] = []
        errors: List[Dict[str, str]] = []

        print(f"[*] Crawling {base_url} | Brand: {brand_name} | Platform detected: {platform}")

        try:
            if platform == 'shopify':
                print(f"[*] Executing fast Shopify API extraction on {base_url}...")
                products = await self.shopify_extractor.extract_all(base_url, max_pages=max_pages)
                self.circuit_breaker.record_success(target_url)
            else:
                print(f"[*] Executing Playwright Headless DOM navigation for {base_url}...")
                browser_mgr = await BrowserManager.get_instance()
                context = await browser_mgr.new_context()
                page = await context.new_page()
                try:
                    prod = await asyncio.wait_for(
                        self.dom_extractor.extract_product_page(target_url, page),
                        timeout=self.timeout
                    )
                    if prod:
                        products.append(prod)
                        self.circuit_breaker.record_success(target_url)
                finally:
                    await page.close()
                    await context.close()

        except asyncio.TimeoutError:
            err = f"Extraction timed out after {self.timeout}s on {target_url}"
            print(f"[!] {err}")
            errors.append({'error': err})
            self.circuit_breaker.record_failure(target_url, error="TimeoutError")
        except Exception as e:
            err = f"Error crawling {target_url}: {str(e)}"
            print(f"[!] {err}")
            errors.append({'error': err})
            self.circuit_breaker.record_failure(target_url, error=e)

        elapsed = round(time.time() - start_time, 2)
        print(f"[✓] Crawl finished: {len(products)} products gathered in {elapsed}s")

        if self.sync_supabase and self.sink and products:
            print(f"[*] Syncing {len(products)} products directly to Supabase...")
            sink_res = self.sink.batch_upsert(products)
            print(f"[✓] Supabase sync completed: {sink_res['success']}/{sink_res['total']} successful")

        return CrawlResult(
            dominio=base_url,
            marca=brand_name,
            plataforma=platform,
            total_productos=len(products),
            tiempo_segundos=elapsed,
            productos=products,
            errores=errors
        )

    async def crawl_single_product(self, product_url: str) -> Optional[ProductIntermediate]:
        async with self.semaphore:
            browser_mgr = await BrowserManager.get_instance()
            context = await browser_mgr.new_context()
            page = await context.new_page()
            try:
                prod = await asyncio.wait_for(
                    self.dom_extractor.extract_product_page(product_url, page),
                    timeout=self.timeout
                )
                if prod and self.sync_supabase and self.sink:
                    self.sink.upsert_product(prod)
                    print(f"[✓] Product {prod.sku} synced to Supabase")
                return prod
            finally:
                await page.close()
                await context.close()

    async def close(self) -> None:
        """Close browser process and clean resources."""
        browser_mgr = await BrowserManager.get_instance()
        await browser_mgr.close()

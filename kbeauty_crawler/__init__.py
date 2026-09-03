"""
KBeauty Crawler Package - Agente 1: Crawler, Shopify API & DOM Extractor
"""
from .models import ProductIntermediate, CrawlResult
from .detector import PlatformDetector
from .shopify_extractor import ShopifyFastExtractor
from .dom_extractor import DomExtractor
from .circuit_breaker import DomainCircuitBreaker, CircuitState, CircuitBreakerOpenException
from .browser_manager import BrowserManager
from .cleaner import clean_title, clean_ean, clean_sku, normalize_image_url, classify_technical_route
from .crawler import KBeautyCrawler
from .supabase_sink import SupabaseSink

__all__ = [
    'ProductIntermediate',
    'CrawlResult',
    'PlatformDetector',
    'ShopifyFastExtractor',
    'DomExtractor',
    'DomainCircuitBreaker',
    'CircuitState',
    'CircuitBreakerOpenException',
    'BrowserManager',
    'clean_title',
    'clean_ean',
    'clean_sku',
    'normalize_image_url',
    'classify_technical_route',
    'KBeautyCrawler',
    'SupabaseSink'
]

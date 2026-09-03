"""
Unit and Integration tests for Resilience, Circuit Breakers, Browser Pool & Concurrency (M1).
Verifies 3-state domain circuit breaking, ephemeral context lifecycle, resource route blocking,
generation recycling, and bounded timeout protection.
"""
import pytest
import asyncio
import time
from unittest.mock import AsyncMock, patch, MagicMock
from kbeauty_crawler.circuit_breaker import DomainCircuitBreaker, CircuitState
from kbeauty_crawler.browser_manager import BrowserManager, BLOCKED_DOMAINS, BLOCKED_RESOURCE_TYPES
from kbeauty_crawler.crawler import KBeautyCrawler

def test_circuit_breaker_3_state_transitions():
    cb = DomainCircuitBreaker(failure_threshold=3, cooldown_seconds=0.2)
    domain = "https://flaky-brand.com/products"

    # 1. Initial State is CLOSED
    assert cb.get_state(domain) == CircuitState.CLOSED
    assert cb.can_execute(domain) is True

    # 2. Record 2 failures -> Still CLOSED
    cb.record_failure(domain, status_code=500)
    cb.record_failure(domain, status_code=500)
    assert cb.get_state(domain) == CircuitState.CLOSED

    # 3. 3rd failure trips to OPEN
    cb.record_failure(domain, status_code=500)
    assert cb.get_state(domain) == CircuitState.OPEN
    assert cb.can_execute(domain) is False

    # 4. Wait for cooldown to expire -> transitions to HALF_OPEN
    time.sleep(0.25)
    assert cb.get_state(domain) == CircuitState.HALF_OPEN
    assert cb.can_execute(domain) is True

    # 5. Successful trial probe resets to CLOSED
    cb.record_success(domain)
    assert cb.get_state(domain) == CircuitState.CLOSED
    assert cb.can_execute(domain) is True

def test_circuit_breaker_immediate_trip_on_403_cloudflare():
    cb = DomainCircuitBreaker(failure_threshold=5, cooldown_seconds=60.0)
    domain = "https://blocked-brand.com"

    # Immediate trip on 403 Forbidden
    cb.record_failure(domain, status_code=403)
    assert cb.get_state(domain) == CircuitState.OPEN
    assert cb.can_execute(domain) is False

def test_browser_manager_resource_blocking_spec():
    assert "media" in BLOCKED_RESOURCE_TYPES
    assert "font" in BLOCKED_RESOURCE_TYPES
    assert "google-analytics.com" in BLOCKED_DOMAINS
    assert "facebook.net" in BLOCKED_DOMAINS
    assert "klaviyo.com" in BLOCKED_DOMAINS

@pytest.mark.asyncio
async def test_crawler_fast_exit_on_circuit_open():
    crawler = KBeautyCrawler(brand="TestBrand", timeout=5.0)
    target = "https://dead-store.com"

    # Trip circuit breaker
    crawler.circuit_breaker.record_failure(target, status_code=403)
    assert crawler.circuit_breaker.can_execute(target) is False

    # Crawl should immediately exit with 0 products and CIRCUIT_OPEN platform
    result = await crawler.crawl_store(target)
    assert result.total_productos == 0
    assert result.plataforma == "CIRCUIT_OPEN"
    assert len(result.errores) == 1

@pytest.mark.asyncio
async def test_crawler_timeout_bounding():
    """Verifies that crawler bounds slow operations with strict timeout."""
    crawler = KBeautyCrawler(brand="TimeoutBrand", timeout=0.1)
    
    with patch("kbeauty_crawler.crawler.PlatformDetector.detect", new_callable=AsyncMock) as mock_detect:
        mock_detect.return_value = ("cafe24", {"base_url": "https://slow-store.com"})
        
        with patch.object(crawler.dom_extractor, "extract_product_page", new_callable=AsyncMock) as mock_extract:
            async def slow_extract(*args, **kwargs):
                await asyncio.sleep(2.0)
                return None
            mock_extract.side_effect = slow_extract
            
            result = await crawler.crawl_store("https://slow-store.com/prod/1")
            assert result.total_productos == 0
            assert any("timed out" in str(e).lower() for e in result.errores)

def test_circuit_breaker_half_open_failure_re_trip():
    """Verify that when in HALF_OPEN state, a failed probe immediately re-trips to OPEN."""
    cb = DomainCircuitBreaker(failure_threshold=2, cooldown_seconds=0.1)
    domain = "https://unstable-api.com"

    # Trip to OPEN
    cb.record_failure(domain, status_code=500)
    cb.record_failure(domain, status_code=500)
    assert cb.get_state(domain) == CircuitState.OPEN
    first_open_time = cb.get_metrics(domain).opened_at

    # Wait for cooldown
    time.sleep(0.15)
    assert cb.get_state(domain) == CircuitState.HALF_OPEN
    assert cb.can_execute(domain) is True

    # Trial probe fails -> immediately re-trips to OPEN
    cb.record_failure(domain, status_code=500)
    assert cb.get_state(domain) == CircuitState.OPEN
    assert cb.can_execute(domain) is False
    assert cb.get_metrics(domain).opened_at >= first_open_time

def test_circuit_breaker_multi_domain_isolation_and_normalization():
    """Verify that circuit states are strictly isolated across different domains and normalized."""
    cb = DomainCircuitBreaker(failure_threshold=2, cooldown_seconds=60.0)
    
    # URL variants for domain A
    url_a1 = "https://brand-a.com/products/item-1"
    url_a2 = "https://brand-a.com/collections/all"
    url_b = "https://brand-b.com/products/item-2"

    cb.record_failure(url_a1, status_code=503)
    assert cb.get_state(url_a1) == CircuitState.OPEN
    assert cb.get_state(url_a2) == CircuitState.OPEN
    assert cb.can_execute(url_a2) is False

    # Domain B remains completely CLOSED and unaffected
    assert cb.get_state(url_b) == CircuitState.CLOSED
    assert cb.can_execute(url_b) is True

def test_circuit_breaker_reset_mechanisms():
    """Verify targeted domain reset vs global reset."""
    cb = DomainCircuitBreaker(failure_threshold=1, cooldown_seconds=60.0)
    cb.record_failure("https://store-1.com", status_code=500)
    cb.record_failure("https://store-2.com", status_code=500)

    assert cb.get_state("https://store-1.com") == CircuitState.OPEN
    assert cb.get_state("https://store-2.com") == CircuitState.OPEN

    # Reset single domain
    cb.reset("https://store-1.com")
    assert cb.get_state("https://store-1.com") == CircuitState.CLOSED
    assert cb.get_state("https://store-2.com") == CircuitState.OPEN

    # Global reset
    cb.reset()
    assert cb.get_state("https://store-2.com") == CircuitState.CLOSED

@pytest.mark.asyncio
async def test_browser_manager_generation_recycling():
    """Verify browser manager generation recycling resets pages_crawled and closes browser."""
    mgr = BrowserManager(max_pages_before_recycle=3)
    
    mock_browser = MagicMock()
    mock_browser.is_connected.return_value = True
    mock_browser.close = AsyncMock()
    
    mgr.browser = mock_browser
    mgr.pages_crawled = 3  # Hit limit
    
    # Recycling
    await mgr.recycle()
    assert mgr.pages_crawled == 0
    assert mgr.browser is None
    mock_browser.close.assert_awaited_once()

@pytest.mark.asyncio
async def test_browser_manager_route_blocking_logic():
    """Verify route interception properly blocks ads, analytics, fonts, media, and allows valid assets."""
    mgr = BrowserManager()
    
    # Test route blocking behavior
    mock_context = MagicMock()
    intercept_fn = None
    
    async def mock_route(pattern, handler):
        nonlocal intercept_fn
        intercept_fn = handler
        
    mock_context.route = AsyncMock(side_effect=mock_route)
    await mgr.setup_route_interception(mock_context)
    
    assert intercept_fn is not None
    
    # 1. Block media resource
    route_media = MagicMock()
    route_media.request.resource_type = "media"
    route_media.request.url = "https://cdn.example.com/video.mp4"
    route_media.abort = AsyncMock()
    route_media.continue_ = AsyncMock()
    await intercept_fn(route_media)
    route_media.abort.assert_awaited_once()
    route_media.continue_.assert_not_called()

    # 2. Block Google Analytics
    route_ga = MagicMock()
    route_ga.request.resource_type = "script"
    route_ga.request.url = "https://www.google-analytics.com/analytics.js"
    route_ga.abort = AsyncMock()
    route_ga.continue_ = AsyncMock()
    await intercept_fn(route_ga)
    route_ga.abort.assert_awaited_once()
    route_ga.continue_.assert_not_called()

    # 3. Allow valid product script / HTML / image
    route_ok = MagicMock()
    route_ok.request.resource_type = "image"
    route_ok.request.url = "https://brand.com/cdn/products/serum.jpg"
    route_ok.abort = AsyncMock()
    route_ok.continue_ = AsyncMock()
    await intercept_fn(route_ok)
    route_ok.continue_.assert_awaited_once()
    route_ok.abort.assert_not_called()

@pytest.mark.asyncio
async def test_crawler_concurrency_semaphore_bound():
    """Verify that concurrency semaphore bounds parallel operations."""
    crawler = KBeautyCrawler(brand="ConcurrencyTest", concurrency=2, timeout=5.0)
    
    active_workers = 0
    max_active_workers = 0
    lock = asyncio.Lock()
    
    async def mock_extract(url, page):
        nonlocal active_workers, max_active_workers
        async with lock:
            active_workers += 1
            if active_workers > max_active_workers:
                max_active_workers = active_workers
        await asyncio.sleep(0.05)
        async with lock:
            active_workers -= 1
        return None

    with patch.object(crawler.dom_extractor, "extract_product_page", new_callable=AsyncMock) as mock_ext:
        mock_ext.side_effect = mock_extract
        
        with patch("kbeauty_crawler.crawler.BrowserManager.get_instance") as mock_mgr_cls:
            mock_mgr = MagicMock()
            mock_ctx = MagicMock()
            mock_page = MagicMock()
            mock_page.close = AsyncMock()
            mock_ctx.close = AsyncMock()
            mock_ctx.new_page = AsyncMock(return_value=mock_page)
            mock_mgr.new_context = AsyncMock(return_value=mock_ctx)
            mock_mgr_cls.return_value = mock_mgr
            
            urls = [f"https://brand.com/prod/{i}" for i in range(5)]
            await asyncio.gather(*[crawler.crawl_single_product(u) for u in urls])
            
            # Concurrency limit was 2
            assert max_active_workers <= 2


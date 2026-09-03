"""
Unit and Integration tests for PlatformDetector (Feature F1).
Tests platform detection across Shopify API/DOM, Cafe24, Imweb, Makeshop, Godomall,
Sixshop, WooCommerce, PrestaShop, VTEX, Custom SPAs, and Custom DOM fallbacks.
"""
import pytest
import httpx
from unittest.mock import AsyncMock, patch, MagicMock
from kbeauty_crawler.detector import PlatformDetector

@pytest.fixture
def detector():
    return PlatformDetector(timeout=5.0)

def test_normalize_base_url(detector):
    assert detector.normalize_base_url("beautyofjoseon.com") == "https://beautyofjoseon.com"
    assert detector.normalize_base_url("http://anua.kr/products") == "http://anua.kr"
    assert detector.normalize_base_url("https://medicube.us/collections/all") == "https://medicube.us"

def test_get_subpath_url(detector):
    assert detector.get_subpath_url("brand.com/ko") == "https://brand.com/ko"
    assert detector.get_subpath_url("https://global.brand.com/en/products") == "https://global.brand.com/en/products"

@pytest.mark.asyncio
async def test_detect_shopify_api(detector):
    """Detects standard Shopify public JSON endpoint."""
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.json.return_value = {"products": [{"id": 123, "title": "Toner"}]}

    with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response
        platform, info = await detector.detect("https://beautyofjoseon.com")
        
        assert platform == "shopify"
        assert info["detected_platform"] == "shopify"
        assert "products.json" in info["endpoint_json"]

@pytest.mark.asyncio
async def test_detect_shopify_dom(detector):
    """Detects Shopify DOM when JSON endpoint fails or is blocked."""
    res_json_fail = MagicMock(spec=httpx.Response)
    res_json_fail.status_code = 404

    res_html = MagicMock(spec=httpx.Response)
    res_html.status_code = 200
    res_html.text = "<html><head><script src='https://cdn.shopify.com/s/files/1/app.js'></script></head><body></body></html>"
    res_html.headers = {}

    with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = [res_json_fail, res_html]
        platform, info = await detector.detect("https://shop.example.com")
        
        assert platform == "shopify_dom"
        assert info["detected_platform"] == "shopify_dom"

@pytest.mark.asyncio
async def test_detect_cafe24(detector):
    """Detects Cafe24 platform from HTML signatures and headers."""
    res_json_fail = MagicMock(spec=httpx.Response)
    res_json_fail.status_code = 404

    res_html = MagicMock(spec=httpx.Response)
    res_html.status_code = 200
    res_html.text = "<html><body><div id='ec_front_root' class='ec-base-tab'>CAFE24SHOP</div></body></html>"
    res_html.headers = {"x-cafe24-server": "web-01"}

    with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = [res_json_fail, res_html]
        platform, info = await detector.detect("https://anua.kr")
        
        assert platform == "cafe24"

@pytest.mark.asyncio
async def test_detect_imweb(detector):
    """Detects Imweb Korean website builder."""
    res_json_fail = MagicMock(spec=httpx.Response)
    res_json_fail.status_code = 404

    res_html = MagicMock(spec=httpx.Response)
    res_html.status_code = 200
    res_html.text = "<html><body><div class='imweb_tab_content _detail_content'></div></body></html>"
    res_html.headers = {}

    with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = [res_json_fail, res_html]
        platform, info = await detector.detect("https://bek.co.kr")
        
        assert platform == "imweb"

@pytest.mark.asyncio
async def test_detect_makeshop(detector):
    """Detects Makeshop Korean e-commerce engine."""
    res_json_fail = MagicMock(spec=httpx.Response)
    res_json_fail.status_code = 404

    res_html = MagicMock(spec=httpx.Response)
    res_html.status_code = 200
    res_html.text = "<html><body><script src='https://makeshop.co.kr/design/makeshop_domain.js'></script><div class='MS_detail'></div></body></html>"
    res_html.headers = {}

    with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = [res_json_fail, res_html]
        platform, info = await detector.detect("https://makeshop-store.co.kr")
        
        assert platform == "makeshop"

@pytest.mark.asyncio
async def test_detect_godomall(detector):
    """Detects Godomall (NHN Commerce / Godo5) platform."""
    res_json_fail = MagicMock(spec=httpx.Response)
    res_json_fail.status_code = 404

    res_html = MagicMock(spec=httpx.Response)
    res_html.status_code = 200
    res_html.text = "<html><body><form action='goods_view.php' data-goods-no='100234'><div class='godo5_spec'></div></form></body></html>"
    res_html.headers = {}

    with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = [res_json_fail, res_html]
        platform, info = await detector.detect("https://godomall-store.com")
        
        assert platform == "godomall"

@pytest.mark.asyncio
async def test_detect_sixshop(detector):
    """Detects Sixshop platform."""
    res_json_fail = MagicMock(spec=httpx.Response)
    res_json_fail.status_code = 404

    res_html = MagicMock(spec=httpx.Response)
    res_html.status_code = 200
    res_html.text = "<html><body><div class='sixshop-container _sixshop'></div></body></html>"
    res_html.headers = {}

    with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = [res_json_fail, res_html]
        platform, info = await detector.detect("https://sixshop-store.com")
        
        assert platform == "sixshop"

@pytest.mark.asyncio
async def test_detect_woocommerce(detector):
    """Detects WooCommerce / WordPress store."""
    res_json_fail = MagicMock(spec=httpx.Response)
    res_json_fail.status_code = 404

    res_html = MagicMock(spec=httpx.Response)
    res_html.status_code = 200
    res_html.text = "<html><body><div class='woocommerce-product-gallery wp-content'></div></body></html>"
    res_html.headers = {}

    with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = [res_json_fail, res_html]
        platform, info = await detector.detect("https://woo-store.com")
        
        assert platform == "woocommerce"

@pytest.mark.asyncio
async def test_detect_prestashop(detector):
    """Detects PrestaShop store."""
    res_json_fail = MagicMock(spec=httpx.Response)
    res_json_fail.status_code = 404

    res_html = MagicMock(spec=httpx.Response)
    res_html.status_code = 200
    res_html.text = "<html><body><div id='prestashop' class='modules/ps_shoppingcart'></div></body></html>"
    res_html.headers = {}

    with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = [res_json_fail, res_html]
        platform, info = await detector.detect("https://presta-store.com")
        
        assert platform == "prestashop"

@pytest.mark.asyncio
async def test_detect_vtex(detector):
    """Detects VTEX store."""
    res_json_fail = MagicMock(spec=httpx.Response)
    res_json_fail.status_code = 404

    res_html = MagicMock(spec=httpx.Response)
    res_html.status_code = 200
    res_html.text = "<html><body><div class='vtexcommercestable vtex.render-runtime'></div></body></html>"
    res_html.headers = {}

    with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = [res_json_fail, res_html]
        platform, info = await detector.detect("https://vtex-store.com")
        
        assert platform == "vtex"

@pytest.mark.asyncio
async def test_detect_spa_dom(detector):
    """Detects Modern SPA / Next.js / Nuxt store."""
    res_json_fail = MagicMock(spec=httpx.Response)
    res_json_fail.status_code = 404

    res_html = MagicMock(spec=httpx.Response)
    res_html.status_code = 200
    res_html.text = "<html><body><script id='__NEXT_DATA__' type='application/json'>{}</script><div id='__next'></div></body></html>"
    res_html.headers = {}

    with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = [res_json_fail, res_html]
        platform, info = await detector.detect("https://spa-store.com")
        
        assert platform == "spa_dom"

@pytest.mark.asyncio
async def test_detect_custom_dom_fallback(detector):
    """Falls back safely to custom_dom on unclassified or erroring sites."""
    with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = httpx.ConnectTimeout("Connection timed out")
        platform, info = await detector.detect("https://offline-brand.com")
        
        assert platform == "custom_dom"
        assert info["detected_platform"] == "custom_dom"

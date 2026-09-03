"""
Unit and Integration tests for ShopifyFastExtractor (Feature F3).
Tests pagination, barcode EAN-13 validation, float cleanup, SKU fallback,
high-res media un-scaling, rate limit backoff, and infinite pagination protection.
"""
import pytest
import httpx
from unittest.mock import AsyncMock, patch, MagicMock
from kbeauty_crawler.shopify_extractor import ShopifyFastExtractor
from kbeauty_crawler.cleaner import clean_ean, clean_sku, clean_title, normalize_image_url

@pytest.fixture
def extractor():
    return ShopifyFastExtractor(brand_name="Beauty of Joseon", timeout=5.0)

def test_clean_ean_valid_korean_ean13():
    # Valid Korean EAN-13 barcodes
    assert clean_ean("8809640732688") == "8809640732688"
    assert clean_ean("8809562559924") == "8809562559924"

def test_clean_ean_scientific_notation_and_float():
    # Scientific notation float artifact from Excel
    assert clean_ean("8.809640732688E+12") == "8809640732688"
    assert clean_ean("8809640732688.0") == "8809640732688"

def test_clean_ean_discard_dummy_sequences():
    # Discards dummy/placeholder barcodes
    assert clean_ean("0000000000000") is None
    assert clean_ean("9999999999999") is None
    assert clean_ean("1234567890123") is None
    assert clean_ean("NONE") is None
    assert clean_ean("") is None
    assert clean_ean(None) is None

def test_clean_sku():
    assert clean_sku("SKU: ANUA-TONER-250") == "ANUA-TONER-250"
    assert clean_sku("Code: 88012345.0") == "88012345"
    assert clean_sku("Item #: PKY-001") == "PKY-001"
    assert clean_sku(None, default_fallback="DEFAULT-SKU") == "DEFAULT-SKU"

def test_clean_title_promotional_brackets():
    assert clean_title("[1+1 기획] Heartleaf 77% Soothing Toner 250ml") == "Heartleaf 77% Soothing Toner 250ml"
    assert clean_title("[Special Set] Dynasty Cream (50ml + Free Gift)") == "Dynasty Cream (50ml + Free Gift)"
    assert clean_title("Glow Serum : Propolis + Niacinamide") == "Glow Serum : Propolis + Niacinamide"

def test_normalize_image_url_shopify_unscaling():
    # Strip Shopify size tokens
    url1 = "https://cdn.shopify.com/s/files/1/0123/products/toner_1024x1024.jpg?v=1673342531&width=800"
    norm1 = normalize_image_url(url1)
    assert "_1024x1024" not in norm1
    assert "width=800" not in norm1
    assert norm1.startswith("https://cdn.shopify.com/s/files/1/0123/products/toner.jpg")

    url2 = "//cdn.shopify.com/s/files/1/0123/products/cream_master.png?crop=center"
    norm2 = normalize_image_url(url2)
    assert norm2.startswith("https://cdn.shopify.com/s/files/1/0123/products/cream.png")
    assert "crop=" not in norm2

@pytest.mark.asyncio
async def test_extract_all_pagination(extractor):
    """Tests 2-page pagination with termination on second partial page."""
    page_1_items = [{"id": i, "title": f"Product {i}", "handle": f"prod-{i}", "variants": [{"id": i*10, "sku": f"SKU-{i}", "barcode": "8809640732688"}]} for i in range(1, 251)]
    page_2_items = [{"id": 301, "title": "Final Product", "handle": "final-prod", "variants": [{"id": 3010, "sku": "SKU-301", "barcode": "8809562559924"}]}]

    res_page_1 = MagicMock(spec=httpx.Response)
    res_page_1.status_code = 200
    res_page_1.json.return_value = {"products": page_1_items}

    res_page_2 = MagicMock(spec=httpx.Response)
    res_page_2.status_code = 200
    res_page_2.json.return_value = {"products": page_2_items}

    with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = [res_page_1, res_page_2]
        products = await extractor.extract_all("https://beautyofjoseon.com", max_pages=10)

        assert len(products) == 251
        assert products[0].brand_name == "Beauty of Joseon"
        assert products[0].marca == "Beauty of Joseon"
        assert products[0].sku == "SKU-1"
        assert products[0].ean == "8809640732688"
        assert products[-1].sku == "SKU-301"

@pytest.mark.asyncio
async def test_extract_all_dedup_guard(extractor):
    """Protects against infinite loop when proxy repeats page 1."""
    repeat_items = [{"id": 101, "title": "Loop Product", "handle": "loop-prod", "variants": [{"sku": "LOOP-1"}]}]
    
    res = MagicMock(spec=httpx.Response)
    res.status_code = 200
    res.json.return_value = {"products": repeat_items}

    with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = [res, res, res]
        products = await extractor.extract_all("https://broken-proxy.com", max_pages=5)

        # Should break on second page due to dedup guard
        assert len(products) == 1
        assert products[0].sku == "LOOP-1"

@pytest.mark.asyncio
async def test_extract_all_429_rate_limit_retry(extractor):
    """Tests 429 Too Many Requests exponential backoff with Retry-After header."""
    res_429 = MagicMock(spec=httpx.Response)
    res_429.status_code = 429
    res_429.headers = {"Retry-After": "0.1"}

    res_200 = MagicMock(spec=httpx.Response)
    res_200.status_code = 200
    res_200.json.return_value = {
        "products": [
            {
                "id": 55,
                "title": "Calming Serum 30ml",
                "handle": "calming-serum",
                "vendor": "Beauty of Joseon",
                "body_html": "<p>Full Ingredients: Centella Asiatica Extract, Glycerin, Water, 1,2-Hexanediol</p>",
                "variants": [{"id": 551, "sku": "BOJ-SERUM-30", "barcode": "8809640732688", "price": "17.00"}]
            }
        ]
    }

    with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = [res_429, res_200]
        products = await extractor.extract_all("https://beautyofjoseon.com", max_pages=1)

        assert len(products) == 1
        assert products[0].sku == "BOJ-SERUM-30"
        assert products[0].formato == "30ml"
        assert products[0].ruta_tecnica == "RUTA_TEXTO"

def test_clean_ean_adversarial_corruptions():
    """Adversarial stress test on corrupt, dummy, and malformed barcodes."""
    # Dummy identical digit sequences
    assert clean_ean("1111111111111") is None
    assert clean_ean("2222222222222") is None
    assert clean_ean("3333333333333") is None
    assert clean_ean("8888888888888") is None
    assert clean_ean("0000000000000") is None
    assert clean_ean("9999999999999") is None

    # Length boundaries (< 8 or > 14 digits)
    assert clean_ean("1234567") is None          # 7 digits -> too short
    assert clean_ean("123456789012345") is None  # 15 digits -> too long

    # Placeholders and nulls
    assert clean_ean("NO-BARCODE-FOUND") is None
    assert clean_ean("undefined") is None
    assert clean_ean("NaN") is None
    assert clean_ean("1234567890123") is None

    # Valid formatting cleanup with hyphens/spaces
    assert clean_ean("880-964-073-268-8") == "8809640732688"
    assert clean_ean(" 880 9562 559924 ") == "8809562559924"

    # Scientific notation variations
    assert clean_ean("8.809640732688e12") == "8809640732688"
    assert clean_ean("8.80964E+99") is None    # Overly large scientific
    assert clean_ean("8.80E") is None          # Malformed scientific

def test_validate_ean_checksum_adversarial():
    """Validates GS1 modulo-10 checksum verification across valid and corrupt codes."""
    from kbeauty_crawler.cleaner import validate_ean_checksum

    # Valid EAN-13 barcodes
    assert validate_ean_checksum("8809562559924") is True
    assert validate_ean_checksum("8809640732683") is True

    # Checksum corruption (invalid check digit)
    assert validate_ean_checksum("8809640732688") is False  # Expected 3, got 8
    assert validate_ean_checksum("8809640732689") is False
    assert validate_ean_checksum("8809640732680") is False
    assert validate_ean_checksum("8809562559925") is False

    # Valid EAN-8 barcode
    assert validate_ean_checksum("88012346") is True
    assert validate_ean_checksum("88012345") is False

    # Invalid lengths or non-numeric
    assert validate_ean_checksum("12345") is False
    assert validate_ean_checksum("88096407326881234") is False
    assert validate_ean_checksum("880964073268A") is False

@pytest.mark.asyncio
async def test_extract_all_empty_and_null_responses(extractor):
    """Stress-tests empty product lists, null objects, and malformed dicts."""
    mock_res_empty = MagicMock(spec=httpx.Response)
    mock_res_empty.status_code = 200
    mock_res_empty.json.return_value = {"products": []}

    with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_res_empty
        prods = await extractor.extract_all("https://empty-store.com", max_pages=5)
        assert len(prods) == 0

    mock_res_null = MagicMock(spec=httpx.Response)
    mock_res_null.status_code = 200
    mock_res_null.json.return_value = {"products": None}

    with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_res_null
        prods = await extractor.extract_all("https://null-store.com", max_pages=5)
        assert len(prods) == 0

@pytest.mark.asyncio
async def test_extract_all_non_json_html_error_responses(extractor):
    """Handles HTML 200 error pages, 500, 502, 503, and 404 cleanly."""
    mock_res_html = MagicMock(spec=httpx.Response)
    mock_res_html.status_code = 200
    mock_res_html.json.side_effect = Exception("Invalid JSON: <html><body>Error</body></html>")

    with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_res_html
        prods = await extractor.extract_all("https://html-error.com", max_pages=5)
        assert len(prods) == 0

    for status in (404, 500, 502, 503, 403):
        mock_res_err = MagicMock(spec=httpx.Response)
        mock_res_err.status_code = status
        with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_res_err
            prods = await extractor.extract_all(f"https://status-{status}.com", max_pages=5)
            assert len(prods) == 0

@pytest.mark.asyncio
async def test_extract_all_429_storm_exhaustion_and_malformed_headers(extractor):
    """Stress-tests 429 rate limit storm and invalid Retry-After header formats."""
    # 1. Complete 429 exhaustion
    res_429 = MagicMock(spec=httpx.Response)
    res_429.status_code = 429
    res_429.headers = {"Retry-After": "0.01"}

    with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = res_429
        prods = await extractor.extract_all("https://rate-limited.com", max_pages=3)
        assert len(prods) == 0

    # 2. Malformed non-digit Retry-After header format (HTTP-date string)
    res_429_date = MagicMock(spec=httpx.Response)
    res_429_date.status_code = 429
    res_429_date.headers = {"Retry-After": "Wed, 21 Oct 2026 07:28:00 GMT"}

    res_200 = MagicMock(spec=httpx.Response)
    res_200.status_code = 200
    res_200.json.return_value = {
        "products": [{"id": 99, "title": "Recovered Toner", "variants": [{"sku": "REC-1", "barcode": "8809640732688"}]}]
    }

    with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = [res_429_date, res_200]
        prods = await extractor.extract_all("https://rate-limited-date.com", max_pages=1)
        assert len(prods) == 1
        assert prods[0].sku == "REC-1"
        assert prods[0].ean == "8809640732688"

@pytest.mark.asyncio
async def test_extract_all_variant_barcode_fallback(extractor):
    """Tests barcode resolution hierarchy across multiple product variants."""
    res_200 = MagicMock(spec=httpx.Response)
    res_200.status_code = 200
    res_200.json.return_value = {
        "products": [
            {
                "id": 101,
                "title": "Multi-Variant Ampoule",
                "handle": "multi-variant-ampoule",
                "variants": [
                    {"id": 1001, "sku": "AMP-DUMMY", "barcode": "0000000000000"},  # Invalid dummy
                    {"id": 1002, "sku": "AMP-VALID", "barcode": "8809640732688"},  # Valid EAN-13 fallback
                ]
            },
            {
                "id": 102,
                "title": "Missing Primary Barcode",
                "handle": "missing-barcode",
                "variants": [
                    {"id": 2001, "sku": "MISS-1", "barcode": None},                # None
                    {"id": 2002, "sku": "MISS-2", "barcode": "8809562559924"},     # Valid EAN-13
                ]
            }
        ]
    }

    with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = res_200
        prods = await extractor.extract_all("https://fallback-store.com", max_pages=1)
        assert len(prods) == 2
        assert prods[0].ean == "8809640732688"
        assert prods[1].ean == "8809562559924"

@pytest.mark.asyncio
async def test_extract_all_null_and_malformed_variant_fields(extractor):
    """Verifies extractor resilience when fields are None, variants is None or empty dict."""
    res_200 = MagicMock(spec=httpx.Response)
    res_200.status_code = 200
    res_200.json.return_value = {
        "products": [
            {
                "id": 201,
                "title": None,
                "handle": None,
                "variants": None,
                "images": None,
                "body_html": None
            },
            {
                "id": 202,
                "title": "Clean Product",
                "handle": "clean-product",
                "variants": [{}],
                "images": [],
                "body_html": ""
            }
        ]
    }

    with patch.object(httpx.AsyncClient, "get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = res_200
        prods = await extractor.extract_all("https://malformed-store.com", max_pages=1)
        assert len(prods) == 2
        assert prods[0].title == ""
        assert prods[1].sku != ""



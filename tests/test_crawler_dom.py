"""
Unit and Integration tests for DomExtractor (Feature F2).
Tests modal dismissals, accordion expansion, MFDS table / definition list parsing,
technical route classification, and fallback mechanisms.
"""
import pytest
from bs4 import BeautifulSoup
from kbeauty_crawler.dom_extractor import DomExtractor, clean_text_block
from kbeauty_crawler.cleaner import classify_technical_route

@pytest.fixture
def dom_extractor():
    return DomExtractor(brand_name="Anua")

def test_clean_text_block():
    assert clean_text_block("  Hello   World \n\t Test  ") == "Hello World Test"
    assert clean_text_block("") == ""

def test_extract_mfds_table_specs_korean(dom_extractor):
    """Tests parsing Korean mandatory disclosure tables (상품정보제공고시)."""
    html = """
    <table class='ec-base-table'>
        <tbody>
            <tr>
                <th>용량 또는 중량</th>
                <td>250ml / 8.45 fl. oz.</td>
            </tr>
            <tr>
                <th>제품 주요 사양</th>
                <td>모든 피부 타입 (민감성 피부 사용 가능)</td>
            </tr>
            <tr>
                <th>사용방법</th>
                <td>세안 후 적당량을 화장솜에 덜어 피부결을 따라 부드럽게 닦아내거나 손에 덜어 흡수시켜 줍니다.</td>
            </tr>
            <tr>
                <th>화장품전성분</th>
                <td>약모밀추출물(77%), 정제수, 1,2-헥산다이올, 글리세린, 베타인, 판테놀, 사탕수수추출물, 쇠비름추출물, 부틸렌글라이콜</td>
            </tr>
            <tr>
                <th>기능성 화장품 심사 필 유무</th>
                <td>해당사항 없음 (피부 진정 및 유수분 밸런스 케어)</td>
            </tr>
        </tbody>
    </table>
    """
    soup = BeautifulSoup(html, "html.parser")
    specs = dom_extractor._extract_mfds_table_specs(soup)

    assert specs["format"] == "250ml"
    assert "약모밀추출물" in specs["inci"]
    assert "정제수" in specs["inci"]
    assert "화장솜에 덜어" in specs["usage"]
    assert "모든 피부 타입" in specs["skin_type"]
    assert len(specs["benefits"]) >= 1

def test_extract_mfds_definition_list_specs(dom_extractor):
    """Tests parsing definition lists (<dl><dt><dd>)."""
    html = """
    <dl class='detail_spec_list'>
        <dt>용량</dt>
        <dd>50ml</dd>
        <dt>전성분</dt>
        <dd>병풀추출물, 글리세린, 부틸렌글라이콜, 나이아신아마이드, 1,2-헥산다이올</dd>
        <dt>사용법</dt>
        <dd>본 품 적당량을 취해 피부에 골고루 펴 바릅니다.</dd>
        <dt>피부타입</dt>
        <dd>건성, 지성, 복합성</dd>
    </dl>
    """
    soup = BeautifulSoup(html, "html.parser")
    specs = dom_extractor._extract_mfds_table_specs(soup)

    assert specs["format"] == "50ml"
    assert "병풀추출물" in specs["inci"]
    assert "골고루 펴 바릅니다" in specs["usage"]
    assert "건성, 지성" in specs["skin_type"]

def test_classify_technical_route_text():
    """Validates classification for text-rich DOM pages."""
    html = """
    <div class='product-details'>
        <h1>Heartleaf 77% Soothing Toner 250ml</h1>
        <p>Full Ingredients: Houttuynia Cordata Extract (77%), Water, 1,2-Hexanediol, Glycerin, Betaine, Panthenol, Butylene Glycol, Centella Asiatica Extract</p>
        <p>How to use: Apply with a cotton pad or gently pat onto face.</p>
        <img src='https://cdn.example.com/toner_hero.jpg' />
    </div>
    """
    ruta, raw_html, infografias = classify_technical_route(html, "https://anua.kr")
    assert ruta == "RUTA_TEXTO"
    assert len(infografias) == 1

def test_classify_technical_route_infographic():
    """Validates classification for image-heavy Korean infographic detail pages."""
    html = """
    <div class='detail_content'>
        <p>상세 설명</p>
        <img src='https://anua.kr/images/infographic_part1_3000px.jpg' />
        <img src='https://anua.kr/images/infographic_part2_3000px.jpg' />
    </div>
    """
    ruta, raw_html, infografias = classify_technical_route(html, "https://anua.kr")
    assert ruta == "RUTA_INFOGRAFIA"
    assert len(infografias) == 2

def test_parse_html_payload_full_integration(dom_extractor):
    """Tests comprehensive parsing into ProductIntermediate."""
    html = """
    <html>
        <head><title>Heartleaf Toner - Anua</title></head>
        <body>
            <h1 class='product__title'>[1+1 기획] Heartleaf 77% Soothing Toner 250ml</h1>
            <span class='sku'>SKU: ANUA-TONER-250ML</span>
            <div class='product__description'>Anua's flagship soothing toner formulated with 77% Heartleaf Extract.</div>
            <table class='specs'>
                <tr><th>용량</th><td>250ml</td></tr>
                <tr><th>전성분</th><td>약모밀추출물, 정제수, 글리세린, 1,2-헥산다이올</td></tr>
                <tr><th>사용방법</th><td>적당량을 취해 피부에 도포합니다.</td></tr>
            </table>
            <img class='gallery' src='https://anua.kr/cdn/images/toner_front_1024x1024.jpg' />
        </body>
    </html>
    """
    prod = dom_extractor._parse_html_payload(html, "https://anua.kr/products/toner")

    assert prod.brand_name == "Anua"
    assert prod.marca == "Anua"
    assert prod.title == "Heartleaf 77% Soothing Toner 250ml"
    assert prod.titulo == "Heartleaf 77% Soothing Toner 250ml"
    assert prod.sku == "ANUA-TONER-250ML"
    assert prod.formato == "250ml"
    assert "약모밀추출물" in prod.inci_completo
    assert "도포합니다" in prod.modo_de_uso
    assert len(prod.gallery_images) >= 1
    assert "_1024x1024" not in prod.gallery_images[0]

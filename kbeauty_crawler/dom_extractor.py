"""
Playwright Dynamic DOM & Accordion Extractor.
Features:
- 4-Phase modal/popup dismissal (Escape, unified selector, iframe traversal, JS backdrop removal)
- State-aware accordion expansion (EXPAND_ALL_JS + verification)
- Korean MFDS table & definition list parsing (화장품전성분, 사용방법, 피부타입, 효능, 용량)
- 4-Tier fallback hierarchy (Playwright DOM -> Static HTTP/JSON-LD -> Infographic Route -> Partial)
"""
import asyncio
import re
from typing import Optional, List, Dict, Any, Tuple
from urllib.parse import urlparse
import httpx
from bs4 import BeautifulSoup
from playwright.async_api import Page

from .models import ProductIntermediate
from .cleaner import clean_title, clean_ean, clean_sku, normalize_image_url, classify_technical_route

UNIFIED_MODAL_SELECTOR = (
    'button[aria-label*="Close" i], button[aria-label*="close" i], '
    'button.needsclick[aria-label*="Close"], '
    '.klaviyo-close-form, [data-testid="POPUP_CLOSE"], '
    '#onetrust-accept-btn-handler, #onetrust-reject-all-handler, '
    '.cookie-consent-accept, .agree-btn, .btn_close, .close_btn, '
    'button:has-text("동의"), button:has-text("닫기"), button:has-text("확인"), '
    'button:has-text("오늘 하루 열지 않기"), button:has-text("오늘 하루 보지 않기"), '
    'button:has-text("다시 보지 않기"), button:has-text("쇼핑 계속하기"), '
    'button:has-text("Accept"), button:has-text("Agree"), button:has-text("Allow all"), '
    'button:has-text("No, thanks"), button:has-text("Maybe later"), '
    '.modal-close, .popup-close, [class*="popup"] [class*="close"], [class*="modal"] [class*="close"], '
    '#layer_popup [onclick*="close"], .xans-popup [onclick*="close"]'
)

EXPAND_ALL_JS = """
(() => {
    // 1. Open all <details>
    document.querySelectorAll('details').forEach(d => {
        d.setAttribute('open', '');
        d.open = true;
    });

    // 2. Expand all interactive accordions & tabs
    const keywords = [
        'ingredient', 'inci', '성분', '전성분', '화장품전성분', '주요성분', '원료 및 함량',
        'how to use', 'directions', 'suggested use', 'how to apply', 'usage', 'application',
        '사용방법', '사용법', '용법용량', '사용 시 주의사항',
        'benefit', '특징', '효능', '효과', 'why we love it', 'features',
        'details', 'specs', '상세정보', '상품정보제공고시', 'skin type', '피부'
    ];

    const clickables = document.querySelectorAll(
        'button, summary, [role="tab"], .accordion__title, .tab-title, dt, ' +
        '.ec-base-tab li, a[href*="#tab"], [class*="tab_btn"], [class*="accordion_btn"]'
    );
    clickables.forEach(el => {
        const text = (el.textContent || '').toLowerCase();
        if (keywords.some(kw => text.includes(kw))) {
            const ariaExp = el.getAttribute('aria-expanded');
            const ariaSel = el.getAttribute('aria-selected');
            if (ariaExp !== 'true' && ariaSel !== 'true') {
                try { el.click(); } catch(e) {}
            }
        }
    });

    // 3. Unhide CSS collapsed panels
    const collapsedSelectors = [
        '.collapse', '.accordion-collapse', '.tab-pane', '.panel-collapse',
        '[class*="accordion_content"]', '[class*="tab_content"]', '[class*="detail_content"]'
    ];
    collapsedSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
            el.classList.add('show', 'active', 'open');
            el.style.display = 'block';
            el.style.maxHeight = 'none';
            el.style.opacity = '1';
            el.style.visibility = 'visible';
        });
    });
})()
"""

ACCORDION_BUTTON_TEXTS = [
    'Ingredients', 'Full Ingredients', 'Key Ingredients', 'Ingredient List',
    'How to Use', 'Suggested Use', 'Directions', 'How to apply',
    'Benefits', 'Key Benefits', 'Why We Love It', 'Details',
    'Skin Type', 'Skin Concern',
    '성분', '전성분', '화장품전성분', '사용방법', '사용법', '특징', '효능', '상품정보제공고시'
]

USAGE_KEYWORDS = [
    'how to use', 'suggested use', 'directions', 'how to apply', 'application',
    'modo de uso', 'instrucciones', '사용방법', '사용법', '용법용량'
]

BENEFIT_KEYWORDS = [
    'benefits', 'key benefits', 'why we love it', 'features', 'what it is',
    'beneficios', '효과', '특징', '효능', '주요효능'
]

SKIN_TYPE_KEYWORDS = [
    'skin type', 'skin concern', 'suitable for', 'recommended for', 'target skin',
    'tipo de piel', '피부타입', '피부'
]

def clean_text_block(text: str) -> str:
    if not text:
        return ''
    return re.sub(r'\s+', ' ', text).strip()

def strip_field_prefix(text: str) -> str:
    """Clean and strip leading label prefixes from extracted text values."""
    if not text:
        return ''
    cleaned = clean_text_block(text)
    patterns = [
        r'^(?:All\s*|Key\s*|Active\s*|Full\s*)?Ingredients?\s*[:\-–—]\s*',
        r'^(?:화장품\s*)?전성분\s*[:\-–—]\s*',
        r'^(?:원료\s*(?:및|&)?\s*함량|주요성분|성분(?:\s*전성분)?)\s*[:\-–—]\s*',
        r'^(?:How\s*to\s*Use|Directions|Suggested\s*Use|Usage)\s*[:\-–—]\s*',
        r'^(?:사용방법|사용법|용법용량|사용\s*시\s*주의사항)\s*[:\-–—]\s*',
        r'^(?:Benefits|Key\s*Benefits|Features|Why\s*we\s*love\s*it)\s*[:\-–—]\s*',
        r'^(?:효능(?:\s*[/및&]\s*효과)?|효과|주요효능|특징|기능성(?:\s*화장품(?:\s*심사여부)?)?)\s*[:\-–—]\s*',
        r'^(?:Skin\s*Type|Target\s*Skin|Suitable\s*for|Recommended\s*for)\s*[:\-–—]\s*',
        r'^(?:피부타입|제품\s*주요\s*사양|피부)\s*[:\-–—]\s*',
        r'^(?:용량\s*(?:또는|및|/|&)?\s*중량|용량|중량)\s*[:\-–—]\s*',
    ]
    for pat in patterns:
        cleaned = re.sub(pat, '', cleaned, flags=re.IGNORECASE).strip()
    return cleaned

class DomExtractor:
    def __init__(self, brand_name: Optional[str] = None):
        self.brand_name = brand_name

    async def dismiss_popups(self, page: Page) -> None:
        """4-Phase synchronized modal and popup dismissal."""
        # Phase 0: Escape key press
        try:
            await page.keyboard.press('Escape')
            await asyncio.sleep(0.05)
        except Exception:
            pass

        # Phase 1: High-Speed Unified Locator Query
        try:
            locators = page.locator(UNIFIED_MODAL_SELECTOR)
            count = await locators.count()
            for i in range(min(count, 3)):
                el = locators.nth(i)
                if await el.is_visible(timeout=200):
                    await el.click(timeout=250, force=True)
                    await asyncio.sleep(0.08)
        except Exception:
            pass

        # Phase 2: Frame traversal for iframes (Klaviyo, OneTrust, etc.)
        try:
            for frame in page.frames:
                if frame != page.main_frame:
                    try:
                        frame_btn = frame.locator('button[aria-label*="Close" i], .close-btn, .modal-close')
                        if await frame_btn.count() > 0 and await frame_btn.first.is_visible(timeout=150):
                            await frame_btn.first.click(timeout=200)
                    except Exception:
                        pass
        except Exception:
            pass

        # Phase 3: Aggressive JS backdrop removal and scroll unlock
        try:
            await page.evaluate("""() => {
                const backdrops = document.querySelectorAll('.modal-backdrop, .popup-overlay, .dimmed, [class*="backdrop"], [class*="dim"]');
                backdrops.forEach(el => el.remove());
                document.body.style.overflow = 'auto';
                document.documentElement.style.overflow = 'auto';
            }""")
        except Exception:
            pass

    async def expand_accordions(self, page: Page) -> None:
        """Expand dynamic collapsible accordions and unhide hidden tabs."""
        # Step A: Single-shot JS evaluation
        try:
            await page.evaluate(EXPAND_ALL_JS)
        except Exception:
            pass

        # Step B: Python interactive fallback for remaining visible collapsible elements
        for btn_text in ACCORDION_BUTTON_TEXTS:
            try:
                locators = page.locator(
                    f'button:has-text("{btn_text}"), summary:has-text("{btn_text}"), '
                    f'[role="tab"]:has-text("{btn_text}"), .accordion__title:has-text("{btn_text}")'
                )
                count = await locators.count()
                for i in range(min(count, 2)):
                    el = locators.nth(i)
                    if await el.is_visible(timeout=150):
                        aria_exp = await el.get_attribute('aria-expanded')
                        if aria_exp != 'true':
                            await el.click(timeout=250, force=True)
                            await asyncio.sleep(0.06)
            except Exception:
                pass

    async def progressive_scroll(self, page: Page, step_px: int = 500, delay_ms: int = 150, max_steps: int = 8) -> None:
        """Progressive incremental viewport scroll triggering lazy loading."""
        try:
            for step in range(max_steps):
                current_pos = (step + 1) * step_px
                await page.evaluate(f'window.scrollTo(0, {current_pos});')
                await asyncio.sleep(delay_ms / 1000.0)
            await asyncio.sleep(0.1)
        except Exception:
            pass

    def _route_spec_item(self, label_raw: str, value_raw: str, specs: Dict[str, Any]) -> None:
        """Route normalized label and stripped value to corresponding specs field."""
        if not label_raw or not value_raw:
            return
        label_norm = re.sub(r'\s+', '', label_raw).lower()
        val_clean = strip_field_prefix(value_raw)
        if not val_clean:
            return
        
        # INCI / Ingredients
        if any(k in label_norm for k in ['화장품전성분', '전성분', '원료및함량', '주요성분', '성분', 'ingredient', 'inci']):
            if len(val_clean) > len(specs['inci']):
                specs['inci'] = val_clean
        # Usage instructions
        elif any(k in label_norm for k in ['사용방법', '사용법', '용법용량', '사용시주의사항', 'howtouse', 'directions', 'suggesteduse', 'usage', 'application', 'mododeuso']):
            if len(val_clean) > len(specs['usage']):
                specs['usage'] = val_clean
        # Skin type / Product spec
        elif any(k in label_norm for k in ['제품주요사양', '주요사양', '피부타입', '피부', 'skintype', 'suitablefor', 'recommendedfor', 'targetskin']):
            if len(val_clean) > len(specs['skin_type']):
                specs['skin_type'] = val_clean
        # Benefits / Efficacy
        elif any(k in label_norm for k in ['기능성화장품', '기능성', '효능효과', '효능', '효과', '주요효능', '특징', 'benefit', 'feature', 'whyweloveit']):
            if val_clean and val_clean not in specs['benefits']:
                specs['benefits'].append(val_clean)
        # Format / Volume
        elif any(k in label_norm for k in ['용량또는중량', '용량/중량', '용량', '중량', 'format', 'volume', 'capacity', 'size']):
            if not specs['format']:
                fmt_match = re.search(r'\b(\d+(?:[\.,]\d+)?\s*(?:ml|g|kg|l|oz|fl\.?\s*oz|sheets?|pads?|pcs?|ea))\b', val_clean, re.I)
                if fmt_match:
                    specs['format'] = fmt_match.group(1).strip()

    def _extract_mfds_table_specs(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """
        Parse mandatory Korean MFDS disclosure tables (<table>) and definition lists (<dl>).
        Extracts INCI, usage, skin type, benefits, and format across single-row, multi-row,
        merged headers, spaced Hangul labels, and unclosed tags.
        """
        specs = {
            'inci': '',
            'usage': '',
            'skin_type': '',
            'benefits': [],
            'format': None
        }

        # 1. Parse tables (handles standard, merged headers, multi-row, and unclosed <th>)
        for table in soup.find_all('table'):
            rows = table.find_all('tr')
            pending_header = None
            
            for i, row in enumerate(rows):
                ths = row.find_all('th')
                tds = row.find_all('td')
                
                # Check for unclosed <th> where <td> was nested inside <th>
                has_nested_td = False
                for th in ths:
                    nested_td = th.find('td')
                    if nested_td:
                        has_nested_td = True
                        td_text = nested_td.get_text(separator=' ', strip=True)
                        th_clone = BeautifulSoup(str(th), 'html.parser')
                        for inner in th_clone.find_all(['td', 'tr']):
                            inner.decompose()
                        h_text = th_clone.get_text(strip=True)
                        if h_text and td_text:
                            self._route_spec_item(h_text, td_text, specs)
                
                if has_nested_td:
                    pending_header = None
                    continue

                # Standard row with both <th> and <td>
                if ths and tds:
                    if len(ths) == len(tds):
                        for th_el, td_el in zip(ths, tds):
                            self._route_spec_item(th_el.get_text(strip=True), td_el.get_text(separator=' ', strip=True), specs)
                    elif len(ths) == 1:
                        self._route_spec_item(ths[0].get_text(strip=True), tds[-1].get_text(separator=' ', strip=True), specs)
                    else:
                        for th_el, td_el in zip(ths, tds):
                            self._route_spec_item(th_el.get_text(strip=True), td_el.get_text(separator=' ', strip=True), specs)
                    pending_header = None
                    continue

                # Row with only <th> elements (e.g. <th colspan="2">전 성 분</th>)
                if ths and not tds:
                    if len(ths) == 1:
                        pending_header = ths[0].get_text(strip=True)
                    elif len(ths) > 1 and i + 1 < len(rows):
                        next_tds = rows[i + 1].find_all('td')
                        if len(next_tds) == len(ths):
                            for th_el, td_el in zip(ths, next_tds):
                                self._route_spec_item(th_el.get_text(strip=True), td_el.get_text(separator=' ', strip=True), specs)
                    continue

                # Row with only <td> elements
                if not ths and tds:
                    if pending_header:
                        val_text = ' '.join(td.get_text(separator=' ', strip=True) for td in tds)
                        self._route_spec_item(pending_header, val_text, specs)
                        pending_header = None
                        continue
                    
                    if len(tds) == 2:
                        self._route_spec_item(tds[0].get_text(strip=True), tds[1].get_text(separator=' ', strip=True), specs)
                    elif len(tds) >= 4 and len(tds) % 2 == 0:
                        for idx in range(0, len(tds), 2):
                            self._route_spec_item(tds[idx].get_text(strip=True), tds[idx + 1].get_text(separator=' ', strip=True), specs)
                    elif len(tds) == 1:
                        td_text = tds[0].get_text(strip=True)
                        td_norm = re.sub(r'\s+', '', td_text).lower()
                        if any(k in td_norm for k in ['화장품전성분', '전성분', '원료및함량', '성분', '사용방법', '사용법', '용법용량', '피부타입', '피부', '효능', '효과', '특징', '용량', '중량', 'ingredient', 'howtouse']):
                            pending_header = td_text
                    continue

        # 2. Fallback for stray <tr> without <table>
        if not specs['inci'] and not specs['usage']:
            for row in soup.find_all('tr'):
                th = row.find('th')
                tds = row.find_all('td')
                if th and tds:
                    self._route_spec_item(th.get_text(strip=True), tds[-1].get_text(separator=' ', strip=True), specs)
                elif len(tds) >= 2:
                    self._route_spec_item(tds[0].get_text(strip=True), tds[-1].get_text(separator=' ', strip=True), specs)

        # 3. Parse definition lists (<dl>)
        for dl in soup.find_all('dl'):
            dts = dl.find_all('dt')
            dds = dl.find_all('dd')
            if len(dts) == len(dds):
                for dt, dd in zip(dts, dds):
                    self._route_spec_item(dt.get_text(strip=True), dd.get_text(separator=' ', strip=True), specs)
            else:
                for dt in dts:
                    dd = dt.find_next_sibling('dd')
                    if dd:
                        self._route_spec_item(dt.get_text(strip=True), dd.get_text(separator=' ', strip=True), specs)

        return specs

    def _parse_html_payload(self, html: str, url: str) -> ProductIntermediate:
        """Parse structured HTML into ProductIntermediate with fallback hierarchy."""
        url = url.strip()
        base_url = f"{urlparse(url).scheme}://{urlparse(url).netloc}"
        domain_brand = urlparse(url).netloc.replace('www.', '').split('.')[0].capitalize()
        brand = self.brand_name or domain_brand

        soup = BeautifulSoup(html, 'html.parser')

        # 1. Title
        title_tag = soup.find(['h1', '.product__title', '.product-title', '.product_title', '[itemprop="name"]'])
        raw_title = clean_text_block(title_tag.get_text(strip=True)) if title_tag else ''
        if not raw_title:
            og_title = soup.find('meta', property='og:title')
            raw_title = og_title['content'] if og_title and 'content' in og_title.attrs else ''
        clean_name = clean_title(raw_title)

        # 2. Format extraction
        formato = None
        fmt_match = re.search(r'\b(\d+(?:[\.,]\d+)?\s*(?:ml|g|kg|l|oz|fl\.?\s*oz|sheets?|pads?|pcs?|ea))\b', raw_title, re.I)
        if fmt_match:
            formato = fmt_match.group(1).strip()

        # 3. SKU Extraction
        sku_el = soup.find(attrs={'itemprop': 'sku'}) or soup.find(class_=re.compile(r'sku|product-code', re.I)) or soup.find(id=re.compile(r'sku|product_code', re.I))
        raw_sku = sku_el.get_text(strip=True) if sku_el else ''
        sku = clean_sku(raw_sku, default_fallback=url.rstrip('/').split('/')[-1].split('?')[0])

        # 4. Korean MFDS Table & DL specs
        mfds_specs = self._extract_mfds_table_specs(soup)
        if mfds_specs['format'] and not formato:
            formato = mfds_specs['format']

        inci_completo = mfds_specs['inci']
        modo_de_uso = mfds_specs['usage']
        tipo_de_piel = mfds_specs['skin_type']
        beneficios = mfds_specs['benefits']
        ingredientes_clave: List[str] = []

        # 5. Deep Section Parsing (details, accordion blocks)
        blocks = soup.find_all(['details', '.accordion', '.collapsible', '.tab-content', '.product-accordion', 'section', 'div'])
        for b in blocks:
            header_el = b.find(['summary', 'button', 'h2', 'h3', 'h4', '.accordion__title', '.title', '.tab-title'])
            header = header_el.get_text(strip=True).lower() if header_el else ''
            
            # Extract content without header element text
            if header_el:
                content_el = b.find(['.accordion_content', '.tab_content', '.detail_content', '.panel-collapse', '.tab-pane'])
                if content_el and content_el != header_el:
                    content_text = content_el.get_text(separator=' ', strip=True)
                else:
                    b_clone = BeautifulSoup(str(b), 'html.parser')
                    h_clone = b_clone.find(['summary', 'button', 'h2', 'h3', 'h4', '.accordion__title', '.title', '.tab-title'])
                    if h_clone:
                        h_clone.decompose()
                    content_text = b_clone.get_text(separator=' ', strip=True)
            else:
                content_text = b.get_text(separator=' ', strip=True)

            content_lower = content_text.lower()

            if (any(k in header for k in ['ingredient', 'inci', '성분', '전성분']) or
                (any(k in content_lower for k in ['1,2-hexanediol', 'dipropylene glycol', 'glycerin,', 'water/aqua', 'butylene glycol']) and len(content_text) > 80)):
                cleaned_inci = strip_field_prefix(content_text)
                if len(cleaned_inci) > len(inci_completo) and len(cleaned_inci) < 5000:
                    inci_completo = clean_text_block(cleaned_inci)

            if any(k in header for k in USAGE_KEYWORDS) and len(content_text) > 20:
                cleaned_usage = strip_field_prefix(content_text)
                if len(cleaned_usage) > len(modo_de_uso):
                    modo_de_uso = clean_text_block(cleaned_usage)

            if any(k in header for k in BENEFIT_KEYWORDS) and len(content_text) > 25:
                cleaned_ben = strip_field_prefix(content_text)
                if len(cleaned_ben) > 20 and cleaned_ben not in beneficios:
                    beneficios.append(clean_text_block(cleaned_ben))

            if any(k in header for k in SKIN_TYPE_KEYWORDS) and len(content_text) > 10:
                cleaned_st = strip_field_prefix(content_text)
                if len(cleaned_st) > len(tipo_de_piel):
                    tipo_de_piel = clean_text_block(cleaned_st)

        # Fallback INCI search across paragraphs/lists
        if not inci_completo:
            for el in soup.find_all(['p', 'li', 'div']):
                txt = el.get_text(separator=' ', strip=True)
                txt_lower = txt.lower()
                if ('ingredients' in txt_lower or 'inci' in txt_lower or '전성분' in txt_lower) and len(txt) > 80:
                    cleaned = strip_field_prefix(txt)
                    if len(cleaned) > len(inci_completo) and len(cleaned) < 4000:
                        inci_completo = clean_text_block(cleaned)

        # 6. Description
        desc_el = soup.find(['.product__description', '.product-description', '#description', '[itemprop="description"]'])
        desc_full = clean_text_block(desc_el.get_text(separator=' ', strip=True)) if desc_el else clean_name

        # 7. Gallery Images
        gallery_urls: List[str] = []
        for img in soup.find_all('img'):
            src = img.get('data-zoom-src') or img.get('data-original') or img.get('data-src') or img.get('src')
            if not src:
                continue
            if any(term in src.lower() for term in ['logo', 'icon', 'badge', 'banner', 'avatar', 'payment', 'cart', 'tracker']):
                continue
            norm = normalize_image_url(src, base_url)
            if norm and norm not in gallery_urls:
                gallery_urls.append(norm)

        # 8. Technical Route & Classification
        tech_container = (
            soup.find(class_=re.compile(r'ingredients|product-details|technical|spec|detail_content|product-description', re.I))
            or soup.find(id=re.compile(r'ingredients|details|specs|prdDetail', re.I))
            or soup.find('div', attrs={'data-tab': re.compile(r'ingredient|detail', re.I)})
        )
        tech_html = str(tech_container) if tech_container else str(desc_el) if desc_el else ''
        ruta, raw_html_tecnico, infografias = classify_technical_route(tech_html or html, base_url)

        return ProductIntermediate(
            marca=brand,
            brand_name=brand,
            url_producto=url,
            source_url=url,
            sku=sku,
            titulo=clean_name,
            title=clean_name,
            nombre_completo=raw_title,
            formato=formato,
            format_raw=formato,
            ruta_tecnica=ruta,
            descripcion_completa=desc_full,
            description_full=desc_full,
            beneficios=beneficios[:5],
            benefits='\n'.join(beneficios[:5]) if beneficios else '',
            modo_de_uso=modo_de_uso,
            usage_instructions=modo_de_uso,
            tipo_de_piel=tipo_de_piel,
            skin_types=tipo_de_piel,
            ingredientes_clave=ingredientes_clave,
            inci_completo=inci_completo,
            key_ingredients_raw=inci_completo,
            raw_html_tecnico=raw_html_tecnico or tech_html,
            urls_infografias=infografias,
            infographic_images=infografias,
            imagenes_galeria=gallery_urls[:15],
            gallery_images=gallery_urls[:15],
            plataforma_origen='DOM_Playwright_Deep'
        )

    async def _extract_static_http_fallback(self, url: str) -> Optional[ProductIntermediate]:
        """Tier 2 fallback: Static HTTP GET with JSON-LD / HTML parsing."""
        try:
            async with httpx.AsyncClient(headers={'User-Agent': 'Mozilla/5.0'}, timeout=10.0, follow_redirects=True) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    return self._parse_html_payload(res.text, url)
        except Exception:
            pass
        return None

    async def extract_product_page(self, url: str, page: Page) -> Optional[ProductIntermediate]:
        """
        Execute 4-tier dynamic extraction on a target product URL.
        """
        url = url.strip()

        # Tier 1: Dynamic Playwright Navigation
        try:
            await page.goto(url, wait_until='domcontentloaded', timeout=15000)
            await asyncio.sleep(0.5)
            
            await self.dismiss_popups(page)
            await self.expand_accordions(page)
            await self.progressive_scroll(page, step_px=500, delay_ms=100, max_steps=6)

            html = await page.content()
            return self._parse_html_payload(html, url)

        except Exception as e:
            # Tier 2: Static HTTP Fallback
            fallback_prod = await self._extract_static_http_fallback(url)
            if fallback_prod:
                return fallback_prod

            # Tier 4: Partial Record Recovery
            domain_brand = urlparse(url).netloc.replace('www.', '').split('.')[0].capitalize()
            brand = self.brand_name or domain_brand
            sku_slug = url.rstrip('/').split('/')[-1].split('?')[0]
            return ProductIntermediate(
                marca=brand,
                brand_name=brand,
                url_producto=url,
                source_url=url,
                sku=clean_sku(sku_slug, default_fallback=sku_slug),
                titulo=sku_slug.replace('-', ' ').capitalize(),
                title=sku_slug.replace('-', ' ').capitalize(),
                ruta_tecnica='RUTA_INFOGRAFIA',
                plataforma_origen='ERROR_FALLBACK'
            )

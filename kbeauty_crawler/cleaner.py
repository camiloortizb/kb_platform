import re
from urllib.parse import urljoin, urlparse, parse_qs, urlencode, urlunparse
from typing import List, Tuple, Optional, Any
from bs4 import BeautifulSoup

# Promotional regex patterns (EN, ES, KR)
PROMO_PATTERNS = [
    r'\[\s*\d+\s*\+\s*\d+\s*\]',                 # [1+1], [2+1]
    r'\(\s*\d+\s*\+\s*\d+\s*\)',                 # (1+1)
    r'\[\s*1\+1기획\s*\]',
    r'\[\s*(?:기획|증정|할인|특가|세일|단독|신상|BEST|NEW|EVENT)\s*\]',
    r'\[\s*(?:Sale|Special Set|Event|Free Gift|New|Best|Renewed|Promo|Set)\s*[^\]]*\]',
    r'\(\s*(?:Special Set|Gift Set|Promo Set|Free Gift)\s*\)',
    r'(?i) (?:sale\s*\d+%|free\s*gift|buy\s*1\s*get\s*1\s*free) ',
    r'^\s*\[[^\]]*\]\s*',                            # Leading bracket tags like [Brand Promotion]
]

# Shopify image size patterns
SHOPIFY_SIZE_PATTERN = re.compile(r'_(?:pico|icon|thumb|small|compact|medium|large|grande|1024x1024|2048x2048|master)(?=\.[a-zA-Z0-9]+(?:\?|$))')

# INCI / Ingredient Keywords (English, Latin & Korean)
INCI_KEYWORDS = [
    'ingredients', 'inci', 'water', 'aqua', 'glycerin', 'niacinamide',
    'butylene glycol', 'centella asiatica', 'panthenol', 'hyaluronic',
    'adenosine', 'allantoin', 'tocopherol', 'salicylic', 'ceramide',
    'dipropylene glycol', '1,2-hexanediol', 'sodium hyaluronate',
    '성분', '전성분', '화장품전성분', '정제수', '글리세린', '부틸렌글라이콜', '나이아신아마이드',
    '병풀추출물', '판테놀', '소듐하이알루로네이트', '아데노신', '알란토인', '토코페롤',
    '세라마이드엔피', '디프로필렌글라이콜', '1,2-헥산다이올'
]

def clean_title(title: str) -> str:
    if not title:
        return ''
    cleaned = title
    for pat in PROMO_PATTERNS:
        cleaned = re.sub(pat, '', cleaned, flags=re.IGNORECASE)
    # Remove excessive punctuation/spaces
    cleaned = re.sub(r'\s+', ' ', cleaned).strip(' -_|:,')
    # If trailing unmatched bracket/parenthesis remains, trim it
    if cleaned.endswith((']', ')')) and not (('[' in cleaned and cleaned.endswith(']')) or ('(' in cleaned and cleaned.endswith(')'))):
        cleaned = cleaned[:-1].strip(' -_|:,')
    if cleaned.startswith(('[', '(')) and not ((cleaned.startswith('[') and ']' in cleaned) or (cleaned.startswith('(') and ')' in cleaned)):
        cleaned = cleaned[1:].strip(' -_|:,')
    return cleaned if cleaned else title.strip()

def validate_ean_checksum(digits: str) -> bool:
    """Validate GS1 modulo-10 checksum for EAN-13, EAN-8, or UPC-A."""
    if not digits.isdigit():
        return False
    if len(digits) not in (8, 12, 13, 14):
        return False
    
    check_digit = int(digits[-1])
    payload = digits[:-1]
    
    total = 0
    for i, char in enumerate(reversed(payload)):
        weight = 3 if (i % 2 == 0) else 1
        total += int(char) * weight
        
    expected_check = (10 - (total % 10)) % 10
    return expected_check == check_digit

def clean_ean(raw_ean: Any, validate_checksum: bool = False) -> Optional[str]:
    """
    Sanitize and validate an EAN/UPC barcode:
    - Rejects non-digit characters upfront (if negative sign '-' or letters A-Z are present, returns None)
    - Handles float scientific notation (e.g., '8.80964E+12' or '8809640732688.0')
    - Filters dummy sequences ('0000000000000', '1234567890123', all identical digits)
    - Validates length (8, 12, 13, 14 digits)
    - Optionally validates GS1 modulo-10 checksum via validate_ean_checksum
    - Returns clean numeric string or None if invalid
    """
    if raw_ean is None:
        return None
    
    s = str(raw_ean).strip()
    if not s or s.lower() in ('none', 'null', 'nan', 'default', 'n/a', 'undefined', ''):
        return None
        
    # Reject negative numbers and leading/trailing dashes
    if s.startswith('-') or s.endswith('-'):
        return None
        
    # Handle scientific notation like 8.80964E+12
    if 'e' in s.lower():
        if '-' in s or not re.match(r'^\s*\+?\d+(?:\.\d+)?[eE]\+?\d+\s*$', s):
            return None
        try:
            float_val = float(s)
            if float_val <= 0:
                return None
            s = f"{float_val:.0f}"
        except Exception:
            return None
    elif '.' in s:
        # Handle trailing .0 float representations (e.g. 8809640732688.0)
        if '-' in s or not re.match(r'^\s*\+?\d+\.0+\s*$', s):
            return None
        try:
            float_val = float(s)
            if float_val <= 0:
                return None
            s = str(int(float_val))
        except Exception:
            return None
            
    # Reject letters or any non-digit / non-hyphen / non-space characters
    if re.search(r'[a-zA-Z]', s):
        return None
    if not re.match(r'^[0-9\s\-]+$', s):
        return None
        
    # Extract only digits
    digits = re.sub(r'[\s\-]', '', s)
    if not digits or not digits.isdigit() or len(digits) not in (8, 12, 13, 14):
        return None
        
    # Check dummy / placeholder sequences
    if len(set(digits)) == 1:  # e.g., '0000000000000', '9999999999999'
        return None
    if digits in ('1234567890123', '123456789012', '12345678'):
        return None
        
    # Validate GS1 modulo-10 checksum if enabled
    if validate_checksum and not validate_ean_checksum(digits):
        return None
        
    return digits

def clean_sku(raw_sku: Any, default_fallback: str = '') -> str:
    """
    Sanitize product SKU:
    - Strips label prefixes ('SKU:', 'Code:', 'Item #:', 'REF:')
    - Removes trailing .0 float artifacts
    - Trims whitespace
    """
    if raw_sku is None:
        return default_fallback.strip()
        
    s = str(raw_sku).strip()
    if not s or s.lower() in ('none', 'null', 'nan', ''):
        return default_fallback.strip()
        
    # Strip label prefixes with colon/hash
    s = re.sub(r'(?i)^(?:sku|code|item\s*#|ref|p_code)\s*[:#]\s*', '', s).strip()
    
    # Clean trailing .0 if present
    if s.endswith('.0') and s[:-2].isdigit():
        s = s[:-2]
        
    return s if s else default_fallback.strip()

def normalize_image_url(url: str, base_url: str = '') -> str:
    if not url:
        return ''
    url = url.strip()
    if url.startswith('//'):
        url = 'https:' + url
    elif not url.startswith(('http://', 'https://')):
        url = urljoin(base_url, url)
    
    # Clean Shopify size suffixes (e.g. image_1024x1024.jpg -> image.jpg)
    url = SHOPIFY_SIZE_PATTERN.sub('', url)
    
    # Strip resizing query parameters like width=300, v=...
    parsed = urlparse(url)
    if parsed.query:
        qs = parse_qs(parsed.query)
        # Remove dimension/compression params
        filtered_qs = {k: v for k, v in qs.items() if k.lower() not in ['width', 'height', 'crop', 'size', 'format', 'scale']}
        clean_query = urlencode(filtered_qs, doseq=True) if filtered_qs else ''
        url = urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, clean_query, parsed.fragment))
    return url

def classify_technical_route(raw_html: str, base_url: str = '') -> Tuple[str, str, List[str]]:
    if not raw_html:
        return 'RUTA_TEXTO', '', []
    
    soup = BeautifulSoup(raw_html, 'html.parser')
    text_content = soup.get_text(separator=' ', strip=True).lower()
    
    # Extract embedded images (potential infographics)
    img_urls = []
    for img in soup.find_all('img'):
        src = img.get('data-original') or img.get('data-src') or img.get('data-zoom-src') or img.get('src')
        if src:
            clean_url = normalize_image_url(src, base_url)
            if clean_url and clean_url not in img_urls:
                # Filter small icons
                if not any(token in clean_url.lower() for token in ['icon', 'logo', 'badge', 'btn', 'arrow', 'cart']):
                    img_urls.append(clean_url)
    
    # Count INCI keywords in text
    inci_matches = sum(1 for kw in INCI_KEYWORDS if kw in text_content)
    text_length = len(text_content)
    
    # Decision logic:
    # If substantial text and INCI keywords found -> RUTA_TEXTO
    # If minimal text (< 250 chars or 0 INCI) and multiple images present -> RUTA_INFOGRAFIA
    if inci_matches >= 2 or (text_length > 250 and inci_matches >= 1):
        return 'RUTA_TEXTO', raw_html, img_urls
    elif len(img_urls) > 0 and (text_length < 300 or inci_matches == 0):
        return 'RUTA_INFOGRAFIA', raw_html, img_urls
    else:
        return 'RUTA_TEXTO', raw_html, img_urls

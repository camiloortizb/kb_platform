from typing import List, Literal, Optional, Dict, Any
from pydantic import BaseModel, Field, model_validator

class ProductIntermediate(BaseModel):
    # Brand Identification
    marca: str = Field(default='', description='Official brand name (Spanish)')
    brand_name: str = Field(default='', description='Official brand name (English)')
    url_producto: str = Field(default='', description='Product source URL (Spanish)')
    source_url: str = Field(default='', description='Product source URL (English)')
    
    # Identifiers
    sku: str = Field(default='', description='Official SKU or commercial ID')
    ean: Optional[str] = Field(default=None, description='Validated EAN-13 or UPC barcode')
    
    # Title & Format
    titulo: str = Field(default='', description='Clean standardized title (Spanish)')
    title: str = Field(default='', description='Clean standardized title (English)')
    nombre_completo: Optional[str] = Field(default=None, description='Full raw manufacturer title')
    formato: Optional[str] = Field(default=None, description='Product format / capacity (Spanish)')
    format_raw: Optional[str] = Field(default=None, description='Product format / capacity (English)')
    
    # Technical Route Classification
    ruta_tecnica: Literal['RUTA_TEXTO', 'RUTA_INFOGRAFIA'] = Field(default='RUTA_TEXTO', description='Classification route')
    
    # Rich Technical Specifications
    descripcion_completa: str = Field(default='', description='Detailed description (Spanish)')
    description_full: Optional[str] = Field(default='', description='Detailed description (English)')
    beneficios: List[str] = Field(default_factory=list, description='Key benefits list (Spanish)')
    benefits: Optional[str] = Field(default='', description='Key benefits text (English)')
    modo_de_uso: str = Field(default='', description='Usage instructions (Spanish)')
    usage_instructions: Optional[str] = Field(default='', description='Usage instructions (English)')
    tipo_de_piel: str = Field(default='', description='Skin types / concerns (Spanish)')
    skin_types: Optional[str] = Field(default='', description='Skin types / concerns (English)')
    ingredientes_clave: List[str] = Field(default_factory=list, description='Key active ingredients list')
    inci_completo: str = Field(default='', description='Full INCI ingredient list (Spanish)')
    key_ingredients_raw: Optional[str] = Field(default='', description='Full INCI / Key raw ingredients (English)')
    
    # Media & Raw HTML
    raw_html_tecnico: Optional[str] = Field(default='', description='Captured technical HTML')
    urls_infografias: List[str] = Field(default_factory=list, description='Infographic image URLs (Spanish)')
    infographic_images: List[str] = Field(default_factory=list, description='Infographic image URLs (English)')
    imagenes_galeria: List[str] = Field(default_factory=list, description='High-resolution gallery URLs (Spanish)')
    gallery_images: List[str] = Field(default_factory=list, description='High-resolution gallery URLs (English)')
    
    # E-commerce & Platform Metadata
    precio_raw: Optional[str] = None
    moneda: Optional[str] = None
    variantes: Optional[List[Dict[str, Any]]] = None
    plataforma_origen: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def sync_bilingual_fields(cls, values: Any) -> Any:
        if isinstance(values, dict):
            # 1. Brand sync
            brand = values.get('brand_name') or values.get('marca') or ''
            values['brand_name'] = str(brand).strip()
            values['marca'] = str(brand).strip()
            
            # 2. Source URL sync
            url = values.get('source_url') or values.get('url_producto') or ''
            values['source_url'] = str(url).strip()
            values['url_producto'] = str(url).strip()
            
            # 3. Title sync
            title = values.get('title') or values.get('titulo') or ''
            values['title'] = str(title).strip()
            values['titulo'] = str(title).strip()
            
            # 4. Format sync
            fmt = values.get('format_raw') or values.get('formato')
            if fmt is not None:
                fmt = str(fmt).strip()
            values['format_raw'] = fmt
            values['formato'] = fmt
            
            # 5. Description sync
            desc = values.get('description_full') or values.get('descripcion_completa') or ''
            values['description_full'] = str(desc).strip()
            values['descripcion_completa'] = str(desc).strip()
            
            # 6. INCI Ingredients sync
            inci = values.get('key_ingredients_raw') or values.get('inci_completo') or ''
            values['key_ingredients_raw'] = str(inci).strip()
            values['inci_completo'] = str(inci).strip()
            
            # 7. Usage Instructions sync
            usage = values.get('usage_instructions') or values.get('modo_de_uso') or ''
            values['usage_instructions'] = str(usage).strip()
            values['modo_de_uso'] = str(usage).strip()
            
            # 8. Skin Types sync
            st = values.get('skin_types') or values.get('tipo_de_piel') or ''
            values['skin_types'] = str(st).strip()
            values['tipo_de_piel'] = str(st).strip()
            
            # 9. Benefits sync (list <-> string)
            ben_list = values.get('beneficios')
            ben_str = values.get('benefits')
            if isinstance(ben_list, list) and not ben_str:
                values['benefits'] = '\n'.join([str(b).strip() for b in ben_list if str(b).strip()])
            elif isinstance(ben_str, str) and not ben_list:
                values['beneficios'] = [b.strip() for b in ben_str.split('\n') if b.strip()]
            elif isinstance(ben_list, list) and isinstance(ben_str, str):
                pass
            else:
                values['beneficios'] = []
                values['benefits'] = ''
                
            # 10. Gallery images sync
            gal = values.get('gallery_images') or values.get('imagenes_galeria') or []
            if isinstance(gal, list):
                clean_gal = [str(u).strip() for u in gal if str(u).strip()]
                values['gallery_images'] = clean_gal
                values['imagenes_galeria'] = clean_gal
                
            # 11. Infographic images sync
            info = values.get('infographic_images') or values.get('urls_infografias') or []
            if isinstance(info, list):
                clean_info = [str(u).strip() for u in info if str(u).strip()]
                values['infographic_images'] = clean_info
                values['urls_infografias'] = clean_info
                
        return values

class CrawlResult(BaseModel):
    dominio: str
    marca: str
    plataforma: str
    total_productos: int
    tiempo_segundos: float
    productos: List[ProductIntermediate]
    errores: List[Dict[str, str]] = Field(default_factory=list)

class ImageSlice(BaseModel):
    slice_index: int = Field(..., description="0-indexed sequence number of the slice")
    total_slices: int = Field(..., description="Total number of slices generated from original banner")
    bbox: tuple[int, int, int, int] = Field(..., description="(left, top, right, bottom) pixel coordinates in normalized image")
    width: int
    height: int
    overlap_top_px: int = 0
    overlap_bottom_px: int = 0
    image_bytes: bytes = Field(repr=False, description="Compressed JPEG byte payload")
    mime_type: str = "image/jpeg"
    source_url: str = ""
    sha256: str = ""

class NormalizedIngredient(BaseModel):
    korean_raw: str
    inci_name: str
    is_canonical: bool = True
    concentration_raw: Optional[str] = None
    concentration_pct: Optional[float] = None
    concentration_ppm: Optional[float] = None
    category: Optional[str] = None

class INCITranslationResult(BaseModel):
    full_inci_list_latin: List[str] = Field(default_factory=list)
    full_inci_text_latin: str = ""
    total_ingredients_count: int = 0
    actives: List[NormalizedIngredient] = Field(default_factory=list)
    unmatched_tokens: List[str] = Field(default_factory=list)
    confidence_score: float = 1.0

class CosmeticVisionExtraction(BaseModel):
    key_ingredients_korean: Optional[str] = Field(
        default=None,
        description="Exact raw Hangul transcription of the '전성분' (full ingredients) section from the image."
    )
    inci_completo: str = Field(
        default="",
        description="Complete ingredient list translated and standardized into international Latin/English INCI nomenclature."
    )
    ingredientes_clave: List[str] = Field(
        default_factory=list,
        description="Key active ingredients identified with their explicit percentages or concentrations."
    )
    modo_de_uso: str = Field(
        default="",
        description="Step-by-step application instructions translated into professional, clear, neutral Spanish."
    )
    tipo_de_piel: str = Field(
        default="",
        description="Target skin types and dermatological concerns in Spanish."
    )
    beneficios: List[str] = Field(
        default_factory=list,
        description="List of 3 to 5 key functional benefits and product claims in Spanish."
    )
    formato: Optional[str] = Field(
        default=None,
        description="Detected net weight, volume, or package capacity."
    )
    advertencias: Optional[str] = Field(
        default=None,
        description="Usage warnings or precautions in Spanish."
    )
    ocr_confidence: float = Field(
        default=0.95,
        description="Self-evaluated extraction completeness score between 0.0 and 1.0."
    )

class EnrichedProduct(BaseModel):
    brand_name: str
    source_url: str
    title: str
    sku: Optional[str] = None
    ean: Optional[str] = None
    format: Optional[str] = None
    description_full: str = ""
    key_ingredients_inci: str = ""         # Standardized Latin INCI list
    key_ingredients_korean: Optional[str] = None
    usage_instructions: str = ""
    skin_types: str = ""
    benefits: str = ""
    gallery_images: List[str] = Field(default_factory=list)
    infographic_images: List[str] = Field(default_factory=list)
    ruta_tecnica: str = "RUTA_TEXTO"
    ocr_confidence: Optional[float] = None
    structured_actives: Optional[List[Dict[str, Any]]] = None
from datetime import datetime, timezone

# ==============================================================================
# 3. MASTER RECONCILIATION & QUALITY AUDIT MODELS (M3)
# ==============================================================================
class MasterProduct(BaseModel):
    sku: str = Field(..., description="Unique commercial SKU (Master key)")
    ean: Optional[str] = Field(default=None, description="Cleaned EAN-13 barcode")
    name: str = Field(..., description="Official product title / name")
    brand_name: str = Field(default="", description="Normalized brand name")
    brand_id: Optional[int] = Field(default=None, description="Supabase brand ID if known")
    priority: str = Field(default="BAJA", description="Catalog priority: URGENTE, ALTA, MEDIA, BAJA")
    format: Optional[str] = Field(default=None, description="Standardized volume/weight capacity (e.g. 50 ml, 30 g)")
    description_full: str = Field(default="", description="Complete product description")
    description_short: Optional[str] = Field(default="", description="Short summary description")
    gallery_images: List[str] = Field(default_factory=list, description="Product image URLs")
    labels: List[str] = Field(default_factory=list, description="Documentation / label URLs")
    key_ingredients: Optional[str] = Field(default=None, description="Raw or parsed ingredient list")
    usage_instructions: Optional[str] = Field(default=None, description="Usage instructions")
    skin_types: Optional[str] = Field(default=None, description="Target skin types")
    benefits: Optional[str] = Field(default=None, description="Key benefits")
    verification_status: str = Field(default="VERIFICADO_MATRIZ", description="Verification state")
    raw_row: Dict[str, Any] = Field(default_factory=dict, description="Raw CSV row data")


class QualityAuditIssue(BaseModel):
    sku: Optional[str] = None
    ean: Optional[str] = None
    rule: str
    field: Optional[str] = None
    message: str
    severity: Literal['ERROR', 'WARNING', 'INFO'] = 'ERROR'
    offending_value: Optional[str] = None


class QualityAuditResult(BaseModel):
    timestamp: str
    source_file: Optional[str] = None
    total_products_audited: int = 0
    passed_count: int = 0
    failed_count: int = 0
    pass_rate_pct: float = 0.0
    hallucination_free_pct: float = 100.0
    status: Literal['AUDIT_PASSED', 'AUDIT_WARNING', 'AUDIT_FAILED'] = 'AUDIT_PASSED'
    issues: List[QualityAuditIssue] = Field(default_factory=list)
    metrics: Dict[str, Any] = Field(default_factory=dict)


class ReconciledRecord(BaseModel):
    product_id: Optional[int] = Field(default=None, description="Internal Supabase product ID if assigned")
    sku: str = Field(..., description="Commercial SKU (master key)")
    ean: Optional[str] = Field(default=None, description="Validated EAN-13 barcode")
    brand_id: Optional[int] = Field(default=None, description="Supabase brand ID")
    brand_name: str = Field(default="", description="Standardized brand name")
    name: str = Field(..., description="Official product title")
    format: Optional[str] = Field(default=None, description="Standardized format/capacity (e.g. 50 ml, 250 g)")
    description_full: str = Field(default="", description="Comprehensive technical and marketing description")
    description_short: Optional[str] = Field(default="", description="Short summary description")
    key_ingredients: str = Field(default="", description="Standardized Latin INCI ingredient list")
    key_ingredients_korean: Optional[str] = Field(default=None, description="Original Hangul 전성분 text if available")
    usage_instructions: Optional[str] = Field(default=None, description="Step-by-step usage instructions")
    skin_types: Optional[str] = Field(default=None, description="Recommended skin types and conditions")
    benefits: Optional[str] = Field(default=None, description="Product benefits and key cosmetic claims")
    url_origen: Optional[str] = Field(default=None, description="Official crawled source URL (Spanish alias)")
    source_url: Optional[str] = Field(default=None, description="Official crawled source URL (English alias)")
    ruta_tecnica: str = Field(default="RUTA_TEXTO", description="Technical extraction route: RUTA_TEXTO or RUTA_INFOGRAFIA")
    raw_html_tecnico: Optional[str] = Field(default=None, description="Captured technical HTML / OCR text")
    verification_status: str = Field(default="VERIFICADO_OFICIAL_DOM", description="Verification status tag")
    match_strategy: str = Field(default="EAN_EXACT", description="Reconciliation strategy: EAN_EXACT, SKU_EXACT, TITLE_SIMILARITY, MASTER_ONLY, UNMATCHED")
    match_confidence: float = Field(default=1.0, description="Match confidence score between 0.0 and 1.0")
    gallery_images: List[str] = Field(default_factory=list, description="High-resolution gallery image URLs")
    infographic_images: List[str] = Field(default_factory=list, description="Infographic image URLs")
    labels: List[str] = Field(default_factory=list, description="Relational label / certificate image URLs")
    priority: Optional[str] = Field(default="BAJA", description="Catalog priority level")

    @model_validator(mode='before')
    @classmethod
    def sync_reconciled_fields(cls, values: Any) -> Any:
        if isinstance(values, dict):
            # Sync source url
            url = values.get('source_url') or values.get('url_origen')
            if url:
                values['source_url'] = str(url).strip()
                values['url_origen'] = str(url).strip()
            
            # Sync title / name
            name = values.get('name') or values.get('title') or values.get('titulo') or values.get('Producto') or ''
            if name:
                values['name'] = str(name).strip()
                
            # Sync brand
            brand = values.get('brand_name') or values.get('marca') or values.get('MARCA') or ''
            if brand:
                values['brand_name'] = str(brand).strip()
                
            # Sync format
            fmt = values.get('format') or values.get('formato') or values.get('format_raw') or values.get('Formato')
            if fmt is not None:
                values['format'] = str(fmt).strip()
                
            # Sync description
            desc = values.get('description_full') or values.get('descripcion_completa') or values.get('DESCRIPCION') or ''
            if desc:
                values['description_full'] = str(desc).strip()
                
            # Sync ingredients
            ingr = values.get('key_ingredients') or values.get('key_ingredients_inci') or values.get('inci_completo') or values.get('key_ingredients_raw') or ''
            if isinstance(ingr, list):
                ingr = ', '.join([str(i).strip() for i in ingr if str(i).strip()])
            values['key_ingredients'] = str(ingr).strip()
            
            # Sync usage
            usage = values.get('usage_instructions') or values.get('modo_de_uso')
            if usage:
                values['usage_instructions'] = str(usage).strip()
                
            # Sync skin types
            st = values.get('skin_types') or values.get('tipo_de_piel')
            if st:
                values['skin_types'] = str(st).strip()
                
            # Sync benefits
            ben = values.get('benefits') or values.get('beneficios')
            if isinstance(ben, list):
                values['benefits'] = '\n'.join([str(b).strip() for b in ben if str(b).strip()])
            elif ben:
                values['benefits'] = str(ben).strip()
                
            # Sync gallery images
            gal = values.get('gallery_images') or values.get('imagenes_galeria') or []
            if isinstance(gal, list):
                values['gallery_images'] = [str(u).strip() for u in gal if str(u).strip()]
                
            # Sync infographic images
            info = values.get('infographic_images') or values.get('urls_infografias') or []
            if isinstance(info, list):
                values['infographic_images'] = [str(u).strip() for u in info if str(u).strip()]
                
        return values


# ==============================================================================
# 4. SUPABASE RELATIONAL & SINK MODELS (M4)
# ==============================================================================
class BrandRecord(BaseModel):
    id: Optional[int] = None
    name: str = Field(..., description="Brand name unique uppercase")
    country: str = Field(default="Corea del Sur", description="Country of origin")
    official_website: Optional[str] = Field(default=None, description="Official domain / website URL")
    type: str = Field(default="B2B", description="B2B or B2C catalog type")
    priority: str = Field(default="Media", description="Brand priority (Urgente, Alta, Media, Baja)")
    is_active: bool = Field(default=True, description="Brand active status")


class BrandSourceRecord(BaseModel):
    id: Optional[int] = None
    brand_id: Optional[int] = Field(default=None, description="Foreign key to brands.id")
    brand_name: str = Field(..., description="Brand name")
    url: str = Field(..., description="Source URL")
    source_type: str = Field(default="Oficial", description="Store platform type: Shopify, Cafe24, Imweb, WooCommerce, Custom, Oficial")
    crawl_status: str = Field(default="pending", description="Crawl state: pending, crawling, success, error, blocked")
    last_crawled_at: Optional[str] = Field(default=None, description="ISO timestamp of last crawl")
    total_products_found: int = Field(default=0, description="Total products found on source")


class ProductDimensionsRecord(BaseModel):
    id: Optional[int] = None
    product_id: int = Field(..., description="Foreign key to products.id")
    sku: str = Field(..., description="Product SKU")
    ean: Optional[str] = Field(default=None, description="Product EAN barcode")
    height_cm: Optional[float] = None
    width_cm: Optional[float] = None
    depth_cm: Optional[float] = None
    weight_raw: Optional[str] = None


class ProductImageRecord(BaseModel):
    id: Optional[int] = None
    product_id: int = Field(..., description="Foreign key to products.id")
    sku: str = Field(..., description="Product SKU")
    ean: Optional[str] = Field(default=None, description="Product EAN barcode")
    image_url: str = Field(..., description="High-resolution image URL")
    display_order: int = Field(default=1, description="1-indexed display order")
    is_primary: bool = Field(default=False, description="Primary catalog hero image flag")


class ProductLabelRecord(BaseModel):
    id: Optional[int] = None
    product_id: int = Field(..., description="Foreign key to products.id")
    sku: str = Field(..., description="Product SKU")
    ean: Optional[str] = Field(default=None, description="Product EAN barcode")
    label_url: str = Field(..., description="Infographic or regulatory label URL")
    label_type: str = Field(default="Infografia", description="Label type: Infografia, Rotulo, Certificado, MFDS_Doc")


class OrphanReport(BaseModel):
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    total_products: int = 0
    total_dimensions: int = 0
    orphan_dimensions: int = 0
    orphan_dimensions_pct: float = 0.0
    total_images: int = 0
    orphan_images: int = 0
    orphan_images_pct: float = 0.0
    total_labels: int = 0
    orphan_labels: int = 0
    orphan_labels_pct: float = 0.0
    total_brand_sources: int = 0
    orphan_brand_sources: int = 0
    orphan_brand_sources_pct: float = 0.0
    empty_ingredients_count: int = 0
    empty_ingredients_pct: float = 0.0
    is_fully_consistent: bool = True


class SyncResult(BaseModel):
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    brands_synced: int = 0
    sources_synced: int = 0
    products_synced: int = 0
    dimensions_synced: int = 0
    images_synced: int = 0
    labels_synced: int = 0
    total_errors: int = 0
    errors: List[Dict[str, Any]] = Field(default_factory=list)
    orphan_report: Optional[OrphanReport] = None
    status: Literal['SUCCESS', 'PARTIAL_SUCCESS', 'FAILED'] = 'SUCCESS'



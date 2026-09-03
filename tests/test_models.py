"""
Unit tests for ProductIntermediate and CrawlResult data models.
Verifies bilingual synchronization, interface contract compatibility, and JSON serialization.
"""
import pytest
from kbeauty_crawler.models import ProductIntermediate, CrawlResult

def test_product_intermediate_bilingual_sync_spanish_input():
    prod = ProductIntermediate(
        marca="Anua",
        url_producto="https://anua.kr/products/toner",
        sku="ANUA-01",
        titulo="Heartleaf 77 Toner",
        formato="250ml",
        descripcion_completa="Soothing toner",
        inci_completo="Houttuynia Cordata Extract, Water, Glycerin",
        modo_de_uso="Apply with cotton pad",
        tipo_de_piel="Sensitive, All skin types",
        beneficios=["Soothing", "Hydrating"],
        imagenes_galeria=["https://cdn.example.com/toner.jpg"],
        urls_infografias=["https://cdn.example.com/info.jpg"],
        ruta_tecnica="RUTA_TEXTO"
    )

    # Verify English aliases are automatically populated and synced
    assert prod.brand_name == "Anua"
    assert prod.source_url == "https://anua.kr/products/toner"
    assert prod.title == "Heartleaf 77 Toner"
    assert prod.format_raw == "250ml"
    assert prod.description_full == "Soothing toner"
    assert prod.key_ingredients_raw == "Houttuynia Cordata Extract, Water, Glycerin"
    assert prod.usage_instructions == "Apply with cotton pad"
    assert prod.skin_types == "Sensitive, All skin types"
    assert "Soothing" in prod.benefits
    assert prod.gallery_images == ["https://cdn.example.com/toner.jpg"]
    assert prod.infographic_images == ["https://cdn.example.com/info.jpg"]

def test_product_intermediate_bilingual_sync_english_input():
    prod = ProductIntermediate(
        brand_name="Beauty of Joseon",
        source_url="https://beautyofjoseon.com/products/glow-serum",
        sku="BOJ-GLOW-30",
        title="Glow Serum : Propolis + Niacinamide",
        format_raw="30ml",
        description_full="Nourishing serum for glowing skin",
        key_ingredients_raw="Propolis Extract (60%), Niacinamide (2%)",
        usage_instructions="Apply 2-3 drops after toning",
        skin_types="Acne-prone, Dry skin",
        benefits="Brightening\nHydrating",
        gallery_images=["https://cdn.shopify.com/serum.jpg"],
        infographic_images=["https://cdn.shopify.com/banner.jpg"],
        ruta_tecnica="RUTA_TEXTO"
    )

    # Verify Spanish aliases are automatically populated and synced
    assert prod.marca == "Beauty of Joseon"
    assert prod.url_producto == "https://beautyofjoseon.com/products/glow-serum"
    assert prod.titulo == "Glow Serum : Propolis + Niacinamide"
    assert prod.formato == "30ml"
    assert prod.descripcion_completa == "Nourishing serum for glowing skin"
    assert prod.inci_completo == "Propolis Extract (60%), Niacinamide (2%)"
    assert prod.modo_de_uso == "Apply 2-3 drops after toning"
    assert prod.tipo_de_piel == "Acne-prone, Dry skin"
    assert "Brightening" in prod.beneficios
    assert prod.imagenes_galeria == ["https://cdn.shopify.com/serum.jpg"]
    assert prod.urls_infografias == ["https://cdn.shopify.com/banner.jpg"]

def test_crawl_result_serialization():
    prod = ProductIntermediate(
        brand_name="Abib",
        source_url="https://abib.com/prod/1",
        sku="ABIB-01",
        title="Heartleaf Pad",
        ruta_tecnica="RUTA_TEXTO"
    )
    result = CrawlResult(
        dominio="https://abib.com",
        marca="Abib",
        plataforma="shopify",
        total_productos=1,
        tiempo_segundos=1.45,
        productos=[prod]
    )

    data = result.model_dump()
    assert data["dominio"] == "https://abib.com"
    assert data["total_productos"] == 1
    assert data["productos"][0]["sku"] == "ABIB-01"

import asyncio
import argparse
import json
import os
from .crawler import KBeautyCrawler
from .supabase_sink import SupabaseSink
from .models import ProductIntermediate

def main():
    parser = argparse.ArgumentParser(description="KBeauty-Crawler-Agent (Agente 1: Crawler & DOM Extractor)")
    subparsers = parser.add_subparsers(dest="command", help="Comando a ejecutar")

    # Command: crawl
    crawl_parser = subparsers.add_parser("crawl", help="Rastrear catálogo completo de una marca o tienda")
    crawl_parser.add_argument("--url", required=True, help="URL base o dominio de la tienda")
    crawl_parser.add_argument("--brand", default=None, help="Nombre oficial de la marca")
    crawl_parser.add_argument("--max-pages", type=int, default=50, help="Límite máximo de páginas")
    crawl_parser.add_argument("--output", default=None, help="Archivo JSON de salida")
    crawl_parser.add_argument("--supabase", action="store_true", help="Guardar directamente en base de datos Supabase")

    # Command: crawl-product
    prod_parser = subparsers.add_parser("crawl-product", help="Rastrear una URL específica de producto")
    prod_parser.add_argument("--url", required=True, help="URL completa del producto")
    prod_parser.add_argument("--brand", default=None, help="Nombre oficial de la marca")
    prod_parser.add_argument("--output", default=None, help="Archivo JSON de salida")
    prod_parser.add_argument("--supabase", action="store_true", help="Guardar directamente en Supabase")

    # Command: crawl-fuentes
    fuentes_parser = subparsers.add_parser("crawl-fuentes", help="Rastrear automáticamente las tiendas de _FUENTES registradas en Supabase")
    fuentes_parser.add_argument("--brand", default=None, help="Filtrar por nombre de marca (opcional)")
    fuentes_parser.add_argument("--limit", type=int, default=None, help="Límite de marcas a rastrear")
    fuentes_parser.add_argument("--supabase", action="store_true", default=True, help="Guardar directamente en Supabase")

    # Command: sync-file
    sync_parser = subparsers.add_parser("sync-supabase", help="Sincronizar archivo JSON existente con Supabase")
    sync_parser.add_argument("--file", required=True, help="Archivo JSON con lista de productos")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    if args.command == "crawl":
        crawler = KBeautyCrawler(brand=args.brand, sync_supabase=args.supabase)
        result = asyncio.run(crawler.crawl_store(args.url, max_pages=args.max_pages))
        
        output_data = [p.model_dump() for p in result.productos]
        if args.output:
            with open(args.output, "w", encoding="utf-8") as f:
                json.dump(output_data, f, ensure_ascii=False, indent=2)
            print(f"[✓] Resultados guardados en {args.output}")
        else:
            print(json.dumps(output_data[:3], ensure_ascii=False, indent=2))
            if len(output_data) > 3:
                print(f"... y {len(output_data) - 3} productos más.")

    elif args.command == "crawl-product":
        crawler = KBeautyCrawler(brand=args.brand, sync_supabase=args.supabase)
        prod = asyncio.run(crawler.crawl_single_product(args.url))
        if prod:
            data = prod.model_dump()
            if args.output:
                with open(args.output, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                print(f"[✓] Guardado en {args.output}")
            else:
                print(json.dumps(data, ensure_ascii=False, indent=2))

    elif args.command == "crawl-fuentes":
        sink = SupabaseSink()
        sources = sink.get_brand_sources(brand=args.brand)
        if args.limit:
            sources = sources[:args.limit]
        print(f"[*] Iniciando rastreo de {len(sources)} fuentes oficiales de _FUENTES...")
        
        total_extracted = 0
        total_matched = 0
        for src in sources:
            b_name = src['brand_name']
            url = src['url']
            print(f"\n---> Procesando marca: {b_name} | URL: {url}")
            crawler = KBeautyCrawler(brand=b_name, sync_supabase=args.supabase)
            try:
                res = asyncio.run(crawler.crawl_store(url, max_pages=10))
                total_extracted += res.total_productos
                # Mark as crawled in brand_sources
                sink.client.patch(
                    f"{sink.url}/rest/v1/brand_sources?id=eq.{src['id']}",
                    headers=sink.headers,
                    json={'crawl_status': 'crawled', 'last_crawled_at': 'now()'}
                )
            except Exception as e:
                print(f"[!] Error rastreando {b_name}: {e}")

        print(f"\n[✓] Rastreo masivo finalizado: {total_extracted} productos procesados.")

    elif args.command == "sync-supabase":
        with open(args.file, "r", encoding="utf-8") as f:
            raw_data = json.load(f)
        if isinstance(raw_data, dict) and "productos" in raw_data:
            raw_data = raw_data["productos"]
        products = [ProductIntermediate(**item) for item in raw_data]
        sink = SupabaseSink()
        res = sink.batch_upsert(products)
        print(f"[✓] Sincronización finalizada: {res['success']}/{res['total']} subidos exitosamente.")

if __name__ == "__main__":
    main()

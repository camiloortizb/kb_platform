import React, { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import {
  Package,
  Search,
  Filter,
  Grid,
  List as ListIcon,
  Download,
  CheckCircle2,
  Eye,
  ShieldCheck,
  Tag,
  Layers,
  Sparkles,
  X,
  FileSpreadsheet,
  ShoppingCart,
  DollarSign
} from 'lucide-react'

export default function ProductsView({
  products = [],
  brands = [],
  imagesByProduct = {},
  dimensionsByProduct = {},
  onSelectProduct
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('ALL')
  const [selectedStage, setSelectedStage] = useState('ALL')
  const [selectedFormat, setSelectedFormat] = useState('ALL')
  const [selectedSkinType, setSelectedSkinType] = useState('ALL')
  const [viewMode, setViewMode] = useState('grid')

  const brandMap = useMemo(() => {
    return brands.reduce((acc, b) => {
      acc[b.id] = b.name
      return acc
    }, {})
  }, [brands])

  const uniqueFormats = useMemo(() => {
    const set = new Set()
    products.forEach((p) => {
      if (p.format && p.format.trim()) set.add(p.format.trim())
    })
    return Array.from(set).sort()
  }, [products])

  const skinTypeOptions = [
    { label: 'Todos los tipos', value: 'ALL' },
    { label: 'Piel Sensible', value: 'sensible' },
    { label: 'Piel Grasa / Acné', value: 'acné' },
    { label: 'Piel Seca', value: 'seca' },
    { label: 'Piel Madura', value: 'madura' }
  ]

  const stagesList = [
    { label: 'Todas las Etapas', value: 'ALL' },
    { label: 'Catalogación', value: 'CATALOGING' },
    { label: 'IA Enriquecida', value: 'AI_ENRICHMENT' },
    { label: 'Aprobación', value: 'APPROVAL' },
    { label: 'Listo para Publicar', value: 'READY_TO_PUBLISH' },
    { label: 'Publicado', value: 'PUBLISHED' }
  ]

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedBrand !== 'ALL' && String(p.brand_id) !== String(selectedBrand)) return false
      if (selectedStage !== 'ALL' && (p.lifecycle_stage || 'PUBLISHED') !== selectedStage) return false
      if (selectedFormat !== 'ALL' && p.format !== selectedFormat) return false
      if (selectedSkinType !== 'ALL') {
        const st = (p.skin_types || '').toLowerCase()
        if (!st.includes(selectedSkinType.toLowerCase())) return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const bName = (brandMap[p.brand_id] || '').toLowerCase()
        const name = (p.name || '').toLowerCase()
        const sku = (p.sku || '').toLowerCase()
        const ean = (p.ean || '').toLowerCase()
        const inci = (p.key_ingredients || '').toLowerCase()

        return (
          name.includes(q) ||
          sku.includes(q) ||
          ean.includes(q) ||
          bName.includes(q) ||
          inci.includes(q)
        )
      }
      return true
    })
  }, [products, selectedBrand, selectedStage, selectedFormat, selectedSkinType, searchQuery, brandMap])

  // 1. Export Master B2B Catalog to Excel
  const handleExportExcel = () => {
    const exportData = filteredProducts.map((p) => {
      const dim = dimensionsByProduct[p.id] || {}
      const wPrice = Number(p.wholesale_price || 14.50)
      const rPrice = Number(p.retail_price || 26.00)
      const margin = rPrice > 0 ? (((rPrice - wPrice) / rPrice) * 100).toFixed(1) : '0.0'
      const pImgs = imagesByProduct[p.id] || []

      return {
        'Marca': brandMap[p.brand_id] || '',
        'Código EAN-13': p.ean || '',
        'SKU Comercial': p.sku || '',
        'Producto': p.name || '',
        'Formato': p.format || '',
        'Precio Mayorista (USD)': wPrice,
        'PVP Sugerido (USD)': rPrice,
        'Margen Sugerido (%)': `${margin}%`,
        'Pack Mínimo (MOQ)': p.moq || 3,
        'Stock Físico': p.stock_quantity || 100,
        'Etapa Ciclo de Vida': p.lifecycle_stage || 'PUBLISHED',
        'Completitud (%)': p.completeness_score || 100,
        'Ingredientes INCI': p.key_ingredients || '',
        'Modo de Uso': p.usage_instructions || '',
        'Tipo de Piel': p.skin_types || '',
        'Beneficios': p.benefits || '',
        'Alto (cm)': dim.height_cm || '',
        'Ancho (cm)': dim.width_cm || '',
        'Profundidad (cm)': dim.depth_cm || '',
        'URL Foto Oficial': pImgs[0] || p.url_origen || '',
        'Verificación': p.verification_status || 'VERIFICADO_OFICIAL_DOM'
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Catalogo_KBeauty_B2B')
    XLSX.writeFile(workbook, `Catalogo_KBeauty_Hub_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // 2. Export Customer Order Sheet (with formula calculation)
  const handleExportCustomerOrderSheet = () => {
    const data = filteredProducts.map((p, idx) => {
      const bName = brandMap[p.brand_id] || 'K-Beauty'
      const wPrice = Number(p.wholesale_price || 14.50)
      const rPrice = Number(p.retail_price || 26.00)
      const rowNum = idx + 2

      return {
        'Marca': bName,
        'Código EAN-13': p.ean || '',
        'SKU': p.sku || '',
        'Producto': p.name || '',
        'Formato': p.format || '',
        'Precio Mayorista USD': wPrice,
        'PVP Sugerido USD': rPrice,
        'Pack Mínimo': p.moq || 3,
        'CANTIDAD A PEDIR (Ingresar aquí)': '',
        'SUBTOTAL USD (Calculado)': { f: `F${rowNum}*I${rowNum}` }
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Planilla_Pedido_Cliente')
    XLSX.writeFile(workbook, `KBeauty_Planilla_Pedido_B2B_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#17181B] flex items-center gap-2.5 font-display">
            <Package className="w-6 h-6 text-slate-800" /> Catálogo Comercial & Fichas Técnicas
          </h2>
          <p className="text-xs text-[#6B6E75] mt-1">
            Catálogo maestro de 334 productos K-Beauty sincronizados con Supabase, precios B2B y especificaciones.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCustomerOrderSheet}
            className="px-3.5 py-2 chrome-btn-secondary text-slate-800 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-blue-600" /> Planilla Pedido Cliente
          </button>

          <button
            onClick={handleExportExcel}
            className="px-4 py-2 chrome-btn-primary rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> Exportar Catálogo (.xlsx)
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-3xl p-5 border border-[#E7E8EB] shadow-xs">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por Nombre, EAN-13, SKU, Marca o Ingrediente INCI..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl text-xs text-[#17181B] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:bg-white transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-[#F8F8F9] p-1 border border-[#E7E8EB] rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-xs font-medium'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-xs font-medium'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#E7E8EB]">
          <div>
            <label className="block text-[11px] font-semibold text-[#6B6E75] mb-1">
              Marca ({brands.length})
            </label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl px-3 py-2 text-xs text-[#17181B] focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="ALL">Todas las Marcas</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#6B6E75] mb-1">
              Etapa del Ciclo de Vida
            </label>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl px-3 py-2 text-xs text-[#17181B] focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {stagesList.map((stg) => (
                <option key={stg.value} value={stg.value}>
                  {stg.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#6B6E75] mb-1">
              Tipo de Piel
            </label>
            <select
              value={selectedSkinType}
              onChange={(e) => setSelectedSkinType(e.target.value)}
              className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl px-3 py-2 text-xs text-[#17181B] focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {skinTypeOptions.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#6B6E75] mb-1">Formato</label>
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl px-3 py-2 text-xs text-[#17181B] focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="ALL">Todos los Formatos</option>
              {uniqueFormats.slice(0, 30).map((fmt) => (
                <option key={fmt} value={fmt}>
                  {fmt}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {filteredProducts.slice(0, 80).map((p) => {
            const prodImages = imagesByProduct[p.id] || []
            const primaryImg = prodImages[0] || 'https://via.placeholder.com/400x400?text=K-Beauty'
            const bName = brandMap[p.brand_id] || 'K-Beauty'
            const wPrice = Number(p.wholesale_price || 14.50)
            const rPrice = Number(p.retail_price || 26.00)

            return (
              <div
                key={p.id}
                onClick={() => onSelectProduct && onSelectProduct(p)}
                className="group liquid-glass-card rounded-3xl overflow-hidden flex flex-col cursor-pointer"
              >
                <div className="relative aspect-square w-full bg-[#F8F8F9] overflow-hidden border-b border-[#E7E8EB]">
                  <img
                    src={primaryImg}
                    alt={p.name}
                    className="w-full h-full object-contain p-6 group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-bold text-slate-800 border border-slate-200 shadow-xs">
                    {bName}
                  </div>
                  {p.format && (
                    <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-medium text-slate-700 border border-slate-200 font-mono">
                      {p.format}
                    </div>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-[#17181B] line-clamp-2 mb-2 group-hover:text-black transition-colors leading-snug font-display">
                      {p.name}
                    </h3>

                    <div className="flex items-center justify-between text-[11px] mb-3">
                      <div>
                        <span className="text-[10px] text-[#6B6E75] block">Mayorista:</span>
                        <span className="font-mono font-bold text-slate-900 text-xs">${wPrice.toFixed(2)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-[#6B6E75] block">PVP Sugerido:</span>
                        <span className="font-mono font-semibold text-slate-600 text-xs">${rPrice.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[#6B6E75] mb-2">
                      {p.ean ? (
                        <span className="font-mono chrome-badge px-1.5 py-0.5 rounded text-[10px]">
                          EAN: {p.ean}
                        </span>
                      ) : (
                        <span className="font-mono text-slate-400">SKU: {p.sku}</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E7E8EB] flex items-center justify-between text-[11px]">
                    <span className="text-emerald-700 flex items-center gap-1 font-medium text-[10px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {p.lifecycle_stage || 'PUBLISHED'}
                    </span>
                    <span className="text-[#6B6E75] group-hover:text-black font-medium flex items-center gap-1 text-[11px] transition">
                      Ver Ficha / Editar <Eye className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-[#E7E8EB] divide-y divide-[#E7E8EB]">
          {filteredProducts.slice(0, 80).map((p) => {
            const prodImages = imagesByProduct[p.id] || []
            const primaryImg = prodImages[0] || 'https://via.placeholder.com/100x100?text=K-Beauty'
            const bName = brandMap[p.brand_id] || 'K-Beauty'
            const dim = dimensionsByProduct[p.id] || {}
            const wPrice = Number(p.wholesale_price || 14.50)
            const rPrice = Number(p.retail_price || 26.00)

            return (
              <div
                key={p.id}
                onClick={() => onSelectProduct && onSelectProduct(p)}
                className="p-4 hover:bg-[#F8F8F9] transition flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={primaryImg}
                    alt={p.name}
                    className="w-14 h-14 object-contain bg-[#F8F8F9] rounded-2xl p-1.5 border border-[#E7E8EB]"
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-800">{bName}</span>
                      {p.format && (
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                          {p.format}
                        </span>
                      )}
                      {p.ean && (
                        <span className="text-[10px] font-mono chrome-badge px-1.5 py-0.5 rounded">
                          EAN: {p.ean}
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-[#17181B]">{p.name}</h4>
                    <p className="text-xs text-[#6B6E75] line-clamp-1 mt-0.5">{p.key_ingredients}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs text-[#6B6E75] self-end md:self-auto">
                  <div className="text-right font-mono">
                    <span className="text-[10px] text-slate-400 block">Mayorista B2B</span>
                    <span className="text-sm font-bold text-slate-900">${wPrice.toFixed(2)}</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-[10px] text-slate-400 block">PVP Sugerido</span>
                    <span className="text-xs text-slate-600">${rPrice.toFixed(2)}</span>
                  </div>
                  <button className="px-3.5 py-1.5 chrome-btn-secondary rounded-xl font-medium transition flex items-center gap-1.5 text-xs">
                    <Eye className="w-3.5 h-3.5 text-slate-500" /> Ficha B2B
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {filteredProducts.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-[#E7E8EB]">
          <p className="text-base text-[#17181B] font-semibold mb-1">
            No se encontraron productos con estos filtros
          </p>
          <p className="text-xs text-[#6B6E75]">
            Intenta buscar por otro término o limpia los filtros activos.
          </p>
        </div>
      )}
    </div>
  )
}

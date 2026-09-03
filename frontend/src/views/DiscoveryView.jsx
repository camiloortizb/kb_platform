import React, { useState } from 'react'
import {
  Globe,
  Search,
  ExternalLink,
  Plus,
  Layers,
  Sparkles,
  CheckCircle2,
  PackagePlus,
  Filter,
  ArrowRight
} from 'lucide-react'

export default function DiscoveryView({
  discoveredProducts = [],
  brands = [],
  onPromoteToCommercial
}) {
  const [search, setSearch] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('ALL')

  const brandMap = brands.reduce((acc, b) => {
    acc[b.id] = b.name
    return acc
  }, {})

  const filtered = discoveredProducts.filter((p) => {
    if (selectedBrand !== 'ALL' && String(p.brand_id) !== String(selectedBrand)) {
      return false
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      const bName = (brandMap[p.brand_id] || '').toLowerCase()
      return (
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.ean && p.ean.toLowerCase().includes(q)) ||
        bName.includes(q)
      )
    }
    return true
  })

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#17181B] flex items-center gap-2.5 font-display">
            <Globe className="w-6 h-6 text-slate-800" /> Productos Descubiertos (Discovery)
          </h2>
          <p className="text-xs text-[#6B6E75] mt-1">
            Catálogo extraído desde tiendas oficiales D2C mediante scraping. Aislado del catálogo comercial activo.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar producto descubierto..."
              className="pl-10 pr-4 py-2 bg-white border border-[#E7E8EB] rounded-xl text-xs text-[#17181B] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 shadow-xs"
            />
          </div>

          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="bg-white border border-[#E7E8EB] rounded-xl px-3 py-2 text-xs text-[#17181B] focus:outline-none focus:ring-2 focus:ring-slate-400 shadow-xs"
          >
            <option value="ALL">Todas las Marcas</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Discovery Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((item) => {
          const bName = brandMap[item.brand_id] || 'K-Beauty Brand'
          const isLinked = !!item.product_id

          return (
            <div
              key={item.id}
              className="liquid-glass-card rounded-3xl p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200 font-mono">
                    {bName}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isLinked
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono'
                        : 'bg-slate-100 text-slate-700 border border-slate-200 font-mono'
                    }`}
                  >
                    {isLinked ? 'VINCULADO' : 'DISCOVERY'}
                  </span>
                </div>

                <div className="flex gap-3 mb-3">
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-16 h-16 object-contain bg-[#F8F8F9] rounded-2xl p-1.5 border border-[#E7E8EB] flex-shrink-0"
                    />
                  )}
                  <div>
                    <h3 className="text-xs font-bold text-[#17181B] leading-snug line-clamp-2 font-display">
                      {item.name}
                    </h3>
                    <div className="text-[10px] text-[#6B6E75] font-mono mt-1">
                      {item.ean && `EAN: ${item.ean}`} {item.format && `• ${item.format}`}
                    </div>
                  </div>
                </div>

                {item.raw_data && (
                  <div className="bg-[#F8F8F9] p-3 rounded-2xl border border-[#E7E8EB] text-[11px] text-[#6B6E75] mb-4 space-y-1">
                    {item.raw_data.scraped_price && (
                      <div className="flex justify-between">
                        <span>Precio Scraping:</span>
                        <span className="text-slate-900 font-semibold font-mono">
                          {item.raw_data.scraped_price}
                        </span>
                      </div>
                    )}
                    {item.raw_data.trending_score && (
                      <div className="flex justify-between">
                        <span>Score Viral:</span>
                        <span className="text-slate-800 font-semibold font-mono">🔥 {item.raw_data.trending_score} / 100</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3.5 border-t border-[#E7E8EB] flex items-center justify-between gap-2">
                {item.external_url && (
                  <a
                    href={item.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-slate-600 hover:text-black flex items-center gap-1 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Ver en Origen
                  </a>
                )}

                {!isLinked && (
                  <button
                    onClick={() => onPromoteToCommercial && onPromoteToCommercial(item)}
                    className="px-3.5 py-1.5 chrome-btn-secondary text-slate-800 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                  >
                    <PackagePlus className="w-3.5 h-3.5" /> Incorporar a Catálogo
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}



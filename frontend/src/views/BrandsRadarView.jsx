import React, { useState } from 'react'
import {
  Layers,
  Search,
  ExternalLink,
  Sparkles,
  TrendingUp,
  Globe,
  Plus,
  CheckCircle2,
  Filter,
  ArrowRight
} from 'lucide-react'

export default function BrandsRadarView({
  brands = [],
  sources = [],
  discoveredProducts = [],
  onStartNegotiation,
  onNavigate
}) {
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [search, setSearch] = useState('')

  const statusTabs = [
    { key: 'ALL', label: 'Todas las Marcas', count: brands.length },
    { key: 'RADAR', label: 'En Radar', count: brands.filter((b) => b.status === 'RADAR').length },
    { key: 'PROSPECT', label: 'Prospección', count: brands.filter((b) => b.status === 'PROSPECT').length },
    { key: 'NEGOTIATING', label: 'En Negociación', count: brands.filter((b) => b.status === 'NEGOTIATING').length },
    { key: 'ACTIVE', label: 'Comerciales Activas', count: brands.filter((b) => b.status === 'ACTIVE' || !b.status).length }
  ]

  const filteredBrands = brands.filter((b) => {
    if (filterStatus !== 'ALL' && (b.status || 'ACTIVE') !== filterStatus) {
      return false
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      return b.name.toLowerCase().includes(q) || (b.notes && b.notes.toLowerCase().includes(q))
    }
    return true
  })

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#17181B] flex items-center gap-2.5 font-display">
            <Layers className="w-6 h-6 text-slate-800" /> Radar de Marcas Coreanas
          </h2>
          <p className="text-xs text-[#6B6E75] mt-1">
            Monitoreo y gestión de marcas desde la prospección inicial hasta la incorporación comercial.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar marca o nota..."
              className="pl-10 pr-4 py-2 bg-white border border-[#E7E8EB] rounded-xl text-xs text-[#17181B] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E7E8EB] gap-2 text-xs font-semibold overflow-x-auto pb-1">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`pb-3 px-3.5 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              filterStatus === tab.key
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-[#6B6E75] hover:text-[#17181B]'
            }`}
          >
            <span>{tab.label}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Brand Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBrands.map((b) => {
          const brandSources = sources.filter((s) => s.brand_id === b.id)
          const officialUrl = brandSources[0]?.url || b.website
          const discCount = discoveredProducts.filter((dp) => dp.brand_id === b.id).length
          const status = b.status || 'ACTIVE'

          return (
            <div
              key={b.id}
              className="liquid-glass-card rounded-3xl p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-base font-bold text-[#17181B] font-display">{b.name}</h3>
                    <span className="text-[11px] text-[#6B6E75] font-medium">
                      {b.country || 'Corea del Sur'}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider ${
                      status === 'RADAR'
                        ? 'bg-slate-100 text-slate-800 border border-slate-300 font-mono'
                        : status === 'PROSPECT'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200 font-mono'
                        : status === 'NEGOTIATING'
                        ? 'bg-blue-50 text-blue-800 border border-blue-200 font-mono'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono'
                    }`}
                  >
                    {status}
                  </span>
                </div>

                {b.notes && (
                  <p className="text-xs text-[#6B6E75] bg-[#F8F8F9] p-3 rounded-2xl border border-[#E7E8EB] mb-4 line-clamp-2">
                    {b.notes}
                  </p>
                )}

                <div className="space-y-2 text-xs text-[#6B6E75] mb-4">
                  <div className="flex items-center justify-between">
                    <span>Productos descubiertos:</span>
                    <span className="font-bold text-[#17181B] font-mono">{discCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Fuente Oficial Scraper:</span>
                    <span className="text-emerald-700 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {brandSources.length > 0 ? 'Conectada' : 'Manual'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E7E8EB] flex items-center justify-between gap-2">
                {officialUrl && (
                  <a
                    href={officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#6B6E75] hover:text-black flex items-center gap-1 transition"
                  >
                    <Globe className="w-3.5 h-3.5 text-slate-500" /> Sitio Oficial
                  </a>
                )}

                {status !== 'ACTIVE' ? (
                  <button
                    onClick={() => onStartNegotiation && onStartNegotiation(b)}
                    className="px-3.5 py-1.5 chrome-btn-secondary text-slate-800 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                  >
                    <TrendingUp className="w-3.5 h-3.5" /> Iniciar Negociación
                  </button>
                ) : (
                  <button
                    onClick={() => onNavigate('products')}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-medium transition flex items-center gap-1 border border-slate-200"
                  >
                    Ver Catálogo <ArrowRight className="w-3 h-3" />
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



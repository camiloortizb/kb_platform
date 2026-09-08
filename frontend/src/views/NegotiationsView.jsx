import React, { useState, useMemo } from 'react'
import {
  TrendingUp,
  Search,
  DollarSign,
  User,
  ShoppingCart
} from 'lucide-react'
import { buildBrandMap } from '../lib/brandUtils'

export default function NegotiationsView({
  negotiations = [],
  brands = [],
  onCreatePoFromNegotiation
}) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')

  const brandMap = useMemo(() => buildBrandMap(brands), [brands])

  const statuses = [
    { key: 'ALL', label: 'Todas las Negociaciones' },
    { key: 'PROSPECTION', label: 'Prospección' },
    { key: 'CONTACTED', label: 'Contactada' },
    { key: 'NEGOTIATING', label: 'En Negociación' },
    { key: 'AGREEMENT', label: 'Con Acuerdo' },
    { key: 'CLOSED', label: 'Cerradas / OC' }
  ]

  const filtered = useMemo(() => {
    return negotiations.filter((n) => {
      if (filterStatus !== 'ALL' && n.status !== filterStatus) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const bName = (brandMap[n.brand_id] || '').toLowerCase()
        return (n.title || '').toLowerCase().includes(q) || bName.includes(q)
      }
      return true
    })
  }, [negotiations, filterStatus, search, brandMap])

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#17181B] flex items-center gap-2.5 font-display">
            <TrendingUp className="w-6 h-6 text-slate-800" /> Negociaciones Comerciales B2B
          </h2>
          <p className="text-xs text-[#6B6E75] mt-1">
            Gestión de acuerdos de distribución y condiciones comerciales con fabricantes y proveedores.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar negociación o marca..."
              className="pl-10 pr-4 py-2 bg-white border border-[#E7E8EB] rounded-xl text-xs text-[#17181B] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E7E8EB] gap-2 text-xs font-semibold overflow-x-auto pb-1">
        {statuses.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`pb-3 px-3.5 border-b-2 transition whitespace-nowrap ${
              filterStatus === tab.key
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-[#6B6E75] hover:text-[#17181B]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((n) => {
          const bName = brandMap[n.brand_id] || 'K-Beauty Brand'

          return (
            <div
              key={n.id}
              className="liquid-glass-card rounded-3xl p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200 font-mono">
                    {bName}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      n.status === 'AGREEMENT'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono'
                        : 'bg-blue-50 text-blue-800 border border-blue-200 font-mono'
                    }`}
                  >
                    {n.status}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-[#17181B] mb-2 leading-snug font-display">{n.title}</h3>

                {n.notes && (
                  <p className="text-xs text-[#6B6E75] bg-[#F8F8F9] p-3 rounded-2xl border border-[#E7E8EB] mb-4 line-clamp-2">
                    {n.notes}
                  </p>
                )}

                <div className="space-y-2 text-xs text-[#6B6E75] mb-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Volumen Estimado:
                    </span>
                    <span className="font-bold text-[#17181B] font-mono">
                      ${Number(n.estimated_volume_usd || 0).toLocaleString()} USD
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Productos Objetivo:</span>
                    <span className="font-bold text-[#17181B]">{n.target_products_count || 0} SKUs</span>
                  </div>
                  {n.contact_person && (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-500" /> Contacto:
                      </span>
                      <span className="text-slate-700 font-medium">{n.contact_person}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3.5 border-t border-[#E7E8EB] flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 font-mono">
                  Inicio: {new Date(n.start_date || n.created_at).toLocaleDateString()}
                </span>

                {n.status === 'AGREEMENT' && (
                  <button
                    onClick={() => onCreatePoFromNegotiation && onCreatePoFromNegotiation(n)}
                    className="px-3.5 py-1.5 chrome-btn-primary rounded-xl text-xs font-bold transition flex items-center gap-1"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" /> Generar OC
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



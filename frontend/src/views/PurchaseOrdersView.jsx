import React, { useState } from 'react'
import {
  ShoppingCart,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  Package,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react'

export default function PurchaseOrdersView({
  purchaseOrders = [],
  poItems = [],
  brands = [],
  onConfirmPo,
  onNavigate
}) {
  const [search, setSearch] = useState('')
  const [confirmingId, setConfirmingId] = useState(null)

  const brandMap = brands.reduce((acc, b) => {
    acc[b.id] = b.name
    return acc
  }, {})

  const filteredPos = purchaseOrders.filter((po) => {
    if (search.trim()) {
      const q = search.toLowerCase()
      const bName = (brandMap[po.brand_id] || '').toLowerCase()
      return (po.po_number || '').toLowerCase().includes(q) || bName.includes(q)
    }
    return true
  })

  const handleProcessConfirm = async (po) => {
    try {
      setConfirmingId(po.id)
      if (onConfirmPo) {
        await onConfirmPo(po)
      }
    } finally {
      setConfirmingId(null)
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#17181B] flex items-center gap-2.5 font-display">
            <ShoppingCart className="w-6 h-6 text-slate-800" /> Órdenes de Compra (Purchase Orders)
          </h2>
          <p className="text-xs text-[#6B6E75] mt-1">
            Gestión de compras internacionales e incorporación automatizada al catálogo comercial.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar OC por número o marca..."
              className="pl-10 pr-4 py-2 bg-white border border-[#E7E8EB] rounded-xl text-xs text-[#17181B] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* PO Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPos.map((po) => {
          const bName = brandMap[po.brand_id] || 'K-Beauty Brand'
          const isConfirmed = po.status === 'CONFIRMED'
          const isReceived = po.status === 'RECEIVED'
          const isDraft = po.status === 'DRAFT'

          return (
            <div
              key={po.id}
              className="liquid-glass-card rounded-3xl p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="font-mono text-sm font-bold text-[#17181B] block">
                      {po.po_number}
                    </span>
                    <span className="text-xs font-semibold text-slate-800">{bName}</span>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isReceived
                        ? 'bg-purple-50 text-purple-800 border border-purple-200 font-mono'
                        : isConfirmed
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono'
                        : 'bg-slate-100 text-slate-700 border border-slate-200 font-mono'
                    }`}
                  >
                    {po.status}
                  </span>
                </div>

                {po.notes && (
                  <p className="text-xs text-[#6B6E75] bg-[#F8F8F9] p-3 rounded-2xl border border-[#E7E8EB] mb-4 line-clamp-2">
                    {po.notes}
                  </p>
                )}

                <div className="space-y-2 text-xs text-[#6B6E75] mb-4">
                  <div className="flex items-center justify-between">
                    <span>Monto Total:</span>
                    <span className="font-bold text-[#17181B] font-mono">
                      ${Number(po.total_amount_usd || 0).toLocaleString()} USD
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Fecha Emisión:</span>
                    <span className="text-slate-700 font-mono">
                      {new Date(po.order_date || po.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3.5 border-t border-[#E7E8EB] flex items-center justify-between gap-2">
                {isDraft ? (
                  <button
                    onClick={() => handleProcessConfirm(po)}
                    disabled={confirmingId === po.id}
                    className="w-full py-2 chrome-btn-primary rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {confirmingId === po.id ? 'Procesando Incorporación...' : 'Confirmar OC & Procesar'}
                  </button>
                ) : (
                  <div className="w-full flex items-center justify-between text-xs text-[#6B6E75]">
                    <span className="text-emerald-700 flex items-center gap-1 font-medium text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Catálogo Incorporado
                    </span>
                    <button
                      onClick={() => onNavigate('pipeline')}
                      className="text-slate-800 hover:text-black font-semibold flex items-center gap-1 transition text-[11px]"
                    >
                      Ver Pipeline <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}



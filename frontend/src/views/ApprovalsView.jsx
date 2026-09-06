import React, { useState } from 'react'
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  Check,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Search,
  ExternalLink,
  Tag
} from 'lucide-react'
import { useToast } from '../components/ToastContainer'

export default function ApprovalsView({
  products = [],
  brands = [],
  imagesByProduct = {},
  onApproveProduct,
  onReturnProduct,
  onSelectProduct
}) {
  const { addToast } = useToast()
  const [filterBrand, setFilterBrand] = useState('ALL')
  const [search, setSearch] = useState('')
  const [returnReason, setReturnReason] = useState('')
  const [returningProductId, setReturningProductId] = useState(null)

  const brandMap = brands.reduce((acc, b) => {
    acc[b.id] = b.name
    return acc
  }, {})

  const pendingApprovalProducts = products.filter((p) => {
    if (p.lifecycle_stage !== 'APPROVAL') return false
    if (filterBrand !== 'ALL' && String(p.brand_id) !== String(filterBrand)) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const bName = (brandMap[p.brand_id] || '').toLowerCase()
      return (
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        bName.includes(q)
      )
    }
    return true
  })

  const handleConfirmReturn = (productId) => {
    if (!returnReason.trim()) {
      addToast('Por favor especifica un motivo de devolución para el catalogador.', 'warning')
      return
    }
    onReturnProduct(productId, returnReason)
    setReturningProductId(null)
    setReturnReason('')
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 mb-2 font-mono">
            <AlertCircle className="w-3.5 h-3.5 text-amber-700" /> Human-in-the-Loop Quality Control
          </div>
          <h2 className="text-2xl font-extrabold text-[#17181B] font-display">
            Bandeja de Aprobación de <span className="chrome-gradient-text">Brand Manager</span>
          </h2>
          <p className="text-xs text-[#6B6E75] mt-1">
            Validación de especificaciones técnicas, claims comerciales e ingredientes antes de la publicación multicanal.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-amber-900 bg-amber-50 px-3.5 py-1.5 rounded-xl border border-amber-200 shadow-xs font-mono">
            {pendingApprovalProducts.length} pendientes de validación
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-3xl p-4 flex flex-col sm:flex-row gap-4 border border-[#E7E8EB] shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por producto, marca o SKU..."
            className="w-full pl-10 pr-4 py-2 bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl text-xs text-[#17181B] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        <select
          value={filterBrand}
          onChange={(e) => setFilterBrand(e.target.value)}
          className="bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl px-3 py-2 text-xs text-[#17181B] focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <option value="ALL">Todas las Marcas</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Pending Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {pendingApprovalProducts.map((p) => {
          const bName = brandMap[p.brand_id] || 'K-Beauty'
          const pImgs = imagesByProduct[p.id] || []
          const img = pImgs[0] || 'https://via.placeholder.com/300x300?text=K-Beauty'

          return (
            <div
              key={p.id}
              className="liquid-glass-card rounded-3xl p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex gap-4 items-start mb-4">
                  <img
                    src={img}
                    alt=""
                    className="w-20 h-20 object-contain rounded-2xl bg-[#F8F8F9] p-2 border border-[#E7E8EB] flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-800">{bName}</span>
                      <span className="text-[10px] font-mono chrome-badge px-2 py-0.5 rounded-full font-bold">
                        IA Completa: {p.completeness_score || 100}%
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-[#17181B] leading-snug line-clamp-2 font-display">
                      {p.name}
                    </h3>
                    <div className="text-[11px] text-[#6B6E75] font-mono mt-1">
                      SKU: {p.sku} {p.ean && `• EAN: ${p.ean}`}
                    </div>
                  </div>
                </div>

                {/* Technical Review Snippet */}
                <div className="space-y-2 bg-[#F8F8F9] p-3.5 rounded-2xl border border-[#E7E8EB] text-xs text-[#17181B] mb-4">
                  <div>
                    <span className="font-semibold text-slate-900 block mb-0.5">Fórmula INCI Extraída:</span>
                    <p className="font-mono text-[11px] text-[#6B6E75] line-clamp-2">
                      {p.key_ingredients || 'Sin ingredientes especificados'}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900 block mb-0.5">Modo de Uso:</span>
                    <p className="text-[11px] text-[#6B6E75] line-clamp-2">
                      {p.usage_instructions || 'Aplicar sobre la piel limpia.'}
                    </p>
                  </div>
                </div>

                {/* Return Reason Input Modal State */}
                {returningProductId === p.id && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl mb-4 space-y-2">
                    <span className="text-xs font-semibold text-amber-900 block">
                      Motivo de Devolución para el Catalogador:
                    </span>
                    <input
                      type="text"
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      placeholder="Ej: Falta revisar concentración de Niacinamida..."
                      className="w-full bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs text-[#17181B] placeholder-slate-400 focus:outline-none"
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={() => setReturningProductId(null)}
                        className="px-2.5 py-1 text-xs text-slate-500 hover:text-black"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleConfirmReturn(p.id)}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition"
                      >
                        Confirmar Devolución
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[#E7E8EB] flex items-center justify-between gap-3">
                <button
                  onClick={() => onSelectProduct && onSelectProduct(p)}
                  className="text-xs text-[#6B6E75] hover:text-black font-medium flex items-center gap-1 transition"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-500" /> Inspeccionar Completo
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setReturningProductId(p.id)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition flex items-center gap-1 border border-slate-200"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Devolver
                  </button>
                  <button
                    onClick={() => onApproveProduct && onApproveProduct(p.id)}
                    className="px-4 py-1.5 chrome-btn-primary rounded-xl text-xs font-bold transition flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Aprobar Ficha
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {pendingApprovalProducts.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-[#E7E8EB]">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#17181B]">
            Bandeja de Aprobaciones al Día
          </h3>
          <p className="text-xs text-[#6B6E75] mt-1">
            No hay productos pendientes de revisión técnica por el Brand Manager.
          </p>
        </div>
      )}
    </div>
  )
}



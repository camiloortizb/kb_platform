import React, { useState, useEffect, useRef } from 'react'
import {
  Search,
  Package,
  Layers,
  ShoppingCart,
  TrendingUp,
  ArrowRight,
  Sparkles,
  X
} from 'lucide-react'

export default function CommandPalette({
  isOpen,
  onClose,
  products = [],
  brands = [],
  purchaseOrders = [],
  negotiations = [],
  onSelectProduct,
  onNavigate
}) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Keyboard shortcut listener (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (isOpen) onClose()
        else {
          // Handled in parent
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const brandMap = brands.reduce((acc, b) => {
    acc[b.id] = b.name
    return acc
  }, {})

  const q = query.toLowerCase().trim()

  const matchedProducts = q
    ? products
        .filter(
          (p) =>
            p.name?.toLowerCase().includes(q) ||
            p.sku?.toLowerCase().includes(q) ||
            p.ean?.toLowerCase().includes(q) ||
            (brandMap[p.brand_id] || '').toLowerCase().includes(q)
        )
        .slice(0, 5)
    : []

  const matchedBrands = q
    ? brands.filter((b) => b.name?.toLowerCase().includes(q)).slice(0, 3)
    : []

  const matchedPos = q
    ? purchaseOrders.filter((po) => po.po_number?.toLowerCase().includes(q)).slice(0, 3)
    : []

  const totalResults = [...matchedProducts, ...matchedBrands, ...matchedPos]

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-md flex items-start justify-center pt-20 p-4 animate-fadeIn">
      <div className="bg-white border border-[#E7E8EB] rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-[#E7E8EB] flex items-center gap-3 bg-[#F8F8F9]">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar productos, marcas, OCs, EAN o SKU..."
            className="w-full bg-transparent text-sm text-[#17181B] placeholder-slate-400 focus:outline-none"
          />
          <kbd className="px-2 py-0.5 rounded-lg bg-white text-[10px] text-slate-700 font-mono border border-slate-200 shadow-xs">
            ESC
          </kbd>
        </div>

        {/* Results Box */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4 bg-white">
          {q === '' && (
            <div className="p-6 text-center text-xs text-[#6B6E75] space-y-2">
              <Sparkles className="w-6 h-6 text-slate-600 mx-auto" />
              <p className="font-semibold text-[#17181B]">Búsqueda Rápida Universal</p>
              <p className="text-[#6B6E75]">
                Escribe el nombre de un producto, marca, código EAN-13, SKU o número de Orden de Compra.
              </p>
            </div>
          )}

          {matchedProducts.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-[#6B6E75] uppercase tracking-wider px-3 mb-1.5 font-mono">
                Productos ({matchedProducts.length})
              </div>
              <div className="space-y-1">
                {matchedProducts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelectProduct && onSelectProduct(p)
                      onClose()
                    }}
                    className="p-2.5 rounded-2xl hover:bg-[#F8F8F9] flex items-center justify-between cursor-pointer transition group border border-transparent hover:border-[#E7E8EB]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-xs border border-slate-200">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#17181B] group-hover:text-black transition font-display">
                          {p.name}
                        </div>
                        <div className="text-[10px] text-[#6B6E75] font-mono">
                          {brandMap[p.brand_id]} • {p.ean ? `EAN: ${p.ean}` : `SKU: ${p.sku}`}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 transition" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {matchedBrands.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-[#6B6E75] uppercase tracking-wider px-3 mb-1.5 font-mono">
                Marcas Coreanas ({matchedBrands.length})
              </div>
              <div className="space-y-1">
                {matchedBrands.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => {
                      onNavigate && onNavigate('brands')
                      onClose()
                    }}
                    className="p-2.5 rounded-2xl hover:bg-[#F8F8F9] flex items-center justify-between cursor-pointer transition group border border-transparent hover:border-[#E7E8EB]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-xs border border-slate-200">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#17181B] group-hover:text-black transition font-display">
                          {b.name}
                        </div>
                        <div className="text-[10px] text-[#6B6E75]">
                          {b.status || 'ACTIVE'} • {b.country || 'Corea del Sur'}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 transition" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {matchedPos.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-[#6B6E75] uppercase tracking-wider px-3 mb-1.5 font-mono">
                Órdenes de Compra ({matchedPos.length})
              </div>
              <div className="space-y-1">
                {matchedPos.map((po) => (
                  <div
                    key={po.id}
                    onClick={() => {
                      onNavigate && onNavigate('purchase_orders')
                      onClose()
                    }}
                    className="p-2.5 rounded-2xl hover:bg-[#F8F8F9] flex items-center justify-between cursor-pointer transition group border border-transparent hover:border-[#E7E8EB]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-xs border border-slate-200">
                        <ShoppingCart className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#17181B] group-hover:text-black transition font-display">
                          {po.po_number}
                        </div>
                        <div className="text-[10px] text-[#6B6E75] font-mono">
                          Estado: {po.status} • Total: ${po.total_amount_usd} USD
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 transition" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {q !== '' && totalResults.length === 0 && (
            <div className="p-8 text-center text-xs text-[#6B6E75]">
              No se encontraron coincidencias para "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  )
}



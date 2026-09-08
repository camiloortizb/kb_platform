import React, { useState, useMemo } from 'react'
import {
  Globe,
  Search,
  ExternalLink,
  CheckCircle2,
  Clock,
  ShoppingBag
} from 'lucide-react'
import { buildBrandMap } from '../lib/brandUtils'

export default function PublicationsView({
  products = [],
  brands = [],
  productChannels = [],
  onPublishChannel
}) {
  const [selectedChannel, setSelectedChannel] = useState('ALL')
  const [search, setSearch] = useState('')

  const brandMap = useMemo(() => buildBrandMap(brands), [brands])

  const productMap = useMemo(() => {
    return products.reduce((acc, p) => {
      acc[p.id] = p
      return acc
    }, {})
  }, [products])

  const channelsList = [
    { key: 'ALL', label: 'Todos los Canales' },
    { key: 'shopify', label: 'Shopify D2C' },
    { key: 'tiendanube', label: 'Tienda Nube B2C' },
    { key: 'mercadolibre', label: 'Mercado Libre Platinum' }
  ]

  const filtered = useMemo(() => {
    return productChannels.filter((ch) => {
      if (selectedChannel !== 'ALL' && ch.channel_name !== selectedChannel) return false
      const prod = productMap[ch.product_id]
      if (!prod) return true
      if (search.trim()) {
        const q = search.toLowerCase()
        const bName = (brandMap[prod.brand_id] || '').toLowerCase()
        return (
          prod.name?.toLowerCase().includes(q) ||
          (prod.sku && prod.sku.toLowerCase().includes(q)) ||
          bName.includes(q)
        )
      }
      return true
    })
  }, [productChannels, selectedChannel, search, productMap, brandMap])

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#17181B] flex items-center gap-2.5 font-display">
            <Globe className="w-6 h-6 text-slate-800" /> Publicación Multicanal
          </h2>
          <p className="text-xs text-[#6B6E75] mt-1">
            Matriz de sincronización independiente para Shopify, Tienda Nube y Mercado Libre.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por producto o SKU..."
              className="pl-10 pr-4 py-2 bg-white border border-[#E7E8EB] rounded-xl text-xs text-[#17181B] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E7E8EB] gap-2 text-xs font-semibold overflow-x-auto pb-1">
        {channelsList.map((ch) => (
          <button
            key={ch.key}
            onClick={() => setSelectedChannel(ch.key)}
            className={`pb-3 px-3.5 border-b-2 transition whitespace-nowrap capitalize ${
              selectedChannel === ch.key
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-[#6B6E75] hover:text-[#17181B]'
            }`}
          >
            {ch.label}
          </button>
        ))}
      </div>

      {/* Publications Table */}
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-[#E7E8EB]">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-[#F8F8F9] text-[11px] uppercase tracking-wider text-[#6B6E75] border-b border-[#E7E8EB]">
            <tr>
              <th className="p-4 font-semibold">Producto</th>
              <th className="p-4 font-semibold">Canal</th>
              <th className="p-4 font-semibold">Precio Venta</th>
              <th className="p-4 font-semibold">Stock</th>
              <th className="p-4 font-semibold">Estado</th>
              <th className="p-4 text-right font-semibold">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7E8EB]">
            {filtered.slice(0, 40).map((ch) => {
              const prod = productMap[ch.product_id] || { name: 'Producto #' + ch.product_id, sku: 'SKU' }
              const bName = brandMap[prod.brand_id] || 'K-Beauty'
              const isPublished = ch.status === 'PUBLISHED'

              return (
                <tr key={ch.id} className="hover:bg-[#F8F8F9] transition">
                  <td className="p-4">
                    <span className="text-[10px] font-bold text-slate-800 block">{bName}</span>
                    <span className="font-semibold text-[#17181B]">{prod.name}</span>
                    <span className="text-[10px] text-[#6B6E75] font-mono block">SKU: {prod.sku}</span>
                  </td>
                  <td className="p-4">
                    <span className="capitalize font-semibold text-[#17181B] flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-slate-600" /> {ch.channel_name}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-bold text-slate-900">
                    ${ch.price || 0} USD
                  </td>
                  <td className="p-4 font-mono">
                    <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                      {ch.inventory_quantity || 0} u.
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                        isPublished
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono'
                          : 'bg-amber-50 text-amber-800 border border-amber-200 font-mono'
                      }`}
                    >
                      {isPublished ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-amber-600" />}
                      {ch.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {ch.published_url ? (
                      <a
                        href={ch.published_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-800 hover:text-black font-semibold inline-flex items-center gap-1 transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Ver en Tienda
                      </a>
                    ) : (
                      <button
                        onClick={() => onPublishChannel && onPublishChannel(ch.id)}
                        className="px-3.5 py-1 chrome-btn-secondary text-slate-800 rounded-lg text-xs font-semibold transition"
                      >
                        Publicar Ahora
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-xs text-[#6B6E75]">
            No hay publicaciones registradas para este filtro.
          </div>
        )}
      </div>
    </div>
  )
}



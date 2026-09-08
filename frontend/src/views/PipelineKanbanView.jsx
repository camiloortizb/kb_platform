import React, { useMemo } from 'react'
import { Layers, ChevronRight } from 'lucide-react'
import { buildBrandMap } from '../lib/brandUtils'

export default function PipelineKanbanView({
  products = [],
  brands = [],
  imagesByProduct = {},
  onSelectProduct,
  onMoveStage
}) {
  const brandMap = useMemo(() => buildBrandMap(brands), [brands])

  const columns = [
    { key: 'CATALOGING', title: 'Catalogación', tagClass: 'status-tag-catalog' },
    { key: 'AI_ENRICHMENT', title: 'IA Enriquecimiento', tagClass: 'status-tag-ai' },
    { key: 'APPROVAL', title: 'Pendiente Aprobación', tagClass: 'status-tag-approval' },
    { key: 'READY_TO_PUBLISH', title: 'Listo para Publicar', tagClass: 'status-tag-radar' },
    { key: 'PUBLISHED', title: 'Publicado Multicanal', tagClass: 'status-tag-published' }
  ]

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-[#17181B] flex items-center gap-2.5 font-display">
          <Layers className="w-6 h-6 text-slate-800" /> Pipeline Operacional Kanban
        </h2>
        <p className="text-xs text-[#6B6E75] mt-1">
          Seguimiento visual del estado operativo de cada producto a lo largo del ciclo de vida.
        </p>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const colProducts = products.filter((p) => {
            const stg = p.lifecycle_stage || 'PUBLISHED'
            return stg === col.key
          })

          return (
            <div
              key={col.key}
              className="bg-white rounded-3xl p-4 flex flex-col min-w-[240px] max-h-[78vh] shadow-sm border border-[#E7E8EB]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E7E8EB]">
                <span className={`px-2.5 py-1 rounded-xl text-xs font-semibold ${col.tagClass}`}>
                  {col.title}
                </span>
                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                  {colProducts.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {colProducts.slice(0, 30).map((p) => {
                  const bName = brandMap[p.brand_id] || 'K-Beauty'
                  const pImgs = imagesByProduct[p.id] || []
                  const img = pImgs[0] || 'https://via.placeholder.com/60x60?text=K-Beauty'

                  return (
                    <div
                      key={p.id}
                      onClick={() => onSelectProduct && onSelectProduct(p)}
                      className="liquid-glass-card p-3 rounded-2xl cursor-pointer group"
                    >
                      <div className="flex gap-2.5 items-start mb-2">
                        <img
                          src={img}
                          alt=""
                          className="w-10 h-10 object-contain rounded-lg bg-[#F8F8F9] p-0.5 border border-[#E7E8EB] flex-shrink-0"
                        />
                        <div>
                          <span className="text-[10px] font-bold text-slate-800 block">{bName}</span>
                          <h4 className="text-[11px] font-semibold text-[#17181B] line-clamp-2 leading-snug group-hover:text-black transition">
                            {p.name}
                          </h4>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-[#6B6E75] pt-2 border-t border-[#E7E8EB]">
                        <span className="font-mono text-slate-700">
                          {p.ean ? `EAN: ${p.ean.slice(-6)}` : `SKU: ${p.sku}`}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-800 font-mono font-semibold">
                            {p.completeness_score || 100}%
                          </span>
                          {onMoveStage && col.key !== 'PUBLISHED' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onMoveStage(p.id)
                              }}
                              className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-indigo-600 transition"
                              title="Avanzar etapa"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {colProducts.length === 0 && (
                  <div className="text-center py-8 text-xs text-[#6B6E75]">
                    Sin productos en esta etapa
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



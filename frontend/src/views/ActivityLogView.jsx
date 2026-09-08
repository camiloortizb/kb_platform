import React, { useState, useMemo } from 'react'
import {
  Activity,
  Search,
  User,
  Bot
} from 'lucide-react'

export default function ActivityLogView({
  activityLogs = []
}) {
  const [search, setSearch] = useState('')
  const [filterActor, setFilterActor] = useState('ALL')

  const actors = [
    { key: 'ALL', label: 'Todos los Actores' },
    { key: 'AI_AGENT', label: 'Agentes de IA' },
    { key: 'CATALOG_AGENT', label: 'Catalog Agent' },
    { key: 'PUBLICATION_AGENT', label: 'Publication Agent' },
    { key: 'COMMERCIAL_MGR', label: 'Equipo Comercial' },
    { key: 'BRAND_MANAGER', label: 'Brand Manager' },
    { key: 'SYSTEM', label: 'Sistema / Triggers' }
  ]

  const filtered = useMemo(() => {
    return activityLogs.filter((log) => {
      if (filterActor !== 'ALL' && log.actor !== filterActor) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return (
          log.action?.toLowerCase().includes(q) ||
          log.entity_type?.toLowerCase().includes(q) ||
          (log.entity_id && log.entity_id.toLowerCase().includes(q)) ||
          log.actor?.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [activityLogs, filterActor, search])

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-[#17181B] flex items-center gap-2.5 font-display">
            <Activity className="w-6 h-6 text-slate-800" /> Trazabilidad & Historial (Activity Log)
          </h2>
          <p className="text-xs text-[#6B6E75] mt-1">
            Registro cronológico inmutable de cada acción ejecutada por usuarios, agentes de IA y automatizaciones.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por acción, actor o ID..."
              className="pl-10 pr-4 py-2 bg-white border border-[#E7E8EB] rounded-xl text-xs text-[#17181B] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E7E8EB] gap-2 text-xs font-semibold overflow-x-auto pb-1">
        {actors.map((act) => (
          <button
            key={act.key}
            onClick={() => setFilterActor(act.key)}
            className={`pb-3 px-3.5 border-b-2 transition whitespace-nowrap ${
              filterActor === act.key
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-[#6B6E75] hover:text-[#17181B]'
            }`}
          >
            {act.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-[#E7E8EB]">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-[#F8F8F9] text-[11px] uppercase tracking-wider text-[#6B6E75] border-b border-[#E7E8EB]">
            <tr>
              <th className="p-4 font-semibold">Actor</th>
              <th className="p-4 font-semibold">Acción Realizada</th>
              <th className="p-4 font-semibold">Entidad Afectada</th>
              <th className="p-4 font-semibold">Metadatos / Detalle</th>
              <th className="p-4 text-right font-semibold">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7E8EB]">
            {filtered.map((log) => (
              <tr key={log.id} className="hover:bg-[#F8F8F9] transition">
                <td className="p-4">
                  <span className="font-bold text-[#17181B] flex items-center gap-1.5 font-mono text-[11px]">
                    {log.actor.includes('AGENT') || log.actor.includes('AI') ? (
                      <Bot className="w-3.5 h-3.5 text-slate-600" />
                    ) : (
                      <User className="w-3.5 h-3.5 text-slate-600" />
                    )}
                    {log.actor}
                  </span>
                </td>
                <td className="p-4">
                  <span className="font-mono text-slate-800 font-bold bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                    {log.action}
                  </span>
                </td>
                <td className="p-4 font-mono text-slate-800">
                  {log.entity_type} <span className="text-slate-400">#{log.entity_id}</span>
                </td>
                <td className="p-4 text-[#6B6E75] font-mono text-[11px]">
                  {log.metadata ? JSON.stringify(log.metadata) : '-'}
                </td>
                <td className="p-4 text-right font-mono text-slate-500">
                  {new Date(log.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-xs text-[#6B6E75]">
            No hay registros de actividad para este filtro.
          </div>
        )}
      </div>
    </div>
  )
}



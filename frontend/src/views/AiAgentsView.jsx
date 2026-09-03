import React, { useState } from 'react'
import {
  Sparkles,
  Bot,
  Play,
  CheckCircle2,
  Clock,
  Zap,
  ShieldCheck,
  Globe,
  Database,
  Cpu
} from 'lucide-react'

export default function AiAgentsView({
  aiRuns = [],
  onTriggerAgent
}) {
  const [runningAgent, setRunningAgent] = useState(null)

  const agents = [
    {
      id: 'discovery_agent',
      name: 'Discovery Agent',
      icon: Globe,
      color: 'text-slate-800 bg-slate-100 border-slate-300 shadow-xs',
      description: 'Rastrea tiendas oficiales D2C y descubre nuevos lanzamientos de K-Beauty sin tocar el catálogo comercial.',
      model: 'Playwright + Gemini 3.6 Flash'
    },
    {
      id: 'catalog_agent',
      name: 'Catalog Agent',
      icon: ShieldCheck,
      color: 'text-teal-800 bg-teal-50 border-teal-200 shadow-xs',
      description: 'Estructura nombres normalizados, clasifica categorías y valida códigos de barras EAN-13.',
      model: 'Gemini 3.6 Flash'
    },
    {
      id: 'enrichment_agent',
      name: 'Enrichment Agent (Vision OCR)',
      icon: Sparkles,
      color: 'text-purple-800 bg-purple-50 border-purple-200 shadow-xs',
      description: 'Segmenta infografías coreanas verticales de hasta 8,000px y extrae fórmulas INCI oficiales en nomenclatura internacional.',
      model: 'Gemini Vision 3.6 Flash'
    },
    {
      id: 'validation_agent',
      name: 'Validation Agent',
      icon: CheckCircle2,
      color: 'text-blue-800 bg-blue-50 border-blue-200 shadow-xs',
      description: 'Audita completitud de datos (dimensiones, ingredientes, descripciones) y detecta incongruencias antes de aprobación.',
      model: 'Deterministic Rule Auditor'
    },
    {
      id: 'publication_agent',
      name: 'Publication Agent',
      icon: Zap,
      color: 'text-emerald-800 bg-emerald-50 border-emerald-200 shadow-xs',
      description: 'Prepara y adapta payloads específicos para APIs de Shopify, Tienda Nube y Mercado Libre.',
      model: 'Multi-Channel Rest Adapter'
    }
  ]

  const handleRun = async (agentId) => {
    try {
      setRunningAgent(agentId)
      if (onTriggerAgent) {
        await onTriggerAgent(agentId)
      }
    } finally {
      setRunningAgent(null)
    }
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-[#17181B] flex items-center gap-2.5 font-display">
          <Cpu className="w-6 h-6 text-slate-800" /> Consola de Agentes de IA & Automatización
        </h2>
        <p className="text-xs text-[#6B6E75] mt-1">
          Supervisión y ejecución de agentes especializados bajo arquitectura Human-in-the-Loop.
        </p>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {agents.map((ag) => {
          const IconComponent = ag.icon
          const isRunning = runningAgent === ag.id

          return (
            <div
              key={ag.id}
              className="liquid-glass-card rounded-3xl p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${ag.color}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#17181B] font-display">{ag.name}</h3>
                      <span className="text-[10px] font-mono text-slate-500 font-semibold">{ag.model}</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[#6B6E75] leading-relaxed bg-[#F8F8F9] p-3 rounded-2xl border border-[#E7E8EB] mb-4">
                  {ag.description}
                </p>
              </div>

              <div className="pt-3 border-t border-[#E7E8EB] flex items-center justify-between">
                <span className="text-[10px] text-emerald-700 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Standby Activo
                </span>

                <button
                  onClick={() => handleRun(ag.id)}
                  disabled={isRunning}
                  className="px-4 py-1.5 chrome-btn-primary rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                  {isRunning ? 'Ejecutando...' : 'Ejecutar Agente'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* AI Runs History Table */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#E7E8EB]">
        <h3 className="text-base font-bold text-[#17181B] mb-4 flex items-center gap-2 font-display">
          <Clock className="w-4 h-4 text-slate-700" /> Registro de Ejecuciones IA (AI Runs Telemetry)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-[#F8F8F9] text-[11px] uppercase tracking-wider text-[#6B6E75] border-b border-[#E7E8EB]">
              <tr>
                <th className="p-3.5 font-semibold">Agente</th>
                <th className="p-3.5 font-semibold">Entidad</th>
                <th className="p-3.5 font-semibold">Resumen de Tarea</th>
                <th className="p-3.5 font-semibold">Modelo</th>
                <th className="p-3.5 font-semibold">Estado</th>
                <th className="p-3.5 text-right font-semibold">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E8EB]">
              {aiRuns.length > 0 ? (
                aiRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-[#F8F8F9] transition">
                    <td className="p-3.5 font-semibold text-slate-900">{run.agent_name}</td>
                    <td className="p-3.5 font-mono text-slate-500">
                      {run.entity_type} #{run.entity_id}
                    </td>
                    <td className="p-3.5 text-slate-700">{run.prompt_summary || 'Extracción y enriquecimiento INCI'}</td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-500">{run.model_used || 'gemini-3.6-flash'}</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                        {run.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-mono text-slate-500">
                      {new Date(run.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-[#6B6E75]">
                    Sin ejecuciones recientes registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}



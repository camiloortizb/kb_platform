import React from 'react'
import {
  Package,
  Layers,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Globe,
  ShieldCheck,
  Zap,
  Activity,
  Award,
  BarChart3
} from 'lucide-react'

export default function DashboardView({
  brands = [],
  products = [],
  negotiations = [],
  purchaseOrders = [],
  discoveredCount = 0,
  onNavigate,
  onSelectProduct
}) {
  const catalogingCount = products.filter((p) => p.lifecycle_stage === 'CATALOGING' || !p.lifecycle_stage).length
  const aiEnrichCount = products.filter((p) => p.lifecycle_stage === 'AI_ENRICHMENT').length
  const approvalCount = products.filter((p) => p.lifecycle_stage === 'APPROVAL').length
  const publishedCount = products.filter((p) => p.lifecycle_stage === 'PUBLISHED').length
  const readyCount = products.filter((p) => p.lifecycle_stage === 'READY_TO_PUBLISH').length

  const pendingPos = purchaseOrders.filter((po) => po.status === 'CONFIRMED' || po.status === 'DRAFT').length
  const activeNegs = negotiations.filter((n) => n.status !== 'REJECTED' && n.status !== 'CLOSED').length

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner / Hero with Liquid Glass & Clinical Silver Refinement */}
      <div className="relative overflow-hidden rounded-3xl liquid-glass p-8 sm:p-10 shadow-sm border border-[#E7E8EB]">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium chrome-badge mb-4">
            <Sparkles className="w-3.5 h-3.5 text-slate-700" /> PRODUCT HUB • PANEL DE CONTROL
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#17181B] tracking-tight leading-tight font-display">
            Catálogo Maestro & <span className="chrome-gradient-text">Gestión Comercial B2B</span>
          </h1>
          <p className="text-[#6B6E75] text-xs sm:text-sm mt-3 leading-relaxed max-w-2xl font-normal">
            Administración centralizada de productos, edición de precios y stock, cotizaciones mayoristas y exportaciones en tiempo real.
          </p>
        </div>
      </div>

      {/* Primary KPI Grid (70% Minimal Clean × 10% Silver Chrome) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div
          onClick={() => onNavigate('brands')}
          className="liquid-glass-card rounded-2xl p-4 cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-[#6B6E75] mb-2">
            <span className="font-semibold text-[11px] uppercase tracking-wider text-[#6B6E75]">Marcas</span>
            <Layers className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition" />
          </div>
          <div className="text-2xl font-extrabold text-[#17181B] font-display">{brands.length}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono font-medium">
            {brands.filter((b) => b.status === 'RADAR').length} en radar activo
          </div>
        </div>

        <div
          onClick={() => onNavigate('negotiations')}
          className="liquid-glass-card rounded-2xl p-4 cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-[#6B6E75] mb-2">
            <span className="font-semibold text-[11px] uppercase tracking-wider text-[#6B6E75]">Negociaciones</span>
            <TrendingUp className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition" />
          </div>
          <div className="text-2xl font-extrabold text-[#17181B] font-display">{activeNegs}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono font-medium">
            {negotiations.filter((n) => n.status === 'AGREEMENT').length} con acuerdo B2B
          </div>
        </div>

        <div
          onClick={() => onNavigate('purchase_orders')}
          className="liquid-glass-card rounded-2xl p-4 cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-[#6B6E75] mb-2">
            <span className="font-semibold text-[11px] uppercase tracking-wider text-[#6B6E75]">Órdenes Compra</span>
            <ShoppingCart className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition" />
          </div>
          <div className="text-2xl font-extrabold text-[#17181B] font-display">{purchaseOrders.length}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono font-medium">
            {pendingPos} en tránsito
          </div>
        </div>

        <div
          onClick={() => onNavigate('pipeline')}
          className="liquid-glass-card rounded-2xl p-4 cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-[#6B6E75] mb-2">
            <span className="font-semibold text-[11px] uppercase tracking-wider text-[#6B6E75]">Catalogación</span>
            <Clock className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition" />
          </div>
          <div className="text-2xl font-extrabold text-[#17181B] font-display">{catalogingCount}</div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono font-medium">
            {aiEnrichCount} con IA INCI
          </div>
        </div>

        <div
          onClick={() => onNavigate('approvals')}
          className="liquid-glass-card rounded-2xl p-4 cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-[#6B6E75] mb-2">
            <span className="font-semibold text-[11px] uppercase tracking-wider text-[#6B6E75]">Aprobación</span>
            <AlertCircle className="w-4 h-4 text-amber-600 group-hover:text-slate-900 transition" />
          </div>
          <div className="text-2xl font-extrabold text-[#17181B] font-display">{approvalCount}</div>
          <div className="text-[10px] text-amber-700 mt-1 font-mono font-medium">
            Brand Manager queue
          </div>
        </div>

        <div
          onClick={() => onNavigate('publications')}
          className="liquid-glass-card rounded-2xl p-4 cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs text-[#6B6E75] mb-2">
            <span className="font-semibold text-[11px] uppercase tracking-wider text-[#6B6E75]">Publicados</span>
            <Globe className="w-4 h-4 text-emerald-600 group-hover:text-slate-900 transition" />
          </div>
          <div className="text-2xl font-extrabold text-[#17181B] font-display">{publishedCount}</div>
          <div className="text-[10px] text-emerald-700 mt-1 font-mono font-medium">
            3 canales en vivo
          </div>
        </div>
      </div>

      {/* Global Pipeline Visualizer (Liquid Glass Container) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E7E8EB] shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-[#17181B] flex items-center gap-2 font-display">
              <Activity className="w-4 h-4 text-slate-700" /> Pipeline Operacional del Negocio
            </h3>
            <p className="text-xs text-[#6B6E75] mt-0.5">
              Estado de avance del catálogo comercial a través de las etapas clave.
            </p>
          </div>
          <button
            onClick={() => onNavigate('pipeline')}
            className="text-xs font-semibold text-slate-800 hover:text-black flex items-center gap-1.5 transition px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200"
          >
            Ver Kanban <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="bg-[#F8F8F9] p-4 rounded-2xl border border-[#E7E8EB] text-center">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
              1. Negociación
            </span>
            <div className="text-xl font-extrabold text-[#17181B] font-display">{activeNegs}</div>
            <span className="text-[10px] text-[#6B6E75]">Marcas en acuerdo</span>
          </div>

          <div className="bg-[#F8F8F9] p-4 rounded-2xl border border-[#E7E8EB] text-center">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
              2. Orden Compra
            </span>
            <div className="text-xl font-extrabold text-[#17181B] font-display">{pendingPos}</div>
            <span className="text-[10px] text-[#6B6E75]">OCs confirmadas</span>
          </div>

          <div className="bg-[#F8F8F9] p-4 rounded-2xl border border-[#E7E8EB] text-center">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
              3. Catalogación
            </span>
            <div className="text-xl font-extrabold text-[#17181B] font-display">{catalogingCount}</div>
            <span className="text-[10px] text-[#6B6E75]">En estructuración</span>
          </div>

          <div className="bg-[#F8F8F9] p-4 rounded-2xl border border-[#E7E8EB] text-center">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
              4. IA Enriquecida
            </span>
            <div className="text-xl font-extrabold text-[#17181B] font-display">{aiEnrichCount}</div>
            <span className="text-[10px] text-[#6B6E75]">INCI y uso listo</span>
          </div>

          <div className="bg-[#F8F8F9] p-4 rounded-2xl border border-[#E7E8EB] text-center">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
              5. Aprobación
            </span>
            <div className="text-xl font-extrabold text-[#17181B] font-display">{approvalCount}</div>
            <span className="text-[10px] text-[#6B6E75]">Revisión humana</span>
          </div>

          <div className="bg-[#F8F8F9] p-4 rounded-2xl border border-[#E7E8EB] text-center">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">
              6. Publicación
            </span>
            <div className="text-xl font-extrabold text-emerald-800 font-display">{publishedCount}</div>
            <span className="text-[10px] text-emerald-600">Multicanal activo</span>
          </div>
        </div>
      </div>

      {/* Critical Action Alerts & Automation Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Action Feed */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E7E8EB] shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-[#17181B] mb-4 flex items-center gap-2 font-display">
              <AlertCircle className="w-4 h-4 text-amber-600" /> Acciones Pendientes Inmediatas
            </h3>

            <div className="space-y-3">
              {approvalCount > 0 && (
                <div
                  onClick={() => onNavigate('approvals')}
                  className="p-4 bg-amber-50/70 hover:bg-amber-50 border border-amber-200/80 rounded-2xl flex items-center justify-between cursor-pointer transition shadow-xs"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs border border-amber-200 font-mono">
                      {approvalCount}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        Productos esperando aprobación de Brand Manager
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Fichas técnicas al 100% listas para validación comercial.
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-amber-700" />
                </div>
              )}

              {pendingPos > 0 && (
                <div
                  onClick={() => onNavigate('purchase_orders')}
                  className="p-4 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-2xl flex items-center justify-between cursor-pointer transition shadow-xs"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-xs border border-slate-300 font-mono">
                      {pendingPos}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900">
                        Órdenes de Compra confirmadas listas para incorporación
                      </div>
                      <div className="text-[11px] text-slate-600">
                        Items listos para cruce automático por EAN / SKU.
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-700" />
                </div>
              )}

              <div
                onClick={() => onNavigate('discovery')}
                className="p-4 bg-purple-50/60 hover:bg-purple-50 border border-purple-200/70 rounded-2xl flex items-center justify-between cursor-pointer transition shadow-xs"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center font-bold text-xs border border-purple-200 font-mono">
                    {discoveredCount}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-900">
                      Productos descubiertos por scraping en fuentes oficiales
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Disponibles para análisis comercial sin polucionar catálogo.
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-purple-700" />
              </div>
            </div>
          </div>
        </div>

        {/* AI & Automation Engine Status */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#E7E8EB] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#17181B] flex items-center gap-2 font-display">
                <Sparkles className="w-4 h-4 text-slate-700" /> Agentes de IA & Automatización
              </h3>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                Gemini 3.6 Flash Active
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F8F8F9] p-3.5 rounded-2xl border border-[#E7E8EB]">
                <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Catalog Agent
                </div>
                <p className="text-[11px] text-[#6B6E75]">
                  Estructuración de fichas y normalización INCI.
                </p>
              </div>

              <div className="bg-[#F8F8F9] p-3.5 rounded-2xl border border-[#E7E8EB]">
                <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Enrichment Agent
                </div>
                <p className="text-[11px] text-[#6B6E75]">
                  Extracción de texto técnico y estructuración de beneficios.
                </p>
              </div>

              <div className="bg-[#F8F8F9] p-3.5 rounded-2xl border border-[#E7E8EB]">
                <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-blue-600" /> Validation Agent
                </div>
                <p className="text-[11px] text-[#6B6E75]">
                  Detección de incongruencias y campos faltantes.
                </p>
              </div>

              <div className="bg-[#F8F8F9] p-3.5 rounded-2xl border border-[#E7E8EB]">
                <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
                  <Globe className="w-3.5 h-3.5 text-slate-700" /> Publication Agent
                </div>
                <p className="text-[11px] text-[#6B6E75]">
                  Preparación de payloads para Shopify, Tienda Nube y ML.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3.5 border-t border-[#E7E8EB] flex items-center justify-between text-xs text-[#6B6E75]">
            <span>Trazabilidad 100% garantizada en Activity Log</span>
            <button
              onClick={() => onNavigate('ai_agents')}
              className="text-slate-900 hover:text-black font-semibold transition flex items-center gap-1"
            >
              Abrir Consola de Agentes →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}



import React, { useState, useEffect } from 'react'
import {
  Sliders,
  DollarSign,
  Package,
  ShieldCheck,
  Globe,
  Save,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Building2,
  Percent,
  TrendingUp,
  Link,
  Zap,
  Info,
  SlidersHorizontal,
  Server
} from 'lucide-react'
import { configService } from '../services/configService'
import { useToast } from '../components/ToastContainer'

export default function SettingsView() {
  const { addToast } = useToast()
  const [activeTab, setActiveTab] = useState('commercial') // 'commercial', 'purchasing', 'taxes', 'integrations'
  const [config, setConfig] = useState(configService.getConfig())
  const [saving, setSaving] = useState(false)
  const [testingChannel, setTestingChannel] = useState(null)

  useEffect(() => {
    setConfig(configService.getConfig())
  }, [])

  const handleSaveAll = async () => {
    try {
      setSaving(true)
      const res = await configService.saveConfig(config)
      if (res.success) {
        addToast('¡Parámetros y configuraciones guardados exitosamente!', 'success')
      } else {
        addToast('Error al guardar: ' + res.error, 'error')
      }
    } catch (err) {
      addToast('Error al guardar: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleTestApi = async (channelKey) => {
    setTestingChannel(channelKey)
    try {
      const res = await configService.testApiConnection(channelKey)
      addToast(res.message, 'success', 4500)
    } catch (err) {
      addToast('Error en la prueba de conexión: ' + err.message, 'error')
    } finally {
      setTestingChannel(null)
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header with Save Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200 mb-2 font-mono">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-700" /> Platform Governance & Operations
          </div>
          <h2 className="text-2xl font-extrabold text-[#17181B] font-display">
            Configuración Global <span className="chrome-gradient-text">& Parámetros de la Plataforma</span>
          </h2>
          <p className="text-xs text-[#6B6E75] mt-1">
            Administración centralizada de tipos de cambio, márgenes mayoristas, alícuotas fiscales y conectores API de e-commerce.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="px-5 py-2.5 chrome-btn-primary rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm self-start sm:self-auto"
        >
          <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar Configuración'}
        </button>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-[#E7E8EB] gap-2 text-xs font-semibold overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('commercial')}
          className={`pb-3 px-4 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'commercial'
              ? 'border-slate-900 text-slate-900 font-bold'
              : 'border-transparent text-[#6B6E75] hover:text-[#17181B]'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Comercial, Monedas & Precios</span>
        </button>

        <button
          onClick={() => setActiveTab('purchasing')}
          className={`pb-3 px-4 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'purchasing'
              ? 'border-slate-900 text-slate-900 font-bold'
              : 'border-transparent text-[#6B6E75] hover:text-[#17181B]'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Criterios de Compra & Stock</span>
        </button>

        <button
          onClick={() => setActiveTab('taxes')}
          className={`pb-3 px-4 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'taxes'
              ? 'border-slate-900 text-slate-900 font-bold'
              : 'border-transparent text-[#6B6E75] hover:text-[#17181B]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Percepciones Fiscales & Empresa</span>
        </button>

        <button
          onClick={() => setActiveTab('integrations')}
          className={`pb-3 px-4 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'integrations'
              ? 'border-slate-900 text-slate-900 font-bold'
              : 'border-transparent text-[#6B6E75] hover:text-[#17181B]'
          }`}
        >
          <Zap className="w-4 h-4 text-purple-600" />
          <span>Conectores API & Sincronizaciones</span>
        </button>
      </div>

      {/* ============================================================================
          TAB 1: COMMERCIAL, CURRENCIES & PRICING
         ============================================================================ */}
      {activeTab === 'commercial' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
          {/* Card 1: Currencies & Exchange Rate */}
          <div className="bg-white p-6 rounded-3xl border border-[#E7E8EB] shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#E7E8EB]">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm font-display">Monedas & Tipo de Cambio</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Moneda Principal (Catálogo)</label>
                <input
                  type="text"
                  value={config.commercial.primaryCurrency}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      commercial: { ...config.commercial, primaryCurrency: e.target.value.toUpperCase() }
                    })
                  }
                  className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Moneda Secundaria (Local)</label>
                <input
                  type="text"
                  value={config.commercial.secondaryCurrency}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      commercial: { ...config.commercial, secondaryCurrency: e.target.value.toUpperCase() }
                    })
                  }
                  className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="font-semibold text-slate-700 block mb-1">
                Tipo de Cambio de Referencia (1 {config.commercial.primaryCurrency} = ? {config.commercial.secondaryCurrency})
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={config.commercial.exchangeRate}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      commercial: { ...config.commercial, exchangeRate: parseFloat(e.target.value) || 0 }
                    })
                  }
                  className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl pl-8 pr-4 py-2 text-xs font-mono font-black text-slate-900 focus:outline-none"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-slate-400 font-bold">$</span>
              </div>
              <p className="text-[11px] text-[#6B6E75] mt-1.5">
                Utilizado para cotizaciones y pedidos B2B expresados en moneda local.
              </p>
            </div>
          </div>

          {/* Card 2: Default Margins & MOQ */}
          <div className="bg-white p-6 rounded-3xl border border-[#E7E8EB] shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#E7E8EB]">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-sm font-display">Márgenes & Reglas B2B</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Margen Mayorista Base (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={config.commercial.defaultWholesaleMarginPct}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        commercial: { ...config.commercial, defaultWholesaleMarginPct: parseFloat(e.target.value) || 0 }
                      })
                    }
                    className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl pr-7 pl-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Markup s/ Costo CIF (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={config.commercial.defaultCostMarkupPct}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        commercial: { ...config.commercial, defaultCostMarkupPct: parseFloat(e.target.value) || 0 }
                      })
                    }
                    className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl pr-7 pl-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                </div>
              </div>
            </div>

            <div className="text-xs">
              <label className="font-semibold text-slate-700 block mb-1">Pack Mínimo de Pedido por Defecto (MOQ)</label>
              <input
                type="number"
                value={config.commercial.defaultMoq}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    commercial: { ...config.commercial, defaultMoq: parseInt(e.target.value) || 1 }
                  })
                }
                className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none"
              />
              <p className="text-[11px] text-[#6B6E75] mt-1.5">
                Cantidad mínima sugerida al crear nuevos productos en el catálogo comercial.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================
          TAB 2: PURCHASING & STOCK CRITERIA
         ============================================================================ */}
      {activeTab === 'purchasing' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
          {/* Card 1: Stock Alert Thresholds */}
          <div className="bg-white p-6 rounded-3xl border border-[#E7E8EB] shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#E7E8EB]">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="font-bold text-slate-900 text-sm font-display">Umbrales de Alerta de Stock</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Alerta de Stock Bajo (u.)</label>
                <input
                  type="number"
                  value={config.purchasing.lowStockThreshold}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      purchasing: { ...config.purchasing, lowStockThreshold: parseInt(e.target.value) || 0 }
                    })
                  }
                  className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-900 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Aviso preventivo</span>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Stock Crítico (u.)</label>
                <input
                  type="number"
                  value={config.purchasing.criticalStockThreshold}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      purchasing: { ...config.purchasing, criticalStockThreshold: parseInt(e.target.value) || 0 }
                    })
                  }
                  className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl px-3 py-2 text-xs font-mono font-bold text-rose-900 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Rotura inminente</span>
              </div>
            </div>
          </div>

          {/* Card 2: International Import Costs */}
          <div className="bg-white p-6 rounded-3xl border border-[#E7E8EB] shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#E7E8EB]">
              <Package className="w-4 h-4 text-purple-600" />
              <h3 className="font-bold text-slate-900 text-sm font-display">Costos de Importación & Logística</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Flete Internacional Estimado (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={config.purchasing.internationalFreightPct}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        purchasing: { ...config.purchasing, internationalFreightPct: parseFloat(e.target.value) || 0 }
                      })
                    }
                    className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl pr-7 pl-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Arancel Aduanero Promedio (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={config.purchasing.customsDutyPct}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        purchasing: { ...config.purchasing, customsDutyPct: parseFloat(e.target.value) || 0 }
                      })
                    }
                    className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl pr-7 pl-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================
          TAB 3: TAXES & FISCAL PERCEPTIONS
         ============================================================================ */}
      {activeTab === 'taxes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
          {/* Card 1: Tax Rates */}
          <div className="bg-white p-6 rounded-3xl border border-[#E7E8EB] shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#E7E8EB]">
              <Percent className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm font-display">Alícuotas & Percepciones Impositivas</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">IVA General (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={config.taxes.standardVatRate}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        taxes: { ...config.taxes, standardVatRate: parseFloat(e.target.value) || 0 }
                      })
                    }
                    className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl pr-7 pl-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Percepción Ingresos Brutos (%)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={config.taxes.grossIncomePerceptionRate}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        taxes: { ...config.taxes, grossIncomePerceptionRate: parseFloat(e.target.value) || 0 }
                      })
                    }
                    className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl pr-7 pl-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Company Legal Details */}
          <div className="bg-white p-6 rounded-3xl border border-[#E7E8EB] shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#E7E8EB]">
              <Building2 className="w-4 h-4 text-slate-700" />
              <h3 className="font-bold text-slate-900 text-sm font-display">Datos Fiscales de la Empresa</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Razón Social Emisora</label>
                <input
                  type="text"
                  value={config.taxes.companyLegalName}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      taxes: { ...config.taxes, companyLegalName: e.target.value }
                    })
                  }
                  className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">CUIT / Identificación Fiscal</label>
                  <input
                    type="text"
                    value={config.taxes.companyTaxId}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        taxes: { ...config.taxes, companyTaxId: e.target.value }
                      })
                    }
                    className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Teléfono Comercial</label>
                  <input
                    type="text"
                    value={config.taxes.companyPhone}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        taxes: { ...config.taxes, companyPhone: e.target.value }
                      })
                    }
                    className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================
          TAB 4: API INTEGRATIONS (SHOPIFY, TIENDA NUBE, MERCADO LIBRE)
         ============================================================================ */}
      {activeTab === 'integrations' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-start gap-3 text-xs text-purple-900">
            <Info className="w-5 h-5 text-purple-700 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Centro de Sincronización de APIs E-Commerce</span>
              Configura las credenciales y parámetros de sincronización automática de stock y precios con tus tiendas oficiales.
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Shopify Card */}
            <div className="bg-white p-6 rounded-3xl border border-[#E7E8EB] shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                      S
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Shopify API</h4>
                      <span className="text-[10px] text-slate-500 font-mono">REST / GraphQL</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    Listo para Conectar
                  </span>
                </div>

                <div className="space-y-2 text-xs pt-2">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Store URL (.myshopify.com)</label>
                    <input
                      type="text"
                      value={config.integrations.shopify.storeUrl}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          integrations: {
                            ...config.integrations,
                            shopify: { ...config.integrations.shopify, storeUrl: e.target.value }
                          }
                        })
                      }
                      className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Admin API Access Token</label>
                    <input
                      type="password"
                      placeholder="shpat_xxxxxxxxxxxxxxxxxxxx"
                      value={config.integrations.shopify.accessToken}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          integrations: {
                            ...config.integrations,
                            shopify: { ...config.integrations.shopify, accessToken: e.target.value }
                          }
                        })
                      }
                      className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none"
                    />
                  </div>

                  <div className="pt-2 space-y-2 border-t border-[#E7E8EB]">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.integrations.shopify.syncStock}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            integrations: {
                              ...config.integrations,
                              shopify: { ...config.integrations.shopify, syncStock: e.target.checked }
                            }
                          })
                        }
                        className="rounded text-slate-900 focus:ring-slate-400"
                      />
                      <span className="text-slate-700 text-xs">Sincronizar Stock Automáticamente</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.integrations.shopify.syncPrice}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            integrations: {
                              ...config.integrations,
                              shopify: { ...config.integrations.shopify, syncPrice: e.target.checked }
                            }
                          })
                        }
                        className="rounded text-slate-900 focus:ring-slate-400"
                      />
                      <span className="text-slate-700 text-xs">Sincronizar Precios PVP Sugeridos</span>
                    </label>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleTestApi('shopify')}
                disabled={testingChannel === 'shopify'}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-200"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingChannel === 'shopify' ? 'animate-spin' : ''}`} />
                {testingChannel === 'shopify' ? 'Probando...' : 'Probar Conexión Shopify'}
              </button>
            </div>

            {/* Tienda Nube Card */}
            <div className="bg-white p-6 rounded-3xl border border-[#E7E8EB] shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm">
                      TN
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Tienda Nube API</h4>
                      <span className="text-[10px] text-slate-500 font-mono">REST Webhooks</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    Listo para Conectar
                  </span>
                </div>

                <div className="space-y-2 text-xs pt-2">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Store ID (User ID)</label>
                    <input
                      type="text"
                      value={config.integrations.tiendanube.storeId}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          integrations: {
                            ...config.integrations,
                            tiendanube: { ...config.integrations.tiendanube, storeId: e.target.value }
                          }
                        })
                      }
                      className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Access Token</label>
                    <input
                      type="password"
                      placeholder="bearer_token_xxxxxxxx"
                      value={config.integrations.tiendanube.accessToken}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          integrations: {
                            ...config.integrations,
                            tiendanube: { ...config.integrations.tiendanube, accessToken: e.target.value }
                          }
                        })
                      }
                      className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none"
                    />
                  </div>

                  <div className="pt-2 border-t border-[#E7E8EB]">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.integrations.tiendanube.syncStock}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            integrations: {
                              ...config.integrations,
                              tiendanube: { ...config.integrations.tiendanube, syncStock: e.target.checked }
                            }
                          })
                        }
                        className="rounded text-slate-900 focus:ring-slate-400"
                      />
                      <span className="text-slate-700 text-xs">Sincronizar Stock Automáticamente</span>
                    </label>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleTestApi('tiendanube')}
                disabled={testingChannel === 'tiendanube'}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-200"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingChannel === 'tiendanube' ? 'animate-spin' : ''}`} />
                {testingChannel === 'tiendanube' ? 'Probando...' : 'Probar Conexión Tienda Nube'}
              </button>
            </div>

            {/* Mercado Libre Card */}
            <div className="bg-white p-6 rounded-3xl border border-[#E7E8EB] shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                      ML
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Mercado Libre</h4>
                      <span className="text-[10px] text-slate-500 font-mono">OAuth 2.0 API</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    Listo para Conectar
                  </span>
                </div>

                <div className="space-y-2 text-xs pt-2">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Application ID (App ID)</label>
                    <input
                      type="text"
                      value={config.integrations.mercadolibre.appId}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          integrations: {
                            ...config.integrations,
                            mercadolibre: { ...config.integrations.mercadolibre, appId: e.target.value }
                          }
                        })
                      }
                      className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Secret Key</label>
                    <input
                      type="password"
                      placeholder="client_secret_xxxxxxxx"
                      value={config.integrations.mercadolibre.secretKey}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          integrations: {
                            ...config.integrations,
                            mercadolibre: { ...config.integrations.mercadolibre, secretKey: e.target.value }
                          }
                        })
                      }
                      className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none"
                    />
                  </div>

                  <div className="pt-2 border-t border-[#E7E8EB]">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.integrations.mercadolibre.syncStock}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            integrations: {
                              ...config.integrations,
                              mercadolibre: { ...config.integrations.mercadolibre, syncStock: e.target.checked }
                            }
                          })
                        }
                        className="rounded text-slate-900 focus:ring-slate-400"
                      />
                      <span className="text-slate-700 text-xs">Sincronizar Stock Automáticamente</span>
                    </label>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleTestApi('mercadolibre')}
                disabled={testingChannel === 'mercadolibre'}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-200"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingChannel === 'mercadolibre' ? 'animate-spin' : ''}`} />
                {testingChannel === 'mercadolibre' ? 'Probando...' : 'Probar Conexión MELI'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

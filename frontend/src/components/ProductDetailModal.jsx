import React, { useState } from 'react'
import {
  X,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Globe,
  Printer,
  Edit3,
  Save,
  DollarSign,
  Sliders
} from 'lucide-react'
import { useToast } from './ToastContainer'

export default function ProductDetailModal({
  product,
  brandName,
  images = [],
  dimensions,
  channels = [],
  onClose,
  onUpdateStage,
  onSaveProduct
}) {
  const { addToast } = useToast()
  const [activeTab, setActiveTab] = useState('commercial') // 'commercial', 'overview', 'inci', 'usage', 'channels'
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [copiedInci, setCopiedInci] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Editable Form State
  const [prevProduct, setPrevProduct] = useState(product)
  const [formData, setFormData] = useState(() => ({
    name: product?.name || '',
    format: product?.format || '',
    category: product?.category || 'Cuidado Facial',
    wholesale_price: Number(product?.wholesale_price || 14.50),
    retail_price: Number(product?.retail_price || 26.00),
    cost_price: Number(product?.cost_price || 8.50),
    stock_quantity: Number(product?.stock_quantity || 100),
    moq: Number(product?.moq || 3),
    is_b2b_active: product?.is_b2b_active !== false,
    description_full: product?.description_full || product?.description_short || '',
    key_ingredients: product?.key_ingredients || '',
    usage_instructions: product?.usage_instructions || '',
    skin_types: product?.skin_types || '',
    benefits: product?.benefits || ''
  }))

  if (product !== prevProduct) {
    setPrevProduct(product)
    if (product) {
      setFormData({
        name: product.name || '',
        format: product.format || '',
        category: product.category || 'Cuidado Facial',
        wholesale_price: Number(product.wholesale_price || 14.50),
        retail_price: Number(product.retail_price || 26.00),
        cost_price: Number(product.cost_price || 8.50),
        stock_quantity: Number(product.stock_quantity || 100),
        moq: Number(product.moq || 3),
        is_b2b_active: product.is_b2b_active !== false,
        description_full: product.description_full || product.description_short || '',
        key_ingredients: product.key_ingredients || '',
        usage_instructions: product.usage_instructions || '',
        skin_types: product.skin_types || '',
        benefits: product.benefits || ''
      })
      setIsEditing(false)
      setSaveSuccess(false)
    }
  }

  if (!product) return null

  const handleCopyInci = (text) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedInci(true)
    setTimeout(() => setCopiedInci(false), 2000)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      if (onSaveProduct) {
        await onSaveProduct(product.id, formData)
      }
      setIsEditing(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2500)
    } catch (err) {
      addToast('Error al guardar el producto: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Live calculations for Margin and Markup
  const wholesale = Number(formData.wholesale_price) || 0
  const retail = Number(formData.retail_price) || 0
  const cost = Number(formData.cost_price) || 0

  const marginPercent = retail > 0 ? (((retail - wholesale) / retail) * 100).toFixed(1) : '0.0'
  const markupPercent = cost > 0 ? (((wholesale - cost) / cost) * 100).toFixed(1) : '0.0'

  const stages = [
    { key: 'DISCOVERY', label: 'Descubierto' },
    { key: 'PURCHASE', label: 'OC Confirmada' },
    { key: 'CATALOGING', label: 'Catalogación' },
    { key: 'AI_ENRICHMENT', label: 'IA Enriquecido' },
    { key: 'APPROVAL', label: 'Aprobación' },
    { key: 'READY_TO_PUBLISH', label: 'Listo p/ Publicar' },
    { key: 'PUBLISHED', label: 'Publicado' }
  ]

  const stageIdx = stages.findIndex((s) => s.key === product.lifecycle_stage)
  const currentStageIndex = stageIdx >= 0 ? stageIdx : 2

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-white border border-[#E7E8EB] rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-[#E7E8EB] flex items-center justify-between bg-[#F8F8F9]">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-900 text-white shadow-xs">
              {brandName || 'K-Beauty'}
            </span>
            <span className="text-xs text-emerald-800 font-medium flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> {product.verification_status || 'VERIFICADO OFICIAL'}
            </span>
            <span className="text-xs text-purple-900 font-medium flex items-center gap-1 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Completitud: {product.completeness_score || 100}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 chrome-btn-secondary text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-600" /> Editar Ficha B2B
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 chrome-btn-primary text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition"
              >
                <Save className="w-3.5 h-3.5" /> {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-black hover:bg-slate-200/60 rounded-full transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Operational Timeline */}
        <div className="px-6 py-3 bg-white border-b border-[#E7E8EB] overflow-x-auto">
          <div className="flex items-center justify-between min-w-[600px] gap-2">
            {stages.map((stg, idx) => {
              const isPast = idx < currentStageIndex
              const isCurrent = idx === currentStageIndex
              return (
                <div key={stg.key} className="flex items-center gap-2 flex-1">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition ${
                      isPast
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : isCurrent
                        ? 'bg-slate-900 text-white border-slate-900 ring-4 ring-slate-200'
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}
                  >
                    {isPast ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                  </div>
                  <span
                    className={`text-[11px] font-medium whitespace-nowrap ${
                      isCurrent ? 'text-slate-900 font-bold' : isPast ? 'text-slate-700' : 'text-slate-400'
                    }`}
                  >
                    {stg.label}
                  </span>
                  {idx < stages.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-1 rounded ${
                        isPast ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Save Notification */}
        {saveSuccess && (
          <div className="bg-emerald-50 px-6 py-2 border-b border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ¡Ficha de producto y precios B2B actualizados correctamente en Supabase!
          </div>
        )}

        {/* Modal Main Content */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6 bg-[#F5F5F7]">
          {/* Left Column: Image Gallery & Logistics Card */}
          <div className="md:col-span-5 flex flex-col gap-4">
            <div className="relative aspect-square w-full bg-white rounded-2xl border border-[#E7E8EB] overflow-hidden flex items-center justify-center p-6 shadow-xs">
              {images.length > 0 ? (
                <img
                  src={images[currentImageIndex]}
                  alt={formData.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-slate-400 text-xs">Sin imagen disponible</div>
              )}

              {images.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/90 text-slate-800 rounded-full hover:bg-white transition shadow-sm border border-slate-200"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/90 text-slate-800 rounded-full hover:bg-white transition shadow-sm border border-slate-200"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-12 h-12 rounded-xl bg-white border overflow-hidden flex-shrink-0 p-1 transition ${
                      currentImageIndex === idx
                        ? 'border-slate-900 ring-2 ring-slate-300'
                        : 'border-[#E7E8EB] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}

            {/* Logistics & Barcodes Card */}
            <div className="bg-white p-4 rounded-2xl border border-[#E7E8EB] text-xs space-y-2.5 shadow-xs">
              <div className="flex justify-between items-center">
                <span className="text-[#6B6E75]">Código EAN-13:</span>
                <span className="font-mono chrome-badge px-2 py-0.5 rounded text-[11px] font-bold">
                  {product.ean || 'N/D'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6B6E75]">SKU Comercial:</span>
                <span className="font-mono text-[#17181B] font-semibold">{product.sku}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6B6E75]">Formato / Volumen:</span>
                {!isEditing ? (
                  <span className="text-[#17181B] font-medium">{formData.format || 'Standard'}</span>
                ) : (
                  <input
                    type="text"
                    value={formData.format}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                    className="w-24 text-right bg-[#F8F8F9] border border-slate-300 rounded px-1.5 py-0.5 text-xs font-semibold"
                  />
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#6B6E75]">Origen de Registro:</span>
                <span className="text-slate-700 font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded">
                  {product.origin || 'IMPORT'}
                </span>
              </div>
              {dimensions && (
                <div className="flex justify-between border-t border-[#E7E8EB] pt-2 text-[11px]">
                  <span className="text-[#6B6E75]">Dimensiones (cm):</span>
                  <span className="text-[#17181B] font-mono">
                    {dimensions.height_cm} × {dimensions.width_cm} × {dimensions.depth_cm} cm
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Detailed Tabs */}
          <div className="md:col-span-7 flex flex-col">
            {!isEditing ? (
              <h2 className="text-xl font-bold text-[#17181B] leading-snug mb-3 font-display">
                {formData.name}
              </h2>
            ) : (
              <div className="mb-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nombre Comercial:</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full font-display font-bold text-sm bg-white border border-slate-300 rounded-xl px-3 py-2 text-[#17181B] focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
            )}

            {/* Tabs Selector */}
            <div className="flex border-b border-[#E7E8EB] gap-2 mb-4 text-xs font-semibold overflow-x-auto">
              <button
                onClick={() => setActiveTab('commercial')}
                className={`pb-2.5 px-2 border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'commercial'
                    ? 'border-slate-900 text-slate-900 font-bold'
                    : 'border-transparent text-[#6B6E75] hover:text-[#17181B]'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Precios & B2B</span>
              </button>

              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-2.5 px-2 border-b-2 transition whitespace-nowrap ${
                  activeTab === 'overview'
                    ? 'border-slate-900 text-slate-900 font-bold'
                    : 'border-transparent text-[#6B6E75] hover:text-[#17181B]'
                }`}
              >
                Ficha Técnica
              </button>

              <button
                onClick={() => setActiveTab('inci')}
                className={`pb-2.5 px-2 border-b-2 transition whitespace-nowrap ${
                  activeTab === 'inci'
                    ? 'border-slate-900 text-slate-900 font-bold'
                    : 'border-transparent text-[#6B6E75] hover:text-[#17181B]'
                }`}
              >
                Ingredientes INCI
              </button>

              <button
                onClick={() => setActiveTab('usage')}
                className={`pb-2.5 px-2 border-b-2 transition whitespace-nowrap ${
                  activeTab === 'usage'
                    ? 'border-slate-900 text-slate-900 font-bold'
                    : 'border-transparent text-[#6B6E75] hover:text-[#17181B]'
                }`}
              >
                Uso & Piel
              </button>

              <button
                onClick={() => setActiveTab('channels')}
                className={`pb-2.5 px-2 border-b-2 transition whitespace-nowrap ${
                  activeTab === 'channels'
                    ? 'border-slate-900 text-slate-900 font-bold'
                    : 'border-transparent text-[#6B6E75] hover:text-[#17181B]'
                }`}
              >
                Canales ({channels.length})
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 text-xs leading-relaxed text-[#17181B]">
              {/* TAB 1: B2B COMMERCIAL & PRICING */}
              {activeTab === 'commercial' && (
                <div className="space-y-4 bg-white p-5 rounded-2xl border border-[#E7E8EB] shadow-xs animate-fadeIn">
                  <h4 className="font-bold text-slate-900 text-sm font-display flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-slate-700" /> Estructura de Precios & Parámetros Mayoristas
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    {/* Cost Price */}
                    <div className="p-3.5 bg-[#F8F8F9] rounded-xl border border-[#E7E8EB]">
                      <span className="text-[10px] font-bold text-[#6B6E75] uppercase block mb-1">
                        Costo FOB / CIF (USD)
                      </span>
                      {!isEditing ? (
                        <div className="text-base font-black font-mono text-slate-800">
                          ${cost.toFixed(2)}
                        </div>
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          value={formData.cost_price}
                          onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 font-mono font-bold text-slate-900 text-sm focus:outline-none"
                        />
                      )}
                      <span className="text-[10px] text-slate-500 mt-1 block">Base de compra</span>
                    </div>

                    {/* Wholesale B2B Price */}
                    <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase block mb-1">
                        Precio Mayorista B2B (USD)
                      </span>
                      {!isEditing ? (
                        <div className="text-base font-black font-mono text-emerald-900">
                          ${wholesale.toFixed(2)}
                        </div>
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          value={formData.wholesale_price}
                          onChange={(e) => setFormData({ ...formData, wholesale_price: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-white border border-emerald-300 rounded-lg px-2 py-1 font-mono font-bold text-emerald-900 text-sm focus:outline-none"
                        />
                      )}
                      <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">
                        Markup: +{markupPercent}% s/ costo
                      </span>
                    </div>

                    {/* Retail MSRP Price */}
                    <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200">
                      <span className="text-[10px] font-bold text-blue-800 uppercase block mb-1">
                        PVP Sugerido al Público (USD)
                      </span>
                      {!isEditing ? (
                        <div className="text-base font-black font-mono text-blue-900">
                          ${retail.toFixed(2)}
                        </div>
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          value={formData.retail_price}
                          onChange={(e) => setFormData({ ...formData, retail_price: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-white border border-blue-300 rounded-lg px-2 py-1 font-mono font-bold text-blue-900 text-sm focus:outline-none"
                        />
                      )}
                      <span className="text-[10px] text-blue-700 font-semibold mt-1 block">
                        Margen Mayorista: {marginPercent}%
                      </span>
                    </div>
                  </div>

                  {/* Stock & MOQ Parameters */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#E7E8EB]">
                    <div>
                      <span className="text-[10px] font-bold text-[#6B6E75] uppercase block mb-1">
                        Stock Físico / Disponible:
                      </span>
                      {!isEditing ? (
                        <span className="font-mono font-bold text-slate-900 text-sm bg-slate-100 px-3 py-1 rounded-lg inline-block">
                          {formData.stock_quantity} unidades
                        </span>
                      ) : (
                        <input
                          type="number"
                          value={formData.stock_quantity}
                          onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                          className="w-full bg-[#F8F8F9] border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                        />
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-[#6B6E75] uppercase block mb-1">
                        Pack Mínimo de Pedido (MOQ):
                      </span>
                      {!isEditing ? (
                        <span className="font-mono font-bold text-slate-900 text-sm bg-slate-100 px-3 py-1 rounded-lg inline-block">
                          {formData.moq} u. por pedido
                        </span>
                      ) : (
                        <input
                          type="number"
                          value={formData.moq}
                          onChange={(e) => setFormData({ ...formData, moq: parseInt(e.target.value) || 1 })}
                          className="w-full bg-[#F8F8F9] border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                        />
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-[#6B6E75] uppercase block mb-1">
                        Estado en Catálogo B2B:
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-block">
                        Activo para Mayoristas
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-4 bg-white p-4 rounded-2xl border border-[#E7E8EB] shadow-xs">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">Descripción Oficial:</h4>
                    {!isEditing ? (
                      <p className="whitespace-pre-line text-[#6B6E75]">
                        {formData.description_full}
                      </p>
                    ) : (
                      <textarea
                        rows={5}
                        value={formData.description_full}
                        onChange={(e) => setFormData({ ...formData, description_full: e.target.value })}
                        className="w-full bg-[#F8F8F9] border border-slate-300 rounded-xl p-3 text-xs text-[#17181B] focus:outline-none"
                      />
                    )}
                  </div>
                  {formData.benefits && (
                    <div className="pt-3 border-t border-[#E7E8EB]">
                      <h4 className="font-semibold text-slate-900 mb-1">Beneficios Clínicos:</h4>
                      {!isEditing ? (
                        <div className="space-y-1.5">
                          {formData.benefits
                            .split('\n')
                            .filter((b) => b.trim())
                            .map((b, i) => (
                              <div key={i} className="flex items-start gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                <span className="text-[#6B6E75]">{b}</span>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <textarea
                          rows={3}
                          value={formData.benefits}
                          onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                          className="w-full bg-[#F8F8F9] border border-slate-300 rounded-xl p-3 text-xs text-[#17181B] focus:outline-none"
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: INCI */}
              {activeTab === 'inci' && (
                <div className="space-y-3 bg-white p-4 rounded-2xl border border-[#E7E8EB] shadow-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-900">
                      Fórmula Internacional Certificada INCI
                    </span>
                    <button
                      onClick={() => handleCopyInci(formData.key_ingredients)}
                      className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition border border-slate-200"
                    >
                      {copiedInci ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copiar INCI
                        </>
                      )}
                    </button>
                  </div>
                  {!isEditing ? (
                    <p className="font-mono text-[11px] text-slate-800 bg-[#F8F8F9] p-3 rounded-xl border border-[#E7E8EB] leading-relaxed">
                      {formData.key_ingredients || 'En proceso de extracción por agente de IA.'}
                    </p>
                  ) : (
                    <textarea
                      rows={5}
                      value={formData.key_ingredients}
                      onChange={(e) => setFormData({ ...formData, key_ingredients: e.target.value })}
                      className="w-full font-mono text-[11px] bg-[#F8F8F9] border border-slate-300 rounded-xl p-3 text-slate-800 focus:outline-none"
                    />
                  )}
                </div>
              )}

              {/* TAB 4: USAGE */}
              {activeTab === 'usage' && (
                <div className="space-y-4 bg-white p-4 rounded-2xl border border-[#E7E8EB] shadow-xs">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">Modo de Aplicación:</h4>
                    {!isEditing ? (
                      <p className="text-[#6B6E75] whitespace-pre-line">
                        {formData.usage_instructions || 'Aplicar con toques suaves sobre la piel limpia.'}
                      </p>
                    ) : (
                      <textarea
                        rows={3}
                        value={formData.usage_instructions}
                        onChange={(e) => setFormData({ ...formData, usage_instructions: e.target.value })}
                        className="w-full bg-[#F8F8F9] border border-slate-300 rounded-xl p-3 text-xs text-[#17181B] focus:outline-none"
                      />
                    )}
                  </div>
                  <div className="pt-3 border-t border-[#E7E8EB]">
                    <h4 className="font-semibold text-slate-900 mb-1">Tipo de Piel y Compatibilidad:</h4>
                    {!isEditing ? (
                      <p className="text-[#6B6E75]">
                        {formData.skin_types || 'Apto para todo tipo de piel.'}
                      </p>
                    ) : (
                      <input
                        type="text"
                        value={formData.skin_types}
                        onChange={(e) => setFormData({ ...formData, skin_types: e.target.value })}
                        className="w-full bg-[#F8F8F9] border border-slate-300 rounded-xl px-3 py-2 text-xs text-[#17181B] focus:outline-none"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: CHANNELS */}
              {activeTab === 'channels' && (
                <div className="space-y-3">
                  {channels.length > 0 ? (
                    channels.map((ch) => (
                      <div
                        key={ch.id}
                        className="bg-white p-3.5 rounded-2xl border border-[#E7E8EB] flex items-center justify-between shadow-xs"
                      >
                        <div>
                          <div className="font-semibold capitalize text-slate-900">{ch.channel_name}</div>
                          <div className="text-[11px] text-[#6B6E75]">
                            Precio: ${ch.price || 0} USD • Stock: {ch.inventory_quantity || 0} u.
                          </div>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            ch.status === 'PUBLISHED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {ch.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-[#6B6E75] bg-white rounded-2xl border border-[#E7E8EB]">
                      No hay canales configurados aún para este producto.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Human-in-the-Loop Actions */}
            <div className="mt-6 pt-4 border-t border-[#E7E8EB] flex items-center justify-between">
              <div className="flex items-center gap-2">
                {product.url_origen && (
                  <a
                    href={product.url_origen}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-slate-700 hover:text-black transition"
                  >
                    <Globe className="w-3.5 h-3.5 text-slate-500" /> Fuente Oficial
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2">
                {product.lifecycle_stage === 'APPROVAL' && (
                  <>
                    <button
                      onClick={() => onUpdateStage && onUpdateStage(product.id, 'CATALOGING')}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition border border-slate-200"
                    >
                      Devolver a Catalogación
                    </button>
                    <button
                      onClick={() => onUpdateStage && onUpdateStage(product.id, 'READY_TO_PUBLISH')}
                      className="px-4 py-2 chrome-btn-primary rounded-xl text-xs font-bold transition flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Aprobar Producto
                    </button>
                  </>
                )}

                {product.lifecycle_stage === 'READY_TO_PUBLISH' && (
                  <button
                    onClick={() => onUpdateStage && onUpdateStage(product.id, 'PUBLISHED')}
                    className="px-4 py-2 chrome-btn-primary rounded-xl text-xs font-bold transition flex items-center gap-1"
                  >
                    <Globe className="w-3.5 h-3.5" /> Publicar en Canales
                  </button>
                )}

                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 chrome-btn-secondary text-xs font-medium rounded-xl transition flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir Ficha
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

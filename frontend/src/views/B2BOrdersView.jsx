import React, { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import {
  ShoppingCart,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Printer,
  Download,
  Trash2,
  Edit,
  User,
  Building2,
  Phone,
  Mail,
  DollarSign,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  ExternalLink,
  ChevronRight,
  X,
  FileText,
  Copy
} from 'lucide-react'

export default function B2BOrdersView({
  products = [],
  brands = [],
  imagesByProduct = {},
  b2bOrders = [],
  b2bOrderItems = [],
  b2bClients = [],
  onSaveOrder,
  onUpdateOrderStatus,
  onSaveClient,
  onSelectProduct
}) {
  const [activeTab, setActiveTab] = useState('orders') // 'orders', 'builder', 'exports', 'clients'
  const [searchOrder, setSearchOrder] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState(null)
  
  // Order Builder State
  const [selectedClient, setSelectedClient] = useState(null)
  const [orderItemsCart, setOrderItemsCart] = useState([]) // { product, quantity, unit_price, discount_percent }
  const [productSearch, setProductSearch] = useState('')
  const [brandFilter, setBrandFilter] = useState('ALL')
  const [orderNotes, setOrderNotes] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('Transferencia Bancaria - 50% Anticipo / 50% Contra Entrega')
  const [savingOrder, setSavingOrder] = useState(false)
  const [orderSuccessMessage, setOrderSuccessMessage] = useState(null)

  // New Client Modal
  const [showClientModal, setShowClientModal] = useState(false)
  const [clientForm, setClientForm] = useState({
    company_name: '',
    tax_id: '',
    contact_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    price_tier: 'MAYORISTA_ESTANDAR',
    discount_rate: 0,
    notes: ''
  })

  const brandMap = useMemo(() => {
    return brands.reduce((acc, b) => {
      acc[b.id] = b.name
      return acc
    }, {})
  }, [brands])

  // ============================================================================
  // COMPUTED STATS & FILTERED ORDERS
  // ============================================================================
  const filteredOrders = useMemo(() => {
    return b2bOrders.filter((o) => {
      if (statusFilter !== 'ALL' && o.status !== statusFilter) return false
      if (searchOrder.trim()) {
        const q = searchOrder.toLowerCase()
        return (
          (o.order_number || '').toLowerCase().includes(q) ||
          (o.client_name || '').toLowerCase().includes(q) ||
          (o.client_tax_id || '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [b2bOrders, statusFilter, searchOrder])

  const totalB2BVolume = useMemo(() => {
    return b2bOrders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + Number(o.total_amount || 0), 0)
  }, [b2bOrders])

  const confirmedOrdersCount = useMemo(() => {
    return b2bOrders.filter((o) => o.status === 'CONFIRMED' || o.status === 'PREPARING' || o.status === 'DELIVERED').length
  }, [b2bOrders])

  const quotedOrdersCount = useMemo(() => {
    return b2bOrders.filter((o) => o.status === 'QUOTED' || o.status === 'DRAFT').length
  }, [b2bOrders])

  // Filtered products for Builder catalog
  const filteredBuilderProducts = useMemo(() => {
    return products.filter((p) => {
      if (brandFilter !== 'ALL' && String(p.brand_id) !== String(brandFilter)) return false
      if (productSearch.trim()) {
        const q = productSearch.toLowerCase()
        const bName = (brandMap[p.brand_id] || '').toLowerCase()
        return (
          p.name?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.ean?.toLowerCase().includes(q) ||
          bName.includes(q)
        )
      }
      return true
    })
  }, [products, brandFilter, productSearch, brandMap])

  // ============================================================================
  // CART / ORDER BUILDER HANDLERS
  // ============================================================================
  const handleAddToCart = (prod) => {
    const existingIndex = orderItemsCart.findIndex((item) => item.product.id === prod.id)
    const moq = prod.moq || 1
    const basePrice = prod.wholesale_price || 14.50

    if (existingIndex >= 0) {
      const updated = [...orderItemsCart]
      updated[existingIndex].quantity += moq
      setOrderItemsCart(updated)
    } else {
      setOrderItemsCart([
        ...orderItemsCart,
        {
          product: prod,
          quantity: moq,
          unit_price: basePrice,
          discount_percent: selectedClient ? Number(selectedClient.discount_rate || 0) : 0
        }
      ])
    }
  }

  const handleUpdateQuantity = (index, newQty) => {
    if (newQty <= 0) {
      handleRemoveFromCart(index)
      return
    }
    const updated = [...orderItemsCart]
    updated[index].quantity = newQty
    setOrderItemsCart(updated)
  }

  const handleUpdateItemPrice = (index, newPrice) => {
    const updated = [...orderItemsCart]
    updated[index].unit_price = Number(newPrice) || 0
    setOrderItemsCart(updated)
  }

  const handleRemoveFromCart = (index) => {
    setOrderItemsCart(orderItemsCart.filter((_, i) => i !== index))
  }

  // Cart Calculations
  const cartSubtotal = useMemo(() => {
    return orderItemsCart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  }, [orderItemsCart])

  const cartDiscountTotal = useMemo(() => {
    return orderItemsCart.reduce(
      (sum, item) => sum + item.quantity * item.unit_price * (item.discount_percent / 100),
      0
    )
  }, [orderItemsCart])

  const cartGrandTotal = cartSubtotal - cartDiscountTotal

  const handleSaveOrderSubmit = async (status = 'CONFIRMED') => {
    if (!selectedClient && !clientForm.company_name) {
      alert('Por favor selecciona un cliente mayorista o crea uno nuevo.')
      return
    }
    if (orderItemsCart.length === 0) {
      alert('Por favor agrega al menos un producto al pedido.')
      return
    }

    try {
      setSavingOrder(true)
      const client = selectedClient || {
        company_name: clientForm.company_name,
        tax_id: clientForm.tax_id,
        email: clientForm.email,
        phone: clientForm.phone
      }

      const orderNumber = `ORD-B2B-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`

      const orderData = {
        order_number: orderNumber,
        client_id: selectedClient?.id || null,
        client_name: client.company_name,
        client_tax_id: client.tax_id,
        client_email: client.email,
        client_phone: client.phone,
        status: status,
        currency: 'USD',
        subtotal: cartSubtotal,
        discount_amount: cartDiscountTotal,
        tax_amount: 0,
        shipping_amount: 0,
        total_amount: cartGrandTotal,
        payment_terms: paymentTerms,
        validity_days: 15,
        notes: orderNotes
      }

      const itemsData = orderItemsCart.map((item) => ({
        product_id: item.product.id,
        sku: item.product.sku,
        ean: item.product.ean,
        product_name: item.product.name,
        brand_name: brandMap[item.product.brand_id] || 'K-Beauty',
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent,
        subtotal: item.quantity * item.unit_price * (1 - item.discount_percent / 100)
      }))

      if (onSaveOrder) {
        await onSaveOrder(orderData, itemsData)
      }

      setOrderSuccessMessage(`¡Orden ${orderNumber} guardada exitosamente con estado ${status}!`)
      setOrderItemsCart([])
      setOrderNotes('')
      setTimeout(() => {
        setOrderSuccessMessage(null)
        setActiveTab('orders')
      }, 2000)
    } catch (err) {
      alert('Error al guardar la orden: ' + err.message)
    } finally {
      setSavingOrder(false)
    }
  }

  // ============================================================================
  // EXPORT ENGINES (EXCEL XLSX, CUSTOMER ORDER SHEET, PDF FORMAL)
  // ============================================================================

  // 1. Export Full B2B Price List in Excel
  const handleExportPriceListExcel = () => {
    const data = products.map((p) => {
      const bName = brandMap[p.brand_id] || 'K-Beauty'
      const wPrice = Number(p.wholesale_price || 14.50)
      const rPrice = Number(p.retail_price || 26.00)
      const margin = rPrice > 0 ? (((rPrice - wPrice) / rPrice) * 100).toFixed(1) : '0.0'
      const pImgs = imagesByProduct[p.id] || []

      return {
        'Marca': bName,
        'Código EAN-13': p.ean || '',
        'SKU': p.sku || '',
        'Producto': p.name || '',
        'Formato': p.format || '',
        'Precio Mayorista (USD)': wPrice,
        'PVP Sugerido (USD)': rPrice,
        'Margen Sugerido (%)': `${margin}%`,
        'Pack Mínimo (MOQ)': p.moq || 3,
        'Stock Disponible': p.stock_quantity || 100,
        'Tipo de Piel': p.skin_types || '',
        'Ingredientes Clave': p.key_ingredients || '',
        'Link Foto': pImgs[0] || p.url_origen || ''
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lista_Precios_B2B')
    XLSX.writeFile(workbook, `KBeauty_Hub_Lista_Precios_B2B_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // 2. Export Interactive Customer Order Sheet (with formulas & editable requested qty)
  const handleExportCustomerOrderSheet = () => {
    const data = products.map((p, idx) => {
      const bName = brandMap[p.brand_id] || 'K-Beauty'
      const wPrice = Number(p.wholesale_price || 14.50)
      const rPrice = Number(p.retail_price || 26.00)
      const rowNum = idx + 2 // header is row 1

      return {
        'Marca': bName,
        'Código EAN-13': p.ean || '',
        'SKU': p.sku || '',
        'Producto': p.name || '',
        'Formato': p.format || '',
        'Precio Mayorista USD': wPrice,
        'PVP Sugerido USD': rPrice,
        'Pack Mínimo': p.moq || 3,
        'CANTIDAD A PEDIR (Ingresar aquí)': '',
        'SUBTOTAL USD (Calculado)': { f: `F${rowNum}*I${rowNum}` }
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Planilla_Pedido_Cliente')
    XLSX.writeFile(workbook, `KBeauty_Planilla_Pedido_B2B_Cliente_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // 3. Export Specific Order to Excel
  const handleExportSingleOrderExcel = (order) => {
    const items = b2bOrderItems.filter((it) => it.order_id === order.id)
    const rows = items.map((it) => ({
      'Código EAN': it.ean || '',
      'SKU': it.sku || '',
      'Marca': it.brand_name || '',
      'Producto': it.product_name || '',
      'Cantidad': it.quantity,
      'Precio Unitario (USD)': it.unit_price,
      'Descuento (%)': it.discount_percent || 0,
      'Subtotal (USD)': it.subtotal
    }))

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Detalle_Pedido')
    XLSX.writeFile(workbook, `Orden_${order.order_number}_${order.client_name.replace(/\s+/g, '_')}.xlsx`)
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2 font-mono">
            <Building2 className="w-3.5 h-3.5 text-emerald-600" /> B2B Commercial Operating Engine
          </div>
          <h2 className="text-2xl font-extrabold text-[#17181B] font-display">
            Ventas & Pedidos <span className="chrome-gradient-text">Mayoristas B2B</span>
          </h2>
          <p className="text-xs text-[#6B6E75] mt-1">
            Gestión comercial de clientes, cotizador rápido, armado de pedidos mayoristas y exportación de listas de precios.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('builder')}
            className="px-4 py-2 chrome-btn-primary rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Nuevo Pedido / Cotizador
          </button>
          <button
            onClick={handleExportPriceListExcel}
            className="px-3.5 py-2 chrome-btn-secondary text-slate-800 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Lista Precios XLSX
          </button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-[#E7E8EB] shadow-xs">
          <span className="text-[11px] font-semibold text-[#6B6E75] uppercase tracking-wider block mb-1">
            Volumen Total B2B
          </span>
          <div className="text-2xl font-black text-[#17181B] font-mono">
            ${totalB2BVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs text-slate-500 font-normal">USD</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Pedidos activos en sistema
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E7E8EB] shadow-xs">
          <span className="text-[11px] font-semibold text-[#6B6E75] uppercase tracking-wider block mb-1">
            Órdenes Confirmadas
          </span>
          <div className="text-2xl font-black text-[#17181B] font-mono">
            {confirmedOrdersCount}
          </div>
          <span className="text-[10px] text-blue-700 font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Listas para preparación
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E7E8EB] shadow-xs">
          <span className="text-[11px] font-semibold text-[#6B6E75] uppercase tracking-wider block mb-1">
            Cotizaciones Pendientes
          </span>
          <div className="text-2xl font-black text-[#17181B] font-mono">
            {quotedOrdersCount}
          </div>
          <span className="text-[10px] text-amber-700 font-semibold mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" /> En seguimiento comercial
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#E7E8EB] shadow-xs">
          <span className="text-[11px] font-semibold text-[#6B6E75] uppercase tracking-wider block mb-1">
            Clientes Mayoristas
          </span>
          <div className="text-2xl font-black text-[#17181B] font-mono">
            {b2bClients.length}
          </div>
          <span className="text-[10px] text-purple-700 font-semibold mt-1 flex items-center gap-1">
            <Building2 className="w-3 h-3" /> Cuentas registradas
          </span>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-[#E7E8EB] gap-2 text-xs font-semibold overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 px-4 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'orders'
              ? 'border-slate-900 text-slate-900 font-bold'
              : 'border-transparent text-[#6B6E75] hover:text-[#17181B]'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Historial de Pedidos & Cotizaciones</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
            {b2bOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('builder')}
          className={`pb-3 px-4 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'builder'
              ? 'border-slate-900 text-slate-900 font-bold'
              : 'border-transparent text-[#6B6E75] hover:text-[#17181B]'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Armador de Pedidos / Cotizador</span>
          {orderItemsCart.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold font-mono">
              {orderItemsCart.length} ítems
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('exports')}
          className={`pb-3 px-4 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'exports'
              ? 'border-slate-900 text-slate-900 font-bold'
              : 'border-transparent text-[#6B6E75] hover:text-[#17181B]'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Centro de Exportaciones B2B</span>
        </button>

        <button
          onClick={() => setActiveTab('clients')}
          className={`pb-3 px-4 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'clients'
              ? 'border-slate-900 text-slate-900 font-bold'
              : 'border-transparent text-[#6B6E75] hover:text-[#17181B]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Directorio de Clientes Mayoristas</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
            {b2bClients.length}
          </span>
        </button>
      </div>

      {/* ============================================================================
          TAB 1: ORDERS & QUOTATIONS LIST
         ============================================================================ */}
      {activeTab === 'orders' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Filters Bar */}
          <div className="bg-white rounded-3xl p-4 flex flex-col sm:flex-row gap-4 border border-[#E7E8EB] shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchOrder}
                onChange={(e) => setSearchOrder(e.target.value)}
                placeholder="Buscar por número de orden, cliente o CUIT..."
                className="w-full pl-10 pr-4 py-2 bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl text-xs text-[#17181B] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto">
              {['ALL', 'CONFIRMED', 'QUOTED', 'PREPARING', 'DELIVERED', 'DRAFT'].map((stg) => (
                <button
                  key={stg}
                  onClick={() => setStatusFilter(stg)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                    statusFilter === stg
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-[#6B6E75] hover:text-[#17181B] hover:bg-slate-200'
                  }`}
                >
                  {stg === 'ALL' ? 'Todos los Estados' : stg}
                </button>
              ))}
            </div>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-[#E7E8EB]">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-[#F8F8F9] text-[11px] uppercase tracking-wider text-[#6B6E75] border-b border-[#E7E8EB]">
                <tr>
                  <th className="p-4 font-semibold">Nº Pedido / Fecha</th>
                  <th className="p-4 font-semibold">Cliente Mayorista</th>
                  <th className="p-4 font-semibold">Condición de Pago</th>
                  <th className="p-4 font-semibold">Total (USD)</th>
                  <th className="p-4 font-semibold">Estado</th>
                  <th className="p-4 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E8EB]">
                {filteredOrders.map((ord) => {
                  const isConfirmed = ord.status === 'CONFIRMED'
                  const isQuoted = ord.status === 'QUOTED'
                  const isDelivered = ord.status === 'DELIVERED'

                  return (
                    <tr key={ord.id} className="hover:bg-[#F8F8F9] transition">
                      <td className="p-4">
                        <span className="font-mono font-bold text-[#17181B] block">{ord.order_number}</span>
                        <span className="text-[10px] text-[#6B6E75] font-mono">
                          {new Date(ord.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-[#17181B] block">{ord.client_name}</span>
                        <span className="text-[10px] text-[#6B6E75] font-mono">
                          CUIT: {ord.client_tax_id || 'N/D'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 text-[11px]">
                        {ord.payment_terms || 'Transferencia Bancaria'}
                      </td>
                      <td className="p-4 font-mono font-black text-slate-900 text-sm">
                        ${Number(ord.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono inline-flex items-center gap-1 ${
                            isConfirmed
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : isQuoted
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : isDelivered
                              ? 'bg-purple-50 text-purple-800 border border-purple-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedOrderForDetail(ord)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                            title="Ver Ficha de Pedido"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleExportSingleOrderExcel(ord)}
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition border border-emerald-200"
                            title="Exportar a Excel"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {filteredOrders.length === 0 && (
              <div className="text-center py-12 text-xs text-[#6B6E75]">
                No se encontraron órdenes registradas para este filtro.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================================
          TAB 2: B2B ORDER BUILDER & QUOTER (ARMADOR DE PEDIDOS)
         ============================================================================ */}
      {activeTab === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* Left Column: Product Selection & Catalog (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            {orderSuccessMessage && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {orderSuccessMessage}
              </div>
            )}

            {/* Client Picker Card */}
            <div className="bg-white p-5 rounded-3xl border border-[#E7E8EB] shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#17181B] font-display flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-slate-700" /> Seleccionar Cliente Mayorista
                </span>
                <button
                  onClick={() => setShowClientModal(true)}
                  className="text-xs text-slate-800 hover:text-black font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Nuevo Cliente
                </button>
              </div>

              <select
                value={selectedClient ? selectedClient.id : ''}
                onChange={(e) => {
                  const found = b2bClients.find((c) => String(c.id) === String(e.target.value))
                  setSelectedClient(found || null)
                  if (found && orderItemsCart.length > 0) {
                    // Update discount rate on cart items
                    const rate = Number(found.discount_rate || 0)
                    setOrderItemsCart(orderItemsCart.map((it) => ({ ...it, discount_percent: rate })))
                  }
                }}
                className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl px-3 py-2 text-xs text-[#17181B] focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="">-- Seleccionar de la cartera de clientes --</option>
                {b2bClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name} (CUIT: {c.tax_id || 'N/D'} • Descuento: {c.discount_rate || 0}%)
                  </option>
                ))}
              </select>

              {selectedClient && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 space-y-1">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-900">{selectedClient.company_name}</span>
                    <span className="font-mono text-[11px] bg-slate-200 px-2 py-0.5 rounded text-slate-800">
                      {selectedClient.price_tier}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Contacto: {selectedClient.contact_name} • Email: {selectedClient.email} • Tel: {selectedClient.phone}
                  </div>
                </div>
              )}
            </div>

            {/* Catalog Filter Bar */}
            <div className="bg-white p-4 rounded-3xl border border-[#E7E8EB] shadow-xs flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Buscar producto por nombre, SKU o EAN..."
                  className="w-full pl-10 pr-4 py-2 bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl text-xs text-[#17181B] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>

              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
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

            {/* Products Quick Picker List */}
            <div className="bg-white rounded-3xl p-4 border border-[#E7E8EB] shadow-xs max-h-[500px] overflow-y-auto space-y-2">
              {filteredBuilderProducts.slice(0, 50).map((p) => {
                const bName = brandMap[p.brand_id] || 'K-Beauty'
                const pImgs = imagesByProduct[p.id] || []
                const img = pImgs[0] || 'https://via.placeholder.com/60x60?text=K-Beauty'
                const wPrice = Number(p.wholesale_price || 14.50)
                const rPrice = Number(p.retail_price || 26.00)
                const moq = p.moq || 3

                return (
                  <div
                    key={p.id}
                    className="p-3 bg-[#F8F8F9] hover:bg-slate-100 rounded-2xl border border-[#E7E8EB] flex items-center justify-between gap-3 transition"
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-12 h-12 object-contain bg-white rounded-xl p-1 border border-[#E7E8EB] flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-slate-800 block">{bName}</span>
                      <h4 className="text-xs font-semibold text-[#17181B] truncate">{p.name}</h4>
                      <div className="text-[10px] text-[#6B6E75] font-mono mt-0.5 flex gap-2">
                        <span>SKU: {p.sku}</span>
                        <span>EAN: {p.ean?.slice(-6) || 'N/D'}</span>
                        <span className="text-emerald-700 font-semibold">MOQ: {moq} u.</span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="font-mono text-xs font-bold text-slate-900">${wPrice.toFixed(2)} USD</div>
                      <div className="text-[10px] text-[#6B6E75] line-through">${rPrice.toFixed(2)} PVP</div>
                    </div>

                    <button
                      onClick={() => handleAddToCart(p)}
                      className="px-3 py-1.5 chrome-btn-primary rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs flex-shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right Column: Order Items & Cart Summary (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl p-5 border border-[#E7E8EB] shadow-xs flex flex-col justify-between min-h-[500px]">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#E7E8EB] mb-3">
                  <h3 className="text-sm font-bold text-[#17181B] font-display flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-slate-800" /> Detalle del Pedido ({orderItemsCart.length})
                  </h3>
                  {orderItemsCart.length > 0 && (
                    <button
                      onClick={() => setOrderItemsCart([])}
                      className="text-[11px] text-rose-600 hover:underline font-semibold"
                    >
                      Vaciar
                    </button>
                  )}
                </div>

                {/* Items in Cart */}
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {orderItemsCart.map((item, idx) => {
                    const itemSub = item.quantity * item.unit_price * (1 - item.discount_percent / 100)

                    return (
                      <div
                        key={idx}
                        className="p-3 bg-[#F8F8F9] rounded-2xl border border-[#E7E8EB] flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-[#17181B] block truncate">{item.product.name}</span>
                          <span className="text-[10px] text-[#6B6E75] font-mono">
                            ${item.unit_price.toFixed(2)} c/u {item.discount_percent > 0 && `(-${item.discount_percent}%)`}
                          </span>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleUpdateQuantity(idx, item.quantity - (item.product.moq || 1))}
                            className="w-6 h-6 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-bold hover:bg-slate-100"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleUpdateQuantity(idx, parseInt(e.target.value) || 1)}
                            className="w-12 text-center bg-white border border-slate-300 rounded-lg py-0.5 text-xs font-mono font-bold"
                          />
                          <button
                            onClick={() => handleUpdateQuantity(idx, item.quantity + (item.product.moq || 1))}
                            className="w-6 h-6 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-bold hover:bg-slate-100"
                          >
                            +
                          </button>
                        </div>

                        <div className="font-mono font-bold text-slate-900 w-16 text-right">
                          ${itemSub.toFixed(2)}
                        </div>

                        <button
                          onClick={() => handleRemoveFromCart(idx)}
                          className="text-slate-400 hover:text-rose-600 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  })}

                  {orderItemsCart.length === 0 && (
                    <div className="text-center py-12 text-xs text-[#6B6E75] space-y-2">
                      <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto" />
                      <p>El pedido está vacío.</p>
                      <p className="text-[11px]">Selecciona productos del catálogo para armar la cotización.</p>
                    </div>
                  )}
                </div>

                {/* Additional Order Settings */}
                <div className="mt-4 pt-3 border-t border-[#E7E8EB] space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-[#6B6E75] uppercase block mb-1">
                      Condiciones de Pago & Entrega:
                    </label>
                    <input
                      type="text"
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl px-3 py-1.5 text-xs text-[#17181B] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#6B6E75] uppercase block mb-1">
                      Notas Comerciales / Instrucciones:
                    </label>
                    <input
                      type="text"
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="Ej: Despachar por expreso con seguro..."
                      className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl px-3 py-1.5 text-xs text-[#17181B] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Financial Breakdown & Actions */}
              <div className="mt-4 pt-4 border-t border-[#E7E8EB] space-y-2 text-xs">
                <div className="flex justify-between text-[#6B6E75]">
                  <span>Subtotal Bruto:</span>
                  <span className="font-mono font-semibold">${cartSubtotal.toFixed(2)} USD</span>
                </div>
                {cartDiscountTotal > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Descuento Comercial Cliente:</span>
                    <span className="font-mono">-${cartDiscountTotal.toFixed(2)} USD</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-[#17181B] pt-2 border-t border-[#E7E8EB]">
                  <span>Total Final:</span>
                  <span className="font-mono text-slate-900">${cartGrandTotal.toFixed(2)} USD</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-3">
                  <button
                    onClick={() => handleSaveOrderSubmit('QUOTED')}
                    disabled={savingOrder || orderItemsCart.length === 0}
                    className="py-2.5 chrome-btn-secondary text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5" /> Guardar Cotización
                  </button>
                  <button
                    onClick={() => handleSaveOrderSubmit('CONFIRMED')}
                    disabled={savingOrder || orderItemsCart.length === 0}
                    className="py-2.5 chrome-btn-primary rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar Pedido
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================
          TAB 3: EXPORT HUB (B2B EXPORTATIONS)
         ============================================================================ */}
      {activeTab === 'exports' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
          {/* Card 1: Lista de Precios Mayorista */}
          <div className="bg-white p-6 rounded-3xl border border-[#E7E8EB] shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#17181B] font-display mb-1">
                Lista de Precios B2B (.xlsx)
              </h3>
              <p className="text-xs text-[#6B6E75] leading-relaxed mb-4">
                Exporta el catálogo completo con precios mayoristas (USD), PVP sugerido, márgenes, packs mínimos (MOQ) y enlaces a imágenes oficiales.
              </p>
            </div>
            <button
              onClick={handleExportPriceListExcel}
              className="w-full py-2.5 chrome-btn-primary rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4" /> Descargar Lista de Precios
            </button>
          </div>

          {/* Card 2: Planilla de Pedido para Clientes */}
          <div className="bg-white p-6 rounded-3xl border border-[#E7E8EB] shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center mb-4">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#17181B] font-display mb-1">
                Planilla Interactiva de Pedidos (.xlsx)
              </h3>
              <p className="text-xs text-[#6B6E75] leading-relaxed mb-4">
                Planilla formateada para enviar por WhatsApp o Email al cliente mayorista, con columna de entrada y cálculo automático de subtotales.
              </p>
            </div>
            <button
              onClick={handleExportCustomerOrderSheet}
              className="w-full py-2.5 chrome-btn-secondary text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <Download className="w-4 h-4" /> Descargar Planilla de Pedido
            </button>
          </div>

          {/* Card 3: Exportación Masiva E-Commerce */}
          <div className="bg-white p-6 rounded-3xl border border-[#E7E8EB] shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center mb-4">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#17181B] font-display mb-1">
                Exportación Multicanal E-Commerce
              </h3>
              <p className="text-xs text-[#6B6E75] leading-relaxed mb-4">
                Archivos estructurados listos para importar masivamente en plataformas Shopify, Tienda Nube y Mercado Libre.
              </p>
            </div>
            <button
              onClick={handleExportPriceListExcel}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-200"
            >
              <Download className="w-4 h-4" /> Exportar CSV Multicanal
            </button>
          </div>
        </div>
      )}

      {/* ============================================================================
          TAB 4: CLIENTS DIRECTORY
         ============================================================================ */}
      {activeTab === 'clients' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-[#17181B] font-display">
              Directorio de Cuentas Comerciales ({b2bClients.length})
            </h3>
            <button
              onClick={() => setShowClientModal(true)}
              className="px-3.5 py-1.5 chrome-btn-primary rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar Cliente
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {b2bClients.map((c) => (
              <div key={c.id} className="bg-white p-5 rounded-3xl border border-[#E7E8EB] shadow-xs space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-[#17181B] text-sm font-display">{c.company_name}</h4>
                    <span className="text-[11px] text-[#6B6E75] font-mono">CUIT: {c.tax_id || 'Sin CUIT'}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 font-mono">
                    {c.price_tier}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-[#6B6E75] pt-2 border-t border-[#E7E8EB]">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{c.contact_name || 'Sin contacto asignado'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{c.email || 'Sin email'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{c.phone || 'Sin teléfono'}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E7E8EB] flex items-center justify-between text-xs">
                  <span className="text-emerald-700 font-bold font-mono">
                    Descuento: {c.discount_rate || 0}%
                  </span>
                  <button
                    onClick={() => {
                      setSelectedClient(c)
                      setActiveTab('builder')
                    }}
                    className="text-slate-800 hover:text-black font-semibold flex items-center gap-1 transition"
                  >
                    Crear Pedido <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================================
          MODAL: SINGLE ORDER DETAIL & PRINT/PDF VIEW
         ============================================================================ */}
      {selectedOrderForDetail && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white border border-[#E7E8EB] rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#E7E8EB] flex items-center justify-between bg-[#F8F8F9]">
              <div>
                <span className="font-mono text-xs font-bold text-slate-800 block">
                  ORDEN: {selectedOrderForDetail.order_number}
                </span>
                <h3 className="text-base font-bold text-[#17181B] font-display">
                  {selectedOrderForDetail.client_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrderForDetail(null)}
                className="p-1.5 text-slate-500 hover:text-black rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#F8F8F9] rounded-2xl border border-[#E7E8EB]">
                <div>
                  <span className="text-[#6B6E75] block text-[10px] uppercase font-bold">Estado:</span>
                  <span className="font-bold text-slate-900 font-mono">{selectedOrderForDetail.status}</span>
                </div>
                <div>
                  <span className="text-[#6B6E75] block text-[10px] uppercase font-bold">Fecha:</span>
                  <span className="font-mono text-slate-900">{new Date(selectedOrderForDetail.created_at).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-[#6B6E75] block text-[10px] uppercase font-bold">CUIT / Tax ID:</span>
                  <span className="font-mono text-slate-900">{selectedOrderForDetail.client_tax_id || 'N/D'}</span>
                </div>
                <div>
                  <span className="text-[#6B6E75] block text-[10px] uppercase font-bold">Total:</span>
                  <span className="font-bold text-slate-900 font-mono text-sm">
                    ${Number(selectedOrderForDetail.total_amount || 0).toFixed(2)} USD
                  </span>
                </div>
              </div>

              {/* Items List in Order */}
              <h4 className="font-bold text-[#17181B] font-display pt-2">Ítems del Pedido:</h4>
              <div className="border border-[#E7E8EB] rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8F8F9] text-[#6B6E75] border-b border-[#E7E8EB]">
                    <tr>
                      <th className="p-3">Producto</th>
                      <th className="p-3">Cant.</th>
                      <th className="p-3">P. Unit</th>
                      <th className="p-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E8EB]">
                    {b2bOrderItems
                      .filter((it) => it.order_id === selectedOrderForDetail.id)
                      .map((it) => (
                        <tr key={it.id}>
                          <td className="p-3">
                            <span className="font-semibold text-slate-900 block">{it.product_name}</span>
                            <span className="text-[10px] text-[#6B6E75] font-mono">SKU: {it.sku}</span>
                          </td>
                          <td className="p-3 font-mono font-bold">{it.quantity} u.</td>
                          <td className="p-3 font-mono">${it.unit_price}</td>
                          <td className="p-3 font-mono font-bold text-right">${it.subtotal}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {selectedOrderForDetail.notes && (
                <div className="p-3 bg-[#F8F8F9] rounded-2xl border border-[#E7E8EB]">
                  <span className="font-bold text-slate-900 block mb-1">Notas Comerciales:</span>
                  <p className="text-[#6B6E75]">{selectedOrderForDetail.notes}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#E7E8EB] bg-[#F8F8F9] flex items-center justify-between">
              <button
                onClick={() => handleExportSingleOrderExcel(selectedOrderForDetail)}
                className="px-4 py-2 chrome-btn-secondary text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Exportar a Excel
              </button>

              <button
                onClick={() => setSelectedOrderForDetail(null)}
                className="px-4 py-2 chrome-btn-primary rounded-xl text-xs font-bold transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================
          MODAL: CREATE NEW B2B CLIENT
         ============================================================================ */}
      {showClientModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white border border-[#E7E8EB] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex justify-between items-center pb-3 border-b border-[#E7E8EB]">
              <h3 className="text-base font-bold text-[#17181B] font-display">
                Registrar Nuevo Cliente Mayorista
              </h3>
              <button
                onClick={() => setShowClientModal(false)}
                className="p-1 text-slate-400 hover:text-black rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Razón Social / Empresa *</label>
                <input
                  type="text"
                  value={clientForm.company_name}
                  onChange={(e) => setClientForm({ ...clientForm, company_name: e.target.value })}
                  placeholder="Ej: K-Glow Store S.A."
                  className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl px-3 py-2 text-xs text-[#17181B] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">CUIT / RUT / Tax ID</label>
                  <input
                    type="text"
                    value={clientForm.tax_id}
                    onChange={(e) => setClientForm({ ...clientForm, tax_id: e.target.value })}
                    placeholder="30-12345678-9"
                    className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl px-3 py-2 text-xs text-[#17181B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Persona de Contacto</label>
                  <input
                    type="text"
                    value={clientForm.contact_name}
                    onChange={(e) => setClientForm({ ...clientForm, contact_name: e.target.value })}
                    placeholder="Nombre y Apellido"
                    className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl px-3 py-2 text-xs text-[#17181B] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email de Compras</label>
                  <input
                    type="email"
                    value={clientForm.email}
                    onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                    placeholder="compras@empresa.com"
                    className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl px-3 py-2 text-xs text-[#17181B] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="text"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                    placeholder="+54 11 ..."
                    className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl px-3 py-2 text-xs text-[#17181B] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Lista de Precios</label>
                  <select
                    value={clientForm.price_tier}
                    onChange={(e) => setClientForm({ ...clientForm, price_tier: e.target.value })}
                    className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl px-3 py-2 text-xs text-[#17181B] focus:outline-none"
                  >
                    <option value="MAYORISTA_ESTANDAR">Mayorista Estándar</option>
                    <option value="MAYORISTA_PREMIUM">Mayorista Premium</option>
                    <option value="DISTRIBUIDOR_REGIONAL">Distribuidor Regional</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Descuento Asignado (%)</label>
                  <input
                    type="number"
                    value={clientForm.discount_rate}
                    onChange={(e) => setClientForm({ ...clientForm, discount_rate: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full bg-[#F8F8F9] border border-[#E7E8EB] rounded-xl px-3 py-2 text-xs text-[#17181B] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E7E8EB]">
              <button
                onClick={() => setShowClientModal(false)}
                className="px-3.5 py-2 text-slate-500 hover:text-black text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!clientForm.company_name.trim()) {
                    alert('Ingresa el nombre de la empresa.')
                    return
                  }
                  if (onSaveClient) {
                    await onSaveClient(clientForm)
                  }
                  setShowClientModal(false)
                  setClientForm({
                    company_name: '',
                    tax_id: '',
                    contact_name: '',
                    email: '',
                    phone: '',
                    address: '',
                    city: '',
                    price_tier: 'MAYORISTA_ESTANDAR',
                    discount_rate: 0,
                    notes: ''
                  })
                }}
                className="px-4 py-2 chrome-btn-primary rounded-xl text-xs font-bold"
              >
                Guardar Cliente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

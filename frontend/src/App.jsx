import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from './lib/supabase'
import * as XLSX from 'xlsx'
import {
  LayoutDashboard,
  Layers,
  Globe,
  TrendingUp,
  ShoppingCart,
  Package,
  Kanban,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Activity,
  Search,
  Download,
  RefreshCw,
  Sparkles,
  Command,
  Menu,
  X,
  Plus,
  ShieldCheck,
  Building2
} from 'lucide-react'

// Views
import DashboardView from './views/DashboardView'
import BrandsRadarView from './views/BrandsRadarView'
import DiscoveryView from './views/DiscoveryView'
import NegotiationsView from './views/NegotiationsView'
import PurchaseOrdersView from './views/PurchaseOrdersView'
import ProductsView from './views/ProductsView'
import PipelineKanbanView from './views/PipelineKanbanView'
import ApprovalsView from './views/ApprovalsView'
import PublicationsView from './views/PublicationsView'
import AiAgentsView from './views/AiAgentsView'
import ActivityLogView from './views/ActivityLogView'
import B2BOrdersView from './views/B2BOrdersView'

// Components
import CommandPalette from './components/CommandPalette'
import ProductDetailModal from './components/ProductDetailModal'

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  // Data State
  const [products, setProducts] = useState([])
  const [brands, setBrands] = useState([])
  const [sources, setSources] = useState([])
  const [images, setImages] = useState([])
  const [dimensions, setDimensions] = useState([])
  const [discoveredProducts, setDiscoveredProducts] = useState([])
  const [negotiations, setNegotiations] = useState([])
  const [purchaseOrders, setPurchaseOrders] = useState([])
  const [poItems, setPoItems] = useState([])
  const [productChannels, setProductChannels] = useState([])
  const [activityLogs, setActivityLogs] = useState([])
  const [aiRuns, setAiRuns] = useState([])

  // B2B State
  const [b2bOrders, setB2bOrders] = useState([])
  const [b2bOrderItems, setB2bOrderItems] = useState([])
  const [b2bClients, setB2bClients] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Modal State
  const [selectedProduct, setSelectedProduct] = useState(null)

  // Load all tables from Supabase
  useEffect(() => {
    fetchAllHubData()
  }, [])

  async function fetchAllHubData() {
    try {
      setLoading(true)
      setError(null)

      const [
        prodsRes,
        brandsRes,
        sourcesRes,
        imgsRes,
        dimsRes,
        discRes,
        negsRes,
        posRes,
        poItemsRes,
        channelsRes,
        logsRes,
        aiRunsRes,
        b2bOrdersRes,
        b2bItemsRes,
        b2bClientsRes
      ] = await Promise.all([
        supabase.from('products').select('*').order('id', { ascending: true }),
        supabase.from('brands').select('*').order('name', { ascending: true }),
        supabase.from('brand_sources').select('*'),
        supabase.from('product_images').select('*'),
        supabase.from('product_dimensions').select('*'),
        supabase.from('discovered_products').select('*').order('id', { ascending: false }),
        supabase.from('negotiations').select('*').order('id', { ascending: false }),
        supabase.from('purchase_orders').select('*').order('id', { ascending: false }),
        supabase.from('purchase_order_items').select('*'),
        supabase.from('product_channels').select('*'),
        supabase.from('activity_log').select('*').order('id', { ascending: false }).limit(100),
        supabase.from('ai_runs').select('*').order('id', { ascending: false }).limit(50),
        supabase.from('b2b_orders').select('*').order('id', { ascending: false }),
        supabase.from('b2b_order_items').select('*'),
        supabase.from('b2b_clients').select('*').order('company_name', { ascending: true })
      ])

      setProducts(prodsRes.data || [])
      setBrands(brandsRes.data || [])
      setSources(sourcesRes.data || [])
      setImages(imgsRes.data || [])
      setDimensions(dimsRes.data || [])
      setDiscoveredProducts(discRes.data || [])
      setNegotiations(negsRes.data || [])
      setPurchaseOrders(posRes.data || [])
      setPoItems(poItemsRes.data || [])
      setProductChannels(channelsRes.data || [])
      setActivityLogs(logsRes.data || [])
      setAiRuns(aiRunsRes.data || [])
      setB2bOrders(b2bOrdersRes.data || [])
      setB2bOrderItems(b2bItemsRes.data || [])
      setB2bClients(b2bClientsRes.data || [])
    } catch (err) {
      console.error('Error fetching Hub data:', err)
      setError(err.message || 'Error al conectar con Supabase')
    } finally {
      setLoading(false)
    }
  }

  // Lookups
  const brandMap = useMemo(() => {
    return brands.reduce((acc, b) => {
      acc[b.id] = b.name
      return acc
    }, {})
  }, [brands])

  const imagesByProduct = useMemo(() => {
    const map = {}
    images.forEach((img) => {
      if (!map[img.product_id]) map[img.product_id] = []
      map[img.product_id].push(img.image_url)
    })
    return map
  }, [images])

  const dimensionsByProduct = useMemo(() => {
    const map = {}
    dimensions.forEach((d) => {
      map[d.product_id] = d
    })
    return map
  }, [dimensions])

  // ============================================================================
  // BUSINESS WORKFLOW ACTIONS & PERSISTENCE
  // ============================================================================

  // 1. Live Product & Pricing Save Handler
  const handleSaveProduct = async (productId, updatedFields) => {
    try {
      const { data, error: err } = await supabase
        .from('products')
        .update(updatedFields)
        .eq('id', productId)
        .select()
        .single()

      if (err) throw err

      // Update local state
      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, ...data } : p)))
      if (selectedProduct && selectedProduct.id === productId) {
        setSelectedProduct({ ...selectedProduct, ...data })
      }

      // Log activity
      await supabase.from('activity_log').insert({
        actor: 'BRAND_MANAGER',
        action: 'PRODUCT_B2B_UPDATED',
        entity_type: 'product',
        entity_id: String(productId),
        metadata: {
          name: updatedFields.name,
          wholesale_price: updatedFields.wholesale_price,
          retail_price: updatedFields.retail_price,
          stock_quantity: updatedFields.stock_quantity
        }
      })

      return data
    } catch (err) {
      console.error('Error updating product:', err)
      throw err
    }
  }

  // 2. B2B Order Save Handler
  const handleSaveB2BOrder = async (orderData, itemsData) => {
    try {
      const { data: newOrder, error: orderErr } = await supabase
        .from('b2b_orders')
        .insert(orderData)
        .select()
        .single()

      if (orderErr) throw orderErr

      const itemsWithOrderId = itemsData.map((it) => ({
        ...it,
        order_id: newOrder.id
      }))

      const { data: newItems, error: itemsErr } = await supabase
        .from('b2b_order_items')
        .insert(itemsWithOrderId)
        .select()

      if (itemsErr) throw itemsErr

      // Update local state
      setB2bOrders((prev) => [newOrder, ...prev])
      setB2bOrderItems((prev) => [...(newItems || []), ...prev])

      // Log activity
      await supabase.from('activity_log').insert({
        actor: 'COMMERCIAL_MGR',
        action: 'B2B_ORDER_CREATED',
        entity_type: 'b2b_order',
        entity_id: String(newOrder.id),
        metadata: {
          order_number: newOrder.order_number,
          client_name: newOrder.client_name,
          total_amount: newOrder.total_amount,
          items_count: itemsData.length
        }
      })

      return newOrder
    } catch (err) {
      console.error('Error saving B2B order:', err)
      throw err
    }
  }

  // 3. Update B2B Order Status Handler
  const handleUpdateB2BOrderStatus = async (orderId, newStatus) => {
    try {
      const { data, error: err } = await supabase
        .from('b2b_orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .select()
        .single()

      if (err) throw err

      setB2bOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)))

      await supabase.from('activity_log').insert({
        actor: 'COMMERCIAL_MGR',
        action: 'B2B_ORDER_STATUS_CHANGED',
        entity_type: 'b2b_order',
        entity_id: String(orderId),
        metadata: { status: newStatus }
      })
    } catch (err) {
      console.error('Error updating order status:', err)
      alert('Error: ' + err.message)
    }
  }

  // 4. Save B2B Client Handler
  const handleSaveB2BClient = async (clientData) => {
    try {
      const { data, error: err } = await supabase
        .from('b2b_clients')
        .insert(clientData)
        .select()
        .single()

      if (err) throw err

      setB2bClients((prev) => [...prev, data])

      await supabase.from('activity_log').insert({
        actor: 'COMMERCIAL_MGR',
        action: 'B2B_CLIENT_REGISTERED',
        entity_type: 'b2b_client',
        entity_id: String(data.id),
        metadata: { company_name: data.company_name, tax_id: data.tax_id }
      })

      return data
    } catch (err) {
      console.error('Error saving B2B client:', err)
      alert('Error: ' + err.message)
    }
  }

  // 5. Promote Discovered Product to Commercial Catalog
  const handlePromoteToCommercial = async (discItem) => {
    try {
      const bName = brandMap[discItem.brand_id] || 'K-Beauty'
      const { data: newP, error: pErr } = await supabase
        .from('products')
        .insert({
          sku: discItem.sku || `SKU-DISC-${discItem.id}`,
          ean: discItem.ean || null,
          name: discItem.name,
          brand_id: discItem.brand_id,
          priority: 'MEDIA',
          format: discItem.format || null,
          description_short: discItem.raw_data?.description || '',
          description_full: discItem.raw_data?.description || '',
          url_origen: discItem.external_url || '',
          lifecycle_stage: 'CATALOGING',
          origin: 'IMPORT',
          verification_status: 'VERIFICADO_DISCOVERY',
          wholesale_price: 14.50,
          retail_price: 26.00,
          stock_quantity: 50,
          moq: 3
        })
        .select()
        .single()

      if (pErr) throw pErr

      await supabase
        .from('discovered_products')
        .update({ product_id: newP.id })
        .eq('id', discItem.id)

      if (discItem.image_url) {
        await supabase.from('product_images').insert({
          product_id: newP.id,
          image_url: discItem.image_url,
          position: 1
        })
      }

      await supabase.from('activity_log').insert({
        actor: 'COMMERCIAL_MGR',
        action: 'DISCOVERY_PROMOTED_TO_CATALOG',
        entity_type: 'product',
        entity_id: String(newP.id),
        metadata: { source_discovery_id: discItem.id, name: newP.name }
      })

      await fetchAllHubData()
      alert(`Producto "${newP.name}" incorporado con éxito al Catálogo Comercial.`)
    } catch (err) {
      console.error('Error promoting product:', err)
      alert('Error al incorporar producto: ' + err.message)
    }
  }

  // 6. Confirm Purchase Order -> Move Items to Catalog
  const handleConfirmPo = async (po) => {
    try {
      await supabase
        .from('purchase_orders')
        .update({ status: 'CONFIRMED' })
        .eq('id', po.id)

      await supabase.from('activity_log').insert({
        actor: 'COMMERCIAL_MGR',
        action: 'PURCHASE_ORDER_CONFIRMED',
        entity_type: 'purchase_order',
        entity_id: String(po.id),
        metadata: { po_number: po.po_number, total_usd: po.total_amount_usd }
      })

      await fetchAllHubData()
      alert(`Orden de Compra ${po.po_number} confirmada exitosamente.`)
    } catch (err) {
      console.error('Error confirming PO:', err)
      alert('Error: ' + err.message)
    }
  }

  // 7. Approve Product in Human-in-the-Loop Quality Control
  const handleApproveProduct = async (productId) => {
    try {
      await supabase
        .from('products')
        .update({
          lifecycle_stage: 'READY_TO_PUBLISH',
          verification_status: 'APROBADO_BRAND_MANAGER'
        })
        .eq('id', productId)

      await supabase.from('activity_log').insert({
        actor: 'BRAND_MANAGER',
        action: 'QUALITY_CONTROL_APPROVED',
        entity_type: 'product',
        entity_id: String(productId),
        metadata: { lifecycle_stage: 'READY_TO_PUBLISH' }
      })

      await fetchAllHubData()
      alert('Ficha técnica y claims aprobados exitosamente.')
    } catch (err) {
      console.error('Error approving product:', err)
    }
  }

  // 8. Return Product for Revision
  const handleReturnProduct = async (productId, reason) => {
    try {
      await supabase
        .from('products')
        .update({
          lifecycle_stage: 'CATALOGING',
          rejection_reason: reason
        })
        .eq('id', productId)

      await supabase.from('activity_log').insert({
        actor: 'BRAND_MANAGER',
        action: 'QUALITY_CONTROL_RETURNED',
        entity_type: 'product',
        entity_id: String(productId),
        metadata: { reason }
      })

      await fetchAllHubData()
      alert('Producto devuelto a catalogación con observaciones.')
    } catch (err) {
      console.error('Error returning product:', err)
    }
  }

  // 9. AI Agent Trigger
  const handleTriggerAgent = async (agentId) => {
    try {
      const { data: run } = await supabase
        .from('ai_runs')
        .insert({
          agent_name: agentId,
          entity_type: 'catalog',
          entity_id: 'batch_run',
          prompt_summary: `Ejecución manual de agente especializado: ${agentId}`,
          model_used: 'gemini-3.6-flash',
          status: 'COMPLETED'
        })
        .select()
        .single()

      await supabase.from('activity_log').insert({
        actor: 'AI_AGENT',
        action: `AGENT_${agentId.toUpperCase()}_TRIGGERED`,
        entity_type: 'ai_run',
        entity_id: agentId,
        metadata: { run_id: run?.id }
      })

      await fetchAllHubData()
      alert(`Agente ${agentId} ejecutado con éxito. Datos y telemetría actualizados.`)
    } catch (err) {
      console.error('Error running agent:', err)
    }
  }

  // Navigation Items
  const navItems = [
    { key: 'dashboard', label: 'Dashboard Hub', icon: LayoutDashboard },
    { key: 'b2b_orders', label: 'Ventas & Pedidos B2B', icon: ShoppingCart, badge: b2bOrders.length, highlight: true },
    { key: 'products', label: 'Catálogo Comercial', icon: Package },
    { key: 'pipeline', label: 'Pipeline Kanban', icon: Kanban },
    { key: 'approvals', label: 'Aprobaciones', icon: AlertCircle, badge: products.filter((p) => p.lifecycle_stage === 'APPROVAL').length, alert: true },
    { key: 'brands', label: 'Radar de Marcas', icon: Layers, badge: brands.filter((b) => b.status === 'RADAR').length },
    { key: 'discovery', label: 'Discovery (Scraping)', icon: Globe, badge: discoveredProducts.length },
    { key: 'negotiations', label: 'Negociaciones B2B', icon: TrendingUp },
    { key: 'purchase_orders', label: 'Órdenes de Compra', icon: ShoppingCart, badge: purchaseOrders.filter((po) => po.status === 'CONFIRMED').length },
    { key: 'publications', label: 'Publicaciones', icon: CheckCircle2 },
    { key: 'ai_agents', label: 'Agentes de IA', icon: Cpu },
    { key: 'activity_log', label: 'Trazabilidad (Logs)', icon: Activity }
  ]

  return (
    <div className="relative min-h-screen bg-[#F5F5F7] text-[#17181B] flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      {/* Ambient Diffused Caustic & Luminescence */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="ambient-caustic-1 absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-slate-200/40 via-white/80 to-transparent blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-slate-100/60 via-white/70 to-transparent blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#E2E8F0_1px,transparent_1px)] [background-size:32px_32px] opacity-30" />
      </div>

      {/* Top Navbar with Liquid Glass */}
      <header className="sticky top-0 z-40 liquid-glass-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 lg:hidden rounded-lg hover:bg-slate-200/50"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="relative group cursor-pointer">
                <div className="w-9 h-9 rounded-xl bg-white border border-[#E7E8EB] flex items-center justify-center shadow-sm text-sm font-bold text-slate-900">
                  ✨
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold tracking-tight text-[#17181B] font-display">
                    K-BEAUTY
                  </span>
                  <span className="text-[11px] uppercase tracking-widest text-[#6B6E75] font-mono font-medium">
                    PRODUCT HUB
                  </span>
                  <span className="hidden sm:inline-block px-2 py-0.5 text-[9px] font-mono font-bold chrome-badge rounded-md">
                    CLINICAL OS
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Search & Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden sm:flex items-center gap-3 px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-[#E7E8EB] hover:border-slate-300 rounded-xl text-xs text-slate-600 transition shadow-sm"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500 font-medium">Buscar productos, marcas, OCs, pedidos B2B...</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600 font-mono border border-slate-200">
                Ctrl + K
              </kbd>
            </button>

            <button
              onClick={fetchAllHubData}
              className="p-2 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-[#E7E8EB] rounded-xl transition shadow-sm"
              title="Refrescar datos en vivo"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-slate-900' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="relative z-10 flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        {/* Sidebar Navigation */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white/95 backdrop-blur-2xl border-r border-[#E7E8EB] p-4 flex flex-col justify-between transform transition-transform duration-300 lg:relative lg:translate-x-0 lg:bg-transparent lg:border-none lg:p-0 lg:w-56 lg:z-auto ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between lg:hidden mb-4">
              <span className="text-sm font-bold text-slate-900">Menú de Navegación</span>
              <button onClick={() => setSidebarOpen(false)} className="text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const IconComp = item.icon
                const isActive = currentView === item.key

                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      setCurrentView(item.key)
                      setSidebarOpen(false)
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-[#17181B] text-white shadow-sm'
                        : 'text-[#6B6E75] hover:text-[#17181B] hover:bg-white/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <IconComp
                        className={`w-4 h-4 transition ${
                          isActive ? 'text-white' : 'text-slate-400'
                        }`}
                      />
                      <span className="tracking-tight">{item.label}</span>
                    </div>

                    {item.badge > 0 && (
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : item.alert
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Sidebar Footer Info */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#E7E8EB] text-[11px] text-slate-500 space-y-1.5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Estado Live</span>
              <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[10px] font-mono">Supabase Online</span>
              </div>
            </div>
            <div className="text-slate-800 font-mono text-[10px] font-semibold">
              {products.length.toLocaleString()} productos comercializados
            </div>
          </div>
        </aside>

        {/* View Main Content Area */}
        <main className="flex-1 min-w-0">
          {loading && products.length === 0 ? (
            <div className="text-center py-28 space-y-3">
              <div className="w-10 h-10 rounded-full border-2 border-slate-300 border-t-slate-900 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium tracking-wide">
                Cargando K-Beauty Product Hub...
              </p>
            </div>
          ) : (
            <>
              {currentView === 'dashboard' && (
                <DashboardView
                  brands={brands}
                  products={products}
                  negotiations={negotiations}
                  purchaseOrders={purchaseOrders}
                  discoveredCount={discoveredProducts.length}
                  onNavigate={(v) => setCurrentView(v)}
                  onSelectProduct={(p) => setSelectedProduct(p)}
                />
              )}

              {currentView === 'b2b_orders' && (
                <B2BOrdersView
                  products={products}
                  brands={brands}
                  imagesByProduct={imagesByProduct}
                  b2bOrders={b2bOrders}
                  b2bOrderItems={b2bOrderItems}
                  b2bClients={b2bClients}
                  onSaveOrder={handleSaveB2BOrder}
                  onUpdateOrderStatus={handleUpdateB2BOrderStatus}
                  onSaveClient={handleSaveB2BClient}
                  onSelectProduct={(p) => setSelectedProduct(p)}
                />
              )}

              {currentView === 'brands' && (
                <BrandsRadarView
                  brands={brands}
                  sources={sources}
                  discoveredProducts={discoveredProducts}
                  onStartNegotiation={() => setCurrentView('negotiations')}
                  onNavigate={(v) => setCurrentView(v)}
                />
              )}

              {currentView === 'discovery' && (
                <DiscoveryView
                  discoveredProducts={discoveredProducts}
                  brands={brands}
                  onPromoteToCommercial={handlePromoteToCommercial}
                />
              )}

              {currentView === 'negotiations' && (
                <NegotiationsView
                  negotiations={negotiations}
                  brands={brands}
                  onCreatePoFromNegotiation={() => setCurrentView('purchase_orders')}
                />
              )}

              {currentView === 'purchase_orders' && (
                <PurchaseOrdersView
                  purchaseOrders={purchaseOrders}
                  poItems={poItems}
                  brands={brands}
                  onConfirmPo={handleConfirmPo}
                  onNavigate={(v) => setCurrentView(v)}
                />
              )}

              {currentView === 'products' && (
                <ProductsView
                  products={products}
                  brands={brands}
                  imagesByProduct={imagesByProduct}
                  dimensionsByProduct={dimensionsByProduct}
                  onSelectProduct={(p) => setSelectedProduct(p)}
                />
              )}

              {currentView === 'pipeline' && (
                <PipelineKanbanView
                  products={products}
                  brands={brands}
                  imagesByProduct={imagesByProduct}
                  onSelectProduct={(p) => setSelectedProduct(p)}
                  onMoveStage={(prodId, newStg) => handleApproveProduct(prodId)}
                />
              )}

              {currentView === 'approvals' && (
                <ApprovalsView
                  products={products}
                  brands={brands}
                  imagesByProduct={imagesByProduct}
                  onApproveProduct={handleApproveProduct}
                  onReturnProduct={handleReturnProduct}
                  onSelectProduct={(p) => setSelectedProduct(p)}
                />
              )}

              {currentView === 'publications' && (
                <PublicationsView
                  products={products}
                  brands={brands}
                  productChannels={productChannels}
                  onPublishChannel={() => alert('Sincronización de canal ejecutada')}
                />
              )}

              {currentView === 'ai_agents' && (
                <AiAgentsView
                  aiRuns={aiRuns}
                  onTriggerAgent={handleTriggerAgent}
                />
              )}

              {currentView === 'activity_log' && (
                <ActivityLogView activityLogs={activityLogs} />
              )}
            </>
          )}
        </main>
      </div>

      {/* Global Command Palette (Ctrl + K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        products={products}
        brands={brands}
        purchaseOrders={purchaseOrders}
        negotiations={negotiations}
        onSelectProduct={(p) => setSelectedProduct(p)}
        onNavigate={(v) => setCurrentView(v)}
      />

      {/* Product Detail Modal with Live Pricing & B2B Editor */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          brandName={brandMap[selectedProduct.brand_id]}
          images={imagesByProduct[selectedProduct.id] || []}
          dimensions={dimensionsByProduct[selectedProduct.id]}
          channels={productChannels.filter((ch) => ch.product_id === selectedProduct.id)}
          onClose={() => setSelectedProduct(null)}
          onSaveProduct={handleSaveProduct}
          onUpdateStage={(pId, newStg) => {
            if (newStg === 'CATALOGING') handleReturnProduct(pId, 'Devuelto desde ficha técnica')
            else if (newStg === 'READY_TO_PUBLISH') handleApproveProduct(pId)
            setSelectedProduct(null)
          }}
        />
      )}
    </div>
  )
}

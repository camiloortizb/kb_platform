import * as XLSX from 'xlsx'

/**
 * Export Master B2B Catalog to Excel (.xlsx)
 */
export function exportMasterCatalogExcel(products = [], brandMap = {}, dimensionsByProduct = {}, imagesByProduct = {}) {
  const exportData = products.map((p) => {
    const dim = dimensionsByProduct[p.id] || {}
    const wPrice = Number(p.wholesale_price || 14.50)
    const rPrice = Number(p.retail_price || 26.00)
    const margin = rPrice > 0 ? (((rPrice - wPrice) / rPrice) * 100).toFixed(1) : '0.0'
    const pImgs = imagesByProduct[p.id] || []

    return {
      'Marca': brandMap[p.brand_id] || '',
      'Código EAN-13': p.ean || '',
      'SKU Comercial': p.sku || '',
      'Producto': p.name || '',
      'Formato': p.format || '',
      'Precio Mayorista (USD)': wPrice,
      'PVP Sugerido (USD)': rPrice,
      'Margen Sugerido (%)': `${margin}%`,
      'Pack Mínimo (MOQ)': p.moq || 3,
      'Stock Físico': p.stock_quantity || 100,
      'Etapa Ciclo de Vida': p.lifecycle_stage || 'PUBLISHED',
      'Completitud (%)': p.completeness_score || 100,
      'Ingredientes INCI': p.key_ingredients || '',
      'Modo de Uso': p.usage_instructions || '',
      'Tipo de Piel': p.skin_types || '',
      'Beneficios': p.benefits || '',
      'Alto (cm)': dim.height_cm || '',
      'Ancho (cm)': dim.width_cm || '',
      'Profundidad (cm)': dim.depth_cm || '',
      'URL Foto Oficial': pImgs[0] || p.url_origen || '',
      'Verificación': p.verification_status || 'VERIFICADO_OFICIAL'
    }
  })

  const worksheet = XLSX.utils.json_to_sheet(exportData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Catalogo_Maestro_B2B')
  XLSX.writeFile(workbook, `Catalogo_Maestro_B2B_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

/**
 * Export Interactive Customer Order Sheet with Formulas (.xlsx)
 */
export function exportCustomerOrderSheet(products = [], brandMap = {}) {
  const data = products.map((p, idx) => {
    const bName = brandMap[p.brand_id] || 'General'
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
  XLSX.writeFile(workbook, `Planilla_Pedido_Mayorista_Cliente_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

/**
 * Export Single Order to Excel (.xlsx)
 */
export function exportSingleOrderExcel(order, items = []) {
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
  const safeClient = (order.client_name || 'Cliente').replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_')
  XLSX.writeFile(workbook, `Orden_${order.order_number}_${safeClient}.xlsx`)
}

import { supabase } from '../lib/supabase'

export const productService = {
  // Update product fields with validation
  updateProduct: async (productId, updatedFields) => {
    if (!productId) throw new Error('ID de producto inválido')

    // Clean numerical values
    const payload = { ...updatedFields }
    if (payload.wholesale_price !== undefined) payload.wholesale_price = Number(payload.wholesale_price) || 0
    if (payload.retail_price !== undefined) payload.retail_price = Number(payload.retail_price) || 0
    if (payload.cost_price !== undefined) payload.cost_price = Number(payload.cost_price) || 0
    if (payload.stock_quantity !== undefined) payload.stock_quantity = parseInt(payload.stock_quantity) || 0
    if (payload.moq !== undefined) payload.moq = parseInt(payload.moq) || 1

    const { data, error } = await supabase
      .from('products')
      .update(payload)
      .eq('id', productId)
      .select()
      .single()

    if (error) throw error

    // Log to activity trail
    await supabase.from('activity_log').insert({
      actor: 'BRAND_MANAGER',
      action: 'PRODUCT_UPDATED',
      entity_type: 'product',
      entity_id: String(productId),
      metadata: {
        name: data.name,
        wholesale_price: data.wholesale_price,
        retail_price: data.retail_price,
        stock_quantity: data.stock_quantity
      }
    })

    return data
  },

  // Approve product in QC
  approveProduct: async (productId) => {
    const { data, error } = await supabase
      .from('products')
      .update({
        lifecycle_stage: 'READY_TO_PUBLISH',
        verification_status: 'APROBADO_BRAND_MANAGER',
        rejection_reason: null
      })
      .eq('id', productId)
      .select()
      .single()

    if (error) throw error

    await supabase.from('activity_log').insert({
      actor: 'BRAND_MANAGER',
      action: 'QUALITY_CONTROL_APPROVED',
      entity_type: 'product',
      entity_id: String(productId),
      metadata: { lifecycle_stage: 'READY_TO_PUBLISH' }
    })

    return data
  },

  // Return product with observations
  returnProduct: async (productId, reason) => {
    const { data, error } = await supabase
      .from('products')
      .update({
        lifecycle_stage: 'CATALOGING',
        rejection_reason: reason || 'Observaciones en ficha técnica'
      })
      .eq('id', productId)
      .select()
      .single()

    if (error) throw error

    await supabase.from('activity_log').insert({
      actor: 'BRAND_MANAGER',
      action: 'QUALITY_CONTROL_RETURNED',
      entity_type: 'product',
      entity_id: String(productId),
      metadata: { reason }
    })

    return data
  }
}

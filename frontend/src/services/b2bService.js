import { supabase } from '../lib/supabase'

export const b2bService = {
  // Create full B2B Order with items transactionally
  createOrder: async (orderData, itemsData) => {
    if (!orderData.client_name) throw new Error('Se requiere un cliente para la orden')
    if (!itemsData || itemsData.length === 0) throw new Error('La orden debe contener al menos un producto')

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

    return { order: newOrder, items: newItems }
  },

  // Update order status
  updateOrderStatus: async (orderId, newStatus) => {
    const { data, error } = await supabase
      .from('b2b_orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select()
      .single()

    if (error) throw error

    await supabase.from('activity_log').insert({
      actor: 'COMMERCIAL_MGR',
      action: 'B2B_ORDER_STATUS_CHANGED',
      entity_type: 'b2b_order',
      entity_id: String(orderId),
      metadata: { status: newStatus }
    })

    return data
  },

  // Save new B2B Client
  createClient: async (clientData) => {
    if (!clientData.company_name?.trim()) throw new Error('El nombre de la empresa es requerido')

    const { data, error } = await supabase
      .from('b2b_clients')
      .insert(clientData)
      .select()
      .single()

    if (error) throw error

    await supabase.from('activity_log').insert({
      actor: 'COMMERCIAL_MGR',
      action: 'B2B_CLIENT_REGISTERED',
      entity_type: 'b2b_client',
      entity_id: String(data.id),
      metadata: { company_name: data.company_name, tax_id: data.tax_id }
    })

    return data
  }
}

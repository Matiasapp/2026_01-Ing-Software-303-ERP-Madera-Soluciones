import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  estadoFromOrderStatus,
  estadoFromShipmentStatus,
  fetchMLOrder,
  fetchMLShipment,
  fetchPublicacionesLookup,
  getValidToken,
  mapMLOrderToVenta,
  updateVentaEstado,
} from '../_shared/ml-client.ts'

type Supabase = ReturnType<typeof createClient>

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

Deno.serve(async (req: Request) => {
  // ML requiere respuesta dentro de ~10 s; procesamos síncronamente
  if (req.method !== 'POST') return json({ ok: true })

  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ ok: true })
  }

  const topic = body?.topic as string | undefined
  // orders_v2 → alta y cancelación; shipments → progreso de envío.
  if (topic !== 'orders_v2' && topic !== 'shipments') return json({ ok: true })

  const resourceId = (body.resource as string | undefined)?.split('/').pop()
  if (!resourceId) return json({ ok: true })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const accessToken = await getValidToken(supabase)
    return topic === 'shipments'
      ? await handleShipment(supabase, accessToken, resourceId)
      : await handleOrder(supabase, accessToken, resourceId)
  } catch (err) {
    console.error('Error procesando webhook ML:', err)
    // Error transitorio (token, red ML, DB): devolvemos 500 para que ML reintente.
    // Los casos de negocio ya retornaron 200 más arriba.
    return json({ ok: false, error: String(err) }, 500)
  }
})

// Notificación de orden: importa la venta nueva (pagada) o propaga la cancelación.
async function handleOrder(supabase: Supabase, accessToken: string, orderId: string) {
  const order  = await fetchMLOrder(orderId, accessToken)
  const estado = estadoFromOrderStatus(order.status)

  // Estado irrelevante para el ERP (p.ej. pago en proceso): ignorar.
  if (!estado) return json({ ok: true, skipped: `status=${order.status}` })

  // ¿La venta ya está en el ERP?
  const { data: existing, error: selErr } = await supabase
    .from('ventas')
    .select('id')
    .eq('ml_order_id', orderId)
    .maybeSingle()
  if (selErr) throw selErr

  if (existing) {
    // Ya importada: solo propagamos la cancelación. No pisamos el progreso de
    // envío (En preparación/Despachado/Entregado) con "Pendiente".
    if (estado === 'Cancelado') {
      await updateVentaEstado(supabase, orderId, 'Cancelado')
      return json({ ok: true, venta: (existing as { id: number }).id, estado })
    }
    return json({ ok: true, skipped: 'already_imported' })
  }

  // Aún no existe: solo importamos órdenes pagadas (no una cancelada que nunca vimos).
  if (estado !== 'Pendiente') {
    return json({ ok: true, skipped: `not_imported_status=${order.status}` })
  }

  const itemIds = (order.order_items as any[] ?? []).map(oi => String(oi.item.id))
  const publicaciones = await fetchPublicacionesLookup(supabase, itemIds)
  const { venta, items } = mapMLOrderToVenta(order, publicaciones)

  // Inserta venta + items atómicamente vía RPC. Si los items fallan, Postgres
  // revierte la venta. UNIQUE(ml_order_id) previene duplicados ante carreras.
  const { data: ventaRow, error: rpcError } = await supabase.rpc('create_venta_with_items', {
    p_fecha:       venta.fecha,
    p_canal:       venta.canal,
    p_referencia:  venta.referencia,
    p_cliente_id:  venta.cliente_id,
    p_monto:       venta.monto,
    p_origen:      venta.origen,
    p_ml_order_id: venta.ml_order_id,
    p_estado:      'Pendiente',
    // p_items es jsonb: hay que pasar el array directo. Con JSON.stringify
    // llegaría como string escalar y jsonb_array_elements falla (22023).
    p_items:       items,
  })

  if (rpcError) {
    // 23505 = UNIQUE violado (otra ejecución la insertó primero): no es error.
    if (rpcError.code === '23505') return json({ ok: true, skipped: 'duplicate' })
    throw rpcError
  }

  const ventaId = (ventaRow as { id: number }).id
  console.log(`Orden ML #${orderId} → venta ID ${ventaId}`)
  return json({ ok: true, venta_id: ventaId })
}

// Notificación de envío: actualiza el estado de la venta ya importada.
async function handleShipment(supabase: Supabase, accessToken: string, shipmentId: string) {
  const shipment = await fetchMLShipment(shipmentId, accessToken)
  const orderId  = String(shipment.order_id ?? '')
  if (!orderId) return json({ ok: true, skipped: 'no_order_id' })

  const estado = estadoFromShipmentStatus(shipment.status)
  // Estado de envío sin mapeo (pending, handling, etc.): no tocamos la venta.
  if (!estado) return json({ ok: true, skipped: `shipment_status=${shipment.status}` })

  const updated = await updateVentaEstado(supabase, orderId, estado)
  if (!updated) {
    // El envío llegó antes que la orden. ML reintenta / orders_v2 la importará luego.
    return json({ ok: true, skipped: 'venta_not_found' })
  }

  console.log(`Envío ML #${shipmentId} (orden ${orderId}) → estado ${estado}`)
  return json({ ok: true, order: orderId, estado })
}

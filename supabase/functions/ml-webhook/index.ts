import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  fetchMLOrder,
  fetchPublicacionesLookup,
  getValidToken,
  mapMLOrderToVenta,
} from '../_shared/ml-client.ts'

// Únicos estados que se importan como venta confirmada
const PAID_STATUSES = new Set(['paid', 'partially_paid'])

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

  // Solo manejar notificaciones de órdenes
  if (body?.topic !== 'orders_v2') return json({ ok: true })

  const orderId = (body.resource as string | undefined)?.split('/').pop()
  if (!orderId) return json({ ok: true })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const accessToken = await getValidToken(supabase)
    const order       = await fetchMLOrder(orderId, accessToken)

    // Ignorar órdenes no pagadas (se recibirá otro webhook cuando se paguen)
    if (!PAID_STATUSES.has(order.status)) {
      return json({ ok: true, skipped: `status=${order.status}` })
    }

    // Resolver producto_id (y costo histórico) de cada línea desde las publicaciones.
    const itemIds = (order.order_items as any[] ?? []).map(oi => String(oi.item.id))
    const publicaciones = await fetchPublicacionesLookup(supabase, itemIds)
    const { venta, items } = mapMLOrderToVenta(order, publicaciones)

    // Inserta venta + items atómicamente vía RPC (la misma función que usa el frontend).
    // Si la inserción de items falla, Postgres revierte la venta automáticamente.
    // UNIQUE(ml_order_id) sigue previniendo duplicados.
    const { data: ventaRow, error: rpcError } = await supabase.rpc('create_venta_with_items', {
      p_fecha:       venta.fecha,
      p_canal:       venta.canal,
      p_referencia:  venta.referencia,
      p_cliente_id:  venta.cliente_id,
      p_monto:       venta.monto,
      p_origen:      venta.origen,
      p_ml_order_id: venta.ml_order_id,
      p_estado:      'Pendiente',
      p_items:       JSON.stringify(items),
    })

    if (rpcError) {
      // Código 23505 = violación de constraint UNIQUE (orden ya importada): no es error
      if (rpcError.code === '23505') return json({ ok: true, skipped: 'duplicate' })
      throw rpcError
    }

    const ventaId = (ventaRow as { id: number }).id
    console.log(`Orden ML #${orderId} → venta ID ${ventaId}`)
    return json({ ok: true, venta_id: ventaId })
  } catch (err) {
    console.error('Error procesando webhook ML:', err)
    // Error transitorio (token, red ML, DB): devolvemos 500 para que ML reintente
    // y no perder la venta. Los errores de negocio ya retornaron 200 más arriba.
    return json({ ok: false, error: String(err) }, 500)
  }
})

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ML_API = 'https://api.mercadolibre.com'

type Credentials = {
  id: number
  seller_id: string
  access_token: string
  refresh_token: string
  expires_at: string
  refresh_lock_until: string | null
}

// Cuánto tiempo se mantiene el lock de refresco antes de considerarlo abandonado
// (si el proceso que lo tomó murió a mitad de camino).
const REFRESH_LOCK_MS = 30 * 1000
// Cuánto espera un proceso que NO obtuvo el lock a que el otro termine.
const REFRESH_WAIT_TOTAL_MS = 15 * 1000
const REFRESH_WAIT_STEP_MS = 1000

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function getValidToken(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data: creds, error } = await supabase
    .from('ml_credentials')
    .select('*')
    .order('id', { ascending: false })
    .limit(1)
    .single()

  if (error || !creds) {
    throw new Error('ML no está conectado. Vincular cuenta en Configuración.')
  }

  const typedCreds = creds as Credentials
  const expiresAt = new Date(typedCreds.expires_at)
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000)

  if (expiresAt < fiveMinutesFromNow) {
    return refreshAccessToken(supabase, typedCreds)
  }

  return typedCreds.access_token
}

async function refreshAccessToken(
  supabase: ReturnType<typeof createClient>,
  creds: Credentials,
): Promise<string> {
  // Lock optimista: los refresh tokens de ML son de un solo uso, así que solo un
  // proceso puede llamar al endpoint de refresco a la vez. Reclamamos el lock con
  // un UPDATE condicional atómico; si otro proceso ya lo tiene, esperamos a que
  // persista el nuevo token y lo devolvemos sin volver a llamar a ML.
  const nowIso = new Date().toISOString()
  const lockUntil = new Date(Date.now() + REFRESH_LOCK_MS).toISOString()

  const { data: claimed, error: claimError } = await supabase
    .from('ml_credentials')
    .update({ refresh_lock_until: lockUntil })
    .eq('id', creds.id)
    .or(`refresh_lock_until.is.null,refresh_lock_until.lt.${nowIso}`)
    .select('id')

  if (claimError) {
    throw new Error(`No se pudo reclamar el lock de refresco ML: ${claimError.message}`)
  }

  // No obtuvimos el lock: otro proceso está refrescando. Esperamos su resultado.
  if (!claimed || claimed.length === 0) {
    return waitForRefreshedToken(supabase, creds)
  }

  try {
    const response = await fetch(`${ML_API}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: Deno.env.get('ML_CLIENT_ID')!,
        client_secret: Deno.env.get('ML_CLIENT_SECRET')!,
        refresh_token: creds.refresh_token,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Error al refrescar token ML: ${response.status} ${body}`)
    }

    const tokens = await response.json()
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // Persistimos los tokens nuevos y liberamos el lock en el mismo UPDATE.
    const { error: updateError } = await supabase
      .from('ml_credentials')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? creds.refresh_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
        refresh_lock_until: null,
      })
      .eq('id', creds.id)

    if (updateError) {
      throw new Error(`Token ML refrescado pero no persistido: ${updateError.message}`)
    }

    return tokens.access_token
  } catch (err) {
    // Liberamos el lock ante un fallo para no bloquear el próximo intento hasta
    // que expire el timeout. Si esta liberación falla, el timeout lo cubre.
    await supabase
      .from('ml_credentials')
      .update({ refresh_lock_until: null })
      .eq('id', creds.id)
    throw err
  }
}

// Espera a que el proceso que tiene el lock persista un token nuevo y lo devuelve.
async function waitForRefreshedToken(
  supabase: ReturnType<typeof createClient>,
  creds: Credentials,
): Promise<string> {
  const margin = new Date(Date.now() + 60 * 1000)
  const deadline = Date.now() + REFRESH_WAIT_TOTAL_MS

  while (Date.now() < deadline) {
    await sleep(REFRESH_WAIT_STEP_MS)

    const { data: fresh } = await supabase
      .from('ml_credentials')
      .select('access_token, expires_at')
      .eq('id', creds.id)
      .single()

    const updated = fresh as { access_token: string; expires_at: string } | null
    // El otro proceso ya refrescó: expires_at quedó bien en el futuro.
    if (updated && new Date(updated.expires_at) > margin) {
      return updated.access_token
    }
  }

  throw new Error('Timeout esperando el refresco de token ML por otro proceso')
}

export async function fetchMLOrder(orderId: string, accessToken: string): Promise<any> {
  const response = await fetch(`${ML_API}/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error(`Error al obtener orden ML #${orderId}: ${response.status}`)
  }

  return response.json()
}

export async function fetchMLShipment(shipmentId: string, accessToken: string): Promise<any> {
  const response = await fetch(`${ML_API}/shipments/${shipmentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error(`Error al obtener envío ML #${shipmentId}: ${response.status}`)
  }

  return response.json()
}

// Estados de fulfillment que maneja el ERP.
export type EstadoERP =
  | 'Pendiente'
  | 'En preparación'
  | 'Despachado'
  | 'Entregado'
  | 'Cancelado'

// Estado del ERP derivado del status de la ORDEN (notificaciones orders_v2).
// Devuelve null para estados que no nos interesan (p.ej. pago en proceso).
export function estadoFromOrderStatus(status: string): EstadoERP | null {
  if (status === 'cancelled') return 'Cancelado'
  if (status === 'paid' || status === 'partially_paid') return 'Pendiente'
  return null
}

// Estado del ERP derivado del status del ENVÍO (notificaciones shipments).
export function estadoFromShipmentStatus(status: string): EstadoERP | null {
  switch (status) {
    case 'ready_to_ship': return 'En preparación'
    case 'shipped':       return 'Despachado'
    case 'delivered':     return 'Entregado'
    case 'cancelled':     return 'Cancelado'
    default:              return null
  }
}

// Actualiza el estado de la venta ML existente (match por ml_order_id).
// Devuelve true si actualizó alguna fila, false si la venta aún no existe.
export async function updateVentaEstado(
  supabase: ReturnType<typeof createClient>,
  mlOrderId: string,
  estado: EstadoERP,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('ventas')
    .update({ estado })
    .eq('ml_order_id', mlOrderId)
    .select('id')

  if (error) {
    throw new Error(`Error al actualizar estado de venta ML #${mlOrderId}: ${error.message}`)
  }
  return (data?.length ?? 0) > 0
}

type PublicacionInfo = { producto_id: number; costo_compra: number | null }

// Carga el mapeo meli_item_id → { producto_id, costo_compra } para los items de
// una orden. Permite enlazar la venta ML con el producto interno y congelar el
// costo. Los item_ids sin publicación registrada quedan fuera del mapa.
export async function fetchPublicacionesLookup(
  supabase: ReturnType<typeof createClient>,
  itemIds: string[],
): Promise<Map<string, PublicacionInfo>> {
  const map = new Map<string, PublicacionInfo>()
  if (itemIds.length === 0) return map

  const { data, error } = await supabase
    .from('meli_publicaciones')
    .select('meli_item_id, producto_id, productos(costo_compra)')
    .in('meli_item_id', itemIds)

  if (error) {
    throw new Error(`Error al cargar publicaciones ML: ${error.message}`)
  }

  for (const row of (data ?? []) as any[]) {
    // El embed a productos es to-one; según el cliente puede venir como objeto o array.
    const prod = Array.isArray(row.productos) ? row.productos[0] : row.productos
    map.set(row.meli_item_id, {
      producto_id: row.producto_id,
      costo_compra: prod?.costo_compra ?? null,
    })
  }
  return map
}

export function mapMLOrderToVenta(
  order: any,
  publicaciones: Map<string, PublicacionInfo> = new Map(),
) {
  // Determinar origen según tipo de logística
  const logisticType: string = order.shipping?.logistic_type ?? ''
  let origen = 'ML Envíos'
  if (logisticType === 'fulfillment') origen = 'ML Full'
  else if (['cross_docking', 'xd_drop_off', 'drop_off'].includes(logisticType)) origen = 'ML Flex'

  return {
    venta: {
      fecha: (order.date_created as string).slice(0, 10),
      canal: 'Mercado Libre' as const,
      referencia: `ML-${order.id}`,
      cliente_id: null,
      monto: order.total_amount as number,
      origen,
      ml_order_id: String(order.id),
    },
    items: (order.order_items as any[]).map(item => {
      const meliItemId = String(item.item.id)
      const match = publicaciones.get(meliItemId)
      return {
        nombre: item.item.title as string,
        cantidad: item.quantity as number,
        precio_unitario: item.unit_price as number,
        producto_id: match?.producto_id ?? null,
        meli_item_id: meliItemId,
        costo_compra_historico: match?.costo_compra ?? null,
      }
    }),
  }
}

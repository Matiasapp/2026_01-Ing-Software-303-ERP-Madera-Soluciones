import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getValidToken } from '../_shared/ml-client.ts'

const ML_API = 'https://api.mercadolibre.com'

// La llama el navegador (otro origen que las funciones), así que respondemos el
// preflight OPTIONS y mandamos cabeceras CORS en cada respuesta.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

// SKU de una publicación ML: primero el campo legacy seller_custom_field, luego
// el atributo SELLER_SKU. Devuelve null si la publicación no declara SKU.
function extractSku(item: any): string | null {
  if (item.seller_custom_field) return String(item.seller_custom_field).trim()
  const attr = (item.attributes as any[] ?? []).find(a => a.id === 'SELLER_SKU')
  if (attr?.value_name) return String(attr.value_name).trim()
  return null
}

// El CHECK de meli_publicaciones.estado_publicacion solo admite estos tres.
function mapEstado(status: string): 'active' | 'paused' | 'closed' {
  if (status === 'active' || status === 'paused' || status === 'closed') return status
  return 'paused' // under_review, inactive, payment_required, etc.
}

// Lista TODOS los item_ids del vendedor. Usa search_type=scan (scroll) para no
// toparse con el tope de 1000 resultados de la paginación por offset.
async function fetchAllItemIds(sellerId: string, token: string): Promise<string[]> {
  const ids: string[] = []
  let scrollId: string | undefined
  for (let page = 0; page < 1000; page++) { // tope de seguridad (100k items)
    const url = new URL(`${ML_API}/users/${sellerId}/items/search`)
    url.searchParams.set('search_type', 'scan')
    url.searchParams.set('limit', '100')
    if (scrollId) url.searchParams.set('scroll_id', scrollId)

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(`items/search ${res.status}: ${await res.text()}`)

    const data = await res.json()
    const batch = (data.results as string[]) ?? []
    if (batch.length === 0) break
    ids.push(...batch)
    scrollId = data.scroll_id
    if (!scrollId) break
  }
  return ids
}

// Trae el detalle de las publicaciones con el multiget /items?ids= (máx 20 por
// llamada). Ignora las que ML no devuelve con code 200.
async function fetchItemsDetails(ids: string[], token: string): Promise<any[]> {
  const items: any[] = []
  const attrs = 'id,title,price,available_quantity,status,seller_custom_field,attributes,variations'
  for (let i = 0; i < ids.length; i += 20) {
    const chunk = ids.slice(i, i + 20)
    const url = `${ML_API}/items?ids=${chunk.join(',')}&attributes=${attrs}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(`items multiget ${res.status}: ${await res.text()}`)

    const data = await res.json()
    for (const entry of (data as any[])) {
      if (entry.code === 200 && entry.body) items.push(entry.body)
    }
  }
  return items
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ ok: false, error: 'no_auth' }, 401)

  // 1. Verificar identidad y rol admin con el JWT del usuario.
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: { user }, error: userErr } = await userClient.auth.getUser()
  if (userErr || !user) return json({ ok: false, error: 'unauthenticated' }, 401)
  const role = (user.app_metadata as any)?.role
  if (role !== 'admin' && role !== 'superadmin') {
    return json({ ok: false, error: 'forbidden' }, 403)
  }

  // 2. Operaciones privilegiadas con service_role.
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const { data: creds, error: credErr } = await admin
      .from('ml_credentials')
      .select('seller_id')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (credErr) throw credErr
    if (!creds) return json({ ok: false, error: 'ml_no_conectado' }, 400)

    const sellerId = (creds as { seller_id: string }).seller_id
    const token = await getValidToken(admin)

    // 3. Catálogo interno: mapa SKU(normalizado) → producto_id.
    const { data: productos, error: prodErr } = await admin
      .from('productos')
      .select('id, sku')
    if (prodErr) throw prodErr

    const skuMap = new Map<string, number>()
    for (const p of (productos ?? []) as { id: number; sku: string }[]) {
      if (p.sku) skuMap.set(String(p.sku).trim().toUpperCase(), p.id)
    }

    // 4. Traer publicaciones desde ML.
    const ids = await fetchAllItemIds(sellerId, token)
    const items = await fetchItemsDetails(ids, token)

    // 5. Resolver el vínculo por SKU.
    const rows: Record<string, unknown>[] = []
    const sinMatch: {
      meli_item_id: string
      title: string
      sku: string | null
      motivo: string
      precio: number
      cantidad_disponible: number
      estado_publicacion: 'active' | 'paused' | 'closed'
    }[] = []

    for (const item of items) {
      const tieneVariaciones = Array.isArray(item.variations) && item.variations.length > 0
      const sku = extractSku(item)
      const productoId = sku ? skuMap.get(sku.toUpperCase()) : undefined

      if (productoId != null) {
        rows.push({
          meli_item_id:       String(item.id),
          producto_id:        productoId,
          precio_publicado:   item.price ?? 0,
          estado_publicacion: mapEstado(item.status),
          updated_at:         new Date().toISOString(),
        })
      } else {
        const motivo = !sku
          ? (tieneVariaciones ? 'sin_sku_con_variaciones' : 'sin_sku')
          : 'sku_no_encontrado'
        sinMatch.push({
          meli_item_id:        String(item.id),
          title:               item.title ?? '',
          sku,
          motivo,
          precio:              item.price ?? 0,
          cantidad_disponible: item.available_quantity ?? 0,
          estado_publicacion:  mapEstado(item.status),
        })
      }
    }

    // 6. Upsert por meli_item_id (UNIQUE). Solo actualiza las columnas provistas;
    //    el resto conserva su valor/defaults (comisiones, tipo, etc.).
    if (rows.length > 0) {
      const { error: upErr } = await admin
        .from('meli_publicaciones')
        .upsert(rows, { onConflict: 'meli_item_id' })
      if (upErr) throw upErr
    }

    return json({
      ok: true,
      total_publicaciones: items.length,
      vinculadas: rows.length,
      sin_vincular: sinMatch.length,
      detalle_sin_vincular: sinMatch,
    })
  } catch (err) {
    console.error('Error sincronizando publicaciones ML:', err)
    return json({ ok: false, error: String(err) }, 500)
  }
})

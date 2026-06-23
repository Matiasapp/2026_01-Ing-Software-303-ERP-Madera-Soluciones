import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// La llama el navegador: respondemos preflight OPTIONS y mandamos CORS siempre.
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

const CATEGORIAS = ['barras', 'rieles', 'soportes', 'tornillería', 'otros']
const ESTADOS = ['active', 'paused', 'closed']

// Una decisión de importación por publicación sin vincular.
type Item = {
  meli_item_id: string
  precio_publicado: number
  estado_publicacion: string
  action: 'link' | 'create'
  producto_id?: number // requerido si action = 'link'
  producto?: {         // requerido si action = 'create'
    sku: string
    nombre: string
    categoria: string
    costo_compra: number
    precio_ml: number
    stock_actual: number
  }
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

  let body: { items?: Item[] }
  try {
    body = await req.json()
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400)
  }
  const items = body.items ?? []
  if (!Array.isArray(items) || items.length === 0) {
    return json({ ok: false, error: 'sin_items' }, 400)
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  let creados = 0
  let vinculados = 0
  const errores: { meli_item_id: string; error: string }[] = []

  for (const it of items) {
    try {
      if (!it.meli_item_id) throw new Error('meli_item_id faltante')
      if (!ESTADOS.includes(it.estado_publicacion)) throw new Error('estado inválido')

      let productoId: number

      if (it.action === 'create') {
        const p = it.producto
        if (!p) throw new Error('faltan datos del producto')
        if (!p.sku?.trim()) throw new Error('SKU requerido')
        if (!p.nombre?.trim()) throw new Error('nombre requerido')
        if (!CATEGORIAS.includes(p.categoria)) throw new Error('categoría inválida')
        if (!(p.costo_compra >= 0)) throw new Error('costo de compra inválido')
        if (!(p.stock_actual >= 0)) throw new Error('stock inicial inválido')

        const { data: prod, error: insErr } = await admin
          .from('productos')
          .insert({
            sku:          p.sku.trim(),
            nombre:       p.nombre.trim(),
            categoria:    p.categoria,
            costo_compra: p.costo_compra,
            precio_ml:    p.precio_ml ?? 0,
            stock_actual: p.stock_actual,
          })
          .select('id')
          .single()
        if (insErr) {
          // 23505 = SKU duplicado: el producto ya existe, hay que vincular en vez de crear.
          if ((insErr as any).code === '23505') {
            throw new Error(`el SKU "${p.sku}" ya existe; vinculá a ese producto en vez de crearlo`)
          }
          throw insErr
        }
        productoId = (prod as { id: number }).id
        creados++
      } else if (it.action === 'link') {
        if (it.producto_id == null) throw new Error('producto_id requerido para vincular')
        productoId = it.producto_id
      } else {
        throw new Error('action inválida')
      }

      const { error: upErr } = await admin
        .from('meli_publicaciones')
        .upsert(
          {
            meli_item_id:       it.meli_item_id,
            producto_id:        productoId,
            precio_publicado:   it.precio_publicado ?? 0,
            estado_publicacion: it.estado_publicacion,
            updated_at:         new Date().toISOString(),
          },
          { onConflict: 'meli_item_id' },
        )
      if (upErr) throw upErr
      vinculados++
    } catch (e) {
      errores.push({ meli_item_id: it.meli_item_id, error: String((e as Error)?.message ?? e) })
    }
  }

  return json({ ok: true, creados, vinculados, errores })
})

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getValidToken } from '../_shared/ml-client.ts'

const ML_API = 'https://api.mercadolibre.com'

// La llama el navegador (otro origen que las funciones de Supabase), así que hay
// que responder el preflight OPTIONS y mandar cabeceras CORS en cada respuesta.
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ ok: false, error: 'no_auth' }, 401)

  // 1. Verificar identidad y rol con el JWT del usuario (forma confiable de leer
  //    el rol, en vez del frágil check de claims dentro de Postgres).
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  const { data: { user }, error: userErr } = await userClient.auth.getUser()
  if (userErr || !user) return json({ ok: false, error: 'unauthenticated' }, 401)

  if ((user.app_metadata as any)?.role !== 'admin') {
    return json({ ok: false, error: 'forbidden' }, 403)
  }

  // 2. Operaciones privilegiadas con service_role (DELETE garantizado).
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const { data: creds } = await admin
      .from('ml_credentials')
      .select('seller_id')
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()

    // 3. Revocar la autorización en Mercado Libre (best-effort): así ML deja de
    //    tener acceso y al reconectar vuelve a pedir autorización. Si falla, se
    //    borra igual localmente.
    if (creds) {
      try {
        const token = await getValidToken(admin)
        const appId = Deno.env.get('ML_CLIENT_ID')!
        const sellerId = (creds as { seller_id: string }).seller_id
        const res = await fetch(`${ML_API}/users/${sellerId}/applications/${appId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          console.error(`Revocación ML no OK: ${res.status} ${await res.text()}`)
        }
      } catch (revokeErr) {
        console.error('No se pudo revocar en ML (se borra igual):', revokeErr)
      }
    }

    // 4. Borrar todas las credenciales locales.
    const { error: delErr } = await admin.from('ml_credentials').delete().gte('id', 0)
    if (delErr) throw delErr

    return json({ ok: true })
  } catch (err) {
    console.error('Error al desconectar ML:', err)
    return json({ ok: false, error: String(err) }, 500)
  }
})

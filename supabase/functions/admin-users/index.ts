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

// Roles asignables DESDE la app. 'superadmin' queda fuera a propósito: solo se
// concede editando app_metadata directamente en Supabase.
const ROLES = ['admin', 'operator']
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
const roleOf = (u: { app_metadata?: Record<string, unknown> }) => {
  const r = u.app_metadata?.role
  return r === 'superadmin' ? 'superadmin' : r === 'admin' ? 'admin' : 'operator'
}

// Duración de baneo "permanente" para desactivar una cuenta (reversible).
const BAN_FOREVER = '876000h' // ~100 años

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ ok: false, error: 'no_auth' }, 401)

  // 1. Verificar identidad y rol admin del que llama.
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: { user: caller }, error: callerErr } = await userClient.auth.getUser()
  if (callerErr || !caller) return json({ ok: false, error: 'unauthenticated' }, 401)
  const callerRole = roleOf(caller)
  if (callerRole !== 'admin' && callerRole !== 'superadmin') {
    return json({ ok: false, error: 'forbidden' }, 403)
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ ok: false, error: 'invalid_json' }, 400)
  }
  const action = body?.action as string

  // 2. Operaciones privilegiadas con la Admin API (requiere service_role).
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Un superadmin es intocable desde la app: solo se gestiona editando
  // app_metadata directamente en Supabase. Rechazamos cualquier mutación sobre él.
  const assertNotSuperadmin = async (userId: string) => {
    const { data, error } = await admin.auth.admin.getUserById(userId)
    if (error || !data?.user) throw new Error('usuario no encontrado')
    if (roleOf(data.user) === 'superadmin') {
      throw new Error('el superadmin solo se puede modificar desde Supabase')
    }
  }

  try {
    switch (action) {
      case 'list': {
        const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
        if (error) throw error
        const users = data.users.map(u => ({
          id:            u.id,
          email:         u.email,
          role:          roleOf(u),
          // banned_until viene con timestamp futuro si está baneado; vacío/null si activo.
          activo:        !(u as any).banned_until,
          created_at:    u.created_at,
          last_sign_in:  u.last_sign_in_at ?? null,
        }))
        return json({ ok: true, users })
      }

      case 'create': {
        const email = String(body.email ?? '').trim().toLowerCase()
        const password = String(body.password ?? '')
        const role = String(body.role ?? '')
        if (!isEmail(email)) throw new Error('correo inválido')
        if (password.length < 6) throw new Error('la contraseña debe tener al menos 6 caracteres')
        if (!ROLES.includes(role)) throw new Error('rol inválido')

        const { data, error } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true, // sin verificación por correo: queda activo de inmediato
          app_metadata: { role },
        })
        if (error) throw error
        return json({ ok: true, user_id: data.user.id })
      }

      case 'set_role': {
        const userId = String(body.user_id ?? '')
        const role = String(body.role ?? '')
        if (!userId) throw new Error('user_id requerido')
        if (!ROLES.includes(role)) throw new Error('rol inválido')
        if (userId === caller.id) throw new Error('no podés cambiar tu propio rol')
        await assertNotSuperadmin(userId)

        const { error } = await admin.auth.admin.updateUserById(userId, {
          app_metadata: { role },
        })
        if (error) throw error
        return json({ ok: true })
      }

      case 'reset_password': {
        const userId = String(body.user_id ?? '')
        const password = String(body.password ?? '')
        if (!userId) throw new Error('user_id requerido')
        if (password.length < 6) throw new Error('la contraseña debe tener al menos 6 caracteres')
        await assertNotSuperadmin(userId)

        const { error } = await admin.auth.admin.updateUserById(userId, { password })
        if (error) throw error
        return json({ ok: true })
      }

      case 'set_active': {
        const userId = String(body.user_id ?? '')
        const activo = Boolean(body.activo)
        if (!userId) throw new Error('user_id requerido')
        if (userId === caller.id && !activo) throw new Error('no podés desactivar tu propia cuenta')
        await assertNotSuperadmin(userId)

        const { error } = await admin.auth.admin.updateUserById(userId, {
          ban_duration: activo ? 'none' : BAN_FOREVER,
        })
        if (error) throw error
        return json({ ok: true })
      }

      default:
        return json({ ok: false, error: 'action_desconocida' }, 400)
    }
  } catch (err) {
    console.error(`admin-users [${action}]:`, err)
    return json({ ok: false, error: String((err as Error)?.message ?? err) }, 400)
  }
})

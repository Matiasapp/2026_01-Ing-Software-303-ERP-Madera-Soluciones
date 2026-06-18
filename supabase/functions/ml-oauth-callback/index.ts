import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ML_TOKEN_URL = 'https://api.mercadolibre.com/oauth/token'
const ML_USER_URL  = 'https://api.mercadolibre.com/users/me'

Deno.serve(async (req: Request) => {
  const url    = new URL(req.url)
  const code   = url.searchParams.get('code')
  const oauthError = url.searchParams.get('error')
  const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173'
  const failBase = `${appUrl}/configuracion?ml=error`

  if (oauthError || !code) {
    return Response.redirect(
      `${failBase}&reason=${encodeURIComponent(oauthError ?? 'no_code')}`,
    )
  }

  try {
    // 1. Intercambiar código por tokens
    const tokenRes = await fetch(ML_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        client_id:     Deno.env.get('ML_CLIENT_ID')!,
        client_secret: Deno.env.get('ML_CLIENT_SECRET')!,
        code,
        redirect_uri:  Deno.env.get('ML_REDIRECT_URI')!,
      }),
    })

    if (!tokenRes.ok) {
      console.error('Token exchange error:', await tokenRes.text())
      return Response.redirect(`${failBase}&reason=token_exchange`)
    }

    const tokens    = await tokenRes.json()
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    // 2. Obtener datos del vendedor
    const userRes = await fetch(ML_USER_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    if (!userRes.ok) {
      return Response.redirect(`${failBase}&reason=user_fetch`)
    }

    const seller = await userRes.json()

    // 3. Guardar credenciales en DB (upsert por seller_id)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { error: dbError } = await supabase.from('ml_credentials').upsert(
      {
        seller_id:     String(seller.id),
        access_token:  tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at:    expiresAt,
        updated_at:    new Date().toISOString(),
      },
      { onConflict: 'seller_id' },
    )

    if (dbError) {
      console.error('DB upsert error:', dbError)
      return Response.redirect(`${failBase}&reason=db_save`)
    }

    return Response.redirect(`${appUrl}/configuracion?ml=connected`)
  } catch (err) {
    console.error('OAuth callback unexpected error:', err)
    return Response.redirect(`${failBase}&reason=unexpected`)
  }
})

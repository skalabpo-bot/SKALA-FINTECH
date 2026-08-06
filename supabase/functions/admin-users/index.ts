// Supabase Edge Function: admin-users
// Operaciones de usuarios que exigen la Admin API (service_role). Existe para que la
// service_role key NUNCA viaje al navegador: antes el cliente creaba un `supabaseAdmin`
// con VITE_SUPABASE_SERVICE_KEY, que quedaba horneada en el bundle público -> acceso
// total a la BD saltándose RLS para cualquiera que abriera la app.
//
//   POST { action:'update-email',    userId, email }
//   POST { action:'update-password', userId, password }
//   POST { action:'create-auth-user', email, password, meta? }  -> { userId }
//   POST { action:'delete-auth-user', userId }
//
// Solo rol ADMIN. Desplegar: supabase functions deploy admin-users

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db = () => createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  try {
    // ── Solo ADMIN autenticado ────────────────────────────────────────────
    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!jwt) return json({ error: 'No autenticado' }, 401);
    const { data: { user }, error: uerr } = await db().auth.getUser(jwt);
    if (uerr || !user) return json({ error: 'Sesión inválida' }, 401);
    const { data: perfil } = await db().from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (!perfil || perfil.role !== 'ADMIN') return json({ error: 'Requiere rol ADMIN' }, 403);

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    if (action === 'update-email') {
      const { userId, email } = body;
      if (!userId || !email) return json({ error: 'Falta userId o email' }, 400);
      const { error } = await db().auth.admin.updateUserById(String(userId), {
        email: String(email).trim(), email_confirm: true,
      });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === 'update-password') {
      const { userId, password } = body;
      if (!userId || !password) return json({ error: 'Falta userId o password' }, 400);
      if (String(password).length < 6) return json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, 400);
      const { error } = await db().auth.admin.updateUserById(String(userId), { password: String(password) });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === 'create-auth-user') {
      const { email, password, meta } = body;
      if (!email || !password) return json({ error: 'Falta email o password' }, 400);
      const { data, error } = await db().auth.admin.createUser({
        email: String(email).trim(), password: String(password),
        email_confirm: true, user_metadata: meta || {},
      });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, userId: data.user?.id });
    }

    if (action === 'delete-auth-user') {
      const { userId } = body;
      if (!userId) return json({ error: 'Falta userId' }, 400);
      const { error } = await db().auth.admin.deleteUser(String(userId));
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: 'Acción no soportada' }, 400);
  } catch (err: any) {
    return json({ error: err?.message || 'Error interno' }, 500);
  }
});

// Supabase Edge Function: admin-api-keys
// Administración de llaves de la API externa desde el panel de admin (solo rol ADMIN).
// Genera el token del lado SERVIDOR, guarda solo el hash (SHA-256) + el webhook_secret,
// y devuelve el token EN CLARO una sola vez. Nunca expone el hash ni tokens de otras llaves.
// Desplegar: supabase functions deploy admin-api-keys  (con verificación de JWT)
//
//   POST { action:'list' }
//   POST { action:'create', entity, name?, scopes?, expiresInDays?, webhookUrl? }  -> { token, webhook_secret, ... } (una vez)
//   POST { action:'rotate', id }                                                   -> { token, ... } (una vez)
//   POST { action:'revoke', id }  |  { action:'enable', id }
//   POST { action:'set_webhook', id, webhookUrl }
//   POST { action:'reveal_webhook_secret', id }  -> { webhook_secret }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db = () => createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
const rndHex = (n: number) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map((b) => b.toString(16).padStart(2, '0')).join(''); };
const newToken = () => 'sk_skala_' + rndHex(32);
const newWebhookSecret = () => 'whsec_' + rndHex(24);

const SCOPES_VALIDOS = ['credits:create', 'credits:read', 'credits:update'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  try {
    // ── AUTZ: solo ADMIN ────────────────────────────────────────────────
    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
    if (!jwt) return json({ error: 'No autenticado' }, 401);
    const { data: { user }, error: uerr } = await db().auth.getUser(jwt);
    if (uerr || !user) return json({ error: 'Sesión inválida' }, 401);
    const { data: profile } = await db().from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (!profile || profile.role !== 'ADMIN') return json({ error: 'Requiere rol ADMIN' }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // ── LIST: metadatos, sin secretos ───────────────────────────────────
    if (action === 'list') {
      const { data } = await db().from('api_keys')
        .select('id, name, entity_scope, key_prefix, scopes, active, expires_at, webhook_url, created_at, last_used_at')
        .order('created_at', { ascending: false });
      return json({ keys: data || [] });
    }

    // ── CREATE: genera token + webhook_secret, guarda hash, devuelve token una vez ──
    if (action === 'create') {
      const entity = String(body.entity || '').trim();
      if (!entity) return json({ error: 'Falta la entidad (entity).' }, 400);
      const scopes = Array.isArray(body.scopes) && body.scopes.length
        ? body.scopes.filter((s: string) => SCOPES_VALIDOS.includes(s))
        : ['credits:create', 'credits:read', 'credits:update'];
      const name = String(body.name || `Alianza ${entity}`).slice(0, 120);
      const expires_at = Number(body.expiresInDays) > 0
        ? new Date(Date.now() + Number(body.expiresInDays) * 86400000).toISOString() : null;

      const token = newToken();
      const key_hash = await sha256Hex(token);
      const webhook_secret = newWebhookSecret();
      const insert: any = {
        // La columna `key` sigue existiendo (NOT NULL); guardamos el HASH ahí también,
        // nunca el token en claro. La autenticación siempre usa key_hash.
        name, key: key_hash, key_hash, key_prefix: token.slice(0, 12),
        scopes, entity_scope: [entity], active: true, expires_at,
        webhook_secret, webhook_url: body.webhookUrl ? String(body.webhookUrl) : null,
      };
      const { data, error } = await db().from('api_keys').insert(insert).select('id, name, entity_scope, key_prefix, scopes, expires_at').single();
      if (error) return json({ error: 'No se pudo crear la llave: ' + error.message }, 400);
      // Token y webhook_secret SOLO se devuelven aquí (una vez).
      return json({ ...data, token, webhook_secret });
    }

    // ── ROTATE: nuevo token para una llave existente ─────────────────────
    if (action === 'rotate') {
      const id = String(body.id || '');
      if (!id) return json({ error: 'Falta id.' }, 400);
      const token = newToken();
      const key_hash = await sha256Hex(token);
      const { data, error } = await db().from('api_keys').update({ key: key_hash, key_hash, key_prefix: token.slice(0, 12), active: true })
        .eq('id', id).select('id, name, key_prefix').single();
      if (error) return json({ error: 'No se pudo rotar: ' + error.message }, 400);
      return json({ ...data, token });
    }

    // ── REVOKE / ENABLE ──────────────────────────────────────────────────
    if (action === 'revoke' || action === 'enable') {
      const id = String(body.id || '');
      if (!id) return json({ error: 'Falta id.' }, 400);
      const { error } = await db().from('api_keys').update({ active: action === 'enable' }).eq('id', id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, id, active: action === 'enable' });
    }

    // ── SET WEBHOOK URL ──────────────────────────────────────────────────
    if (action === 'set_webhook') {
      const id = String(body.id || '');
      if (!id) return json({ error: 'Falta id.' }, 400);
      const { error } = await db().from('api_keys').update({ webhook_url: body.webhookUrl ? String(body.webhookUrl) : null }).eq('id', id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, id });
    }

    // ── REVELAR webhook_secret (para re-enviarlo al aliado) ──────────────
    if (action === 'reveal_webhook_secret') {
      const id = String(body.id || '');
      if (!id) return json({ error: 'Falta id.' }, 400);
      const { data } = await db().from('api_keys').select('webhook_secret').eq('id', id).maybeSingle();
      return json({ webhook_secret: data?.webhook_secret || null });
    }

    return json({ error: 'Acción no reconocida' }, 400);
  } catch (err: any) {
    return json({ error: err?.message || 'Error interno' }, 500);
  }
});

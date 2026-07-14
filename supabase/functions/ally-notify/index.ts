// Supabase Edge Function: ally-notify
// Envía un webhook FIRMADO al aliado DUEÑO de un crédito cuando cambia su estado.
// La invoca un trigger de la BD (pg_net) con { credit_id, event, old_status, new_status }
// + header x-ally-notify-secret. Nunca se expone el webhook_secret al cliente.
// Firma: X-Skala-Signature: sha256=<hmac_sha256(bodyExacto, webhook_secret)>
// Desplegar: supabase functions deploy ally-notify --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const INTERNAL = Deno.env.get('ALLY_NOTIFY_SECRET') || '';
const db = () => createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

async function hmacHex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg)));
  return [...sig].map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method', { status: 405 });
  if (!INTERNAL || (req.headers.get('x-ally-notify-secret') || '') !== INTERNAL) return new Response('unauthorized', { status: 401 });

  const { credit_id, event, old_status, new_status } = await req.json().catch(() => ({}));
  if (!credit_id) return new Response('missing credit_id', { status: 400 });

  const { data: c } = await db().from('credits').select('*').eq('id', credit_id).maybeSingle();
  if (!c) return new Response('no credit', { status: 404 });

  // Llaves que deben enterarse: la DUEÑA del crédito (api_key_id) o una con entity_scope que incluya la entidad.
  const { data: keys } = await db().from('api_keys').select('id, webhook_url, webhook_secret, entity_scope')
    .eq('active', true).not('webhook_url', 'is', null);
  const targets = (keys || []).filter((k: any) =>
    k.id === c.api_key_id || (Array.isArray(k.entity_scope) && k.entity_scope.includes(c.entity_name)));
  if (!targets.length) return new Response(JSON.stringify({ sent: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  const { data: states } = await db().from('credit_states_config').select('id, name');
  const stName = (id: string) => (states || []).find((s: any) => s.id === id)?.name || null;
  const cd = c.client_data || {};
  const payload = {
    event: event || 'credit_status_change',
    timestamp: new Date().toISOString(),
    solicitud_number: c.solicitud_number,
    external_ref: c.external_ref || null,
    estado_anterior: old_status ? stName(old_status) : null,
    estado_nuevo: stName(new_status || c.status_id),
    credito: {
      monto: Number(c.amount || 0),
      monto_desembolso: Number(c.disbursement_amount || 0),
      plazo: Number(c.term || 0),
      tasa: Number(c.interest_rate || 0),
      entidad: c.entity_name,
      comision_estimada: Number(c.commission_est || 0),
      linea_credito: cd.lineaCredito || '',
    },
    cliente: {
      nombre: cd.nombreCompleto || `${cd.nombres || ''} ${cd.apellidos || ''}`.trim(),
      documento: cd.numeroDocumento || '',
      correo: cd.correo || '',
      celular: cd.telefonoCelular || '',
      pagaduria: cd.pagaduria || '',
    },
  };
  const bodyStr = JSON.stringify(payload); // los mismos bytes que se firman y se envían

  const results: any[] = [];
  for (const k of targets) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-Skala-Event': payload.event };
      if (k.webhook_secret) headers['X-Skala-Signature'] = 'sha256=' + (await hmacHex(k.webhook_secret, bodyStr));
      const r = await fetch(k.webhook_url, { method: 'POST', headers, body: bodyStr });
      results.push({ key: k.id, status: r.status });
    } catch (e) {
      results.push({ key: k.id, error: String((e as any)?.message || e).slice(0, 120) });
    }
  }
  return new Response(JSON.stringify({ sent: results.length, results }), { status: 200, headers: { 'Content-Type': 'application/json' } });
});

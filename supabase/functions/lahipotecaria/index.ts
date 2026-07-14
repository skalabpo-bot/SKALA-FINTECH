// Edge Function: robot server-side que conduce el formulario de La Hipotecaria.
// El front de Skala NUNCA habla directo con La Hipotecaria (evita CORS y no expone su flujo);
// llama a esta función con { action, ... }. Se despliega con verify_jwt=true (solo usuarios Skala logueados).
//
//   action: 'calcular'    body: { ingresos, gastos, pagaduria, plazo }         -> { aprobado, monto, cuota, salud, tasa, plazo, mensaje }
//   action: 'viabilidad'  body: { nombres, apellidos, tipoDoc, documento, correo, celular, vendedor, ingresos, gastos, pagaduria, plazo }
//     no viable -> { viable:false, code, mensaje }
//     viable    -> { viable:true, otpEnviado:true, sessionId, mensaje }  (envía OTP al CORREO del cliente)
//   action: 'verify-otp'  body: { sessionId, codigo }                          -> { ok, code, mensaje }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LH = 'https://app.lahipotecaria.com';
const SURVEY_PATH = '/surveys/credito-de-libranza';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const fail = (status: number, msg: string, internal?: unknown) => {
  const request_id = crypto.randomUUID();
  if (internal) console.error('[lahipotecaria]', request_id, msg, internal);
  return json({ error: msg, request_id }, status);
};
const db = () => createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

// Pagadurías de La Hipotecaria (value del <select> de su form).
const PAGADURIA_LH: Record<string, string> = {
  COLPENSIONES: '1', FIDUPREVISORA: '3', FONCEP: '4', FOPEP: '5', CASUR: '6',
};
const mapPagaduria = (p: string): string | null => {
  if (!p) return null;
  if (/^\d+$/.test(p)) return p; // ya es un id de LH
  const key = p.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]/g, '');
  for (const [name, id] of Object.entries(PAGADURIA_LH)) if (key.includes(name)) return id;
  return null;
};

// ── Cookie jar ────────────────────────────────────────────────────────────
type Jar = Record<string, string>;
const absorb = (jar: Jar, res: Response) => {
  const sc = (res.headers as any).getSetCookie?.() ?? [];
  for (const c of sc) { const kv = c.split(';')[0]; const i = kv.indexOf('='); if (i > 0) jar[kv.slice(0, i).trim()] = kv.slice(i + 1); }
};
const cookieHeader = (jar: Jar) => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');

// ── Parseo del HTML de su formulario ────────────────────────────────────────
const pickInput = (html: string, name: string): string | null => {
  const m = html.match(new RegExp(`<input[^>]*name="${name}"[^>]*value="([^"]*)"`, 'i'))
    || html.match(new RegExp(`<input[^>]*value="([^"]*)"[^>]*name="${name}"`, 'i'));
  return m ? m[1] : null;
};
const parseNum = (s?: string | null) => s ? Number(String(s).replace(/[^\d]/g, '')) || 0 : 0;

/** GET la página del survey → tokens, ids y cookies de sesión. */
async function fetchPage() {
  const jar: Jar = {};
  const r = await fetch(`${LH}${SURVEY_PATH}`, { headers: { 'User-Agent': UA } });
  absorb(jar, r);
  const html = await r.text();
  const action0 = (html.match(/action="([^"]*\/libranza\/calcular\/surveys\/[^"]+)"/) || [])[1] || '';
  const action1 = (html.match(/action="([^"]*\/surveys\/next\/[^"]+)"/) || [])[1] || '';
  return {
    jar, html,
    token: pickInput(html, '_token'),
    section: pickInput(html, '_section'),
    form: pickInput(html, '_form'),
    uuid: action0.split('/').pop() || '',
    calcularUrl: action0,
    nextUrl: action1,
  };
}

/** Paso calculadora (GET) → preaprobación. Sin PII, sin OTP. */
async function calcular(body: any) {
  const pag = mapPagaduria(String(body.pagaduria ?? '')) || '1';
  const ingresos = parseNum(String(body.ingresos));
  const gastos = parseNum(String(body.gastos));
  const plazo = parseNum(String(body.plazo)) || 120;
  if (ingresos <= 0) return fail(400, 'Ingresos inválidos.');

  const p = await fetchPage();
  if (!p.calcularUrl) return fail(502, 'No se pudo iniciar la consulta con La Hipotecaria.');
  const qs = new URLSearchParams({ ingresos: String(ingresos), gastos: String(gastos), pagaduria: pag, plazo: String(plazo) });
  const r = await fetch(`${p.calcularUrl}?${qs}`, {
    headers: { 'User-Agent': UA, 'Cookie': cookieHeader(p.jar), 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json, text/html, */*' },
  });
  const text = await r.text();
  let msg = text;
  try { const j = JSON.parse(text); msg = j.message ?? text; } catch { /* html plano */ }

  const montoV = parseNum((msg.match(/Monto a otorgar:\s*<b>([\d.]+)/i) || [])[1]);
  const cuotaV = parseNum((msg.match(/Cuota:\s*<b>([\d.]+)/i) || [])[1]);
  const saludV = parseNum((msg.match(/Salud:\s*<b>([\d.]+)/i) || [])[1]);
  const tasaV = Number((msg.match(/Tasa:\s*<b>([\d.,]+)/i) || [])[1]?.replace(',', '.')) || 0;
  const plazoV = parseNum((msg.match(/Plazo:\s*<b>([\d.]+)/i) || [])[1]) || plazo;
  const aprobado = montoV > 0;
  const textoPlano = msg.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  return json({ aprobado, monto: montoV, cuota: cuotaV, salud: saludV, tasa: tasaV, plazo: plazoV, mensaje: textoPlano });
}

/**
 * Verifica la VIABILIDAD con La Hipotecaria (POST datos personales).
 * NOTA (reversing jul 2026): este formulario NO envía OTP. El POST de datos personales
 * devuelve directamente la viabilidad: viable = HTTP 200; no viable = HTTP 201 con code 'CNPV..'.
 */
async function viabilidad(body: any) {
  const pag = mapPagaduria(String(body.pagaduria ?? '')) || '1';
  const p = await fetchPage();
  if (!p.nextUrl || !p.token) return fail(502, 'No se pudo iniciar la consulta con La Hipotecaria.');

  const ingresos = parseNum(String(body.ingresos));
  const gastos = parseNum(String(body.gastos));
  const plazo = parseNum(String(body.plazo)) || 120;

  // Primar la sesión con la calculadora (mismo cookie jar), como hace el wizard real.
  if (p.calcularUrl && ingresos > 0) {
    const qs = new URLSearchParams({ ingresos: String(ingresos), gastos: String(gastos), pagaduria: pag, plazo: String(plazo) });
    await fetch(`${p.calcularUrl}?${qs}`, { headers: { 'User-Agent': UA, 'Cookie': cookieHeader(p.jar), 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json, */*' } }).then(r => absorb(p.jar, r)).catch(() => {});
  }

  const fd = new URLSearchParams();
  fd.set('_token', p.token);
  fd.set('_method', 'PUT');
  if (p.form) fd.set('_form', p.form);
  if (p.section) fd.set('_section', p.section);
  fd.set('q_nombres', String(body.nombres ?? ''));
  fd.set('q_apellidos', String(body.apellidos ?? ''));
  fd.set('q_tipo_de_documento', String(body.tipoDoc ?? 'CÉDULA DE CIUDADANIA'));
  fd.set('q_numero_documento', String(body.documento ?? ''));
  fd.set('q_correo_electronico', String(body.correo ?? ''));
  fd.set('q_numero_de_celular', String(body.celular ?? ''));
  fd.set('q_vendedor', String(body.vendedor || 'SKALA')); // radicar SIEMPRE bajo el vendedor SKALA
  fd.set('ingresos', String(ingresos));
  fd.set('gastos', String(gastos));
  fd.set('pagaduria', pag);
  fd.set('plazo', String(plazo));

  const r = await fetch(p.nextUrl, {
    method: 'POST',
    headers: { 'User-Agent': UA, 'Cookie': cookieHeader(p.jar), 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': p.token, 'Accept': 'application/json, text/html, */*', 'Referer': `${LH}${SURVEY_PATH}` },
    body: fd.toString(),
  });
  absorb(p.jar, r);
  const text = await r.text();
  let j: any = {};
  try { j = JSON.parse(text); } catch { j = { message: text }; }
  const strip = (s: string) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

  // YA REGISTRADO (RGDUPL): el cliente ya tiene un registro activo en La Hipotecaria.
  // NO es un rechazo. La Hipotecaria NO reenvía el OTP para duplicados, así que buscamos la
  // sesión OTP que generamos en el intento previo (si existe y no expiró) para poder ingresar
  // ese código que ya llegó al correo. Si no hay sesión pendiente, se continúa a radicación.
  const yaRegistrado = typeof j.code === 'string' && /^RG/i.test(j.code);
  if (yaRegistrado) {
    const doc = String(body.documento ?? '');
    let pendiente: any = null;
    if (doc) {
      const { data: sesiones } = await db().from('lahipotecaria_sessions')
        .select('id, expires_at').eq('client_ref', doc).order('created_at', { ascending: false }).limit(1);
      if (sesiones && sesiones[0] && new Date(sesiones[0].expires_at) > new Date()) pendiente = sesiones[0];
    }
    if (pendiente) {
      return json({ viable: true, yaRegistrado: true, otpEnviado: true, sessionId: pendiente.id, mensaje: 'El cliente ya tiene un registro. Ingresa el código OTP que se envió al correo para confirmarlo y continuar.' });
    }
    return json({ viable: true, yaRegistrado: true, otpEnviado: false, code: j.code, mensaje: strip(j.message) || 'El cliente ya tiene un registro activo en La Hipotecaria; puedes continuar con la radicación.' });
  }

  // NO VIABLE (CNPV..) → rechazo por políticas.
  const noViable = j.error === true || (typeof j.code === 'string' && /^CN/i.test(j.code));
  if (noViable) {
    return json({ viable: false, code: j.code ?? null, mensaje: strip(j.message) || 'El cliente no es viable según las políticas de La Hipotecaria.' });
  }

  // VIABLE: La Hipotecaria envía un OTP al CORREO y devuelve la sección del OTP en `load[]`.
  let otpHtml = '';
  if (Array.isArray(j.load)) {
    for (const item of j.load) {
      if (item && typeof item === 'object') for (const k of Object.keys(item)) if (/section_question_body/i.test(k)) otpHtml = String(item[k] || '');
    }
  }
  const requiereOtp = /q_codigo_otp/i.test(otpHtml);
  if (requiereOtp) {
    const otpAction = (otpHtml.match(/action="([^"]*\/surveys\/next\/[^"]+)"/) || [])[1] || '';
    const otpToken = pickInput(otpHtml, '_token');
    const otpSection = pickInput(otpHtml, '_section');
    const otpForm = pickInput(otpHtml, '_form');
    const { data, error } = await db().from('lahipotecaria_sessions').insert({
      survey_uuid: p.uuid,
      jwt: otpAction,            // URL del paso de validación del OTP (contiene su JWT)
      section: otpSection,
      cookies: cookieHeader(p.jar),
      client_ref: String(body.documento ?? ''),
      state: { token: otpToken, form: otpForm },
      expires_at: new Date(Date.now() + 30 * 60000).toISOString(), // 30 min para ingresar el OTP
    }).select('id').single();
    if (error) return fail(500, 'No se pudo guardar la sesión del OTP.', error);
    return json({ viable: true, otpEnviado: true, sessionId: data.id, mensaje: 'Cliente VIABLE. Enviamos un código al CORREO del cliente; ingrésalo para continuar.' });
  }

  // Viable pero sin paso de OTP (fallback).
  return json({ viable: true, otpEnviado: false, mensaje: strip(j.message) || 'Cliente viable para crédito.' });
}

/** Valida el OTP (código que llegó al correo) contra La Hipotecaria. */
async function verifyOtp(body: any) {
  const { sessionId, codigo } = body;
  if (!sessionId || !codigo) return fail(400, 'Falta sessionId o codigo.');
  const { data: s } = await db().from('lahipotecaria_sessions').select('*').eq('id', sessionId).maybeSingle();
  if (!s) return fail(404, 'Sesión no encontrada o expirada.');
  if (new Date(s.expires_at) < new Date()) return fail(410, 'La sesión del OTP expiró; vuelve a verificar la viabilidad.');
  if (!s.jwt) return fail(500, 'La sesión no tiene endpoint de validación.');

  const token = s.state?.token;
  const fd = new URLSearchParams();
  if (token) fd.set('_token', token);
  fd.set('_method', 'PUT');
  if (s.state?.form) fd.set('_form', s.state.form);
  if (s.section) fd.set('_section', s.section);
  fd.set('q_codigo_otp', String(codigo).trim());

  const r = await fetch(s.jwt, {
    method: 'POST',
    headers: { 'User-Agent': UA, 'Cookie': s.cookies || '', 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': token || '', 'Accept': 'application/json, text/html, */*', 'Referer': `${LH}${SURVEY_PATH}` },
    body: fd.toString(),
  });
  const text = await r.text();
  let j: any = {};
  try { j = JSON.parse(text); } catch { j = { message: text }; }
  const strip = (str: string) => String(str || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const fallo = j.error === true;
  const ok = !fallo && r.status >= 200 && r.status < 400;
  if (ok) await db().from('lahipotecaria_sessions').delete().eq('id', sessionId);
  return json({ ok, code: j.code ?? null, mensaje: strip(j.message) || (ok ? 'Código verificado correctamente.' : 'Código incorrecto o vencido.') });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail(405, 'Método no permitido.');
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || new URL(req.url).pathname.split('/').pop();
    switch (action) {
      case 'calcular': return await calcular(body);
      case 'viabilidad':
      case 'registrar': return await viabilidad(body);
      case 'verify-otp': return await verifyOtp(body);
      default: return fail(400, `Acción no reconocida: ${action}`);
    }
  } catch (err) {
    return fail(500, 'Error interno.', err);
  }
});

// Edge Function: robot server-side que conduce el formulario de La Hipotecaria.
// El front de Skala NUNCA habla directo con La Hipotecaria (evita CORS y no expone su flujo);
// llama a esta función con { action, ... }. Se despliega con verify_jwt=true (solo usuarios Skala logueados).
//
//   action: 'calcular'    body: { ingresos, gastos, pagaduria, plazo }         -> { aprobado, monto, cuota, salud, tasa, plazo, mensaje }
//   action: 'viabilidad'  body: { nombres, apellidos, tipoDoc, documento, correo, celular, vendedor, ingresos, gastos, pagaduria, plazo }
//     no viable -> { viable:false, code, mensaje }
//     viable    -> { viable:true, otpEnviado:true, sessionId, mensaje }  (envía OTP al CORREO del cliente)
//   action: 'verify-otp'  body: { sessionId, codigo }                          -> { ok, code, mensaje, siguienteFormulario, campos, spec }
//   action: 'formulario'  body: { sessionId }                                  -> { spec }  (campos del formulario pendiente, para pintarlo en Skala)
//   action: 'continuar'   body: { sessionId, valores: { q_xxx: valor, ... } }   -> { ok, mensaje, siguienteFormulario, spec }

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

/**
 * Lee el HTML de una sección de su formulario y devuelve la ESPECIFICACIÓN de sus campos
 * (nombre, etiqueta, tipo, opciones). Se hace dinámico a propósito: si La Hipotecaria
 * agrega/quita campos u opciones, Skala los pinta igual sin tocar código.
 */
type Campo = { name: string; label: string; hint?: string; grupo?: string; type: 'text' | 'select' | 'textarea' | 'file' | 'date' | 'checkbox' | 'radio'; required: boolean; options?: { value: string; label: string }[] };
/** Quita etiquetas y decodifica las entidades HTML que usa su formulario. */
const textoPlano = (s: string) => String(s || '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&aacute;/gi, 'á').replace(/&eacute;/gi, 'é')
  .replace(/&iacute;/gi, 'í').replace(/&oacute;/gi, 'ó').replace(/&uacute;/gi, 'ú').replace(/&ntilde;/gi, 'ñ')
  .replace(/&Aacute;/g, 'Á').replace(/&Eacute;/g, 'É').replace(/&Iacute;/g, 'Í').replace(/&Oacute;/g, 'Ó')
  .replace(/&Uacute;/g, 'Ú').replace(/&Ntilde;/g, 'Ñ').replace(/&quot;/gi, '"').replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ').trim();

/**
 * Título de la sección. Su formulario lo subraya (<u>Información de los ingresos</u>), pero no
 * todas las secciones lo traen y a veces el paréntesis va FUERA del <u>
 * ("<u>Referencia</u> (Información de un familiar…)"). Por eso se toma la línea completa que
 * contiene el subrayado y, si no hay, se cae al primer encabezado de la sección.
 */
function parseTitulo(html: string): string {
  const u = html.match(/<u\b[^>]*>[\s\S]*?<\/u>/i);
  if (u) {
    // Línea/bloque que contiene el subrayado → arrastra el paréntesis si va aparte.
    const i = html.indexOf(u[0]);
    const desde = html.lastIndexOf('>', i - 1) + 1;
    const corte = html.indexOf('</div', i + u[0].length);
    const hasta = corte > 0 ? corte : i + u[0].length + 200;
    const linea = textoPlano(html.slice(desde, hasta));
    const solo = textoPlano(u[0]);
    // Se usa la línea completa solo si empieza por el subrayado (evita arrastrar texto ajeno).
    if (linea.startsWith(solo) && linea.length <= solo.length + 80) return linea;
    return solo;
  }
  const h = html.match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i);
  return h ? textoPlano(h[1]) : '';
}

function parseSpec(html: string): Campo[] {
  const limpiar = textoPlano;
  const out: Campo[] = [];
  const seen = new Set<string>();
  const re = /<(input|select|textarea)\b([^>]*)>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const tag = m[1].toLowerCase();
    const attrs = m[2];
    const name = (attrs.match(/name="([^"]+)"/) || [])[1];
    if (!name || !name.startsWith('q_')) continue;
    // Los checkbox/radio son VARIOS <input> con el MISMO name: cada uno es una opción
    // (ej. la autorización Ley 2300 trae 5 canales). Si se descartaran por repetidos,
    // el campo quedaría como texto libre y La Hipotecaria lo rechaza por inválido.
    const tipoInput = tag === 'input' ? ((attrs.match(/type="([^"]+)"/) || [])[1] || '').toLowerCase() : '';
    if (seen.has(name)) {
      if (tipoInput === 'checkbox' || tipoInput === 'radio') {
        const prev = out.find((c) => c.name === name);
        const val = (attrs.match(/value="([^"]*)"/) || [])[1] ?? '';
        if (prev && val !== '' && !prev.options?.some((o) => o.value === val)) {
          (prev.options ||= []).push({ value: val, label: val });
        }
      }
      continue;
    }
    seen.add(name);
    const antes = html.slice(0, m.index);

    // La etiqueta es el último <b> antes del campo; su form marca lo OBLIGATORIO con un '*' ahí
    // (no usan el atributo required), y a veces agrega debajo una nota de ayuda.
    const bs = [...antes.matchAll(/<b\b[^>]*>([\s\S]*?)<\/b>/gi)];
    const crudo = bs.length ? limpiar(bs[bs.length - 1][1]) : '';
    let label = crudo.replace(/^\*\s*/, '').trim();
    const required = /^\*/.test(crudo);

    // Nota de ayuda: lo que quede entre la etiqueta y el campo.
    let hint: string | undefined;
    if (bs.length) {
      const ultimo = bs[bs.length - 1];
      const finLabel = (ultimo.index || 0) + ultimo[0].length;
      const entre = limpiar(antes.slice(finLabel));
      if (entre.length > 3) hint = entre;
    }
    if (!label) label = (attrs.match(/placeholder="([^"]*)"/) || [])[1] || name;

    // Subtítulo del bloque al que pertenece (<h3>PLAZO DEL PRÉSTAMO</h3>).
    const hs = [...antes.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi)];
    const grupo = hs.length ? limpiar(hs[hs.length - 1][1]) : undefined;

    let options: { value: string; label: string }[] | undefined;
    let type: Campo['type'] = tag === 'select' ? 'select' : tag === 'textarea' ? 'textarea' : 'text';
    if (tag === 'input') {
      if (tipoInput === 'file') type = 'file';
      else if (tipoInput === 'date') type = 'date';
      else if (tipoInput === 'checkbox') type = 'checkbox';
      else if (tipoInput === 'radio') type = 'radio';
      // Primera opción del grupo (las demás se agregan arriba, al repetirse el name).
      if (type === 'checkbox' || type === 'radio') {
        const val = (attrs.match(/value="([^"]*)"/) || [])[1] ?? '';
        options = val !== '' ? [{ value: val, label: val }] : [];
      }
    }
    if (tag === 'select') {
      const bloque = html.slice(m.index).match(/<select\b[^>]*>([\s\S]*?)<\/select>/i);
      options = [...(bloque?.[1] || '').matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)]
        // Un <option> sin atributo value envía su propio texto (así lo hace el navegador).
        // Descartarlos dejaba listas incompletas (ej. departamentos con una sola opción).
        .map((o) => {
          const attr = o[1].match(/value="([^"]*)"/);
          const label = limpiar(o[2]);
          return { value: attr ? attr[1] : label, label };
        })
        .filter((o) => o.value !== '' && o.label !== '');
    }
    out.push({ name, label, hint, grupo, type, required, options });
  }
  return out;
}

/** Carga la sesión validando que siga viva. */
async function loadSession(sessionId: string) {
  if (!sessionId) return { error: fail(400, 'Falta sessionId.') };
  const { data: s } = await db().from('lahipotecaria_sessions').select('*').eq('id', sessionId).maybeSingle();
  if (!s) return { error: fail(404, 'Sesión no encontrada o expirada.') };
  if (new Date(s.expires_at) < new Date()) return { error: fail(410, 'La sesión expiró; vuelve a iniciar la preaprobación.') };
  return { s };
}

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

  if (ok) {
    // OTP correcto → La Hipotecaria devuelve la SIGUIENTE sección del formulario en `load[]`.
    // La capturamos para pintarla dentro de Skala (el cliente nunca ve su sitio).
    const { spec, titulo } = await capturarSiguiente(s, r, j, token, sessionId);
    return json({
      ok: true,
      mensaje: strip(j.message) || 'Código verificado correctamente.',
      siguienteFormulario: spec.length > 0,
      campos: spec.map((c) => c.name),
      spec, titulo,
    });
  }

  return json({ ok, code: j.code ?? null, mensaje: strip(j.message) || 'Código incorrecto o vencido.' });
}

/**
 * Tras un POST exitoso, La Hipotecaria devuelve la siguiente sección en `load[]`.
 * La capturamos (campos + tokens + cookies) y dejamos la sesión lista para el siguiente paso.
 */
async function capturarSiguiente(s: any, r: Response, j: any, tokenPrev: string | null, sessionId: string): Promise<{ spec: Campo[]; titulo: string }> {
  let nextHtml = '';
  if (Array.isArray(j.load)) {
    for (const item of j.load) {
      if (item && typeof item === 'object') for (const k of Object.keys(item)) if (/section_question_body/i.test(k)) nextHtml = String(item[k] || '');
    }
  }
  const nextAction = (nextHtml.match(/action="([^"]*\/surveys\/next\/[^"]+)"/) || [])[1] || '';
  const nextToken = pickInput(nextHtml, '_token');
  const nextSection = pickInput(nextHtml, '_section');
  const nextForm = pickInput(nextHtml, '_form');

  // Mantener viva la sesión con las cookies actualizadas (el flujo continúa).
  const jar: Jar = {};
  for (const c of String(s.cookies || '').split('; ')) { const i = c.indexOf('='); if (i > 0) jar[c.slice(0, i).trim()] = c.slice(i + 1); }
  absorb(jar, r);

  await db().from('lahipotecaria_sessions').update({
    jwt: nextAction || s.jwt,
    section: nextSection || s.section,
    cookies: cookieHeader(jar),
    state: { ...(s.state || {}), token: nextToken || tokenPrev, form: nextForm || s.state?.form, otpOk: true, nextHtml: nextHtml.slice(0, 60000) },
    expires_at: new Date(Date.now() + 30 * 60000).toISOString(),
  }).eq('id', sessionId);

  return { spec: parseSpec(nextHtml), titulo: parseTitulo(nextHtml) };
}

/** Devuelve los campos del formulario pendiente, para que Skala lo pinte con su propia UI. */
async function formulario(body: any) {
  const { s, error } = await loadSession(String(body.sessionId || ''));
  if (error) return error;
  const spec = parseSpec(String(s!.state?.nextHtml || ''));
  return json({ spec, titulo: parseTitulo(String(s!.state?.nextHtml || '')), pendiente: spec.length > 0 });
}

/** Envía a La Hipotecaria los valores que el gestor llenó en el formulario nativo de Skala. */
async function continuar(body: any) {
  const { s, error } = await loadSession(String(body.sessionId || ''));
  if (error) return error;
  if (!s!.jwt) return fail(500, 'La sesión no tiene endpoint para continuar.');

  const valores = body.valores || {};
  // Archivos que Skala envía por el cliente: { q_campo: { nombre, tipo, base64 } }
  const archivos: Record<string, { nombre?: string; tipo?: string; base64?: string }> = body.archivos || {};
  const spec = parseSpec(String(s!.state?.nextHtml || ''));
  const faltan = spec
    .filter((c) => c.required && !(c.type === 'file' ? archivos[c.name]?.base64 : String(valores[c.name] ?? '').trim()))
    .map((c) => c.label);
  if (faltan.length) return fail(400, `Faltan campos obligatorios: ${faltan.join(', ')}.`);

  const token = s!.state?.token;
  const conArchivos = Object.values(archivos).some((f) => f?.base64);

  // Con archivos hay que ir en multipart (urlencoded no puede llevarlos).
  let body_: BodyInit;
  const headers: Record<string, string> = {
    'User-Agent': UA, 'Cookie': s!.cookies || '', 'X-Requested-With': 'XMLHttpRequest',
    'X-CSRF-TOKEN': token || '', 'Accept': 'application/json, text/html, */*', 'Referer': `${LH}${SURVEY_PATH}`,
  };
  if (conArchivos) {
    const form = new FormData();
    if (token) form.set('_token', token);
    form.set('_method', 'PUT');
    if (s!.state?.form) form.set('_form', s!.state.form);
    if (s!.section) form.set('_section', s!.section);
    // Un grupo de checkbox puede traer varias opciones: se repite la clave, igual que el navegador.
    for (const [k, v] of Object.entries(valores)) {
      if (!k.startsWith('q_')) continue;
      if (Array.isArray(v)) v.forEach((x) => form.append(k, String(x ?? '')));
      else form.set(k, String(v ?? ''));
    }
    for (const [k, f] of Object.entries(archivos)) {
      if (!k.startsWith('q_') || !f?.base64) continue;
      const bin = Uint8Array.from(atob(f.base64), (c) => c.charCodeAt(0));
      form.set(k, new File([bin], f.nombre || 'documento', { type: f.tipo || 'application/octet-stream' }));
    }
    body_ = form; // sin Content-Type: fetch pone el boundary
  } else {
    const fd = new URLSearchParams();
    if (token) fd.set('_token', token);
    fd.set('_method', 'PUT');
    if (s!.state?.form) fd.set('_form', s!.state.form);
    if (s!.section) fd.set('_section', s!.section);
    for (const [k, v] of Object.entries(valores)) {
      if (!k.startsWith('q_')) continue;
      if (Array.isArray(v)) v.forEach((x) => fd.append(k, String(x ?? '')));
      else fd.set(k, String(v ?? ''));
    }
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body_ = fd.toString();
  }

  const r = await fetch(s!.jwt, { method: 'POST', headers, body: body_ });
  const text = await r.text();
  let j: any = {};
  try { j = JSON.parse(text); } catch { j = { message: text }; }
  const strip = (str: string) => String(str || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const ok = j.error !== true && r.status >= 200 && r.status < 400;
  if (!ok) return json({ ok: false, mensaje: strip(j.message) || 'La Hipotecaria rechazó el formulario.' });

  const next = await capturarSiguiente(s, r, j, token, String(body.sessionId));
  return json({
    ok: true,
    mensaje: strip(j.message) || 'Formulario enviado a La Hipotecaria.',
    siguienteFormulario: next.spec.length > 0,
    spec: next.spec,
    titulo: next.titulo,
  });
}

/**
 * Id del asesor que está llamando. La función corre con verify_jwt=true, así que Supabase ya
 * validó el token: aquí solo se lee el `sub` del payload. Si la llamada vino con la anon key
 * (sin sesión) no hay `sub` y devuelve null.
 */
const callerId = (req: Request): string | null => {
  try {
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload?.sub === 'string' ? payload.sub : null;
  } catch { return null; }
};

/**
 * Deja constancia de qué asesor está trabajando esta cédula. La Hipotecaria crea el crédito
 * por su API en paralelo y NO conoce a nuestros asesores: sin esta reserva el crédito nace
 * huérfano y, si el asesor no alcanza a terminar (OTP sin confirmar), queda huérfano para
 * siempre. La API la consulta para asignarle dueño desde el insert.
 */
const guardarReserva = async (cedula: string, gestorId: string | null) => {
  const ced = String(cedula || '').trim();
  if (!ced || !gestorId) return;
  try {
    await db().from('lh_reservas').insert({ cedula: ced, gestor_id: gestorId });
  } catch (e) {
    console.warn('lh_reservas: no se pudo guardar la reserva', e); // nunca frena la preaprobación
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail(405, 'Método no permitido.');
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || new URL(req.url).pathname.split('/').pop();
    switch (action) {
      case 'calcular': return await calcular(body);
      case 'viabilidad':
      case 'registrar':
        // Se registra ANTES de llamar a La Hipotecaria: ellos crean el crédito por API en
        // cuanto reciben los datos, así que la reserva tiene que existir para ese momento.
        await guardarReserva(body.documento, callerId(req));
        return await viabilidad(body);
      case 'verify-otp': return await verifyOtp(body);
      case 'formulario': return await formulario(body);
      case 'continuar': return await continuar(body);
      default: return fail(400, `Acción no reconocida: ${action}`);
    }
  } catch (err) {
    return fail(500, 'Error interno.', err);
  }
});

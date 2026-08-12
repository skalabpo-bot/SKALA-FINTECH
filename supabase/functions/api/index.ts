// Supabase Edge Function: API pública para plataformas externas.
// Base URL: https://<project>.supabase.co/functions/v1/api
// Auth: header `x-api-key: <token>`. La llave se compara por HASH (SHA-256), nunca en claro.
// Ejecuta con service role. Desplegar: supabase functions deploy api --no-verify-jwt
//
//   POST   /credits                    -> crear (scope credits:create). Soporta header Idempotency-Key.
//   GET    /credits/:solicitud|?cedula= -> consultar uno (scope credits:read)
//   GET    /credits?limit&offset&estado -> LISTAR los créditos de la llave (scope credits:read)
//   PATCH  /credits/:solicitud/status   -> cambiar estado / devolver con tareas (scope credits:update)
//   POST   /credits/:solicitud/comments -> comentar (credits:update) | GET -> listar (credits:read)
// Aislamiento: cada llave solo ve/toca su alcance (entity_scope, o los créditos que ella creó).
// Webhooks salientes firmados: los envía la función `ally-notify` vía trigger de la BD.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-api-key, apikey, idempotency-key',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// Error público genérico + request_id; el detalle interno solo va a los logs (no se filtra el esquema).
const fail = (status: number, publicMsg: string, internal?: unknown) => {
  const request_id = crypto.randomUUID();
  if (internal) console.error('[api]', request_id, publicMsg, internal);
  return json({ error: publicMsg, request_id }, status);
};

// Escrituras no críticas para la respuesta (historial, last_used) — que no se pierdan al terminar la instancia.
// ⚠️ Los builders de supabase-js son thenables PEREZOSOS: el request HTTP solo se dispara al
// invocar .then(). Pasarlos directo a waitUntil sin suscribirse hacía que, si waitUntil no
// existía, la consulta JAMÁS se ejecutara (créditos vía API quedaban con 0 eventos de historial).
// Promise.resolve(p) fuerza la suscripción (la consulta corre sí o sí); waitUntil solo mantiene
// viva la instancia hasta que termine.
const bg = (p: PromiseLike<any>) => {
  const real = Promise.resolve(p).then(
    (r: any) => { if (r?.error) console.error('[api] bg query error:', r.error.message || r.error); },
    (e: any) => console.error('[api] bg falló:', e?.message || e),
  );
  try { (globalThis as any).EdgeRuntime?.waitUntil?.(real); } catch { /* ignore */ }
};

const db = () => createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

type Identity = { id: string; scopes: string[]; entity_scope: string[] | null };

/** Valida la API key (por hash) y devuelve la identidad o null. */
async function auth(req: Request): Promise<Identity | null> {
  const key = (req.headers.get('x-api-key') || (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')).trim();
  if (!key) return null;
  const hash = await sha256Hex(key);
  const { data } = await db().from('api_keys').select('id, scopes, active, expires_at, entity_scope').eq('key_hash', hash).maybeSingle();
  if (!data || data.active === false) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
  bg(db().from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id));
  return { id: data.id, scopes: data.scopes || [], entity_scope: Array.isArray(data.entity_scope) && data.entity_scope.length ? data.entity_scope : null };
}

// Alcance de una llave: por entidad (si entity_scope está definido) o por dueño (api_key_id).
// Toda consulta/listado/actualización pasa por aquí → aislamiento garantizado.
function applyScope(q: any, identity: Identity) {
  return identity.entity_scope ? q.in('entity_name', identity.entity_scope) : q.eq('api_key_id', identity.id);
}

async function getStates() {
  const { data } = await db().from('credit_states_config').select('id, name, order_index, enable_tasks, is_final').order('order_index');
  return data || [];
}

const norm = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();

// AISLAMIENTO POR LLAVE: una API key solo puede encontrar créditos dentro de su alcance
// (su entidad, o los que ella misma creó). Nunca ve la cartera de otros aliados ni la de Skala.
async function findCredit(solicitud: string | null | undefined, cedula: string | null | undefined, identity: Identity) {
  const q = applyScope(db().from('credits').select('*'), identity);
  if (solicitud != null && solicitud !== '') {
    const n = Number(solicitud);
    if (!Number.isInteger(n)) return null;
    return (await q.eq('solicitud_number', n).maybeSingle()).data;
  }
  if (cedula) return (await q.filter('client_data->>numeroDocumento', 'eq', String(cedula)).order('created_at', { ascending: false }).limit(1).maybeSingle()).data;
  return null;
}

function creditPublicView(c: any, states: any[]) {
  const cd = c.client_data || {};
  return {
    id: c.id,
    solicitud_number: c.solicitud_number,
    external_ref: c.external_ref || null,
    estado: states.find((s) => s.id === c.status_id)?.name || null,
    monto: Number(c.amount || 0),
    monto_desembolso: Number(c.disbursement_amount || 0),
    plazo: Number(c.term || 0),
    tasa: Number(c.interest_rate || 0),
    entidad: c.entity_name,
    comision_estimada: Number(c.commission_est || 0),
    linea_credito: cd.lineaCredito || '',
    cliente: {
      nombre: cd.nombreCompleto || `${cd.nombres || ''} ${cd.apellidos || ''}`.trim(),
      documento: cd.numeroDocumento || '',
      correo: cd.correo || '',
      celular: cd.telefonoCelular || '',
      pagaduria: cd.pagaduria || '',
    },
    created_at: c.created_at,
    updated_at: c.updated_at,
  };
}

// Campos de cliente permitidos en client_data (whitelist). Se descartan flags internos (fechaDesembolso,
// devolucionTasks, subsanacionHabilitada, legalAnalysis, etc.) que otras partes tratan como confiables.
const CLIENT_FIELDS = new Set([
  'nombres', 'apellidos', 'nombreCompleto', 'tipoDocumento', 'numeroDocumento',
  'correo', 'telefonoCelular', 'pagaduria', 'banco', 'tipoCuenta', 'numeroCuenta',
  'ciudadResidencia', 'direccionCompleta', 'barrio', 'estadoCivil', 'sexo', 'fechaNacimiento',
  'ciudadNacimiento', 'ciudadExpedicion', 'fechaExpedicion', 'tipoPension', 'mesadaPensional',
  'cuotaUtilizar', 'cuotaDisponible', 'observaciones', 'lineaCredito', 'tipoDesembolso',
]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    // Límite de tamaño del body (anti-DoS).
    const cl = Number(req.headers.get('content-length') || '0');
    if (cl > 64 * 1024) return fail(413, 'Cuerpo demasiado grande (máx 64KB).');

    const identity = await auth(req);
    if (!identity) return fail(401, 'API key inválida o ausente (header x-api-key).');
    const has = (scope: string) => identity.scopes.includes(scope);

    const url = new URL(req.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const i = parts.indexOf('api');
    const sub = i >= 0 ? parts.slice(i + 1) : parts;
    if (sub[0] !== 'credits') return fail(404, 'Recurso no encontrado.');

    // ── Comentarios: POST/GET /credits/:sol/comments ──────────────────────
    if (sub[2] === 'comments') {
      const sol = sub[1];
      const credit = await findCredit(sol, null, identity);
      if (!credit) return fail(404, 'Crédito no encontrado.');

      if (req.method === 'POST') {
        if (!has('credits:update')) return fail(403, 'Falta el scope credits:update.');
        const body = await req.json().catch(() => ({}));
        const texto = String(body.texto ?? body.text ?? '').trim();
        if (!texto) return fail(400, 'Indica el campo {texto}.');
        if (texto.length > 5000) return fail(400, 'El comentario supera los 5000 caracteres.');
        const insert: any = { credit_id: credit.id, text: texto, is_system: false };
        if (body.adjuntoUrl) { insert.attachment_url = String(body.adjuntoUrl); insert.attachment_name = String(body.adjuntoNombre ?? 'adjunto'); }
        const { data, error } = await db().from('comments').insert(insert).select('id, created_at').single();
        if (error) return fail(400, 'No se pudo agregar el comentario.', error);
        bg(db().from('credit_history').insert({ credit_id: credit.id, action: 'COMENTARIO (API)', description: texto.slice(0, 200) }));
        return json({ id: data.id, solicitud_number: credit.solicitud_number, created_at: data.created_at }, 201);
      }

      if (req.method === 'GET') {
        if (!has('credits:read')) return fail(403, 'Falta el scope credits:read.');
        const { data } = await db().from('comments').select('text, is_system, attachment_name, attachment_url, created_at').eq('credit_id', credit.id).order('created_at', { ascending: true });
        return json({
          solicitud_number: credit.solicitud_number,
          comentarios: (data || []).map((c: any) => ({ texto: c.text, sistema: !!c.is_system, adjunto: c.attachment_name || null, adjunto_url: c.attachment_url || null, fecha: c.created_at })),
        });
      }
      return fail(405, 'Método no soportado en /comments.');
    }

    // ── POST /credits ─────────────────────────────────────────────────────
    if (req.method === 'POST' && sub.length === 1) {
      if (!has('credits:create')) return fail(403, 'Falta el scope credits:create.');
      const body = await req.json().catch(() => ({}));
      const cliente = (body.cliente && typeof body.cliente === 'object') ? body.cliente : {};

      // Alias de campos PRIMERO: el aliado puede mandar la cédula/contacto con otro nombre
      // (cedula/documento/celular/email...). Normalizar aquí — antes de validar, de cobrar la
      // reserva y del anti-duplicado — es obligatorio: cuando este bloque corría al final, un
      // POST con `cedula` en vez de `numeroDocumento` se saltaba el lookup de lh_reservas (el
      // crédito nacía huérfano AUNQUE hubiera reserva) y esquivaba el anti-duplicado por cédula.
      const ALIAS: Record<string, string> = {
        celular: 'telefonoCelular', telefono: 'telefonoCelular', telefonoMovil: 'telefonoCelular',
        telefono_celular: 'telefonoCelular', movil: 'telefonoCelular', phone: 'telefonoCelular', celphone: 'telefonoCelular',
        email: 'correo', correoElectronico: 'correo', correo_electronico: 'correo', mail: 'correo',
        cedula: 'numeroDocumento', documento: 'numeroDocumento', numero_documento: 'numeroDocumento',
      };
      for (const [alias, canon] of Object.entries(ALIAS)) {
        if (cliente[alias] != null && (cliente[canon] == null || cliente[canon] === '')) cliente[canon] = cliente[alias];
      }
      // La cédula se compara en 3 sitios (reserva, anti-duplicado, adopción en Skala): un espacio
      // de borde no debe tumbar el POST ni partir el match.
      if (cliente.numeroDocumento != null) cliente.numeroDocumento = String(cliente.numeroDocumento).trim();

      const entidad = body.entidad || body.entity_name;
      const monto = Number(body.monto ?? body.amount);
      const plazo = Number(body.plazo ?? body.term);
      const tasa = Number(body.tasa ?? body.interest_rate);
      const commPct = Number(body.comisionPct ?? body.commission_percent ?? 0);

      // Validación de presencia, tipo y rango.
      if (!entidad || isNaN(monto) || isNaN(plazo) || isNaN(tasa)) return fail(400, 'Faltan campos: entidad, monto, plazo, tasa.');
      if (monto <= 0 || monto > 2_000_000_000 || plazo <= 0 || plazo > 240 || tasa < 0 || tasa > 100) return fail(400, 'Valores fuera de rango (monto 0–2.000.000.000, plazo 1–240, tasa 0–100).');
      if (isNaN(commPct) || commPct < 0 || commPct > 100) return fail(400, 'comisionPct fuera de rango (0–100).');
      // Alcance por entidad: una llave scopeada solo puede crear créditos de su(s) entidad(es).
      if (identity.entity_scope && !identity.entity_scope.some((e) => norm(e) === norm(String(entidad)))) return fail(403, `Tu llave solo puede operar la entidad: ${identity.entity_scope.join(', ')}.`);
      if (!cliente.numeroDocumento && !cliente.nombres && !cliente.nombreCompleto) return fail(400, 'Falta cliente (numeroDocumento o nombres).');
      if (cliente.numeroDocumento && !/^\d{5,15}$/.test(String(cliente.numeroDocumento))) return fail(400, 'numeroDocumento inválido.');
      if (cliente.correo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(cliente.correo))) return fail(400, 'correo inválido.');

      // Validar gestorId si viene (UUID + existe).
      let gestorId = body.gestorId || body.assigned_gestor_id || null;
      if (gestorId) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(gestorId))) return fail(400, 'gestorId inválido.');
        const { data: g } = await db().from('profiles').select('id').eq('id', gestorId).maybeSingle();
        if (!g) return fail(400, 'gestorId no existe.');
      }

      // ── EL CRÉDITO NO PUEDE NACER HUÉRFANO ────────────────────────────────────
      // El aliado crea el crédito por API en paralelo a que el asesor lo radica en Skala, y no
      // conoce a nuestros asesores: nunca manda gestorId. Antes eso insertaba dueño NULL, y si
      // el asesor no alcanzaba a terminar (OTP sin confirmar) el crédito quedaba huérfano para
      // siempre — invisible en las bandejas. Skala sí sabe quién es: al iniciar la preaprobación
      // guarda una reserva (cédula → asesor) que aquí se cobra.
      if (!gestorId && cliente.numeroDocumento) {
        const { data: reserva } = await db()
          .from('lh_reservas')
          .select('gestor_id')
          .eq('cedula', String(cliente.numeroDocumento).trim())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (reserva?.gestor_id) {
          // Mismo guard que el gestorId explícito: si el perfil de la reserva ya no existe
          // (asesor eliminado), NO usarlo — mejor huérfano visible que un dueño fantasma.
          const { data: gr } = await db().from('profiles').select('id').eq('id', reserva.gestor_id).maybeSingle();
          if (gr) gestorId = reserva.gestor_id;
        }
      }

      // external_ref: ID del aliado para enlazar el MISMO crédito en las dos apps (y deduplicar).
      const externalRef = (String(body.external_ref ?? body.externalRef ?? '').trim() || '').slice(0, 200) || null;
      // Idempotencia.
      const idem = (req.headers.get('idempotency-key') || '').trim() || null;
      const states = await getStates();
      const initial = states[0];
      if (!initial) return fail(500, 'No hay estados configurados.');
      if (idem) {
        const { data: existing } = await db().from('credits').select('id, solicitud_number, status_id, external_ref').eq('idempotency_key', idem).eq('api_key_id', identity.id).maybeSingle();
        if (existing) return json({ id: existing.id, solicitud_number: existing.solicitud_number, external_ref: existing.external_ref || null, estado: states.find((s) => s.id === existing.status_id)?.name || initial.name }, 200);
      }
      // Dedup por external_ref dentro del alcance de la llave (evita duplicar el mismo crédito del aliado).
      if (externalRef) {
        const { data: ex } = await applyScope(db().from('credits').select('id, solicitud_number, status_id'), identity).eq('external_ref', externalRef).maybeSingle();
        if (ex) return json({ id: ex.id, solicitud_number: ex.solicitud_number, external_ref: externalRef, estado: states.find((s) => s.id === ex.status_id)?.name || initial.name }, 200);
      }

      // ── ANTI-DUPLICADO por pagaduría (misma regla de capacidad que la UI de Skala) ──────
      // No se puede radicar si ya existe un crédito NO final para la MISMA cédula (o correo)
      // en la MISMA pagaduría. Se permite otro crédito solo si es con una pagaduría diferente.
      // La comprobación es global (no solo dentro de la entidad): respeta la capacidad real del
      // cliente en esa pagaduría. El mensaje es genérico (no expone datos de otras entidades).
      const pagaduriaNorm = norm(String(cliente.pagaduria || ''));
      if (pagaduriaNorm) {
        const finalIds = new Set(states.filter((s: any) => s.is_final === true).map((s: any) => s.id));
        const ced = cliente.numeroDocumento ? String(cliente.numeroDocumento).trim() : '';
        const correoLc = cliente.correo ? String(cliente.correo).trim().toLowerCase() : '';
        const candidatos: any[] = [];
        if (ced) {
          const { data } = await db().from('credits').select('id, status_id, client_data').filter('client_data->>numeroDocumento', 'eq', ced);
          if (data) candidatos.push(...data);
        }
        if (correoLc) {
          const { data } = await db().from('credits').select('id, status_id, client_data').filter('client_data->>correo', 'ilike', correoLc);
          if (data) candidatos.push(...data);
        }
        const conflicto = candidatos.find((c: any) => {
          if (finalIds.has(c.status_id)) return false; // ya cerrado → no bloquea
          const p = norm(String(c.client_data?.pagaduria || ''));
          return !p || p === pagaduriaNorm; // misma pagaduría (o sin pagaduría en el existente) → conflicto
        });
        if (conflicto) {
          const stName = states.find((s) => s.id === conflicto.status_id)?.name || 'en trámite';
          return fail(409, `Ya existe un crédito en trámite para este cliente en la pagaduría "${String(cliente.pagaduria).trim()}" (estado: ${stName}). Solo puedes radicar otro si es con una pagaduría diferente.`);
        }
      }

      // (Los alias de campos ya se normalizaron arriba, antes de validar/reserva/anti-duplicado.)
      for (const [alias, canon] of Object.entries(ALIAS)) {
        if (cliente[alias] != null && (cliente[canon] == null || cliente[canon] === '')) cliente[canon] = cliente[alias];
      }

      // Saneo de client_data por whitelist (solo strings/números cortos).
      const cleanCliente: Record<string, any> = {};
      for (const [k, v] of Object.entries(cliente)) {
        if (CLIENT_FIELDS.has(k) && (typeof v === 'string' || typeof v === 'number') && String(v).length < 500) cleanCliente[k] = v;
      }
      const nombreCompleto = cliente.nombreCompleto || `${cliente.nombres || ''} ${cliente.apellidos || ''}`.trim();

      const insertPayload: any = {
        status_id: initial.id,
        amount: monto,
        disbursement_amount: Number(body.montoDesembolso ?? body.disbursement_amount ?? monto),
        term: plazo,
        entity_name: String(entidad).trim(),
        interest_rate: tasa,
        commission_percent: commPct,
        commission_est: (monto * commPct) / 100,
        assigned_gestor_id: gestorId,
        api_key_id: identity.id, // llave que originó el crédito (para trazabilidad)
        external_ref: externalRef, // ID del aliado para enlazar el mismo crédito en ambas apps
        // _apiCamposRecibidos: nombres de campos que envió el aliado (diagnóstico; sin valores).
        client_data: { ...cleanCliente, nombreCompleto, lineaCredito: body.lineaCredito || cliente.lineaCredito || '', origen_api: true, _apiCamposRecibidos: Object.keys(cliente || {}) },
        idempotency_key: idem,
      };

      const { data, error } = await db().from('credits').insert(insertPayload).select('id, solicitud_number, external_ref').single();
      if (error) {
        // Violación de idempotencia (23505) → devolver el existente en vez de error.
        if ((error as any).code === '23505' && idem) {
          const { data: ex } = await db().from('credits').select('id, solicitud_number, status_id, external_ref').eq('idempotency_key', idem).eq('api_key_id', identity.id).maybeSingle();
          if (ex) return json({ id: ex.id, solicitud_number: ex.solicitud_number, external_ref: ex.external_ref || null, estado: states.find((s) => s.id === ex.status_id)?.name || initial.name }, 200);
        }
        return fail(400, 'No se pudo crear el crédito.', error);
      }

      bg(db().from('credit_history').insert({
        credit_id: data.id,
        user_id: gestorId, // queda a nombre del asesor dueño, no como acción anónima
        action: 'CREADO VIA API',
        description: `Crédito creado vía API externa para ${nombreCompleto || cliente.numeroDocumento || ''}.`
          + (gestorId
              ? (body.gestorId || body.assigned_gestor_id
                  ? ' Asesor indicado por el aliado.'
                  : ' Asignado al asesor que inició la preaprobación en Skala.')
              : ' SIN ASESOR: el aliado no lo indicó y no había preaprobación abierta en Skala para esta cédula.'),
      }));

      return json({ id: data.id, solicitud_number: data.solicitud_number, external_ref: data.external_ref || null, estado: initial.name }, 201);
    }

    // ── GET /credits/:sol | ?solicitud= | ?cedula=  (uno)  |  GET /credits (lista) ──
    if (req.method === 'GET') {
      if (!has('credits:read')) return fail(403, 'Falta el scope credits:read.');
      const sol = sub[1] || url.searchParams.get('solicitud');
      const cedula = url.searchParams.get('cedula');
      const extRef = url.searchParams.get('external_ref') || url.searchParams.get('externalRef');
      const states = await getStates();

      // ?external_ref= → buscar por el ID del aliado (dentro de su alcance).
      if (!sol && !cedula && extRef) {
        const { data } = await applyScope(db().from('credits').select('*'), identity).eq('external_ref', extRef).order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (!data) return fail(404, 'Crédito no encontrado.');
        return json(creditPublicView(data, states));
      }

      // Sin :solicitud ni ?cedula → LISTAR los créditos de esta llave (paginado, más recientes primero).
      if (!sol && !cedula) {
        const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || '20') || 20, 1), 100);
        const offset = Math.max(Number(url.searchParams.get('offset') || '0') || 0, 0);
        let q = applyScope(db().from('credits').select('*'), identity);
        const estadoFiltro = (url.searchParams.get('estado') || '').trim();
        if (estadoFiltro) {
          const ni = norm(estadoFiltro);
          const st = states.find((s) => norm(s.name) === ni);
          if (st) q = q.eq('status_id', st.id);
        }
        const { data } = await q.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
        return json({ items: (data || []).map((c) => creditPublicView(c, states)), limit, offset, count: (data || []).length });
      }

      const credit = await findCredit(sol, cedula, identity);
      if (!credit) return fail(404, 'Crédito no encontrado.');
      return json(creditPublicView(credit, states));
    }

    // ── PATCH /credits/:sol/status  body {estado, motivo} ─────────────────
    if (req.method === 'PATCH' && sub[2] === 'status') {
      if (!has('credits:update')) return fail(403, 'Falta el scope credits:update.');
      const sol = sub[1];
      const body = await req.json().catch(() => ({}));
      const estadoInput = String(body.estado || '').trim();
      const motivo = String(body.motivo || '').trim();
      if (!sol || !estadoInput) return fail(400, 'Indica :solicitud y body {estado}.');

      const credit = await findCredit(sol, null, identity);
      if (!credit) return fail(404, 'Crédito no encontrado.');

      const states = await getStates();
      const ni = norm(estadoInput);
      // Coincidencia INEQUÍVOCA: id exacto → nombre exacto → parcial solo si es único.
      let target = states.find((s) => s.id === estadoInput) || states.find((s) => norm(s.name) === ni);
      if (!target) {
        const partial = states.filter((s) => norm(s.name).includes(ni));
        if (partial.length === 1) target = partial[0];
        else if (partial.length > 1) return json({ error: `Estado ambiguo: "${estadoInput}" coincide con varios. Usa el nombre completo o el id.`, coincidencias: partial.map((s) => s.name) }, 400);
      }
      if (!target) return json({ error: `Estado no reconocido: "${estadoInput}".`, estados_validos: states.map((s) => s.name) }, 400);

      const now = new Date().toISOString();
      const cd = credit.client_data || {};
      const newCd: Record<string, any> = { ...cd };
      let cdChanged = false;

      // DESEMBOLSADO → estampar fecha de desembolso.
      if (/DESEMBOLSADO/i.test(target.name) && !cd.fechaDesembolso) { newCd.fechaDesembolso = now; cdChanged = true; }

      // DEVOLUCIÓN con tareas: si el estado habilita tareas y llegan `tareas`, se guardan.
      // tareas: [{ titulo, requiereAdjunto? }] o ["texto", ...]
      const tareasInput = Array.isArray(body.tareas) ? body.tareas : [];
      const esDevolucion = target.enable_tasks === true;
      let tareasGuardadas: any[] = [];
      if (esDevolucion && tareasInput.length > 0) {
        tareasGuardadas = tareasInput
          .map((t: any) => ({
            id: crypto.randomUUID().slice(0, 9),
            title: (typeof t === 'string' ? t : String(t.titulo ?? t.title ?? '')).trim(),
            requiresDoc: typeof t === 'object' ? !!(t.requiereAdjunto ?? t.requiresDoc) : false,
            completed: false,
          }))
          .filter((t: any) => t.title);
        if (tareasGuardadas.length > 0) { newCd.devolucionTasks = tareasGuardadas; newCd.subsanacionHabilitada = false; cdChanged = true; }
      }

      const updatePayload: any = { status_id: target.id, updated_at: now };
      if (cdChanged) updatePayload.client_data = newCd;
      const { error } = await db().from('credits').update(updatePayload).eq('id', credit.id);
      if (error) return fail(400, 'No se pudo actualizar el crédito.', error);

      const conTareas = tareasGuardadas.length > 0;
      const descTareas = conTareas ? ' Tareas: ' + tareasGuardadas.map((t) => `${t.title}${t.requiresDoc ? ' (adjunto)' : ''}`).join('; ') : '';
      // Audit trail confirmado antes de responder (historial + comentario de sistema).
      await Promise.all([
        db().from('credit_history').insert({
          credit_id: credit.id,
          action: conTareas ? 'DEVOLUCIÓN CON TAREAS (API)' : 'CAMBIO ESTADO (API)',
          description: `Estado cambiado a ${target.name}. Motivo: ${motivo || 'vía API externa'}.${descTareas}`,
        }),
        db().from('comments').insert({
          credit_id: credit.id,
          text: `[API] Estado → ${target.name}.${motivo ? ' Motivo: ' + motivo + '.' : ''}${descTareas}`,
          is_system: true,
        }),
      ]).catch((e) => console.error('[api] audit state-change', e));

      return json({ solicitud_number: credit.solicitud_number, estado: target.name, ...(conTareas ? { tareas: tareasGuardadas.length } : {}) });
    }

    // Llegamos aquí solo con rutas /credits válidas pero método/subruta no soportada → 405.
    return fail(405, 'Método no soportado en esta ruta.');
  } catch (err) {
    return fail(500, 'Error interno.', err);
  }
});

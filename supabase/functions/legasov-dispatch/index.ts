// Edge Function: puente entre Skala y el robot de LegasovApp (Node+Playwright en EasyPanel).
// Skala NUNCA llama al robot directo (evita CORS y no expone el secreto en el navegador):
// llama a esta función con { creditId }. Ella lee el crédito, valida entidad, llama al robot
// server-to-server con el secreto, y guarda el resultado en credits.client_data.legasov.
//
//   POST { creditId, forzar?: boolean }
//     -> { ok, mensaje, legasov: { estado, codigoId?, mensaje, at } }
//
// Secrets requeridos (Supabase → Edge Functions → Secrets):
//   ROBOT_URL     = https://<dominio-easypanel-del-robot>   (sin / al final)
//   ROBOT_SECRET  = mismo valor que el robot (X-Robot-Secret)
//   LEGASOV_ENTIDAD_PRODUCTO = (opcional) opción exacta del combobox "Entidad / Producto" para La Hipotecaria

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ROBOT_URL = (Deno.env.get('ROBOT_URL') || '').replace(/\/+$/, '');
const ROBOT_SECRET = Deno.env.get('ROBOT_SECRET') || '';
const ENTIDAD_PRODUCTO = Deno.env.get('LEGASOV_ENTIDAD_PRODUCTO') || 'La Hipotecaria';

// Solo esta entidad dispara la validación en LegasovApp.
const ENTIDAD_OBJETIVO = 'la hipotecaria';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const fail = (status: number, msg: string, internal?: unknown) => {
  const request_id = crypto.randomUUID();
  if (internal) console.error('[legasov-dispatch]', request_id, msg, internal);
  return json({ error: msg, request_id }, status);
};
const db = () => createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

const norm = (s: string) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail(405, 'Método no permitido.');

  try {
    if (!ROBOT_URL || !ROBOT_SECRET) return fail(500, 'Robot no configurado (faltan ROBOT_URL / ROBOT_SECRET).');

    const body = await req.json().catch(() => ({}));
    const creditId = String(body.creditId || '').trim();
    const forzar = body.forzar === true;
    const dryRun = body.dryRun === true; // prueba: el robot llena pero NO crea; no se persiste resultado
    if (!creditId) return fail(400, 'Falta creditId.');

    const supa = db();
    const { data: credit, error } = await supa
      .from('credits')
      .select('id, entity_name, client_data, solicitud_number')
      .eq('id', creditId)
      .maybeSingle();
    if (error || !credit) return fail(404, 'Crédito no encontrado.', error);

    // Solo La Hipotecaria (salvo forzado explícito).
    if (norm(credit.entity_name) !== ENTIDAD_OBJETIVO && !forzar) {
      return json({ ok: false, mensaje: `La validación en LegasovApp solo aplica a La Hipotecaria (esta es "${credit.entity_name}").` });
    }

    const cd = credit.client_data || {};

    // Idempotencia: si ya se creó y no se fuerza, no repetir.
    if (cd.legasov?.estado === 'creado' && cd.legasov?.codigoId && !forzar) {
      return json({ ok: true, mensaje: 'Ya existía el Codigo en LegasovApp.', legasov: cd.legasov });
    }

    const nombresCompletos = `${cd.nombres || ''} ${cd.apellidos || ''}`.trim() || cd.nombreCompleto || '';
    const payload = {
      documento: String(cd.numeroDocumento || '').trim(),
      nombresCompletos,
      entidadProducto: ENTIDAD_PRODUCTO,
      correo: String(cd.correo || '').trim(),
      celular: String(cd.telefonoCelular || '').trim(),
      creditId,
      dryRun,
    };
    if (!payload.documento || !payload.nombresCompletos) {
      return fail(400, 'El crédito no tiene documento o nombres del cliente para crear el Codigo.');
    }

    // Llamada al robot (server-to-server). Timeout defensivo: Playwright puede tardar.
    let robot: any = {};
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 90_000);
      const r = await fetch(`${ROBOT_URL}/codigos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Robot-Secret': ROBOT_SECRET },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      robot = await r.json().catch(() => ({ ok: false, mensaje: `Respuesta no-JSON del robot (HTTP ${r.status}).` }));
    } catch (e: any) {
      robot = { ok: false, mensaje: e?.name === 'AbortError' ? 'El robot tardó demasiado (timeout).' : `No se pudo contactar el robot: ${e?.message || e}` };
    }

    // En dryRun no se persiste nada (es solo prueba del chain).
    if (dryRun) {
      return json({ ok: robot.ok === true, dryRun: true, mensaje: String(robot.mensaje || ''), robot });
    }

    const legasov = {
      estado: robot.ok ? 'creado' : 'error',
      codigoId: robot.codigoId ?? cd.legasov?.codigoId ?? null,
      mensaje: String(robot.mensaje || (robot.ok ? 'Codigo creado.' : 'Error creando el Codigo.')),
      at: new Date().toISOString(),
    };

    // Guardar el resultado en el crédito (merge sobre client_data).
    const { error: upErr } = await supa
      .from('credits')
      .update({ client_data: { ...cd, legasov } })
      .eq('id', creditId);
    if (upErr) console.error('[legasov-dispatch] no se pudo guardar client_data.legasov:', upErr);

    return json({ ok: robot.ok === true, mensaje: legasov.mensaje, legasov });
  } catch (err) {
    return fail(500, 'Error interno.', err);
  }
});

// Supabase Edge Function: simulador-calc
// Proxy navegador → Apps Script (motor Google Sheets). Evita CORS y oculta el token.
// Secrets requeridos (Supabase → Edge Functions → Secrets):
//   APPS_SCRIPT_URL   = https://script.google.com/macros/s/XXXX/exec
//   APPS_SCRIPT_TOKEN = (opcional) mismo TOKEN configurado en el Apps Script

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const APPS_SCRIPT_URL = Deno.env.get('APPS_SCRIPT_URL') || '';
const APPS_SCRIPT_TOKEN = Deno.env.get('APPS_SCRIPT_TOKEN') || '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!APPS_SCRIPT_URL) {
      return new Response(JSON.stringify({ error: 'APPS_SCRIPT_URL no configurada en los secrets de la Edge Function' }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }
    const body = await req.json(); // { templateId, inputs:[{sheet,a1,value}], outputsSheet }
    if (!body?.templateId) {
      return new Response(JSON.stringify({ error: 'Falta templateId' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const payload = { ...body, token: APPS_SCRIPT_TOKEN || undefined };
    // Apps Script suele redirigir (302) a googleusercontent; fetch sigue el redirect.
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });
    const text = await resp.text();
    let json: any;
    try { json = JSON.parse(text); } catch { json = { error: 'Respuesta no-JSON del motor', raw: text.slice(0, 300) }; }

    return new Response(JSON.stringify(json),
      { status: resp.ok ? 200 : 502, headers: { ...CORS, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Error desconocido' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
});

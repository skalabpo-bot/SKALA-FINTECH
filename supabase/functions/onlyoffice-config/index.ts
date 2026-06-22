// Supabase Edge Function: onlyoffice-config
// Arma y FIRMA (JWT) la configuración del editor OnlyOffice para un simulador.
// - Genera un enlace FIRMADO y temporal del .xlsx (bucket privado) que OnlyOffice
//   descarga del lado servidor → los archivos no quedan públicos.
// - Firma la config con ONLYOFFICE_JWT_SECRET (el secreto no se expone al navegador).
//
// Secrets requeridos (ya configurados):
//   ONLYOFFICE_URL, ONLYOFFICE_JWT_SECRET
//   (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY están disponibles por defecto)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const OO_URL = (Deno.env.get('ONLYOFFICE_URL') || '').replace(/\/$/, '');
const OO_SECRET = Deno.env.get('ONLYOFFICE_JWT_SECRET') || '';
const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') || '').replace(/\/$/, '');
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const BUCKET = 'simuladores';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const b64url = (data: Uint8Array | string) => {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  let bin = ''; bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

async function signJWT(payload: any, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const data = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)));
  return `${data}.${b64url(sig)}`;
}

async function signedFileUrl(filePath: string): Promise<string> {
  const resp = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${filePath}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: 3600 }),
  });
  if (!resp.ok) throw new Error(`No se pudo firmar el archivo (${resp.status})`);
  const json = await resp.json();
  return `${SUPABASE_URL}/storage/v1${json.signedURL}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!OO_URL || !OO_SECRET) throw new Error('OnlyOffice no configurado (faltan secrets)');
    const body = await req.json(); // { filePath, fileName, key, userName? }
    if (!body?.filePath) throw new Error('Falta filePath');

    const url = await signedFileUrl(body.filePath);
    const fileName = body.fileName || 'simulador.xlsx';
    const key = String(body.key || (body.filePath + '-' + Date.now())).replace(/[^a-zA-Z0-9._=-]/g, '').slice(0, 120);

    const config: any = {
      document: {
        fileType: 'xlsx',
        key,
        title: fileName,
        url,
        permissions: { edit: true, download: true, print: true, comment: false },
      },
      documentType: 'cell',
      editorConfig: {
        mode: 'edit',
        lang: 'es',
        user: { id: 'asesor', name: body.userName || 'Asesor' },
        customization: { autosave: false, forcesave: false, comments: false, chat: false },
      },
    };
    config.token = await signJWT(config, OO_SECRET);

    return new Response(JSON.stringify({ documentServerUrl: OO_URL, config }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Error' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
});

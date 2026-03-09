// Supabase Edge Function: Send Push Notification
// Despliega con: supabase functions deploy send-push-notification

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// VAPID keys — generadas para Skala Fintech
const VAPID_PUBLIC_KEY = 'BDd1xSo79UGaNKWoz2tXA5L6w3Qcb9K-yVUPP73sHq0NnQC6513geFqorgHWmbBtKFvZn_gJwoBnxqH9tJRUh1s';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || 'yh2bKsO1w1s9Fy-J_vchly_NZUdyQzHRFyfqd0DRWy8';
const VAPID_SUBJECT = 'mailto:admin@skalafintech.com';

// Web Push: firmar JWT para autenticación VAPID
async function createVapidAuthHeader(endpoint: string): Promise<{ authorization: string; cryptoKey: string }> {
  const audience = new URL(endpoint).origin;

  // Decodificar private key de base64url
  const padding = '='.repeat((4 - (VAPID_PRIVATE_KEY.length % 4)) % 4);
  const base64 = (VAPID_PRIVATE_KEY + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawKey = Uint8Array.from(atob(base64), c => c.charCodeAt(0));

  // Crear JWT header + payload
  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12 horas
    sub: VAPID_SUBJECT,
  };

  const enc = new TextEncoder();
  const toB64url = (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const headerB64 = toB64url(enc.encode(JSON.stringify(header)));
  const payloadB64 = toB64url(enc.encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Importar clave privada ECDSA P-256
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    await convertRawToP256Pkcs8(rawKey),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    enc.encode(unsignedToken)
  );

  // Convertir firma DER a raw (r || s de 32 bytes cada uno)
  const sigB64 = toB64url(derToRaw(new Uint8Array(signature)));

  const jwt = `${unsignedToken}.${sigB64}`;

  return {
    authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
    cryptoKey: `p256ecdsa=${VAPID_PUBLIC_KEY}`,
  };
}

// Convertir clave raw EC de 32 bytes a formato PKCS8 (para crypto.subtle)
async function convertRawToP256Pkcs8(rawPrivate: Uint8Array): Promise<ArrayBuffer> {
  // ASN.1 DER encoding para PKCS8 wrapping de una clave EC P-256
  const pkcs8Header = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13,
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
    0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02,
    0x01, 0x01, 0x04, 0x20,
  ]);
  const pkcs8Footer = new Uint8Array([
    0xa1, 0x44, 0x03, 0x42, 0x00,
  ]);

  // Generar la clave pública a partir de la privada
  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    d: btoa(String.fromCharCode(...rawPrivate)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''),
    x: 'N3XFKjv1QZo0pajPa1cDkvrDdBxv0r7JVQ8_vewerQ0', // from public key
    y: 'DZ0Auu9d4HhaiqIB1pmwbShb2Z_4CcKAZ8aof7SUVIc', // from public key
  };

  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
  return crypto.subtle.exportKey('pkcs8', key);
}

// Convertir firma DER a raw format (64 bytes: r[32] + s[32])
function derToRaw(der: Uint8Array): Uint8Array {
  const raw = new Uint8Array(64);
  let offset = 2; // skip 0x30, length

  // Parse r
  offset++; // 0x02
  let rLen = der[offset++];
  if (rLen === 33) offset++; // skip leading 0x00
  raw.set(der.slice(offset, offset + 32), 0);
  offset += 32;

  // Parse s
  offset++; // 0x02
  let sLen = der[offset++];
  if (sLen === 33) offset++; // skip leading 0x00
  raw.set(der.slice(offset, offset + 32), 32);

  return raw;
}

serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  try {
    const { user_id, title, body, type, credit_id } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id requerido' }), { status: 400 });
    }

    // Crear cliente Supabase con service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Obtener suscripciones push del usuario
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', user_id);

    if (error || !subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: 'No push subscriptions found' }), { status: 200 });
    }

    const payload = JSON.stringify({
      title: title || 'Skala',
      body: body || 'Tienes una nueva notificación',
      icon: '/skala.png',
      tag: `skala-${type || 'info'}-${Date.now()}`,
      url: credit_id ? `/?credit=${credit_id}` : '/',
      creditId: credit_id,
    });

    let sent = 0;
    let failed = 0;
    const expiredEndpoints: string[] = [];

    for (const sub of subscriptions) {
      try {
        const vapidHeaders = await createVapidAuthHeader(sub.endpoint);

        const response = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Encoding': 'aes128gcm',
            'TTL': '86400',
            'Authorization': vapidHeaders.authorization,
            'Crypto-Key': vapidHeaders.cryptoKey,
          },
          body: new TextEncoder().encode(payload),
        });

        if (response.status === 201 || response.status === 200) {
          sent++;
        } else if (response.status === 404 || response.status === 410) {
          // Suscripción expirada — marcar para eliminar
          expiredEndpoints.push(sub.endpoint);
          failed++;
        } else {
          console.error(`Push failed for ${sub.endpoint}: ${response.status}`);
          failed++;
        }
      } catch (err) {
        console.error(`Push error for ${sub.endpoint}:`, err);
        failed++;
      }
    }

    // Limpiar suscripciones expiradas
    if (expiredEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user_id)
        .in('endpoint', expiredEndpoints);
    }

    return new Response(JSON.stringify({ sent, failed, expired: expiredEndpoints.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

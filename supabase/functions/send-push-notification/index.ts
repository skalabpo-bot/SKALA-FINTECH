// Supabase Edge Function: Send Push Notification
// Despliega con: supabase functions deploy send-push-notification

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SignJWT, importJWK } from 'https://deno.land/x/jose@v5.2.0/index.ts';

// VAPID keys — generadas para Skala Fintech
const VAPID_PUBLIC_KEY = 'BDd1xSo79UGaNKWoz2tXA5L6w3Qcb9K-yVUPP73sHq0NnQC6513geFqorgHWmbBtKFvZn_gJwoBnxqH9tJRUh1s';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || 'yh2bKsO1w1s9Fy-J_vchly_NZUdyQzHRFyfqd0DRWy8';
const VAPID_SUBJECT = 'mailto:admin@skalafintech.com';

// === Utilidades de codificación ===

function base64urlToUint8Array(base64url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

function uint8ArrayToBase64url(arr: Uint8Array): string {
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// === VAPID JWT usando jose ===

async function createVapidJwt(endpoint: string): Promise<{ authorization: string; cryptoKey: string }> {
  const audience = new URL(endpoint).origin;

  // Decodificar la clave pública (65 bytes: 0x04 + x[32] + y[32])
  const publicKeyRaw = base64urlToUint8Array(VAPID_PUBLIC_KEY);
  const x = uint8ArrayToBase64url(publicKeyRaw.slice(1, 33));
  const y = uint8ArrayToBase64url(publicKeyRaw.slice(33, 65));
  const d = VAPID_PRIVATE_KEY; // ya está en base64url

  // Importar como JWK usando jose
  const privateKey = await importJWK(
    { kty: 'EC', crv: 'P-256', x, y, d },
    'ES256'
  );

  // Firmar JWT con jose
  const jwt = await new SignJWT({})
    .setProtectedHeader({ typ: 'JWT', alg: 'ES256' })
    .setAudience(audience)
    .setExpirationTime('12h')
    .setSubject(VAPID_SUBJECT)
    .sign(privateKey);

  return {
    authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
    cryptoKey: `p256ecdsa=${VAPID_PUBLIC_KEY}`,
  };
}

// === Web Push Encryption (RFC 8291 / aes128gcm) ===

async function encryptPayload(
  plaintext: Uint8Array,
  p256dhKey: string,
  authSecret: string
): Promise<Uint8Array> {
  const subscriberPublicKey = base64urlToUint8Array(p256dhKey);
  const authSecretBytes = base64urlToUint8Array(authSecret);

  // 1. Generar par de claves ECDH efímeras
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKeyPair.publicKey)
  );

  // 2. Importar clave pública del suscriptor
  const subscriberKey = await crypto.subtle.importKey(
    'raw', subscriberPublicKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    false, []
  );

  // 3. Derivar shared secret via ECDH
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: subscriberKey },
      serverKeyPair.privateKey,
      256
    )
  );

  // 4. Salt aleatorio (16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // 5. HKDF: PRK usando auth_secret
  const enc = new TextEncoder();
  const authInfo = new Uint8Array([
    ...enc.encode('WebPush: info\0'),
    ...subscriberPublicKey,
    ...serverPublicKeyRaw,
  ]);
  const ikm = await hkdf(authSecretBytes, sharedSecret, authInfo, 32);

  // 6. CEK (16 bytes)
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);

  // 7. Nonce (12 bytes)
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);

  // 8. Pad: payload + 0x02
  const paddedPayload = new Uint8Array([...plaintext, 2]);

  // 9. Encrypt AES-128-GCM
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, paddedPayload)
  );

  // 10. Header aes128gcm: salt(16) + rs(4) + keyid_len(1) + keyid(65)
  const recordSize = new Uint8Array(4);
  new DataView(recordSize.buffer).setUint32(0, paddedPayload.length + 16, false);

  const header = new Uint8Array([
    ...salt, ...recordSize, serverPublicKeyRaw.length, ...serverPublicKeyRaw,
  ]);

  const result = new Uint8Array(header.length + ciphertext.length);
  result.set(header, 0);
  result.set(ciphertext, header.length);
  return result;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const prk = await hmacSha256(salt, ikm);
  const okm = await hmacSha256(prk, new Uint8Array([...info, 1]));
  return okm.slice(0, length);
}

async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data));
}

// === Handler principal ===

serve(async (req) => {
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
    const reqPayload = await req.json();
    console.log('Received payload:', JSON.stringify(reqPayload));

    const record = reqPayload.record || reqPayload;
    const user_id = record.user_id;
    const title = record.title;
    const body = record.message || record.body;
    const type = record.type;
    const credit_id = record.credit_id;

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id requerido' }), { status: 400 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', user_id);

    if (error || !subscriptions || subscriptions.length === 0) {
      console.log('No subscriptions for user:', user_id);
      return new Response(JSON.stringify({ sent: 0, reason: 'No push subscriptions' }), { status: 200 });
    }

    console.log(`Found ${subscriptions.length} subscription(s) for user ${user_id}`);

    const notificationPayload = JSON.stringify({
      title: title || 'Skala',
      body: body || 'Tienes una nueva notificación',
      icon: '/skala.png',
      tag: `skala-${type || 'info'}-${Date.now()}`,
      url: credit_id ? `/?credit=${credit_id}` : '/',
      creditId: credit_id,
    });

    const plaintextBytes = new TextEncoder().encode(notificationPayload);

    let sent = 0;
    let failed = 0;
    const expiredEndpoints: string[] = [];

    for (const sub of subscriptions) {
      try {
        // Validar que tiene p256dh y auth
        if (!sub.p256dh || !sub.auth) {
          console.error(`Subscription missing keys: p256dh=${!!sub.p256dh}, auth=${!!sub.auth}`);
          failed++;
          continue;
        }

        const vapidHeaders = await createVapidJwt(sub.endpoint);
        const encryptedBody = await encryptPayload(plaintextBytes, sub.p256dh, sub.auth);

        const response = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Encoding': 'aes128gcm',
            'Content-Length': String(encryptedBody.length),
            'TTL': '86400',
            'Authorization': vapidHeaders.authorization,
            'Crypto-Key': vapidHeaders.cryptoKey,
          },
          body: encryptedBody,
        });

        console.log(`Push to ${sub.endpoint.slice(0, 80)}... → ${response.status}`);

        if (response.status === 201 || response.status === 200) {
          sent++;
        } else if (response.status === 404 || response.status === 410) {
          expiredEndpoints.push(sub.endpoint);
          failed++;
        } else {
          const respBody = await response.text();
          console.error(`Push failed: ${response.status} — ${respBody}`);
          failed++;
        }
      } catch (err) {
        console.error(`Push error:`, err);
        failed++;
      }
    }

    if (expiredEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user_id)
        .in('endpoint', expiredEndpoints);
    }

    return new Response(JSON.stringify({ sent, failed, expired: expiredEndpoints.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

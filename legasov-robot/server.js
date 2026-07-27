// Servicio HTTP del robot LegasovApp.
// Solo lo llama la Edge Function `legasov-dispatch` de Skala (server-to-server), autenticado
// con el header X-Robot-Secret. NUNCA se expone al navegador.
require('dotenv').config();
const express = require('express');
const { crearCodigo } = require('./crear-codigo');

const { ROBOT_SECRET, PORT = 3000 } = process.env;

if (!process.env.LEGASOV_NUMERO_DOCUMENTO || !process.env.LEGASOV_PASSWORD) {
  console.error('Faltan LEGASOV_NUMERO_DOCUMENTO / LEGASOV_PASSWORD en el entorno.');
  process.exit(1);
}
if (!ROBOT_SECRET) {
  console.error('Falta ROBOT_SECRET en el entorno (secreto compartido con Skala).');
  process.exit(1);
}
if (!process.env.BROWSER_WS_ENDPOINT) {
  console.error('Falta BROWSER_WS_ENDPOINT (Chrome de Browserless).');
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: '256kb' }));

// Salud (para que EasyPanel verifique que está vivo)
app.get('/health', (_req, res) => res.json({ ok: true, service: 'legasov-robot' }));

// Crear un Codigo (cliente) en LegasovApp.
// Body: { documento, nombresCompletos, entidadProducto, correo, celular, creditId? }
app.post('/codigos', async (req, res) => {
  // Auth por secreto compartido (comparación de longitud constante para no filtrar por timing)
  const enviado = String(req.get('X-Robot-Secret') || '');
  if (enviado.length !== ROBOT_SECRET.length || !timingSafeEqual(enviado, ROBOT_SECRET)) {
    return res.status(401).json({ ok: false, mensaje: 'No autorizado' });
  }

  const b = req.body || {};
  const cliente = {
    documento: String(b.documento || '').trim(),
    nombresCompletos: String(b.nombresCompletos || '').trim(),
    entidadProducto: String(b.entidadProducto || '').trim(),
    correo: String(b.correo || '').trim(),
    celular: String(b.celular || '').trim(),
    creditId: b.creditId ? String(b.creditId) : undefined,
    dryRun: b.dryRun === true, // prueba: llena todo pero NO envía (no crea cliente real)
  };

  if (!cliente.documento || !cliente.nombresCompletos) {
    return res.status(400).json({ ok: false, mensaje: 'Faltan documento o nombres completos.' });
  }

  try {
    const resultado = await crearCodigo(cliente);
    return res.status(resultado.ok ? 200 : 422).json(resultado);
  } catch (err) {
    console.error('[legasov-robot] error inesperado:', err);
    return res.status(500).json({ ok: false, mensaje: 'Error interno del robot: ' + (err?.message || String(err)) });
  }
});

// Comparación en tiempo (casi) constante sin depender de crypto.timingSafeEqual con buffers de distinta longitud.
function timingSafeEqual(a, b) {
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

app.listen(PORT, () => console.log(`legasov-robot escuchando en :${PORT}`));

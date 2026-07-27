// Lógica Playwright: entra al panel de LegasovApp y crea el "Codigo" (cliente).
//
// Selectores CONFIRMADOS contra el HTML real (Livewire/Filament, login por número de documento).
// Lo único no confirmado es la detección del toast de éxito/error (clases estándar de Filament,
// best-effort): si su panel usa otras clases, se afina en la primera prueba real.
const { chromium } = require('playwright-core');

const BASE = process.env.LEGASOV_BASE || 'https://legasovapp.com';
const { LEGASOV_NUMERO_DOCUMENTO, LEGASOV_PASSWORD, BROWSER_WS_ENDPOINT, BROWSER_PROTOCOL = 'cdp' } = process.env;

/** Conecta al Chrome remoto de Browserless (no lanza navegador local). */
async function conectarNavegador() {
  if (!BROWSER_WS_ENDPOINT) throw new Error('Falta BROWSER_WS_ENDPOINT (Chrome de Browserless).');
  // "playwright" → endpoint que habla el protocolo Playwright (Browserless v2 /chromium/playwright).
  // "cdp" (default) → protocolo CDP, el más compatible.
  return BROWSER_PROTOCOL === 'playwright'
    ? chromium.connect(BROWSER_WS_ENDPOINT)
    : chromium.connectOverCDP(BROWSER_WS_ENDPOINT);
}

/**
 * DIAGNÓSTICO: navega al login y devuelve lo que Browserless realmente ve
 * (url, título, y todos los inputs). Sirve para saber por qué no aparece el selector.
 */
async function debugLogin() {
  const browser = await conectarNavegador();
  const context = await browser.newContext({ locale: 'es-CO' });
  const page = await context.newPage();
  try {
    const resp = await page.goto(`${BASE}/admin/login`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3000); // dar chance a Livewire de pintar
    const url = page.url();
    const title = await page.title().catch(() => '');
    const status = resp ? resp.status() : null;
    const inputs = await page.$$eval('input, select, textarea', (els) =>
      els.map((e) => ({ tag: e.tagName.toLowerCase(), id: e.id || '', name: e.getAttribute('name') || '', type: e.getAttribute('type') || '', placeholder: e.getAttribute('placeholder') || '' }))
    ).catch(() => []);
    const bodySnippet = (await page.evaluate(() => document.body?.innerText?.slice(0, 400) || '').catch(() => '')) || '';
    const tieneDocInput = await page.locator('#data\\.numero_documento').count().catch(() => 0);
    return { ok: true, debug: true, url, title, httpStatus: status, tieneDocInput, inputs, bodySnippet };
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

/** Inicia sesión en el panel admin. El login es por NÚMERO DE DOCUMENTO (no email). */
async function login(page) {
  await page.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle' });

  // Selectores reales (Livewire, ids con punto → escapados en CSS).
  await page.locator('#data\\.numero_documento').fill(String(LEGASOV_NUMERO_DOCUMENTO));
  await page.locator('#data\\.password').fill(String(LEGASOV_PASSWORD));
  await page.getByRole('button', { name: 'Entrar' }).click();

  // Redirige a /admin (dashboard). Esperamos salir del login.
  await page.waitForURL((url) => !/\/admin\/login/.test(url.href), { timeout: 20000 });
}

/** Rellena y envía el formulario de creación de Codigo. Devuelve {ok, codigoId?, mensaje}. */
async function crearCodigo(cliente) {
  const browser = await conectarNavegador();
  const context = await browser.newContext({ locale: 'es-CO' });
  const page = await context.newPage();

  try {
    await login(page);

    await page.goto(`${BASE}/admin/codigos/create`, { waitUntil: 'networkidle' });

    // ── Campos por ID exacto (Livewire, ids con punto escapados en CSS) ──
    await page.locator('#data\\.numero_identificacion').fill(cliente.documento);
    await page.locator('#data\\.nombres').fill(cliente.nombresCompletos);

    // Combobox "Entidad / Producto" (Choices.js): el <select> real está oculto; se elige por la lista.
    if (cliente.entidadProducto) {
      await seleccionarEntidadProducto(page, cliente.entidadProducto);
    }

    if (cliente.correo) {
      await page.locator('#data\\.correo').fill(cliente.correo);
    }
    // Celular SMS (obligatorio).
    await page.locator('#data\\.celular').fill(cliente.celular);

    // MODO PRUEBA: si llegamos hasta aquí, login + todos los selectores funcionaron.
    // NO se envía el formulario → no se crea ningún cliente real en Legasov.
    if (cliente.dryRun) {
      return { ok: true, dryRun: true, mensaje: 'Prueba OK: login y todos los campos se llenaron. NO se envió el formulario (no se creó cliente).' };
    }

    // Enviar. "Crear" EXACTO para no chocar con "Crear y crear otro".
    await page.getByRole('button', { name: 'Crear', exact: true }).click();

    // ── Detección de resultado ──
    const resultado = await esperarResultado(page);
    return resultado;
  } catch (err) {
    await capturarPantalla(page, cliente).catch(() => {});
    return { ok: false, mensaje: 'Fallo automatizando LegasovApp: ' + (err?.message || String(err)) };
  } finally {
    // Cerrar el contexto (limpia cookies/sesión) y desconectar de Browserless (recicla el Chrome).
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

/**
 * Selecciona la opción en el combobox "Entidad / Producto" (Choices.js).
 * El <select id="data.entidad_id"> real está oculto; se abre el buscador, se teclea y se elige el
 * <li role="option"> que coincide. (Hoy "La Hipotecaria" = data-value="200", única opción.)
 */
async function seleccionarEntidadProducto(page, valor) {
  const buscador = page.getByPlaceholder('Teclee para buscar...');
  await buscador.click();
  await buscador.fill(valor).catch(() => {}); // filtra la lista; si no acepta fill, igual queda abierta
  const opcion = page.getByRole('option', { name: valor, exact: false }).first();
  await opcion.waitFor({ state: 'visible', timeout: 8000 });
  await opcion.click();
}

/**
 * Tras enviar: distingue éxito (toast Filament / redirect al index) de error de validación.
 * Nota: clases estándar de Filament (best-effort); se afinan en la primera prueba real si difieren.
 */
async function esperarResultado(page) {
  const exito = page.locator('.fi-no-notification, [role="status"], .fi-notification').filter({ hasText: /creado|guardado|éxito|success|correctamente/i });
  const indexUrl = /\/admin\/codigos(\/?$|\?)/;

  try {
    await Promise.race([
      exito.first().waitFor({ state: 'visible', timeout: 12000 }),
      page.waitForURL(indexUrl, { timeout: 12000 }),
    ]);
  } catch {
    // Ni éxito ni redirect → buscar errores de validación de Filament.
    const errores = await page
      .locator('.fi-fo-field-wrp-error-message, [data-validation-error], .text-danger-600, .fi-fo-field-wrp .fi-error')
      .allTextContents()
      .catch(() => []);
    const msg = errores.map((s) => s.trim()).filter(Boolean).join(' · ');
    return { ok: false, mensaje: msg || 'LegasovApp no confirmó la creación (sin toast de éxito ni error visible).' };
  }

  // Intento best-effort de capturar el ID/código creado (si Filament lo muestra en la URL o la tabla).
  let codigoId;
  const m = page.url().match(/\/codigos\/(\d+)/);
  if (m) codigoId = m[1];

  return { ok: true, codigoId, mensaje: 'Codigo creado en LegasovApp.' };
}

/** Guarda un screenshot en fallo para diagnóstico (visible en logs/volumen de EasyPanel). */
async function capturarPantalla(page, cliente) {
  const stamp = String(cliente?.documento || 'sin-doc').replace(/[^\w]/g, '');
  const path = `/tmp/legasov-error-${stamp}.png`;
  await page.screenshot({ path, fullPage: true });
  console.warn('[legasov-robot] screenshot de error guardado en', path);
}

module.exports = { crearCodigo, debugLogin };

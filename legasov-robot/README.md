# legasov-robot

Robot server-side que crea el **Codigo (cliente)** en LegasovApp cuando Skala radica un crédito de La Hipotecaria. Es un puro "llena-formularios": recibe los datos por HTTP y maneja el panel Filament con un navegador real (Playwright).

## Por qué existe
El panel de LegasovApp es **Filament/Livewire** (estado reactivo con checksums en el servidor). No se puede manejar con `fetch`/HTTP simple; necesita un **navegador de verdad**. Este robot no trae navegador: es liviano (`playwright-core`) y se conecta a un **Chrome gestionado por Browserless** (servicio aparte, desde la plantilla de EasyPanel).

## Flujo
```
Skala (radica La Hipotecaria) → Edge Function legasov-dispatch (Supabase)
   → POST /codigos  (este robot, con X-Robot-Secret)
   → robot conecta por WS a Browserless (Chrome remoto) → LegasovApp
   ← { ok, codigoId?, mensaje }
```
La Edge Function lee el crédito y le pasa los datos ya listos; **este robot NO toca Supabase** (solo tiene las credenciales de Legasov + el secreto + el endpoint de Browserless).

## Endpoints
- `GET /health` → `{ ok: true }`
- `POST /codigos` (header `X-Robot-Secret: <ROBOT_SECRET>`)
  ```json
  { "documento": "80000000", "nombresCompletos": "NOMBRE APELLIDO",
    "entidadProducto": "La Hipotecaria", "correo": "correo@ejemplo.com", "celular": "3000000000", "creditId": "uuid" }
  ```
  Respuesta: `{ "ok": true, "codigoId": "123", "mensaje": "Codigo creado en LegasovApp." }`

## Variables de entorno (poner en EasyPanel, NUNCA en el repo)
Ver `.env.example`: `LEGASOV_NUMERO_DOCUMENTO` (el login es por documento, no email), `LEGASOV_PASSWORD`, `BROWSER_WS_ENDPOINT`, `BROWSER_PROTOCOL`, `ROBOT_SECRET`, `PORT`, `LEGASOV_BASE`.
`ROBOT_SECRET` debe ser el MISMO valor que la Edge Function `legasov-dispatch` manda en `X-Robot-Secret`.

## Deploy en EasyPanel
1. **Browserless** desde la plantilla de EasyPanel (Chrome gestionado). Anota su URL interna + token → ese es `BROWSER_WS_ENDPOINT` (ej. `ws://browserless:3000?token=XXX`). Si tu Browserless expone el endpoint Playwright, pon `BROWSER_PROTOCOL=playwright`.
2. Este robot: nuevo servicio → **App** (Docker) apuntando a esta carpeta. Build con el `Dockerfile` (imagen liviana `node:20-slim`, sin navegador).
3. Cargar las variables de entorno (incluido `BROWSER_WS_ENDPOINT`).
4. Exponer el puerto `3000` con dominio HTTPS (ej. `https://legasov-robot.tu-easypanel...`) — o mantenerlo interno y que solo la Edge Function lo alcance.
5. Verificar: `curl https://<dominio>/health` → `{"ok":true}`.

## Ojo con el timeout de Browserless
Browserless corta cada sesión a los ~30s por defecto. Un login + formulario Filament puede acercarse a eso.
Sube el límite: variable `TIMEOUT=90000` en el servicio de Browserless, **o** agrega `&timeout=90000` al
`BROWSER_WS_ENDPOINT`. La Edge Function ya espera hasta 90s.

## Selectores (confirmados contra el HTML real)
- Login: `#data.numero_documento` + `#data.password` → botón "Entrar" → redirige a `/admin`.
- Crear: `#data.numero_identificacion`, `#data.nombres`, `#data.correo`, `#data.celular`.
- Entidad/Producto: combobox **Choices.js** (buscador `placeholder="Teclee para buscar..."` → opción `li[role=option]`; "La Hipotecaria" = `data-value="200"`).
- Guardar: botón "Crear" (exacto, para no chocar con "Crear y crear otro").

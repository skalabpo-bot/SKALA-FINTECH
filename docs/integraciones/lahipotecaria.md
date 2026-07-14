# Integración La Hipotecaria (crédito de libranza)

Skala muestra al cliente **su propia UI** (sin marca de La Hipotecaria) y por detrás conduce el
formulario de La Hipotecaria mediante la Edge Function `supabase/functions/lahipotecaria`.

## Arquitectura
```
Cliente ── UI Skala (PreaprobacionPanel) ──► Edge Function `lahipotecaria` ──► app.lahipotecaria.com
```
El front nunca habla directo con La Hipotecaria (evita CORS y no expone su flujo). El robot mantiene
cookies + `_token` (CSRF) + JWT + `_section` entre pasos.

## Reversing del formulario (Fase 0, jul 2026)

Base: `https://app.lahipotecaria.com/surveys/credito-de-libranza` (Laravel + Vite, **sin captcha**).

### Paso 1 — GET la página
Devuelve, en el HTML: `_token` (CSRF, = meta `csrf-token`), `_section`, `_form`, el `uuid` del survey
(en el `action` de la calculadora) y un **JWT por sesión** (en el `action` del paso `next`). Cookies de
sesión: `AWSALB`, `AWSALBCORS`, `XSRF-TOKEN`, `la_hipotecaria_session`.

### Paso 2 — Calculadora (GET, **sin PII, sin OTP**) ✅ verificado
```
GET /libranza/calcular/surveys/{uuid}?ingresos=&gastos=&pagaduria=&plazo=
```
Responde **JSON**:
```json
{ "status": 200, "messageType": "alert",
  "message": "RESULTADO DE LA CONSULTA · Monto a otorgar: <b>46.718.827</b> · Cuota: <b>1.052.915</b> · Salud: <b>300.000</b> · Tasa: <b>19</b>% · Plazo: <b>72</b> · Gastos: <b>500.000</b>" }
```
**Este paso ya da la preaprobación completa** (monto, cuota, salud, tasa, plazo) sin registrar a nadie.

Pagadurías (value del `<select>`): `1`=Colpensiones, `3`=Fiduprevisora, `4`=FONCEP, `5`=FOPEP, `6`=CASUR.
Plazo: rango 6–120, paso 6.

### Paso 3 — Datos personales = decisión de VIABILIDAD (POST). ✅ verificado
```
POST /surveys/next/{uuid}/{jwt}
_token, _method=PUT, _form, _section,
q_nombres, q_apellidos, q_tipo_de_documento, q_numero_documento,
q_correo_electronico, q_numero_de_celular, q_vendedor
```
`q_tipo_de_documento`: `CÉDULA DE CIUDADANIA` | `CÉDULA DE EXTRANJERÍA`.
`q_vendedor`: opciones en vivo `JHON CASTELLANOS` | `ONIX BPO` | **`SKALA`**. El robot manda **siempre `SKALA`** por defecto (`body.vendedor || 'SKALA'`), así toda radicación de Skala queda atribuida a ese vendedor.

Respuesta según la CÉDULA real (LH verifica el perfil de la persona; documentos ficticios dan `CNPV01`):
- **No viable** → HTTP 201 `{error:true, code:"CNPV01", message:"...no es viable..."}`.
- **Duplicado** → `{error:true, code:"RGDUPL", message:"Ya tienes un registro activo"}`.
- **VIABLE** → HTTP 200 `{status:200, load:[{"#section_question_body":"<HTML de la sección OTP>"}]}`
  y **se envía un OTP al CORREO** del cliente. La sección OTP trae su propio `_token`/`_section`/`_form`,
  un nuevo `action` (`/surveys/next/{uuid}/{jwt_otp}`, s_key:7) y el campo **`q_codigo_otp`**.

### Paso 4 — Validación del OTP (POST). ✅ verificado
```
POST {action de la sección OTP}
_token, _method=PUT, _form, _section, q_codigo_otp=<código del correo>
```
- Código correcto → avanza (acepta tratamiento de datos y continúa).
- Código incorrecto → `{error:true, code:"COTP01", message:"El código introducido no coincide con el generado..."}`.

Cada POST del paso 3 crea un lead real en su sistema (y envía un OTP real al correo si es viable).

## Edge Function `lahipotecaria` (acciones)
- `calcular`  `{ ingresos, gastos, pagaduria, plazo }` → `{ aprobado, monto, cuota, salud, tasa, plazo, mensaje }`  ✅
- `registrar` `{ nombres, apellidos, tipoDoc?, documento, correo, celular, vendedor?, ingresos, gastos, pagaduria, plazo }` → `{ sessionId, estado:'otp_enviado', mensaje }`
- `verify-otp` `{ sessionId, codigo }` → `{ ok, mensaje }`

Sesión transitoria en tabla `lahipotecaria_sessions` (RLS deny-all; solo service role). Se despliega con
`verify_jwt=true` (solo usuarios Skala logueados). Deploy:
`supabase functions deploy lahipotecaria --project-ref yfosumpmtmcomfpbspaz`.

## Front
- Entidad con `preaprobacionExterna=true` (+ `preaprobacionUrl` referencia) → en el simulador aparece
  `PreaprobacionPanel` (consulta → formaliza con OTP → valores a radicar). Fallback manual siempre disponible.
- Radica con `MockService.createCredit`; comisión **por tasa** (tabla `allied_entities.rates` de la entidad).
  Guarda en `client_data`: `preaprobacionEstado`, `preaprobacionNumero`, `preaprobacionMontoAprobado/TasaAprobada/PlazoAprobado`.

## Setup para producción
1. Migración `20260708_lahipotecaria.sql` (columnas `preaprobacion_externa`/`preaprobacion_url` + tabla `lahipotecaria_sessions`). ✅ aplicada.
2. Crear entidad "La Hipotecaria" en Admin: pagadurías (Colpensiones/Fiduprevisora/FONCEP/FOPEP/CASUR),
   tipo de crédito libranza, `isActive`, `preaprobacionExterna=true`.
3. **Sembrar `allied_entities.rates`** de La Hipotecaria (pares tasa→comisión) o la comisión sale 0.

## Petición formal a La Hipotecaria (para una integración ESTABLE)
La automatización actual es funcional pero **frágil** (se rompe si cambian tokens/pasos/campos) y automatizar
su intake puede ir contra sus términos. Solicitar **una** de estas opciones oficiales:
1. **API**: endpoint para (a) consultar preaprobación, (b) registrar lead + disparar OTP, (c) validar OTP y
   devolver resultado. Con eso el robot se reemplaza por llamadas oficiales sin cambiar la UI del front.
2. **Embed sin marca**: una versión "chrome-less" de su formulario + `Content-Security-Policy: frame-ancestors https://app.skalapp.co`
   para embeberlo dentro de Skala, + webhook/redirect con el resultado.
3. **Código de vendedor** de Skala para `q_vendedor` (identifica el origen del lead).

  # Manual de Integración — API de Skala Fintech

  **Versión:** 1.2 · **Última actualización:** 2026-07-15

  Guía completa para que una plataforma externa se integre con Skala: **radicar créditos**, **consultar** su estado y datos, **cambiar de estado**, gestionar **devoluciones con tareas**, agregar **comentarios**, y **recibir eventos** (webhooks salientes).

  ---

  ## Índice
  1. [Introducción](#1-introducción)
  2. [Conceptos clave](#2-conceptos-clave)
  3. [Primeros pasos](#3-primeros-pasos)
  4. [Autenticación y scopes](#4-autenticación-y-scopes)
  5. [Convenciones](#5-convenciones)
  6. [Endpoints](#6-endpoints)
    - 6.1 [Radicar crédito](#61-radicar-crédito--post-credits)
    - 6.2 [Consultar crédito](#62-consultar-crédito--get-creditssolicitud)
    - 6.2b [Listar tus créditos](#62b-listar-tus-créditos--get-credits)
    - 6.3 [Cambiar estado](#63-cambiar-estado--patch-creditssolicitudstatus)
    - 6.4 [Devolver crédito con tareas](#64-devolver-crédito-con-tareas)
    - 6.5 [Agregar comentario](#65-agregar-comentario--post-creditssolicitudcomments)
    - 6.6 [Listar comentarios](#66-listar-comentarios--get-creditssolicitudcomments)
  7. [Ciclo de vida del crédito](#7-ciclo-de-vida-del-crédito)
  8. [Webhooks (Skala → tu plataforma)](#8-webhooks-skala--tu-plataforma)
  9. [Manejo de errores](#9-manejo-de-errores)
  10. [Buenas prácticas](#10-buenas-prácticas)
  11. [Catálogos de referencia](#11-catálogos-de-referencia)
  12. [Preguntas frecuentes](#12-preguntas-frecuentes)

  ---

  ## 1. Introducción

  Skala es una plataforma de gestión de crédito de libranza. Su API permite que **plataformas de terceros** (originadores, aliados, marketplaces) operen contra Skala de forma programática:

  - **Entrada (tu plataforma → Skala):** crear créditos, consultarlos, cambiar su estado, devolverlos con tareas de subsanación y comentar.
  - **Salida (Skala → tu plataforma):** recibir notificaciones de eventos (webhooks) cuando algo cambia.

  La API es **REST sobre HTTPS**, con **JSON** en request y response, y autenticación por **API key**.

  ---

  ## 2. Conceptos clave

  | Concepto | Descripción |
  |---|---|
  | **Crédito** | Solicitud de libranza. Tiene un `solicitud_number` (entero único) que es su identificador de negocio; tu plataforma lo recibe al radicar. |
  | **Estado** | Etapa del crédito en el flujo (ej. *RADICADO / PTE VALIDACIÓN*, *EN ESTUDIO - ANALISTA*, *DESEMBOLSADO*). Ver [catálogo](#estados). |
  | **Radicación** | Creación de un crédito. Nace en el **estado inicial** del flujo. |
  | **Devolución** | Cambio a un estado que **habilita tareas** (`enable_tasks`), usado para pedirle al originador que **subsane** (corrija/adjunte) algo. Lleva una lista de **tareas**. |
  | **Comentario** | Nota en el hilo del crédito. Puede ser de un usuario/plataforma o **de sistema** (generada automáticamente). |
  | **Gestor** | Asesor de Skala dueño del crédito. Opcional al radicar por API. |
  | **Entidad** | Entidad aliada que financia (ej. *CREDIALIANZA*). Ver [catálogo](#entidades-aliadas). |
  | **Pagaduría** | Entidad que paga la nómina/pensión del cliente y de donde se descuenta la cuota. |
  | **Línea de crédito** | Producto (ej. *LIBRE INVERSION*, *COMPRA DE CARTERA*). |

  ---

  ## 3. Primeros pasos

  - **Base URL:**
    ```
    https://yfosumpmtmcomfpbspaz.supabase.co/functions/v1/api
    ```
  - **Formato:** JSON (`Content-Type: application/json`).
  - **Zona horaria:** las fechas se devuelven en **ISO 8601 (UTC)**.
  - **Obtener tu API key:** Skala te emite una llave **asignada a tu entidad** (crear/consultar/actualizar solo créditos de esa entidad). La llave se muestra **una sola vez**; guárdala del lado servidor (ver [seguridad](#seguridad-de-la-llave)).

  Prueba de conectividad (debe responder `401` si no envías llave, lo cual confirma que el endpoint está vivo):
  ```bash
  curl -i 'https://yfosumpmtmcomfpbspaz.supabase.co/functions/v1/api/credits/1'
  ```

  ---

  ## 4. Autenticación y scopes

  Toda petición requiere el header **`x-api-key`**:
  ```
  x-api-key: sk_skala_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  ```

  Cada llave tiene **scopes** que limitan lo que puede hacer:

  | Scope | Permite |
  |---|---|
  | `credits:create` | Radicar créditos (`POST /credits`) |
  | `credits:read` | Consultar créditos y comentarios (`GET ...`) |
  | `credits:update` | Cambiar estado, devolver y comentar (`PATCH`, `POST .../comments`) |

  - Llave ausente o inválida → **`401`**.
  - Llave sin el scope requerido → **`403`**.

  ### Seguridad de la llave
  - En el servidor de Skala **solo se guarda el hash SHA-256** de tu llave (nunca en texto plano). Si la pierdes, **no es recuperable**: se re-emite.
  - Las llaves pueden tener **fecha de expiración**; una llave vencida responde `401`.
  - La llave es **secreta**: úsala **solo del lado servidor** (nunca en el frontend, app móvil, repositorios públicos ni logs). Cualquiera que la tenga puede operar con tus permisos.
  - **Alcance:** tu llave está **asignada a tu entidad** y opera únicamente sobre **los créditos de esa entidad**, con los **scopes mínimos** que necesites (no pidas `credits:update` si solo consultas).
  - Guárdala en un **gestor de secretos / variable de entorno**, no en el código.
  - Para **rotar**: Skala emite una nueva y revoca la anterior. Solicítalo con anticipación para solapar. Reporta de inmediato cualquier sospecha de filtración para revocarla.

  ---

  ## 5. Convenciones

  - **Identificador del crédito:** el `solicitud_number` (entero). También puedes ubicar por `?cedula=`.
  - **Montos:** enteros en pesos colombianos (COP), sin separadores. Ej. `5000000`.
  - **Tasa:** número (porcentaje mensual según la entidad). Ej. `1.85`.
  - **Idempotencia:** en `POST /credits`, envía el header `Idempotency-Key` (UUID único por intento). Si reintentas con la misma llave, la API **devuelve el crédito ya creado** en vez de duplicarlo.
  - **Tamaño del body:** máximo **64 KB**.
  - **request_id:** toda respuesta de error incluye un `request_id` para soporte.
  - **Saneo:** en la creación, los campos del cliente pasan por una **lista blanca**; las claves no reconocidas se descartan.
  - **Aislamiento por entidad:** tu llave está asignada a **una entidad/alianza**. Solo ves y modificas créditos de **tu entidad** — los crees tú por la API **o** los cree Skala internamente (misma entidad = "el mismo crédito vive en las dos plataformas"). Créditos de otra entidad responden **`404`**; crear para otra entidad responde **`403`**.
  - **`external_ref` (enlace de IDs):** al radicar puedes enviar tu propio identificador en `external_ref`. Skala lo guarda y te lo devuelve junto con su `solicitud_number`, para que ambas plataformas sepan que es "el mismo crédito". Reenviar el mismo `external_ref` **no duplica** (devuelve el existente). Puedes consultar por él: `GET /credits?external_ref=TU_ID`.

  ---

  ## 6. Endpoints

  ### 6.1 Radicar crédito — `POST /credits`
  Scope: `credits:create`.

  **Campos del body:**

  | Campo | Tipo | Obligatorio | Notas |
  |---|---|---|---|
  | `entidad` | string | ✅ | Nombre de la entidad aliada. Ver [catálogo](#entidades-aliadas). |
  | `monto` | number | ✅ | 1 – 2.000.000.000. |
  | `plazo` | number | ✅ | Meses, 1 – 240. |
  | `tasa` | number | ✅ | 0 – 100. |
  | `cliente` | object | ✅ | Requiere al menos `numeroDocumento` **o** `nombres`. |
  | `montoDesembolso` | number | ➖ | Default = `monto`. |
  | `comisionPct` | number | ➖ | 0 – 100. Si se omite, la comisión estimada queda en **0** (envíala si quieres fijarla). |
  | `lineaCredito` | string | ➖ | Ver [catálogo](#líneas-de-crédito). |
  | `external_ref` | string | ➖ | Tu propio ID del crédito (enlace + dedup). Ver [Convenciones](#5-convenciones). |
  | `gestorId` | uuid | ➖ | Si se envía, debe ser un gestor existente; si se omite, queda sin asignar. |

  **Objeto `cliente` (campos aceptados):** `nombres`, `apellidos`, `nombreCompleto`, `tipoDocumento`, `numeroDocumento` (5–15 dígitos), `correo` (formato válido), `telefonoCelular`, `pagaduria`, `banco`, `tipoCuenta`, `numeroCuenta`, `ciudadResidencia`, `direccionCompleta`, `barrio`, `estadoCivil`, `sexo`, `fechaNacimiento`, `ciudadNacimiento`, `ciudadExpedicion`, `fechaExpedicion`, `tipoPension`, `mesadaPensional`, `cuotaUtilizar`, `observaciones`. *(Cualquier otra clave se ignora.)*

  **Ejemplo (curl):**
  ```bash
  curl -X POST 'https://yfosumpmtmcomfpbspaz.supabase.co/functions/v1/api/credits' \
    -H 'x-api-key: TU_API_KEY' \
    -H 'Content-Type: application/json' \
    -H 'Idempotency-Key: 7c1f9a2e-4b3d-4a1e-9f0c-2b6a1d8e5f3a' \
    -d '{
      "entidad": "CREDIALIANZA",
      "monto": 5000000,
      "plazo": 60,
      "tasa": 1.85,
      "montoDesembolso": 4800000,
      "comisionPct": 2,
      "lineaCredito": "LIBRE INVERSION",
      "cliente": {
        "nombres": "JUAN CARLOS", "apellidos": "PEREZ GOMEZ",
        "numeroDocumento": "1020304050", "correo": "juan@correo.com",
        "telefonoCelular": "3001234567", "pagaduria": "Colpensiones"
      }
    }'
  ```

  **Ejemplo (Node.js):**
  ```js
  const res = await fetch('https://yfosumpmtmcomfpbspaz.supabase.co/functions/v1/api/credits', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.SKALA_API_KEY,
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify({
      entidad: 'CREDIALIANZA', monto: 5000000, plazo: 60, tasa: 1.85,
      cliente: { numeroDocumento: '1020304050', nombres: 'JUAN', apellidos: 'PEREZ', pagaduria: 'Colpensiones' },
    }),
  });
  const credito = await res.json(); // { id, solicitud_number, estado }
  ```

  **Ejemplo (Python):**
  ```python
  import requests, uuid
  r = requests.post(
      'https://yfosumpmtmcomfpbspaz.supabase.co/functions/v1/api/credits',
      headers={'x-api-key': API_KEY, 'Idempotency-Key': str(uuid.uuid4())},
      json={'entidad': 'CREDIALIANZA', 'monto': 5000000, 'plazo': 60, 'tasa': 1.85,
            'cliente': {'numeroDocumento': '1020304050', 'nombres': 'JUAN', 'pagaduria': 'Colpensiones'}})
  print(r.json())  # {'id': ..., 'solicitud_number': 1420, 'estado': 'RADICADO / PTE VALIDACIÓN'}
  ```

  **Respuesta `201`:**
  ```json
  { "id": "uuid", "solicitud_number": 1420, "external_ref": "TU-ID-123 (o null si no lo enviaste)", "estado": "RADICADO / PTE VALIDACIÓN" }
  ```
  > **Nota:** si el crédito ya existía (mismo `Idempotency-Key` o mismo `external_ref`), la respuesta es **`200`** (no `201`) con el crédito ya creado — no se duplica.

  > **Regla anti-duplicado (por pagaduría) → `409`:** no puedes radicar si ya existe un crédito **en trámite** (estado no final) para la **misma cédula o el mismo correo** en la **misma pagaduría**. Puedes radicar otro **solo si es con una pagaduría diferente**, o si el anterior ya llegó a un estado final (DESEMBOLSADO / NEGADO / DESISTIDO). Respuesta: `409 { "error": "Ya existe un crédito en trámite para este cliente en la pagaduría \"…\" (estado: …). Solo puedes radicar otro si es con una pagaduría diferente.", "request_id": "…" }`.
  > *(Es la misma regla de capacidad que aplica Skala internamente; evita duplicar al cliente en la misma pagaduría.)*

  ---

  ### 6.2 Consultar crédito — `GET /credits/:solicitud`
  Scope: `credits:read`. Alternativas: `GET /credits?solicitud=1420` o `GET /credits?cedula=1020304050` (por cédula devuelve el más reciente **de tu entidad**). Solo se consultan créditos de tu entidad; cualquier otro responde `404`.

  **Respuesta `200`:**
  ```json
  {
    "id": "uuid",
    "solicitud_number": 1420,
    "estado": "EN ESTUDIO - ANALISTA",
    "monto": 5000000,
    "monto_desembolso": 4800000,
    "plazo": 60,
    "tasa": 1.85,
    "entidad": "CREDIALIANZA",
    "comision_estimada": 100000,
    "linea_credito": "LIBRE INVERSION",
    "cliente": { "nombre": "JUAN PEREZ", "documento": "1020304050", "correo": "juan@correo.com", "celular": "3001234567", "pagaduria": "Colpensiones" },
    "created_at": "2026-07-06T15:00:00Z",
    "updated_at": "2026-07-06T16:10:00Z"
  }
  ```

  ---

  ### 6.2b Listar tus créditos — `GET /credits`
  Scope: `credits:read`. Sin `:solicitud` ni `?cedula=`, devuelve **la lista de créditos de tu entidad** (los más recientes primero). Solo los de tu entidad — nunca los de otras.

  **Parámetros (query):**
  | Parámetro | Default | Notas |
  |---|---|---|
  | `limit` | 20 | Máximo 100 por página. |
  | `offset` | 0 | Para paginar. |
  | `estado` | — | Filtra por nombre exacto de estado (opcional). |

  **Ejemplo:** `GET /credits?limit=50&offset=0&estado=DESEMBOLSADO`

  **Respuesta `200`:**
  ```json
  {
    "items": [ { "solicitud_number": 1420, "estado": "EN ESTUDIO - ANALISTA", "monto": 5000000, "entidad": "CREDIALIANZA", "cliente": { "nombre": "JUAN PEREZ", "documento": "1020304050" }, "created_at": "..." } ],
    "limit": 50, "offset": 0, "count": 1
  }
  ```
  Pagina hasta que `count < limit`.

  ---

  ### 6.3 Cambiar estado — `PATCH /credits/:solicitud/status`
  Scope: `credits:update`.

  **Body:**
  ```json
  { "estado": "DESEMBOLSADO", "motivo": "Desembolso confirmado" }
  ```

  - `estado`: acepta el **nombre completo** del estado (ignora mayúsculas/acentos) o su `id`. Un nombre **parcial** se acepta **solo si coincide con un único** estado; si es ambiguo → `400` con `coincidencias`; si no se reconoce → `400` con `estados_validos`.
  - `motivo`: opcional pero recomendado (queda en el historial y en un comentario de sistema).
  - Si el estado es **DESEMBOLSADO**, se estampa automáticamente la fecha de desembolso.

  Cada cambio de estado registra una entrada en el **historial** y agrega un **comentario de sistema** (`[API] Estado → …`).

  **Respuesta `200`:**
  ```json
  { "solicitud_number": 1420, "estado": "DESEMBOLSADO" }
  ```

  **curl:**
  ```bash
  curl -X PATCH 'https://yfosumpmtmcomfpbspaz.supabase.co/functions/v1/api/credits/1420/status' \
    -H 'x-api-key: TU_API_KEY' -H 'Content-Type: application/json' \
    -d '{"estado":"DESEMBOLSADO","motivo":"Confirmado"}'
  ```

  ---

  ### 6.4 Devolver crédito con tareas
  Mismo endpoint `PATCH /credits/:solicitud/status`, usando un **estado de devolución** (que habilita tareas) y el arreglo `tareas`.

  **Estados de devolución** (habilitan tareas): `DEVUELTO`, `APLAZADO EN ESTUDIO`, `APROBADO PEND CERTIFICADOS`.

  **Body:**
  ```json
  {
    "estado": "DEVUELTO",
    "motivo": "Faltan documentos del cliente",
    "tareas": [
      { "titulo": "Corregir la cédula (foto legible)", "requiereAdjunto": true },
      { "titulo": "Adjuntar desprendible actualizado", "requiereAdjunto": true },
      { "titulo": "Verificar la pagaduría" }
    ]
  }
  ```
  - Cada tarea puede ser un **objeto** `{ "titulo": string, "requiereAdjunto": boolean }` o simplemente un **string** (título, sin adjunto obligatorio).
  - Las tareas quedan como pendientes de **subsanación** en el crédito; el gestor de Skala las verá y completará.
  - Se registra en historial (`DEVOLUCIÓN CON TAREAS (API)`) y en un comentario de sistema con el detalle.

  **Respuesta `200`:**
  ```json
  { "solicitud_number": 1420, "estado": "DEVUELTO", "tareas": 3 }
  ```

  **curl:**
  ```bash
  curl -X PATCH 'https://yfosumpmtmcomfpbspaz.supabase.co/functions/v1/api/credits/1420/status' \
    -H 'x-api-key: TU_API_KEY' -H 'Content-Type: application/json' \
    -d '{"estado":"DEVUELTO","motivo":"Faltan docs","tareas":[{"titulo":"Corregir cédula","requiereAdjunto":true},"Verificar pagaduría"]}'
  ```

  ---

  ### 6.5 Agregar comentario — `POST /credits/:solicitud/comments`
  Scope: `credits:update`.

  **Body:**
  ```json
  { "texto": "El cliente confirmó los datos de la cuenta bancaria.", "adjuntoUrl": "https://...", "adjuntoNombre": "soporte.pdf" }
  ```
  - `texto`: obligatorio (máx 5000 caracteres).
  - `adjuntoUrl` / `adjuntoNombre`: opcionales (URL pública de un soporte).

  **Respuesta `201`:**
  ```json
  { "id": "uuid", "solicitud_number": 1420, "created_at": "2026-07-08T19:02:41Z" }
  ```

  **curl:**
  ```bash
  curl -X POST 'https://yfosumpmtmcomfpbspaz.supabase.co/functions/v1/api/credits/1420/comments' \
    -H 'x-api-key: TU_API_KEY' -H 'Content-Type: application/json' \
    -d '{"texto":"Cliente confirmó cuenta bancaria."}'
  ```

  ---

  ### 6.6 Listar comentarios — `GET /credits/:solicitud/comments`
  Scope: `credits:read`.

  **Respuesta `200`:**
  ```json
  {
    "solicitud_number": 1420,
    "comentarios": [
      { "texto": "Cliente confirmó cuenta bancaria.", "sistema": false, "adjunto": null, "adjunto_url": null, "fecha": "2026-07-08T19:02:41Z" },
      { "texto": "[API] Estado → DEVUELTO. Motivo: Faltan docs. Tareas: Corregir cédula (adjunto); Verificar pagaduría", "sistema": true, "adjunto": null, "adjunto_url": null, "fecha": "2026-07-08T19:04:36Z" }
    ]
  }
  ```
  Los comentarios vienen ordenados del más antiguo al más reciente. `sistema: true` = generado automáticamente por Skala.

  ---

  ## 7. Ciclo de vida del crédito

  Flujo típico (los estados exactos y su orden los define Skala; ver [catálogo](#estados)):

  ```
  RADICADO / PTE VALIDACIÓN
        │
        ▼
  OK VALIDACION A PREANALISIS ──► PREANALISIS ──► EN ESTUDIO - ANALISTA
        │                                               │
        │                        ┌──────────────────────┼───────────────┐
        ▼                        ▼                       ▼               ▼
    DEVUELTO*             APROBADO - PTE FIRMA        NEGADO(f)     APLAZADO EN ESTUDIO*
    (subsanar)                  │
        │                        ▼
        └──► SUBSANADO     PTE FIRMA ELECTRÓNICA ──► EN PROCESO PAGADURIA ──► DESEMBOLSADO(f)
  ```
  - `(f)` = **estado final** (NEGADO, DESEMBOLSADO, DESISTIDO): el crédito no avanza más.
  - `*` = **estado de devolución** (habilita tareas de subsanación).

  No hay validación de transiciones vía API: puedes mover el crédito a cualquier estado. Respeta el flujo de negocio de Skala.

  ---

  ## 8. Vía de vuelta (Skala → tu plataforma)

  Para enterarte cuando un crédito **tuyo** cambia de estado (p. ej. un analista de Skala lo aprueba o lo devuelve) hay **dos opciones**. Elige una:

  ### Opción A — Polling (recomendada si no tienes servidor de webhooks)
  Consulta el estado periódicamente con la API. No necesitas exponer ninguna URL:
  - **Sincroniza tu cartera:** `GET /credits?limit=100&offset=0` cada X minutos y compara el `estado` de cada uno con el que tenías.
  - **O consulta puntual:** `GET /credits/1420` cuando necesites el estado de uno.
  - Cadencia sugerida: cada 5–15 min (o bajo demanda). Es simple, sin infraestructura extra.

  ### Opción B — Webhooks firmados (push, si tienes un endpoint HTTPS)
  Si prefieres recibir avisos en tiempo real, Skala envía un `POST` JSON **firmado** a la URL que registres. Solo recibes eventos de **tus** créditos.

  ### Registro
  Pásale a Skala tu **URL de webhook** (HTTPS). Skala la asocia a tu llave junto con un **secreto de firma** (`webhook_secret`) que te entregamos una vez. Con ese secreto verificas que el webhook vino de Skala.

  ### Formato del evento (`credit_status_change`)
  ```json
  {
    "event": "credit_status_change",
    "timestamp": "2026-07-14T17:24:48.435Z",
    "solicitud_number": 1420,
    "estado_anterior": "RADICADO / PTE VALIDACIÓN",
    "estado_nuevo": "EN ESTUDIO - ANALISTA",
    "credito": { "monto": 5000000, "monto_desembolso": 4800000, "plazo": 60, "tasa": 1.85, "entidad": "CREDIALIANZA", "comision_estimada": 100000, "linea_credito": "LIBRE INVERSION" },
    "cliente": { "nombre": "JUAN PEREZ", "documento": "1020304050", "correo": "juan@correo.com", "celular": "3001234567", "pagaduria": "Colpensiones" }
  }
  ```
  Headers: `X-Skala-Event: credit_status_change` y `X-Skala-Signature: sha256=<hmac>`.

  ### Verificar la firma (obligatorio)
  La firma es un **HMAC-SHA256** del **cuerpo crudo** (los bytes exactos que recibes) con tu `webhook_secret`. Compárala en tiempo constante:

  ```js
  // Node.js (Express con el body crudo)
  import crypto from 'crypto';
  function verificar(rawBody, headerFirma, secret) {
    const esperado = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
    const a = Buffer.from(headerFirma || ''); const b = Buffer.from(esperado);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  // if (!verificar(req.rawBody, req.header('X-Skala-Signature'), process.env.SKALA_WEBHOOK_SECRET)) return res.sendStatus(401);
  ```
  ```python
  # Python
  import hmac, hashlib
  def verificar(raw: bytes, header: str, secret: str) -> bool:
      esperado = 'sha256=' + hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
      return hmac.compare_digest(esperado, header or '')
  ```
  ⚠️ Firma sobre el **cuerpo crudo sin re-serializar** (no vuelvas a `JSON.stringify`), o el HMAC no coincidirá.

  ### Respuesta y reintentos
  - Responde **`2xx`** rápido (idealmente < 5 s). Procesa de forma asíncrona.
  - Si respondes distinto de `2xx` o hay timeout, la entrega es **best-effort** (sin reintento automático en v1). Reconcilia con `GET /credits` periódicamente por si perdiste algún evento.
  - **Idempotencia:** un mismo cambio podría llegar más de una vez; identifica por `solicitud_number` + `estado_nuevo` + `timestamp` y trata el manejo como idempotente.
  - Si **tú** cambiaste el estado por la API, igual te llega el webhook (es el mismo evento); puedes ignorar los que correspondan a tu propia acción.

  ### Aislamiento
  Solo recibes webhooks de **tus** créditos (mismo aislamiento que la API). Nunca recibes eventos de otros aliados ni de la cartera interna de Skala.

  ---

  ## 9. Manejo de errores

  | Código | Significado |
  |---|---|
  | `200` / `201` | OK / creado |
  | `400` | Falta un campo, valor fuera de rango, o estado no reconocido/ambiguo |
  | `401` | API key ausente, inválida o vencida |
  | `403` | La API key no tiene el scope requerido |
  | `404` | Crédito o ruta no encontrada (incluye créditos fuera de tu alcance) |
  | `405` | Método no soportado en esa ruta |
  | `409` | **Duplicado:** ya hay un crédito en trámite para esa cédula/correo en la misma pagaduría (ver §6.1) |
  | `413` | Body demasiado grande (máx 64 KB) |
  | `500` | Error interno |

  **Formato de error:**
  ```json
  { "error": "mensaje legible", "request_id": "uuid-para-soporte" }
  ```
  Skala **no expone** detalles internos; usa el `request_id` para reportar a soporte.

  **Casos especiales del `PATCH .../status`:**
  - Estado ambiguo → `{ "error": "...", "coincidencias": ["...", "..."] }`
  - Estado no reconocido → `{ "error": "...", "estados_validos": ["...", "..."] }`

  ---

  ## 10. Buenas prácticas

  - **Idempotencia:** envía siempre `Idempotency-Key` al crear créditos, con un UUID por intento lógico. Evita duplicados en reintentos por timeout/red.
  - **Reintentos:** ante `5x` o timeout, reintenta con backoff exponencial y la **misma** `Idempotency-Key`. Ante `4xx`, corrige la petición (no reintentes igual).
  - **Estados:** usa el **nombre completo** o el `id` del estado para evitar ambigüedad; no uses abreviaturas.
  - **Seguridad:** guarda la llave del lado servidor; una llave por entidad con scopes mínimos; rótala periódicamente.
  - **Consulta antes de actualizar:** verifica el estado actual con `GET` si tu lógica depende de él (no hay bloqueo optimista).

  ---

  ## 11. Catálogos de referencia

  ### Estados
  | Estado | Final | Habilita tareas (devolución) |
  |---|---|---|
  | RADICADO / PTE VALIDACIÓN | | |
  | OK VALIDACION A PREANALISIS | | |
  | PREANALISIS | | |
  | EN ESTUDIO - ANALISTA | | |
  | PREAPROBADO | | |
  | APROBADO - PTE FIRMA | | |
  | APROBADO PEND CERTIFICADOS | | ✅ |
  | PTE FIRMA ELECTRÓNICA | | |
  | EN PROCESO PAGADURIA | | |
  | SUBSANADO | | |
  | DEVUELTO | | ✅ |
  | APLAZADO EN ESTUDIO | | ✅ |
  | NEGADO | ✅ | |
  | DESISTIDO | ✅ | |
  | DESEMBOLSADO | ✅ | |

  *(El nombre exacto es autoritativo — cópialo del `GET` o de esta tabla. Skala puede agregar estados; consulta el error `estados_validos` para la lista viva.)*

  ### Entidades aliadas
  `CREDIALIANZA` · `COLTEFINANCIERA` · `VANTAGE` · `La Hipotecaria`

  ### Líneas de crédito
  `LIBRE INVERSION` · `COMPRA DE CARTERA` · `RETANQUEO` · `COMPRA + SANEAMIENTO` · `LIBRE + SANEAMIENTO`

  ### Pagadurías (texto libre; usa el nombre oficial)
  Ejemplos frecuentes: `Colpensiones`, `CASUR`, `CREMIL`, `Caja de Retiro de las Fuerzas Militares`, `Caja de Sueldos de Retiro de la Policía Nacional`, `Policía Nacional`, `Ejército Nacional`, `Pensionados Mindefensa`, `Fiduprevisora`, `Consorcio FOPEP`, `FONCEP`, `Fondo Nacional de Prestaciones Sociales del Magisterio`, `Seguros de Vida Alfa S.A.`.

  ### Tipos de documento
  `CEDULA` (por defecto) · `CÉDULA DE CIUDADANIA` · `CÉDULA DE EXTRANJERÍA`.

  ---

  ## 12. Preguntas frecuentes

  **¿Puedo crear el crédito sin gestor?** Sí; `gestorId` es opcional. Sin gestor, no se disparan notificaciones a gestor.

  **¿Cómo evito duplicar un crédito si mi request falla por timeout?** Usa `Idempotency-Key`; el reintento con la misma llave devuelve el crédito ya creado.

  **¿Puedo radicar el mismo cliente dos veces?** Sí, pero **no en la misma pagaduría** si el anterior sigue en trámite → responde `409`. Puedes con **otra pagaduría**, o cuando el anterior llegue a estado final. (Además, para el mismo crédito lógico usa `external_ref`/`Idempotency-Key` para no duplicar por reintentos.)

  **¿Cómo devuelvo un crédito para que corrijan algo?** `PATCH .../status` con un estado de devolución (ej. `DEVUELTO`) y el arreglo `tareas`.

  **¿La API valida que la transición de estado sea válida?** No; puedes mover a cualquier estado. Respeta el flujo de negocio.

  **¿Los cambios de estado disparan webhooks?** Sí — cualquier cambio de estado de tus créditos (por la API o por un analista de Skala) te llega como **webhook firmado** a tu URL registrada. Ver §8.

  **¿Cómo listo todos mis créditos?** `GET /credits?limit=50&offset=0` (paginado). Ver §6.2b.

  **¿Cómo obtengo la lista viva de estados?** Envía un `PATCH` con un estado inexistente y usa el arreglo `estados_validos` de la respuesta `400`.

  ---

  ## Changelog
  - **1.2 (2026-07-15):** **regla anti-duplicado por pagaduría** (`409`): no se radica si ya hay un crédito en trámite para la misma cédula/correo en la misma pagaduría.
  - **1.1 (2026-07-10):** aislamiento **por entidad**; endpoint **`GET /credits`** (listar, paginado); campo **`external_ref`** (enlace de IDs + dedup); **webhooks firmados** (HMAC) + opción de **polling**; código `405` documentado.
  - **1.0 (2026-07-08):** versión inicial (crear, consultar, cambiar estado, devolver con tareas, comentar).

  ---

  *Soporte de integración: contacta a tu enlace comercial/técnico en Skala con el `request_id` de cualquier error.*

# Correo para La Hipotecaria (listo para enviar)

> **Antes de enviar:** reemplaza `[TOKEN_AQUI]` por el token de la llave **"Alianza La Hipotecaria"** (prefijo `sk_skala_…`). El token **NO se guarda en este archivo** por seguridad — pídelo/cópialo aparte. **Recomendado:** manda el token por un canal seguro (WhatsApp/llamada), no en el mismo correo.
> Para generar/rotar la llave: **Skala → Administración → API & Integraciones**.

---

**Asunto:** Integración API Skala ↔ La Hipotecaria

Hola [NOMBRE],

Habilitamos la conexión por **API** para integrar nuestras dos plataformas. Con esto, los créditos de **La Hipotecaria** viven en ambos lados: pueden crearse desde su sistema o desde Skala, y los cambios de estado (con tareas/devoluciones) se reflejan **automáticamente** en la otra plataforma.

**Lo que pueden hacer con la API (solo sobre los créditos de La Hipotecaria):**
- **Crear** créditos (radicar).
- **Consultar** y **listar** sus créditos y su estado.
- **Cambiar de estado** y **devolver con tareas** (subsanación).

**Datos de conexión**
- **Base URL:** `https://yfosumpmtmcomfpbspaz.supabase.co/functions/v1/api`
- **Autenticación:** header `x-api-key: [TOKEN_AQUI]` en cada petición.
  *(Guárdenlo del lado servidor; nunca en el navegador ni en repositorios. Si se filtra, avísennos y lo rotamos.)*
- **Alcance:** la llave solo ve y modifica créditos de **La Hipotecaria**. Cualquier otro responde `404`.

**Ejemplo — crear un crédito**
```bash
curl -X POST 'https://yfosumpmtmcomfpbspaz.supabase.co/functions/v1/api/credits' \
  -H 'x-api-key: [TOKEN_AQUI]' -H 'Content-Type: application/json' \
  -d '{
    "entidad": "La Hipotecaria",
    "monto": 5000000, "plazo": 60, "tasa": 1.85,
    "external_ref": "SU_ID_INTERNO_DEL_CREDITO",
    "cliente": { "numeroDocumento": "1020304050", "nombres": "JUAN", "apellidos": "PEREZ", "pagaduria": "Colpensiones" }
  }'
```
La respuesta trae el `solicitud_number` de Skala **y** su `external_ref`. Guarden cualquiera de los dos para enlazar el mismo crédito en ambos sistemas.

> **Regla anti-duplicado:** no se puede radicar dos veces el **mismo cliente en la misma pagaduría** mientras el crédito anterior siga en trámite → responde `409`. Con **otra pagaduría** sí se permite.

**Enterarse de los cambios de estado (que hace un analista de Skala)**
Consulten periódicamente (polling), cada 5–15 min:
```
GET /credits?limit=100        → lista sus créditos con su estado actual
GET /credits/{solicitud}      → uno puntual
GET /credits?external_ref=ID  → buscar por su propio ID
```
*(Si más adelante quieren avisos en tiempo real por webhook, nos dan su URL HTTPS y les damos un secreto de firma. Opcional.)*

**Cambiar el estado / devolver con tareas**
```bash
curl -X PATCH '.../api/credits/{solicitud}/status' \
  -H 'x-api-key: [TOKEN_AQUI]' -H 'Content-Type: application/json' \
  -d '{"estado":"DEVUELTO","motivo":"Faltan documentos","tareas":[{"titulo":"Corregir cédula","requiereAdjunto":true}]}'
```

**Documentación completa** (todos los endpoints, catálogos de estados, ejemplos en Node/Python, manejo de errores): adjunto el manual `MANUAL_INTEGRACION.md`.

Cualquier duda técnica, con gusto agendamos una llamada para dejarlo andando.

Saludos,
[TU NOMBRE] — Skala

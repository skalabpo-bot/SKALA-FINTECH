# Correo para enviar al aliado (plantilla)

> Cómo usarla: genera la llave de ese aliado en **Skala → Administración → API & Integraciones → Generar** (elige su entidad). Copia el **token** y reemplaza `[TOKEN_AQUI]`. **Recomendado:** manda el token por un canal aparte (WhatsApp/llamada), no en el mismo correo.

---

**Asunto:** Integración API Skala — [NOMBRE_ENTIDAD]

Hola [NOMBRE],

Habilitamos la conexión por **API** para que integremos nuestras dos plataformas. Con esto, los créditos de **[NOMBRE_ENTIDAD]** viven en ambos lados: pueden crearse desde su sistema o desde Skala, y los cambios de estado (con tareas/devoluciones) se reflejan en Skala automáticamente.

**Lo que pueden hacer con la API (solo sobre los créditos de [NOMBRE_ENTIDAD]):**
- **Crear** créditos (radicar).
- **Consultar** y **listar** sus créditos y su estado.
- **Cambiar de estado** y **devolver con tareas** (subsanación).

**Datos de conexión**
- **Base URL:** `https://yfosumpmtmcomfpbspaz.supabase.co/functions/v1/api`
- **Autenticación:** header `x-api-key: [TOKEN_AQUI]` en cada petición.
  *(Guárdenlo del lado servidor; nunca en el navegador ni en repositorios. Si se filtra, avísennos y lo rotamos.)*
- **Alcance:** la llave solo ve y modifica créditos de **[NOMBRE_ENTIDAD]**. Cualquier otro crédito responde `404`.

**Ejemplo — crear un crédito**
```bash
curl -X POST 'https://yfosumpmtmcomfpbspaz.supabase.co/functions/v1/api/credits' \
  -H 'x-api-key: [TOKEN_AQUI]' -H 'Content-Type: application/json' \
  -d '{
    "entidad": "[NOMBRE_ENTIDAD]",
    "monto": 5000000, "plazo": 60, "tasa": 1.85,
    "external_ref": "SU_ID_INTERNO_DEL_CREDITO",
    "cliente": { "numeroDocumento": "1020304050", "nombres": "JUAN", "apellidos": "PEREZ", "pagaduria": "Colpensiones" }
  }'
```
La respuesta trae el `solicitud_number` de Skala. Guárdenlo (o usen `external_ref`, su propio ID) para enlazar el mismo crédito en ambos sistemas.

**Enterarse de los cambios de estado (que hace un analista de Skala)**
Consulten periódicamente (polling), cada 5–15 min:
```
GET /credits?limit=100        → lista sus créditos con su estado actual
GET /credits/{solicitud}      → uno puntual
GET /credits?external_ref=ID  → buscar por su propio ID
```
*(Si más adelante quieren avisos en tiempo real por webhook, nos dicen su URL HTTPS y les damos un secreto de firma. Opcional.)*

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

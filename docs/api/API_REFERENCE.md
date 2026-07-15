# Skala Fintech — API (referencia rápida)

> 📘 **El documento completo es [MANUAL_INTEGRACION.md](./MANUAL_INTEGRACION.md)** (ejemplos curl/Node/Python, catálogos, verificación de webhooks, errores, buenas prácticas). Esta página es solo el resumen.
> 🔑 Para **crear/administrar llaves**: [ADMIN_LLAVES.md](./ADMIN_LLAVES.md). Para el **correo al aliado**: [CORREO_ALIADO.md](./CORREO_ALIADO.md).

- **Base URL:** `https://yfosumpmtmcomfpbspaz.supabase.co/functions/v1/api`
- **Formato:** JSON · **Fechas:** ISO 8601 (UTC) · **Body máx:** 64 KB.

## Autenticación y alcance
Header **`x-api-key: sk_skala_…`** en cada petición. Cada llave está **asignada a una entidad/alianza** y solo puede ver/crear/modificar créditos de **esa entidad** — los cree el aliado o Skala (el mismo crédito "vive en las dos plataformas"). Otra entidad → `404` (o `403` al crear).

| Scope | Permite |
|---|---|
| `credits:create` | Crear (`POST /credits`) |
| `credits:read` | Consultar y **listar** (`GET /credits…`) |
| `credits:update` | Cambiar estado, devolver con tareas, comentar (`PATCH`, `POST …/comments`) |

Llave ausente/inválida/vencida → `401`. Sin el scope → `403`. En la BD solo se guarda el **hash SHA-256** de la llave (nunca el token en claro).

## Endpoints
| Método | Ruta | Scope | Qué hace |
|---|---|---|---|
| `POST` | `/credits` | create | Radicar. Body: `entidad, monto, plazo, tasa, cliente{…}`, opc. `external_ref`, `montoDesembolso`, `comisionPct`, `lineaCredito`. Header `Idempotency-Key` recomendado. → `201 {id, solicitud_number, external_ref, estado}` |
| `GET` | `/credits/:sol` | read | Consultar uno. También `?cedula=` o `?external_ref=` |
| `GET` | `/credits` | read | **Listar** los tuyos, paginado: `?limit&offset&estado`. → `{items[], limit, offset, count}` |
| `PATCH` | `/credits/:sol/status` | update | Cambiar estado. Body `{estado, motivo}`. Para **devolver**: estado de devolución + `tareas:[{titulo,requiereAdjunto}]` |
| `POST` | `/credits/:sol/comments` | update | Comentar. Body `{texto, adjuntoUrl?}` |
| `GET` | `/credits/:sol/comments` | read | Listar comentarios |

- `estado` acepta el nombre completo (ignora mayúsculas/acentos) o su `id`; parcial solo si es único (si no → `400` con `coincidencias` / `estados_validos`).
- `external_ref`: tu propio ID del crédito; enlaza el mismo crédito en ambas apps y **deduplica** (mismo `external_ref` → mismo crédito).

## Vía de vuelta (Skala → tú)
- **Polling (default):** consulta `GET /credits` cada 5–15 min y compara estados. Sin infraestructura.
- **Webhooks firmados (opcional):** si registras una URL HTTPS, Skala envía cada cambio de estado con `X-Skala-Signature: sha256=<HMAC>` (verificas con tu `webhook_secret`). Detalle y código de verificación en el manual §8.

## Errores
`400` (campo/valor/estado inválido) · `401` (llave) · `403` (scope/entidad) · `404` (no existe o fuera de tu entidad) · `405` (método) · `409` (duplicado: misma cédula/correo + misma pagaduría en trámite) · `413` (body > 64 KB) · `500`.
Formato: `{ "error": "mensaje", "request_id": "uuid" }` (sin detalles internos; usa el `request_id` para soporte).

## Seguridad
- La llave es **secreta**: úsala solo del lado servidor (nunca en frontend/repos). Si se filtra, se **rota**.
- Cada aliado tiene su **propia** llave, limitada a **su entidad** y a los scopes mínimos. Se revocan sin afectar a las demás.

# Administrar llaves API (para el admin de Skala)

Las llaves de la API externa se gestionan desde el panel: **Administración → API & Integraciones**.
Cada llave está **asignada a una entidad/alianza** y solo puede ver/crear/modificar los créditos de esa entidad.

## Crear una llave para un aliado
1. En **API & Integraciones**, sección "Crear llave para una entidad".
2. Elige la **entidad** (ej. La Hipotecaria).
3. **Expira (días):** deja `365` (recomendado) o vacío para que no caduque.
4. **URL de webhook:** déjala vacía si el aliado usará *polling*. Solo llénala si el aliado tiene un endpoint HTTPS para recibir avisos push.
5. **Generar** → aparece el **token** (`sk_skala_…`) y el **webhook_secret**.
   - ⚠️ El **token se muestra una sola vez** (en la base solo queda su hash). Cópialo y guárdalo/entrégalo ya.
   - El **webhook_secret** sí es recuperable después (botón del ojo 👁️).
6. Entrégale al aliado **el token** (y el webhook_secret solo si usará webhooks). Usa la plantilla `CORREO_ALIADO.md`.

## Acciones sobre una llave existente
- **Rotar** (🔄): genera un token nuevo y **invalida el anterior**. Úsalo si se filtró o para rotación periódica. Da el nuevo token al aliado.
- **Ver webhook_secret** (👁️): para re-enviárselo al aliado.
- **Revocar** (🚫): desactiva la llave (responde `401`). Reversible (reactivar).

## Notas de seguridad
- El token nunca se guarda en claro (solo su hash SHA-256) → Skala no lo puede "ver" después; si se pierde, se **rota**.
- Cada llave está limitada por **scopes** (crear/consultar/actualizar) y por **entidad**. No puede tocar otras entidades ni otras funciones de Skala.
- Solo usuarios con rol **ADMIN** pueden administrar llaves.

## Cómo funciona la doble vía (resumen)
- **Aliado → Skala:** su sistema llama la API (crear / cambiar estado / devolver) → se refleja en Skala al instante.
- **Skala → aliado:** el aliado consulta el estado con `GET /credits` (polling); o, si configuras su webhook_url, recibe avisos **firmados** en tiempo real.
- El campo **`external_ref`** enlaza el ID del aliado con el `solicitud_number` de Skala (y evita duplicados).

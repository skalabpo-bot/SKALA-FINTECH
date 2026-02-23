# Guía de Resolución de Problemas - Registro de Usuarios

## Problema: El formulario de registro no funciona

### 1. Verificar Configuración de Supabase

**Paso 1: Confirmar credenciales**
Abre el archivo `.env` y verifica que las credenciales sean correctas:

```env
VITE_SUPABASE_URL=https://yfosumpmtmcomfpbspaz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Paso 2: Verificar que el servidor esté reiniciado**
Después de cambiar el `.env`, DEBES reiniciar Vite:
```bash
# Detener el servidor (Ctrl+C)
# Volver a iniciar
npm run dev
```

### 2. Verificar Políticas de Supabase (RLS)

**Problema común:** Las políticas RLS (Row Level Security) pueden estar bloqueando las inserciones.

**Solución:**
1. Ve a tu dashboard de Supabase: https://supabase.com/dashboard/project/yfosumpmtmcomfpbspaz
2. Ve a **Authentication > Policies**
3. Asegúrate de que la tabla `profiles` tenga una política que permita INSERT:

```sql
-- Política para permitir que auth.users cree su propio perfil
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);
```

4. Para el bucket de storage, verifica que tengas esta política:

```sql
-- Política para el bucket skala-bucket
CREATE POLICY "Acceso Universal"
ON storage.objects
FOR ALL
USING (bucket_id = 'skala-bucket')
WITH CHECK (bucket_id = 'skala-bucket');
```

### 3. Verificar el Trigger de Creación de Perfil

El trigger `handle_new_user()` debe estar activo. Verifica ejecutando esto en el SQL Editor:

```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

Si no existe, ejecuta el script completo de `BACKEND_CONTEXT.md`.

### 4. Verificar la Consola del Navegador

**Pasos:**
1. Abre las DevTools del navegador (F12)
2. Ve a la pestaña **Console**
3. Intenta registrarte
4. Busca errores en rojo

**Errores comunes y soluciones:**

#### Error: "Invalid API key"
- **Causa:** La clave anon de Supabase es incorrecta
- **Solución:** Copia la clave correcta desde Supabase Dashboard > Settings > API

#### Error: "Email already registered"
- **Causa:** Ya existe un usuario con ese email
- **Solución:** Usa otro email o elimina el usuario anterior desde Supabase Dashboard > Authentication > Users

#### Error: "new row violates row-level security policy"
- **Causa:** Las políticas RLS están bloqueando la inserción
- **Solución:** Revisa las políticas en la sección 2

#### Error: "Failed to upload file"
- **Causa:** Problema con el bucket de storage
- **Solución:**
  1. Verifica que el bucket `skala-bucket` exista
  2. Verifica que sea público
  3. Verifica las políticas de storage

### 5. Probar Registro Manual desde Supabase Dashboard

**Método alternativo para crear un usuario:**

1. Ve a Supabase Dashboard > Authentication > Users
2. Click en "Add User"
3. Completa:
   - Email: `test@skala.co`
   - Password: `Test123!`
   - Auto Confirm User: **Activado**

4. Luego, ejecuta esto en SQL Editor:

```sql
INSERT INTO public.profiles (
  id,
  full_name,
  email,
  role,
  status,
  phone,
  cedula,
  city,
  bank_details,
  registration_docs
)
SELECT
  id,
  'Usuario de Prueba',
  email,
  'GESTOR',
  'ACTIVE',  -- Cambia a ACTIVE para poder loguearte inmediatamente
  '3001234567',
  '123456789',
  'BOGOTA D.C.',
  '{"banco": "BANCOLOMBIA", "tipoCuenta": "AHORROS", "numeroCuenta": "123456789"}'::jsonb,
  '[]'::jsonb
FROM auth.users
WHERE email = 'test@skala.co'
LIMIT 1;
```

### 6. Crear Usuario Administrador

Para crear un usuario administrador, ejecuta el script `create-admin-user.sql` en Supabase SQL Editor.

O manualmente:
```sql
-- Opción 1: Convertir un usuario existente en admin
UPDATE public.profiles
SET role = 'ADMIN', status = 'ACTIVE'
WHERE email = 'TU_EMAIL@ejemplo.com';

-- Opción 2: Usar el script create-admin-user.sql
```

### 7. Verificar que la Aplicación esté Usando Modo Producción

Abre `services/mockService.ts` y verifica:

```typescript
const USE_PRODUCTION = true;  // DEBE SER true
```

### 8. Logs Detallados

Para ver exactamente qué está fallando, revisa los errores en la consola del navegador. El código ahora muestra el error completo:

```javascript
catch (err: any) {
  console.error('Error en registro:', err);
  dispatchAlert(`Error al enviar solicitud: ${err.message || 'Error desconocido'}`, 'error');
}
```

## Checklist de Verificación Rápida

- [ ] Variables de entorno configuradas en `.env`
- [ ] Servidor Vite reiniciado después de cambiar `.env`
- [ ] Bucket `skala-bucket` existe y es público
- [ ] Políticas RLS configuradas correctamente
- [ ] Trigger `handle_new_user` activo
- [ ] Campos obligatorios completados (incluidos los 4 documentos)
- [ ] Sin errores en la consola del navegador
- [ ] Email no está ya registrado
- [ ] `USE_PRODUCTION = true` en mockService.ts

## Contacto y Soporte

Si después de seguir estos pasos el problema persiste:

1. Revisa los errores específicos en la consola del navegador
2. Verifica los logs de Supabase en Dashboard > Logs
3. Comparte el mensaje de error exacto para obtener ayuda más específica

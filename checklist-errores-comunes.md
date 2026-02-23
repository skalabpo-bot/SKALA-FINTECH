# ✅ Checklist de Errores Comunes en Registro

## 🔍 Errores Posibles y Soluciones

### 1. ❌ Error de Subida de Archivos (Storage)
**Síntoma:** "Failed to upload file" o error 400/403 en storage

**Solución:**
```sql
-- Verificar que el bucket existe y es público
SELECT * FROM storage.buckets WHERE name = 'skala-bucket';

-- Si no existe, créalo:
INSERT INTO storage.buckets (id, name, public)
VALUES ('skala-bucket', 'skala-bucket', true)
ON CONFLICT (id) DO NOTHING;

-- Agregar política para permitir uploads
CREATE POLICY "Allow public uploads"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'skala-bucket');

CREATE POLICY "Allow public reads"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'skala-bucket');
```

---

### 2. ❌ Error "Database error saving new user"
**Síntoma:** Usuario se crea en auth pero no en profiles

**Verificar:**
```sql
-- ¿El trigger existe?
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- ¿RLS está deshabilitado?
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'profiles' AND schemaname = 'public';
-- Debe mostrar: rowsecurity = false
```

**Solución:** Ejecuta [solucion-definitiva-registro.sql](solucion-definitiva-registro.sql)

---

### 3. ❌ Error de Email Inválido
**Síntoma:** "Email address is invalid"

**Emails que NO funcionan:**
- ❌ `test@test.test`
- ❌ `aaa@a.com`
- ❌ `usuario@localhost`

**Usa estos:**
- ✅ `test@gmail.com`
- ✅ `usuario@hotmail.com`
- ✅ `demo@skala.co`

---

### 4. ❌ Contraseña Muy Corta
**Síntoma:** Error 400 "Password should be..."

**Solución:** Usa contraseña con mínimo 8 caracteres
- ✅ `Test1234`
- ✅ `Admin2024!`
- ❌ `123456` (muy corta)

---

### 5. ❌ Faltan Documentos
**Síntoma:** "Faltan documentos obligatorios: ..."

**Solución:** Sube los 4 documentos:
1. CEDULA_FRONTAL
2. CEDULA_POSTERIOR
3. RUT
4. CERTIFICACION_BANCARIA

---

### 6. ❌ Ciudad o Banco No Seleccionado
**Síntoma:** "Por favor selecciona una ciudad..." o "Por favor selecciona un banco..."

**Solución:** Asegúrate de seleccionar una opción en los dropdowns (no dejar en "Seleccione...")

---

### 7. ❌ Error CORS
**Síntoma:** "CORS policy blocked" o "Failed to fetch"

**Solución:**
1. Ve a: https://supabase.com/dashboard/project/yfosumpmtmcomfpbspaz/settings/api
2. Verifica que la URL esté correcta
3. Si usas localhost, debe estar permitido

---

### 8. ❌ Error "User already registered"
**Síntoma:** El email ya existe

**Solución:**
- Usa un email diferente, o
- Elimina el usuario existente:

```sql
-- Ver usuarios
SELECT id, email FROM auth.users WHERE email = 'tu_email@ejemplo.com';

-- Eliminar usuario (solo para testing)
DELETE FROM auth.users WHERE email = 'tu_email@ejemplo.com';
DELETE FROM public.profiles WHERE email = 'tu_email@ejemplo.com';
```

---

### 9. ❌ Error de Notificaciones
**Síntoma:** "Error al enviar notificaciones" en consola

**No es crítico:** El usuario sí se crea, solo fallan las notificaciones a admins.

**Solución (opcional):**
```sql
-- Verificar que hay admins
SELECT id, email, role, status FROM public.profiles WHERE role = 'ADMIN' AND status = 'ACTIVE';

-- Si no hay admins, las notificaciones fallan (esperado)
```

---

### 10. ❌ VPN/Incógnito: Error de Conexión
**Síntoma:** "Network error" o "Failed to connect"

**Solución:**
- Verifica que la VPN permite conexiones a Supabase
- Prueba sin VPN (solo incógnito)
- O usa datos móviles del teléfono

---

## 🧪 Test Rápido de Configuración

Ejecuta esto en SQL Editor para verificar que todo está OK:

```sql
-- 1. ¿Existe el bucket?
SELECT name, public FROM storage.buckets WHERE name = 'skala-bucket';
-- Esperado: 1 fila, public = true

-- 2. ¿Existe el trigger?
SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created';
-- Esperado: 1 fila

-- 3. ¿RLS está deshabilitado?
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'profiles' AND schemaname = 'public';
-- Esperado: rowsecurity = false

-- 4. ¿Hay admins?
SELECT COUNT(*) as total_admins FROM public.profiles WHERE role = 'ADMIN' AND status = 'ACTIVE';
-- Esperado: >= 1
```

Si TODOS estos tests pasan → Tu configuración está correcta

---

## 🔧 Script de Diagnóstico Completo

Ejecuta esto para ver el estado completo:

```sql
-- DIAGNÓSTICO COMPLETO DE CONFIGURACIÓN
SELECT
  '✅ Bucket Storage' as componente,
  CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'skala-bucket' AND public = true)
    THEN 'OK'
    ELSE '❌ FALTA CREAR'
  END as estado
UNION ALL
SELECT
  '✅ Trigger Auth',
  CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created')
    THEN 'OK'
    ELSE '❌ FALTA CREAR'
  END
UNION ALL
SELECT
  '✅ RLS Deshabilitado',
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'profiles' AND schemaname = 'public' AND rowsecurity = false)
    THEN 'OK'
    ELSE '❌ DEBE DESHABILITAR'
  END
UNION ALL
SELECT
  '✅ Admins Activos',
  CASE WHEN (SELECT COUNT(*) FROM public.profiles WHERE role = 'ADMIN' AND status = 'ACTIVE') > 0
    THEN 'OK (' || (SELECT COUNT(*) FROM public.profiles WHERE role = 'ADMIN' AND status = 'ACTIVE')::text || ')'
    ELSE '⚠️ SIN ADMINS'
  END
UNION ALL
SELECT
  '✅ Políticas Storage',
  CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage')
    THEN 'OK'
    ELSE '⚠️ REVISAR'
  END;
```

---

## 📋 Datos de Prueba Recomendados

Usa estos datos para testing (siempre funcionan):

```
Nombre: Juan Prueba Test
Email: test.vpn.2024@gmail.com  ← Email único cada vez
Contraseña: TestVPN2024!
Cédula: 987654321
Celular: 3009876543
Ciudad: BOGOTA D.C.
Banco: BANCOLOMBIA
Tipo Cuenta: AHORROS
No. Cuenta: 12345678901
```

**Tip:** Cambia el email cada intento: `test1@gmail.com`, `test2@gmail.com`, etc.

---

## 🚨 Si Nada Funciona

**Plan B - Crear usuario manualmente:**

1. Dashboard > Auth > Users > "Add User"
2. Crear usuario con email/password
3. Ejecutar SQL para crear perfil:

```sql
INSERT INTO public.profiles (
  id, full_name, email, role, status, phone, cedula, city, bank_details, registration_docs
)
SELECT
  id, 'Usuario Test', 'test@gmail.com', 'GESTOR', 'ACTIVE',
  '3001234567', '123456789', 'BOGOTA D.C.',
  '{"banco": "BANCOLOMBIA", "tipoCuenta": "AHORROS", "numeroCuenta": "123"}'::jsonb,
  '[]'::jsonb
FROM auth.users WHERE email = 'test@gmail.com' LIMIT 1;
```

---

**Comparte los errores específicos que ves y te ayudo con la solución exacta** 🚀

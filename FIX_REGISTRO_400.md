# 🔧 Solución Error 400 en Registro

## Error Identificado

```
POST https://yfosumpmtmcomfpbspaz.supabase.co/auth/v1/signup
Status: 400 (Internal Server Error)
```

Este error ocurre porque **Supabase tiene el registro público deshabilitado** o hay un problema con las políticas.

---

## ✅ Solución 1: Habilitar Registro Público (RECOMENDADO)

### Paso 1: Ir a Configuración de Auth

1. Ve a: https://supabase.com/dashboard/project/yfosumpmtmcomfpbspaz/auth/providers
2. O navega: Dashboard > Authentication > Providers

### Paso 2: Habilitar Email Auth

En la sección **Email**:
- ✅ **Enable Email provider** debe estar ON
- ✅ **Confirm email** debe estar OFF (para testing)
- ✅ **Enable sign ups** debe estar ON ← **IMPORTANTE**

Si "Enable sign ups" está OFF, los usuarios no podrán registrarse.

### Paso 3: Guardar Cambios

Click en "Save" y prueba de nuevo.

---

## ✅ Solución 2: Verificar Políticas RLS

### Opción A: Deshabilitar RLS temporalmente (para testing)

1. Ve a: https://supabase.com/dashboard/project/yfosumpmtmcomfpbspaz/editor
2. Click en tabla `profiles`
3. Click en "RLS" o el escudo
4. Click en "Disable RLS" temporalmente
5. Prueba el registro
6. Si funciona, el problema son las políticas

### Opción B: Arreglar las Políticas (RECOMENDADO)

Ve a SQL Editor y ejecuta esto:

```sql
-- Permitir que usuarios autenticados creen su propio perfil
DROP POLICY IF EXISTS "Perfiles_Insert_Propio" ON public.profiles;
CREATE POLICY "Perfiles_Insert_Propio"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Permitir lectura pública de perfiles (para el trigger)
DROP POLICY IF EXISTS "Perfiles_Select_Propio" ON public.profiles;
CREATE POLICY "Perfiles_Select_Propio"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Permitir que el service role (trigger) inserte perfiles
DROP POLICY IF EXISTS "Service_Can_Insert_Profiles" ON public.profiles;
CREATE POLICY "Service_Can_Insert_Profiles"
ON public.profiles
FOR INSERT
TO service_role
WITH CHECK (true);
```

---

## ✅ Solución 3: Verificar el Trigger

Ejecuta esto en SQL Editor para verificar que el trigger existe:

```sql
SELECT
    tgname AS trigger_name,
    tgenabled AS enabled,
    proname AS function_name
FROM pg_trigger
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
WHERE tgname = 'on_auth_user_created';
```

Si NO aparece nada, ejecuta esto:

```sql
-- Recrear el trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario Nuevo'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'GESTOR'),
    COALESCE(NEW.raw_user_meta_data->>'status', 'PENDING'),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'cedula',
    NEW.raw_user_meta_data->>'city',
    COALESCE(NEW.raw_user_meta_data->'bank_details', '{"banco": "", "tipoCuenta": "AHORROS", "numeroCuenta": ""}'::jsonb),
    COALESCE(NEW.raw_user_meta_data->'registration_docs', '[]'::jsonb)
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

---

## 🧪 Solución 4: Registrar Manualmente (WORKAROUND)

Si las soluciones anteriores no funcionan, puedes crear usuarios manualmente:

### En Supabase Dashboard:

1. Ve a: Authentication > Users
2. Click "Add User"
3. Llena:
   - Email: `test@skala.co`
   - Password: `Test1234`
   - Auto Confirm User: ✅ ON

4. Luego ejecuta en SQL Editor:

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
  'Usuario Test',
  'test@skala.co',
  'GESTOR',
  'ACTIVE',  -- Cambiar a ACTIVE para poder loguearte
  '3001234567',
  '123456789',
  'BOGOTA D.C.',
  '{"banco": "BANCOLOMBIA", "tipoCuenta": "AHORROS", "numeroCuenta": "123456789"}'::jsonb,
  '[]'::jsonb
FROM auth.users
WHERE email = 'test@skala.co'
LIMIT 1;
```

---

## 📋 Checklist de Verificación

Sigue estos pasos en orden:

- [ ] 1. Ir a Auth > Providers > Email
- [ ] 2. Verificar que "Enable sign ups" está ON
- [ ] 3. Guardar cambios
- [ ] 4. Refrescar la página de la app
- [ ] 5. Intentar registrarse de nuevo
- [ ] 6. Si sigue fallando, deshabilitar RLS en `profiles`
- [ ] 7. Intentar de nuevo
- [ ] 8. Si funciona, el problema son las políticas
- [ ] 9. Ejecutar el SQL de políticas (Solución 2)
- [ ] 10. Re-habilitar RLS
- [ ] 11. Probar de nuevo

---

## 🎯 La Causa Más Común

En el 90% de los casos, el error 400 en signup se debe a:

**"Enable sign ups" está desactivado en Auth Settings**

Ve a: https://supabase.com/dashboard/project/yfosumpmtmcomfpbspaz/auth/providers

Y verifica que en la sección Email:
- ✅ Enable Email provider: ON
- ✅ **Enable sign ups: ON** ← Este es el culpable

---

## 💡 Después de Habilitar

Una vez que habilites "Enable sign ups":

1. La app debe refrescarse automáticamente (por HMR)
2. Prueba registrarte con:
   - Email: `test@skala.co`
   - Password: `Test1234`
3. Deberías ver el mensaje verde de éxito

---

## ❓ Si Aún Falla

Comparte:
1. Screenshot de Auth > Providers > Email (con las configuraciones visibles)
2. Screenshot de las políticas RLS de la tabla `profiles`
3. El error exacto en la consola del navegador

---

**Empieza con la Solución 1 (habilitar signups) y avísame si funciona** ✅

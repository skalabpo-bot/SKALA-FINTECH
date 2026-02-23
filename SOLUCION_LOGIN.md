# 🔧 Solución: Usuarios no pueden iniciar sesión después del registro

## 📋 Problema
Los usuarios se registran correctamente, aparecen en la base de datos, pero **no pueden iniciar sesión** con sus credenciales.

## 🎯 Causa
Supabase tiene habilitada la **confirmación de email** por defecto. Esto significa que:
1. El usuario se registra ✅
2. Supabase envía un email de confirmación 📧
3. El usuario NO puede iniciar sesión hasta confirmar el email ❌

## ✅ Solución Completa

### PASO 1: Ejecutar Script SQL para Confirmar Usuarios Existentes

Ejecuta el archivo `fix-email-confirmation.sql` en el SQL Editor de Supabase:

```sql
-- Confirmar todos los usuarios existentes
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;
```

Esto confirmará automáticamente a todos los usuarios que ya están registrados.

### PASO 2: Desactivar Confirmación de Email para Nuevos Usuarios

**IMPORTANTE:** Debes hacer este cambio en el Dashboard de Supabase:

1. Ve a **[Supabase Dashboard](https://supabase.com/dashboard)**
2. Selecciona tu proyecto: `yfosumpmtmcomfpbspaz`
3. En el menú lateral, ve a **Authentication** → **Settings**
4. Busca la sección **"Email Auth"**
5. Encuentra la opción **"Enable email confirmations"**
6. **DESACTIVA** esta opción (toggle a OFF)
7. Haz clic en **"Save"**

### PASO 3: Verificar la Solución

1. **Verifica usuarios existentes:**
   - Los usuarios ya registrados deberían poder iniciar sesión inmediatamente
   - Prueba con las credenciales de un usuario creado anteriormente

2. **Prueba registro nuevo:**
   - Registra un nuevo usuario de prueba
   - Intenta iniciar sesión inmediatamente
   - Debería funcionar sin necesidad de confirmar email ✅

## 🔍 Verificación en Base de Datos

Ejecuta esta query para ver el estado de tus usuarios:

```sql
SELECT
    u.email,
    u.email_confirmed_at,
    p.full_name,
    p.role,
    p.status,
    CASE
        WHEN u.email_confirmed_at IS NOT NULL THEN '✅ Puede iniciar sesión'
        ELSE '❌ No puede iniciar sesión'
    END as login_status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC;
```

## 🚨 Alternativa: Si NO Puedes Desactivar Email Confirmation

Si prefieres mantener la confirmación de email habilitada por seguridad, puedes:

1. **Configurar emails de confirmación:**
   - En Authentication → Email Templates
   - Personaliza el template de confirmación
   - Asegúrate que el SMTP esté configurado correctamente

2. **Usar auto-confirmación en el código:**
   - Actualizar `productionService.ts` para incluir `emailRedirectTo`
   - Configurar una URL de callback

3. **Confirmar manualmente desde Admin Panel:**
   - Crear un panel de administración para que los admins confirmen usuarios manualmente

## ✨ Recomendación

Para un sistema interno como SKALA donde los admins aprueban a los gestores, **NO necesitas confirmación de email**. Es mejor:

1. ✅ Desactivar confirmación de email (PASO 2)
2. ✅ Mantener el flujo de aprobación por admin (status PENDING → ACTIVE)
3. ✅ Los gestores pueden iniciar sesión inmediatamente pero no tienen acceso hasta que un admin los apruebe

Esto mejora la experiencia del usuario y mantiene el control administrativo.

## 📝 Resumen de Acciones

- [ ] Ejecutar `fix-email-confirmation.sql`
- [ ] Desactivar "Enable email confirmations" en Supabase Dashboard
- [ ] Probar login con usuario existente
- [ ] Probar registro + login con usuario nuevo
- [ ] Verificar que el flujo de aprobación de admin funciona

---

**Fecha:** 2026-02-03
**Estado:** Pendiente de ejecución

-- ===================================================================
-- FIX: Desactivar Confirmación de Email y Confirmar Usuarios
-- ===================================================================
-- Problema: Los usuarios se crean pero no pueden iniciar sesión
-- porque Supabase requiere confirmación de email
-- ===================================================================

-- PASO 1: Confirmar TODOS los usuarios existentes que están sin confirmar
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- PASO 2: Verificar usuarios confirmados
SELECT
    id,
    email,
    email_confirmed_at,
    created_at,
    CASE
        WHEN email_confirmed_at IS NOT NULL THEN '✅ Confirmado'
        ELSE '❌ Sin confirmar'
    END as status
FROM auth.users
ORDER BY created_at DESC;

-- PASO 3: Verificar que los perfiles están creados correctamente
SELECT
    u.email,
    u.email_confirmed_at,
    p.full_name,
    p.role,
    p.status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.created_at DESC;

-- ===================================================================
-- IMPORTANTE: Configuración en Dashboard de Supabase
-- ===================================================================
-- Este script confirma a los usuarios existentes, pero para que
-- los NUEVOS usuarios puedan iniciar sesión sin confirmar email:
--
-- 1. Ve al Dashboard de Supabase: https://supabase.com/dashboard
-- 2. Selecciona tu proyecto
-- 3. Ve a Authentication > Settings
-- 4. Busca la sección "Email Auth"
-- 5. DESACTIVA la opción "Enable email confirmations"
-- 6. Guarda los cambios
--
-- Esto permitirá que los nuevos gestores puedan iniciar sesión
-- inmediatamente después de registrarse.
-- ===================================================================

-- VERIFICACIÓN FINAL: Ver si hay usuarios sin perfil
SELECT
    u.id,
    u.email,
    u.created_at,
    CASE
        WHEN p.id IS NULL THEN '⚠️ Sin perfil'
        ELSE '✅ Perfil OK'
    END as profile_status
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

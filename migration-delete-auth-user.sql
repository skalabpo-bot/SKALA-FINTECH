-- ============================================================
-- MIGRACIÓN: Función para eliminar usuarios de auth.users
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Crear función que elimina un usuario de auth.users
-- Esta función se ejecuta con privilegios de SECURITY DEFINER
-- para poder acceder a auth.users desde el cliente
CREATE OR REPLACE FUNCTION public.delete_auth_user(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM auth.users WHERE id = user_id;
END;
$$;

-- 2. Permitir que usuarios autenticados llamen esta función
-- (La lógica de permisos ADMIN se valida en el frontend)
GRANT EXECUTE ON FUNCTION public.delete_auth_user(UUID) TO authenticated;

-- 3. Verificar
SELECT proname, prosecdef FROM pg_proc WHERE proname = 'delete_auth_user';

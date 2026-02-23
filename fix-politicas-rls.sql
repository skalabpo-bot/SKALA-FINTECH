-- ===================================================================
-- SOLUCIÓN: Políticas RLS para permitir registro de usuarios
-- ===================================================================
-- El error "Database error saving new user" ocurre porque el trigger
-- no tiene permisos para insertar en la tabla profiles debido a RLS
-- ===================================================================

-- PASO 1: Asegurarnos de que RLS esté habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- PASO 2: Eliminar políticas antiguas que puedan estar causando conflictos
DROP POLICY IF EXISTS "Perfiles_Insert_Propio" ON public.profiles;
DROP POLICY IF EXISTS "Service_Can_Insert_Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users_Can_Insert_Own_Profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Perfiles_Select_Propio" ON public.profiles;

-- PASO 3: Crear política que permite al SERVICE ROLE insertar
-- (El trigger usa el service role, no el usuario autenticado)
CREATE POLICY "Service_Role_Can_Insert"
ON public.profiles
FOR INSERT
TO service_role
WITH CHECK (true);

-- PASO 4: Permitir a usuarios autenticados insertar su propio perfil
CREATE POLICY "Users_Can_Insert_Own"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- PASO 5: Permitir lectura pública de perfiles (para consultas)
CREATE POLICY "Public_Read_Profiles"
ON public.profiles
FOR SELECT
TO authenticated, anon
USING (true);

-- PASO 6: Permitir a usuarios actualizar su propio perfil
CREATE POLICY "Users_Can_Update_Own"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- PASO 7: Solo admins pueden actualizar cualquier perfil
CREATE POLICY "Admins_Can_Update_All"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ADMIN'
  )
);

-- ===================================================================
-- VERIFICACIÓN
-- ===================================================================
-- Ver todas las políticas activas:
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Debería mostrar las 5 políticas que acabamos de crear
-- ===================================================================

-- ===================================================================
-- ALTERNATIVA SI AÚN FALLA: Deshabilitar RLS temporalmente
-- ===================================================================
-- SOLO USA ESTO PARA TESTING, NO EN PRODUCCIÓN:
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
-- Luego de verificar que funciona, vuelve a habilitarlo con:
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- ===================================================================

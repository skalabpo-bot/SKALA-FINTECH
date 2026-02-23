-- ============================================================
-- CREAR USUARIO MANUALMENTE - VERSIÓN SIMPLE
-- ============================================================
-- Primero crea el usuario en Dashboard > Auth > Users
-- Luego ejecuta este SQL para crear el perfil
-- ============================================================

-- PASO 1: Verificar estructura de la tabla profiles
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================================
-- PASO 2: Insertar perfil (SIN registration_docs)
-- ============================================================
-- Cambia el email por el que creaste en el paso anterior

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
  created_at,
  updated_at
)
SELECT
  id,
  'Camilo Test',
  'camilo.test@skala.co',  -- Cambia este email
  'GESTOR',
  'ACTIVE',
  '213123',
  '312312',
  'AGUACHICA',
  '{"banco": "BANCO AGRARIO", "tipoCuenta": "CORRIENTE", "numeroCuenta": "231231"}'::jsonb,
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'camilo.test@skala.co'  -- Cambia este email
LIMIT 1;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================
-- Ver que el perfil se creó correctamente:
SELECT id, full_name, email, role, status FROM public.profiles WHERE email = 'camilo.test@skala.co';

-- ============================================================
-- ALTERNATIVA: Si falla porque la tabla no tiene bank_details
-- ============================================================
-- Ejecuta este en su lugar:
/*
INSERT INTO public.profiles (
  id,
  full_name,
  email,
  role,
  status,
  phone,
  cedula,
  city,
  created_at,
  updated_at
)
SELECT
  id,
  'Camilo Test',
  'camilo.test@skala.co',
  'GESTOR',
  'ACTIVE',
  '213123',
  '312312',
  'AGUACHICA',
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'camilo.test@skala.co'
LIMIT 1;
*/

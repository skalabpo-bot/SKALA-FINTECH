-- ==============================================================
-- SCRIPT PARA CREAR USUARIO ADMINISTRADOR DE PRUEBA
-- ==============================================================
-- Este script crea un usuario administrador para probar la plataforma
--
-- IMPORTANTE: Ejecuta este script en el SQL Editor de Supabase
-- (Dashboard > SQL Editor > New Query > Pega este código > Run)
-- ==============================================================

-- 1. Insertar el usuario en auth.users (tabla de autenticación)
-- NOTA: Cambia el email y la contraseña según tus necesidades
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'admin@skala.co',  -- Cambia este email
  crypt('Admin123!', gen_salt('bf')),  -- Cambia esta contraseña
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{
    "full_name": "Administrador Skala",
    "role": "ADMIN",
    "status": "ACTIVE"
  }',
  false,
  'authenticated'
)
RETURNING id;

-- 2. Insertar el perfil del usuario en public.profiles
-- NOTA: Asegúrate de que el id coincida con el usuario creado arriba
INSERT INTO public.profiles (
  id,
  full_name,
  email,
  role,
  status,
  avatar_url,
  phone,
  cedula,
  city,
  bank_details,
  registration_docs,
  created_at,
  updated_at
)
SELECT
  id,
  'Administrador Skala',
  'admin@skala.co',  -- Mismo email de arriba
  'ADMIN',
  'ACTIVE',
  'https://ui-avatars.com/api/?background=EA580C&color=fff&name=Admin+Skala',
  '3001234567',
  '1234567890',
  'BOGOTA D.C.',
  '{"banco": "BANCOLOMBIA", "tipoCuenta": "AHORROS", "numeroCuenta": "12345678901"}'::jsonb,
  '[]'::jsonb,
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'admin@skala.co'
LIMIT 1;

-- ==============================================================
-- VERIFICACIÓN
-- ==============================================================
-- Ejecuta esta consulta para verificar que el usuario fue creado:
-- SELECT * FROM public.profiles WHERE email = 'admin@skala.co';
-- ==============================================================

-- ==============================================================
-- ALTERNATIVA MÁS SIMPLE (SI LO ANTERIOR NO FUNCIONA)
-- ==============================================================
-- Si tienes problemas con el método anterior, puedes:
-- 1. Registrarte normalmente desde la app con el formulario
-- 2. Luego ejecutar este script para convertirte en admin:

/*
UPDATE public.profiles
SET
  role = 'ADMIN',
  status = 'ACTIVE'
WHERE email = 'TU_EMAIL_AQUI@ejemplo.com';
*/

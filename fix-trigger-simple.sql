-- ================================================
-- TRIGGER SIMPLIFICADO PARA REGISTRO DE USUARIOS
-- ================================================
-- Este trigger maneja metadatos mínimos en signUp
-- Los datos completos se guardan con upsert después
-- ================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertar perfil básico (los datos completos vienen después por upsert)
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
    registration_docs,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario Nuevo'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'GESTOR'),
    COALESCE(NEW.raw_user_meta_data->>'status', 'PENDING'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'cedula', ''),
    COALESCE(NEW.raw_user_meta_data->>'city', ''),
    '{"banco": "", "tipoCuenta": "AHORROS", "numeroCuenta": ""}'::jsonb,
    '[]'::jsonb,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ================================================
-- VERIFICACIÓN
-- ================================================
-- Ejecuta esto para verificar que el trigger existe:
SELECT
    tgname AS trigger_name,
    tgenabled AS enabled
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- Debería mostrar: trigger_name = 'on_auth_user_created', enabled = 'O'

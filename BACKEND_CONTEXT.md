
-- ==========================================================
-- SCRIPT DE INICIALIZACIÓN TOTAL (DEFINITIVO) - SKALA
-- ==========================================================

-- 1. TABLA DE PERFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT UNIQUE,
  role TEXT DEFAULT 'GESTOR' CHECK (role IN ('ADMIN', 'GESTOR', 'ASISTENTE_OPERATIVO', 'ANALISTA', 'TESORERIA')),
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('ACTIVE', 'PENDING', 'REJECTED')),
  avatar_url TEXT DEFAULT 'https://ui-avatars.com/api/?background=EA580C&color=fff',
  phone TEXT,
  cedula TEXT,
  city TEXT,
  zone_id UUID,
  permissions TEXT[],
  bank_details JSONB DEFAULT '{"banco": "", "tipoCuenta": "AHORROS", "numeroCuenta": ""}'::jsonb,
  registration_docs JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA DE ENTIDADES ALIADAS Y ZONAS
CREATE TABLE IF NOT EXISTS public.allied_entities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  rates JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  cities TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLA DE CRÉDITOS (Campos maestros)
CREATE TABLE IF NOT EXISTS public.credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assigned_gestor_id UUID REFERENCES public.profiles(id),
  assigned_analyst_id UUID REFERENCES public.profiles(id),
  status_id TEXT DEFAULT '1',
  amount NUMERIC DEFAULT 0,
  term INTEGER DEFAULT 0,
  entity_name TEXT,
  interest_rate NUMERIC DEFAULT 0,
  commission_percent NUMERIC DEFAULT 0,
  commission_est NUMERIC DEFAULT 0,
  client_data JSONB DEFAULT '{}'::jsonb, -- Aquí se guardan los +30 campos del onboarding
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLA DE DOCUMENTOS
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_id UUID REFERENCES public.credits(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLA DE HISTORIAL (Trazabilidad)
CREATE TABLE IF NOT EXISTS public.credit_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_id UUID REFERENCES public.credits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  action TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLA DE COMENTARIOS (Chat Operativo)
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_id UUID REFERENCES public.credits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  text TEXT,
  attachment_name TEXT,
  attachment_url TEXT,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLA DE NOVEDADES Y NOTIFICACIONES
CREATE TABLE IF NOT EXISTS public.news (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT,
  message TEXT,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  credit_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TRIGGER DE PERFIL AUTOMÁTICO
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, status, phone, cedula, city, bank_details, registration_docs)
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
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 9. POLÍTICAS DE STORAGE
INSERT INTO storage.buckets (id, name, public) VALUES ('skala-bucket', 'skala-bucket', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Acceso Universal" ON storage.objects;
CREATE POLICY "Acceso Universal" ON storage.objects FOR ALL USING (bucket_id = 'skala-bucket') WITH CHECK (bucket_id = 'skala-bucket');

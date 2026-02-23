-- ============================================================
-- MIGRACIÓN: Unificación de bases de datos + Líneas de crédito
-- Ejecutar en el SQL Editor de tu proyecto Supabase principal
-- https://yfosumpmtmcomfpbspaz.supabase.co
-- ============================================================

-- 1. Entidades financieras (antes solo existían en el DB del simulador)
CREATE TABLE IF NOT EXISTS financial_entities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1e293b',
  secondary_color TEXT DEFAULT '#64748b',
  cash_fee NUMERIC(10,2) DEFAULT 15157,
  bank_fee NUMERIC(10,2) DEFAULT 7614,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Factores FPM (antes solo existían en el DB del simulador)
CREATE TABLE IF NOT EXISTS fpm_factors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_name TEXT NOT NULL,
  product TEXT NOT NULL,
  term_months INTEGER NOT NULL,
  rate NUMERIC(6,4) NOT NULL,
  factor NUMERIC(10,8) NOT NULL,
  discount_pct NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Líneas de crédito (nueva tabla, gestionable desde admin)
CREATE TABLE IF NOT EXISTS credit_lines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Poblar líneas de crédito iniciales
INSERT INTO credit_lines (name, sort_order) VALUES
  ('LIBRE INVERSION', 1),
  ('COMPRA DE CARTERA', 2),
  ('RETANQUEO', 3),
  ('LIBRE + SANEAMIENTO', 4),
  ('COMPRA + SANEAMIENTO', 5)
ON CONFLICT (name) DO NOTHING;

-- 4. RLS para financial_entities
ALTER TABLE financial_entities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read financial_entities" ON financial_entities;
DROP POLICY IF EXISTS "Auth write financial_entities" ON financial_entities;
CREATE POLICY "Public read financial_entities" ON financial_entities FOR SELECT USING (true);
CREATE POLICY "Auth write financial_entities" ON financial_entities FOR ALL TO authenticated USING (true);

-- 5. RLS para fpm_factors
ALTER TABLE fpm_factors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read fpm_factors" ON fpm_factors;
DROP POLICY IF EXISTS "Auth write fpm_factors" ON fpm_factors;
CREATE POLICY "Public read fpm_factors" ON fpm_factors FOR SELECT USING (true);
CREATE POLICY "Auth write fpm_factors" ON fpm_factors FOR ALL TO authenticated USING (true);

-- 6. RLS para credit_lines
ALTER TABLE credit_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read credit_lines" ON credit_lines;
DROP POLICY IF EXISTS "Auth write credit_lines" ON credit_lines;
CREATE POLICY "Public read credit_lines" ON credit_lines FOR SELECT USING (true);
CREATE POLICY "Auth write credit_lines" ON credit_lines FOR ALL TO authenticated USING (true);

-- 7. Arreglar RLS de notificaciones (permitir que usuarios eliminen/actualicen las suyas)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications' AND policyname = 'Users delete own notifications'
  ) THEN
    CREATE POLICY "Users delete own notifications" ON notifications
      FOR DELETE TO authenticated USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications' AND policyname = 'Users update own notifications'
  ) THEN
    CREATE POLICY "Users update own notifications" ON notifications
      FOR UPDATE TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;

-- ============================================================
-- NOTA: Después de correr esta migración, ve al AdminDashboard
-- del simulador (ahora unificado) para agregar las entidades
-- y sus factores FPM. Los datos del DB viejo del simulador
-- (qyjrqbodkxwcxoxvqdqz) deben re-ingresarse manualmente
-- o exportarse/importarse con la herramienta de migración
-- de Supabase.
-- ============================================================

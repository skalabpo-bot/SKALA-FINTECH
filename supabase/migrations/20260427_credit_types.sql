-- Tipos de crédito (Libranza, Hipotecario, Vehículo, etc.)
CREATE TABLE IF NOT EXISTS credit_types (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  icon text DEFAULT 'CreditCard',
  color text DEFAULT 'orange',
  active boolean DEFAULT true,
  available boolean DEFAULT true,
  order_index int DEFAULT 0,
  created_at timestamp DEFAULT now()
);

-- Datos iniciales
INSERT INTO credit_types (name, description, icon, color, available, order_index) VALUES
  ('Libranza', 'Crédito con descuento directo de nómina o pensión. Ideal para empleados y pensionados.', 'Building2', 'orange', true, 1),
  ('Crédito Hipotecario', 'Financiación para compra de vivienda nueva o usada. Tasas competitivas a largo plazo.', 'Home', 'blue', false, 2),
  ('Crédito de Vehículo', 'Financiación para vehículo nuevo o usado. Aprobación rápida con tasa preferencial.', 'Car', 'emerald', false, 3)
ON CONFLICT (name) DO NOTHING;

-- Tipos de crédito que atiende cada entidad (array de UUIDs)
ALTER TABLE financial_entities
  ADD COLUMN IF NOT EXISTS credit_type_ids jsonb DEFAULT '[]'::jsonb;

-- RLS: lectura pública, escritura solo staff
ALTER TABLE credit_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "credit_types_select" ON credit_types;
CREATE POLICY "credit_types_select" ON credit_types FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "credit_types_admin" ON credit_types;
CREATE POLICY "credit_types_admin" ON credit_types FOR ALL TO authenticated USING (true) WITH CHECK (true);

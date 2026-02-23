-- Agrega columnas de costos configurables por entidad financiera
-- Ejecutar en el SQL Editor de Supabase

ALTER TABLE financial_entities
  ADD COLUMN IF NOT EXISTS cash_fee INTEGER DEFAULT 15157,
  ADD COLUMN IF NOT EXISTS bank_fee INTEGER DEFAULT 7614;

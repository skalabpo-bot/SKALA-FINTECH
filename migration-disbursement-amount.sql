-- Agrega la columna disbursement_amount a la tabla credits
-- Ejecutar en Supabase SQL Editor

ALTER TABLE credits
  ADD COLUMN IF NOT EXISTS disbursement_amount NUMERIC(15, 2) DEFAULT 0;

-- Actualizar registros existentes: usar el mismo valor que amount como referencia inicial
UPDATE credits
  SET disbursement_amount = amount
  WHERE disbursement_amount = 0 OR disbursement_amount IS NULL;

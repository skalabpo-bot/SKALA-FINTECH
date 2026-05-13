-- =============================================
-- Comisiones por tasa para tipos sin entidad (hipotecario, vehículo)
-- =============================================

-- Estructura: jsonb array [{rate: number, commission: number}, ...]
ALTER TABLE credit_types
  ADD COLUMN IF NOT EXISTS rate_commissions jsonb DEFAULT '[]'::jsonb;

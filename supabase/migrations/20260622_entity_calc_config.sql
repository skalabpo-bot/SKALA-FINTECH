-- =============================================
-- Motor de cálculo por entidad: usar el Excel REAL (Google Sheets) como motor
-- de radicación. Reemplaza los factores por millón en las entidades migradas.
--
-- Skala envía cuota + plazo (+ fecha de nacimiento / pagaduría / tipo según la
-- entidad) a la hoja real vía la Edge Function `simulador-calc` y lee de vuelta
-- el monto a financiar y el monto a desembolsar. La comisión la define el
-- PRODUCTO (= tasa) que elige el asesor.
--
-- Una config por entidad. Las entidades SIN config siguen usando fpm_factors.
-- =============================================

CREATE TABLE IF NOT EXISTS entity_calc_config (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_name text NOT NULL UNIQUE,          -- coincide con financial_entities.name
  google_sheet_id text NOT NULL,             -- ID del Google Sheet (templateId del motor)
  sheet_tab text,                            -- hoja donde se escribe/lee (null = primera hoja)
  -- Celdas A1 que Skala LLENA antes de calcular. Claves conocidas:
  --   cuota, plazo, fechaNacimiento, pagaduria, tipo. Flexible por entidad.
  input_cells jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Celdas A1 que Skala LEE como resultado: { "monto": "C9", "desembolso": "C23" }
  output_cells jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Productos (= tasas/variantes). Cada uno fija sus celdas y trae su comisión:
  --   [{ "nombre": "1.5% NMV", "rate": 1.5, "comision": 3.5, "discountPct": 13.49,
  --      "cellValues": { "C12": 1.5 } }]
  products jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entity_calc_config_entity ON entity_calc_config (entity_name, is_active);

ALTER TABLE entity_calc_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "entity_calc_config_select" ON entity_calc_config;
CREATE POLICY "entity_calc_config_select" ON entity_calc_config FOR SELECT TO public USING (true);
DROP POLICY IF EXISTS "entity_calc_config_admin" ON entity_calc_config;
CREATE POLICY "entity_calc_config_admin" ON entity_calc_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- Hipotecario: tipo de crédito sin entidad real
-- =============================================

-- 1. credit_type_id en credits
ALTER TABLE credits
  ADD COLUMN IF NOT EXISTS credit_type_id uuid REFERENCES credit_types(id);

CREATE INDEX IF NOT EXISTS idx_credits_credit_type ON credits(credit_type_id);

-- Backfill: todos los créditos existentes son Libranza
UPDATE credits
SET credit_type_id = (SELECT id FROM credit_types WHERE name = 'Libranza' LIMIT 1)
WHERE credit_type_id IS NULL;

-- 2. requires_entity en credit_types
ALTER TABLE credit_types
  ADD COLUMN IF NOT EXISTS requires_entity boolean DEFAULT true;

UPDATE credit_types SET requires_entity = false WHERE name IN ('Crédito Hipotecario', 'Crédito de Vehículo');
UPDATE credit_types SET requires_entity = true  WHERE name = 'Libranza';

-- Activar hipotecario (available=true)
UPDATE credit_types SET available = true WHERE name = 'Crédito Hipotecario';

-- 3. virtual en financial_entities (para ocultarlas del selector normal)
ALTER TABLE financial_entities
  ADD COLUMN IF NOT EXISTS virtual boolean DEFAULT false;

-- 4. Entidad virtual "Skala Hipotecario"
INSERT INTO financial_entities (name, virtual, requires_full_form, credit_type_ids, cash_fee, bank_fee, pagadurias, primary_color, secondary_color, commissions)
SELECT
  'Skala Hipotecario',
  true,
  true,
  jsonb_build_array((SELECT id::text FROM credit_types WHERE name = 'Crédito Hipotecario' LIMIT 1)),
  0, 0, ARRAY[]::text[], '#3B82F6', '#1E40AF', '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM financial_entities WHERE name = 'Skala Hipotecario');

-- 5. Campos nuevos en field_library para hipotecario
INSERT INTO field_library (internal_name, label, type, category, options, is_system) VALUES
  -- INMUEBLE
  ('inmueble_tipo',         'Tipo de Inmueble',          'select',   'INMUEBLE', '["Casa","Apartamento","Lote","Local Comercial","Bodega","Oficina","Finca"]'::jsonb, false),
  ('inmueble_direccion',    'Dirección del Inmueble',    'text',     'INMUEBLE', '[]'::jsonb, false),
  ('inmueble_ciudad',       'Ciudad del Inmueble',       'text',     'INMUEBLE', '[]'::jsonb, false),
  ('inmueble_matricula',    'Matrícula Inmobiliaria',    'text',     'INMUEBLE', '[]'::jsonb, false),
  ('inmueble_avaluo',       'Avalúo Comercial',          'number',   'INMUEBLE', '[]'::jsonb, false),
  ('inmueble_area',         'Área (m²)',                  'number',   'INMUEBLE', '[]'::jsonb, false),
  ('inmueble_estrato',      'Estrato',                   'select',   'INMUEBLE', '["1","2","3","4","5","6"]'::jsonb, false),
  -- GARANTIA
  ('garantia_tipo',         'Tipo de Garantía',          'select',   'GARANTIA', '["Hipoteca en Primer Grado","Hipoteca en Segundo Grado","Codeudor","Mixta"]'::jsonb, false),
  ('codeudor_nombre',       'Nombre Completo Codeudor',  'text',     'GARANTIA', '[]'::jsonb, false),
  ('codeudor_cedula',       'Cédula Codeudor',           'text',     'GARANTIA', '[]'::jsonb, false),
  ('codeudor_telefono',     'Teléfono Codeudor',         'text',     'GARANTIA', '[]'::jsonb, false),
  ('codeudor_ingresos',     'Ingresos Mensuales Codeudor','number',  'GARANTIA', '[]'::jsonb, false),
  -- CREDITO_HIPOTECARIO
  ('monto_solicitado',      'Monto Solicitado',          'number',   'CREDITO_HIPOTECARIO', '[]'::jsonb, false),
  ('plazo_meses',           'Plazo (meses)',             'number',   'CREDITO_HIPOTECARIO', '[]'::jsonb, false),
  ('cuota_inicial_pct',     'Cuota Inicial (%)',         'number',   'CREDITO_HIPOTECARIO', '[]'::jsonb, false),
  ('destino_credito',       'Destino del Crédito',       'select',   'CREDITO_HIPOTECARIO', '["Compra de Vivienda Nueva","Compra de Vivienda Usada","Construcción","Mejoras","Liberación de Hipoteca","Compra Local Comercial"]'::jsonb, false)
ON CONFLICT (internal_name) DO NOTHING;

-- 6. Asignar campos a la entidad virtual "Skala Hipotecario"
WITH hipo_entity AS (
  SELECT id FROM financial_entities WHERE name = 'Skala Hipotecario' LIMIT 1
),
hipo_fields AS (
  SELECT id, internal_name FROM field_library
  WHERE internal_name IN (
    -- DATOS PERSONALES base
    'nombres','apellidos','tipoDocumento','numeroDocumento','fechaNacimiento','ciudadNacimiento','sexo','ciudadExpedicion','fechaExpedicion','estadoCivil',
    -- CONTACTO
    'correo','telefonoCelular','telefonoFijo',
    -- RESIDENCIA
    'direccionCompleta','barrio','ciudadResidencia',
    -- FINANCIERO
    'gastosMensuales','activos','pasivos',
    -- REF 1
    'ref1Nombre','ref1Telefono','ref1Parentesco',
    -- REF 2
    'ref2Nombre','ref2Telefono','ref2Parentesco',
    -- BENEFICIARIO
    'beneficiarioNombre','beneficiarioCedula','beneficiarioParentesco',
    -- DESEMBOLSO
    'tipoDesembolso','banco','tipoCuenta','numeroCuenta',
    -- HIPOTECARIO (los nuevos)
    'inmueble_tipo','inmueble_direccion','inmueble_ciudad','inmueble_matricula','inmueble_avaluo','inmueble_area','inmueble_estrato',
    'garantia_tipo','codeudor_nombre','codeudor_cedula','codeudor_telefono','codeudor_ingresos',
    'monto_solicitado','plazo_meses','cuota_inicial_pct','destino_credito'
  )
)
INSERT INTO entity_form_fields (entity_id, field_id, required, order_index)
SELECT
  (SELECT id FROM hipo_entity),
  hf.id,
  CASE WHEN hf.internal_name IN ('nombres','apellidos','numeroDocumento','correo','telefonoCelular','direccionCompleta','ciudadResidencia','monto_solicitado','plazo_meses','inmueble_tipo','inmueble_direccion','inmueble_avaluo','destino_credito') THEN true ELSE false END,
  ROW_NUMBER() OVER (ORDER BY hf.internal_name)
FROM hipo_fields hf
WHERE NOT EXISTS (
  SELECT 1 FROM entity_form_fields eff
  WHERE eff.entity_id = (SELECT id FROM hipo_entity)
    AND eff.field_id = hf.id
);

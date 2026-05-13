-- =============================================
-- Alinear campos de hipotecario con el portal real de Habicredit
-- =============================================

-- 1. Añadir campos nuevos específicos de Habicredit
INSERT INTO field_library (internal_name, label, type, category, options, is_system) VALUES
  ('segundoNombre',             'Segundo Nombre (opcional)',         'text',   'DATOS PERSONALES', '[]'::jsonb, false),
  ('segundoApellido',           'Segundo Apellido (opcional)',       'text',   'DATOS PERSONALES', '[]'::jsonb, false),
  ('actividad_economica',       'Actividad Económica',               'select', 'INGRESOS',         '["Asalariado","Pensionado","Independiente"]'::jsonb, false),
  ('tipo_cartera',              'Tipo de Cartera',                   'select', 'CREDITO_VIVIENDA', '["Compra de Vivienda Nueva","Compra de Vivienda Usada","Construcción","Mejoras Locativas","Subrogación","Compra de Cartera Hipotecaria","Crédito con Garantía Hipotecaria"]'::jsonb, false),
  ('tipo_vivienda_credito',     'Tipo de Vivienda',                  'select', 'CREDITO_VIVIENDA', '["VIS (Vivienda de Interés Social)","No VIS","VIP (Vivienda de Interés Prioritario)","Comercial"]'::jsonb, false),
  ('tipo_producto_credito',     'Tipo de Producto',                  'select', 'CREDITO_VIVIENDA', '["Tasa Fija en Pesos","Tasa Variable UVR","Leasing Habitacional","Crédito Constructor"]'::jsonb, false),
  ('banco_preferido',           'Banco Preferido',                   'select', 'BANCO',            '["Banco de Bogotá","Itaú","BBVA","Bancolombia","Av Villas","Credifamilia","Banco Caja Social","Banco de Occidente"]'::jsonb, false),
  ('es_inmueble_habi',          '¿Es inmueble Habi?',                'select', 'INMUEBLE',         '["Sí","No"]'::jsonb, false),
  ('valor_inmueble',            'Valor del Inmueble (COP)',          'number', 'INMUEBLE',         '[]'::jsonb, false),
  ('documento_firmado_cliente', '¿Documento firmado por el cliente?','select', 'TERMINOS',         '["Sí","No"]'::jsonb, false)
ON CONFLICT (internal_name) DO NOTHING;

-- 2. Limpiar de la entidad virtual los campos sembrados antes que Habicredit NO pide
DELETE FROM entity_form_fields
WHERE entity_id = (SELECT id FROM financial_entities WHERE name = 'Skala Hipotecario')
  AND field_id IN (
    SELECT id FROM field_library
    WHERE internal_name IN (
      -- Campos de inmueble que sembré y Habicredit no pide
      'inmueble_tipo','inmueble_matricula','inmueble_area','inmueble_estrato','inmueble_direccion','inmueble_ciudad',
      -- Garantía / codeudor: Habicredit no pide esto al radicar
      'garantia_tipo','codeudor_nombre','codeudor_cedula','codeudor_telefono','codeudor_ingresos',
      -- Otros campos del crédito que no aplican
      'cuota_inicial_pct','destino_credito',
      -- Referencias (Habicredit no pide en radicación)
      'ref1Nombre','ref1Telefono','ref1Parentesco',
      'ref2Nombre','ref2Telefono','ref2Parentesco',
      -- Beneficiario
      'beneficiarioNombre','beneficiarioCedula','beneficiarioParentesco',
      -- Financiero (no lo pide Habicredit en radicación)
      'gastosMensuales','activos','pasivos',
      -- Desembolso (Habicredit no maneja desembolso desde acá)
      'tipoDesembolso','banco','tipoCuenta','numeroCuenta',
      -- Datos personales que Habicredit no pide
      'estadoCivil','ciudadNacimiento','ciudadResidencia','direccionCompleta','barrio','telefonoFijo'
    )
  );

-- 3. Asignar los campos correctos en el orden del portal Habicredit
WITH hipo_entity AS (
  SELECT id FROM financial_entities WHERE name = 'Skala Hipotecario'
),
fields_ordered AS (
  SELECT id, internal_name,
    CASE internal_name
      -- TITULAR Información básica
      WHEN 'nombres'                    THEN 1
      WHEN 'segundoNombre'              THEN 2
      WHEN 'apellidos'                  THEN 3
      WHEN 'segundoApellido'            THEN 4
      WHEN 'fechaNacimiento'            THEN 5
      WHEN 'correo'                     THEN 6
      WHEN 'telefonoCelular'            THEN 7
      -- Datos identificación
      WHEN 'tipoDocumento'              THEN 10
      WHEN 'numeroDocumento'            THEN 11
      WHEN 'ciudadExpedicion'           THEN 12
      WHEN 'fechaExpedicion'            THEN 13
      WHEN 'sexo'                       THEN 14
      -- Ingresos
      WHEN 'actividad_economica'        THEN 20
      -- Crédito de vivienda
      WHEN 'tipo_cartera'               THEN 30
      WHEN 'tipo_vivienda_credito'      THEN 31
      WHEN 'tipo_producto_credito'      THEN 32
      WHEN 'monto_solicitado'           THEN 33
      WHEN 'plazo_meses'                THEN 34
      -- Banco
      WHEN 'banco_preferido'            THEN 40
      -- Inmueble
      WHEN 'es_inmueble_habi'           THEN 50
      WHEN 'valor_inmueble'             THEN 51
      -- Términos
      WHEN 'documento_firmado_cliente'  THEN 60
      ELSE 999
    END AS sort_order
  FROM field_library
  WHERE internal_name IN (
    'nombres','segundoNombre','apellidos','segundoApellido','fechaNacimiento','correo','telefonoCelular',
    'tipoDocumento','numeroDocumento','ciudadExpedicion','fechaExpedicion','sexo',
    'actividad_economica',
    'tipo_cartera','tipo_vivienda_credito','tipo_producto_credito','monto_solicitado','plazo_meses',
    'banco_preferido',
    'es_inmueble_habi','valor_inmueble',
    'documento_firmado_cliente'
  )
)
INSERT INTO entity_form_fields (entity_id, field_id, required, order_index)
SELECT
  (SELECT id FROM hipo_entity),
  f.id,
  -- Campos obligatorios según Habicredit
  CASE WHEN f.internal_name IN (
    'nombres','apellidos','fechaNacimiento','correo','telefonoCelular',
    'tipoDocumento','numeroDocumento','ciudadExpedicion','fechaExpedicion',
    'actividad_economica','tipo_cartera','banco_preferido',
    'valor_inmueble','documento_firmado_cliente',
    'monto_solicitado','plazo_meses'
  ) THEN true ELSE false END,
  f.sort_order
FROM fields_ordered f
WHERE NOT EXISTS (
  SELECT 1 FROM entity_form_fields eff
  WHERE eff.entity_id = (SELECT id FROM hipo_entity)
    AND eff.field_id = f.id
);

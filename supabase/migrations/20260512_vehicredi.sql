-- =============================================
-- Crédito de Vehículo (formulario VehiCredi)
-- =============================================

-- 1. Marcar el tipo "Crédito de Vehículo" como disponible y requires_entity=false
UPDATE credit_types
SET available = true, requires_entity = false
WHERE name = 'Crédito de Vehículo';

-- 2. Entidad virtual "Skala Vehículo"
INSERT INTO financial_entities (name, virtual, requires_full_form, credit_type_ids, cash_fee, bank_fee, pagadurias, primary_color, secondary_color, commissions)
SELECT
  'Skala Vehículo',
  true,
  true,
  jsonb_build_array((SELECT id::text FROM credit_types WHERE name = 'Crédito de Vehículo' LIMIT 1)),
  0, 0, ARRAY[]::text[], '#10B981', '#065F46', '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM financial_entities WHERE name = 'Skala Vehículo');

-- 3. Añadir columna `condition` para renderizado condicional
ALTER TABLE entity_form_fields
  ADD COLUMN IF NOT EXISTS condition jsonb DEFAULT NULL;

-- 4. Sembrar campos específicos de VehiCredi (los que no existen ya en la biblioteca)
INSERT INTO field_library (internal_name, label, type, category, options, is_system) VALUES
  -- DATOS DEL CRÉDITO
  ('credito_o_leasing',       'Modalidad',                'select', 'CREDITO_VEHICULO', '["Crédito","Leasing"]'::jsonb, false),
  ('rol_solicitante',         'Rol del Solicitante',      'select', 'CREDITO_VEHICULO', '["Deudor","Codeudor"]'::jsonb, false),
  ('fecha_diligenciamiento',  'Fecha de Diligenciamiento','date',   'CREDITO_VEHICULO', '[]'::jsonb, false),
  ('ciudad_diligenciamiento', 'Ciudad',                   'text',   'CREDITO_VEHICULO', '[]'::jsonb, false),
  ('linea_vehiculo',          'Línea de Vehículo (Adquisición / CxC / Libre Inversión con prenda)', 'select', 'CREDITO_VEHICULO', '["Adquisición","Compra de Cartera","Libre Inversión con Prenda"]'::jsonb, false),
  ('tipo_vehiculo',           'Tipo de Vehículo',         'select', 'VEHICULO', '["Auto","Moto"]'::jsonb, false),
  ('uso_vehiculo',            'Nuevo o Usado',            'select', 'VEHICULO', '["Nuevo","Usado"]'::jsonb, false),
  ('marca_vehiculo',          'Marca',                    'text',   'VEHICULO', '[]'::jsonb, false),
  ('modelo_vehiculo',         'Modelo (año)',             'text',   'VEHICULO', '[]'::jsonb, false),
  ('referencia_vehiculo',     'Referencia',               'text',   'VEHICULO', '[]'::jsonb, false),
  ('valor_vehiculo',          'Valor del Vehículo (COP)', 'number', 'VEHICULO', '[]'::jsonb, false),
  ('plan_financiacion',       'Plan de Financiación',     'text',   'CREDITO_VEHICULO', '[]'::jsonb, false),
  ('cuota_inicial_vehiculo',  'Cuota Inicial (COP)',      'number', 'CREDITO_VEHICULO', '[]'::jsonb, false),
  ('valor_a_financiar',       'Valor a Financiar (COP)',  'number', 'CREDITO_VEHICULO', '[]'::jsonb, false),
  ('porcentaje_financiacion', '% Financiación',           'number', 'CREDITO_VEHICULO', '[]'::jsonb, false),
  ('servicio_vehiculo',       'Servicio',                 'select', 'VEHICULO', '["Particular","Público"]'::jsonb, false),
  ('otras_garantias',         'Otras Garantías Ofrecidas','textarea','CREDITO_VEHICULO', '[]'::jsonb, false),

  -- DATOS PERSONALES extras VehiCredi
  ('nacionalidad',            'Nacionalidad',             'text',   'DATOS PERSONALES', '[]'::jsonb, false),
  ('edad',                    'Edad',                     'number', 'DATOS PERSONALES', '[]'::jsonb, false),
  ('personas_a_cargo',        'Personas a Cargo',         'number', 'DATOS PERSONALES', '[]'::jsonb, false),
  ('tipo_vivienda_residencia','Tipo de Vivienda',         'select', 'RESIDENCIA', '["Familiar","Propia","Arriendo"]'::jsonb, false),
  ('nivel_estudios',          'Nivel de Estudios',        'select', 'DATOS PERSONALES', '["Primaria","Bachiller","Técnico","Tecnólogo","Profesional","Especialización","Maestría","Doctorado"]'::jsonb, false),
  ('titulo_profesional',      'Título Profesional',       'text',   'DATOS PERSONALES', '[]'::jsonb, false),
  ('pais_residencia',         'País de Residencia',       'text',   'RESIDENCIA', '[]'::jsonb, false),
  ('estrato_residencia',      'Estrato',                  'select', 'RESIDENCIA', '["1","2","3","4","5","6"]'::jsonb, false),
  ('tiempo_residencia_meses', 'Tiempo en Residencia Actual (meses)', 'number', 'RESIDENCIA', '[]'::jsonb, false),

  -- DATOS LABORALES TITULAR
  ('declara_renta',           'Declara Renta',            'select', 'LABORAL', '["Sí","No"]'::jsonb, false),
  ('nombre_empleador',        'Nombre del Empleador',     'text',   'LABORAL', '[]'::jsonb, false),
  ('fecha_ingreso_empleo',    'Fecha de Ingreso',         'date',   'LABORAL', '[]'::jsonb, false),
  ('cargo_empleo',            'Cargo',                    'text',   'LABORAL', '[]'::jsonb, false),
  ('salario_empleo',          'Salario (COP)',            'number', 'LABORAL', '[]'::jsonb, false),
  ('tipo_contrato',           'Tipo de Contrato',         'select', 'LABORAL', '["Indefinido","Fijo","Obra/Labor","Prestación de Servicios","Aprendizaje"]'::jsonb, false),
  ('telefono_empresa',        'Teléfono Empresa',         'text',   'LABORAL', '[]'::jsonb, false),
  ('extension_empresa',       'Extensión',               'text',   'LABORAL', '[]'::jsonb, false),
  ('direccion_empresa',       'Dirección Empresa/Local',  'text',   'LABORAL', '[]'::jsonb, false),
  ('barrio_empresa',          'Barrio Empresa',           'text',   'LABORAL', '[]'::jsonb, false),
  ('ciudad_empresa',          'Ciudad Empresa',           'text',   'LABORAL', '[]'::jsonb, false),
  ('pais_empresa',            'País Empresa',             'text',   'LABORAL', '[]'::jsonb, false),

  -- Si es Independiente
  ('nit',                     'NIT',                      'text',   'INDEPENDIENTE', '[]'::jsonb, false),
  ('tipo_actividad_indep',    'Tipo de Actividad',        'text',   'INDEPENDIENTE', '[]'::jsonb, false),
  ('codigo_ciiu',             'Código CIIU',              'text',   'INDEPENDIENTE', '[]'::jsonb, false),
  ('descripcion_actividad',   'Descripción Actividad',    'text',   'INDEPENDIENTE', '[]'::jsonb, false),

  -- DATOS FINANCIEROS
  ('ingresos_mensuales',      'Ingresos / Ventas Mensuales (COP)', 'number', 'FINANCIERO', '[]'::jsonb, false),
  ('descripcion_origen_fondos','Descripción Origen de Fondos','textarea', 'FINANCIERO', '[]'::jsonb, false),
  ('otros_ingresos_mensuales','Otros Ingresos Mensuales (COP)', 'number', 'FINANCIERO', '[]'::jsonb, false),
  ('descripcion_otros_ingresos','Descripción Otros Ingresos','text', 'FINANCIERO', '[]'::jsonb, false),
  ('egresos_mensuales',       'Egresos Mensuales (COP)',  'number', 'FINANCIERO', '[]'::jsonb, false),
  ('total_activos',           'Total Activos (COP)',      'number', 'FINANCIERO', '[]'::jsonb, false),
  ('total_pasivos',           'Total Pasivos (COP)',      'number', 'FINANCIERO', '[]'::jsonb, false),

  -- REFERENCIAS VehiCredi (las 3)
  ('ref_familiar_nombre',     'Referencia Familiar - Nombre',   'text', 'REFERENCIAS', '[]'::jsonb, false),
  ('ref_familiar_ciudad_dpto','Referencia Familiar - Ciudad y Dpto', 'text', 'REFERENCIAS', '[]'::jsonb, false),
  ('ref_familiar_telefono',   'Referencia Familiar - Teléfono', 'text', 'REFERENCIAS', '[]'::jsonb, false),
  ('ref_personal_nombre',     'Referencia Personal - Nombre',   'text', 'REFERENCIAS', '[]'::jsonb, false),
  ('ref_personal_ciudad_dpto','Referencia Personal - Ciudad y Dpto', 'text', 'REFERENCIAS', '[]'::jsonb, false),
  ('ref_personal_telefono',   'Referencia Personal - Teléfono', 'text', 'REFERENCIAS', '[]'::jsonb, false),
  ('ref_comercial_nombre',    'Referencia Comercial - Nombre',  'text', 'REFERENCIAS', '[]'::jsonb, false),
  ('ref_comercial_ciudad_dpto','Referencia Comercial - Ciudad y Dpto', 'text', 'REFERENCIAS', '[]'::jsonb, false),
  ('ref_comercial_telefono',  'Referencia Comercial - Teléfono','text', 'REFERENCIAS', '[]'::jsonb, false),

  -- CÓNYUGE (condicional: estado civil casado/unión libre)
  ('conyuge_nombre_completo', 'Nombre y Apellido Cónyuge','text',   'CONYUGE', '[]'::jsonb, false),
  ('conyuge_cedula',          'Cédula Cónyuge',           'text',   'CONYUGE', '[]'::jsonb, false),
  ('conyuge_fecha_expedicion','Fecha Expedición Cónyuge', 'date',   'CONYUGE', '[]'::jsonb, false),
  ('conyuge_ciudad_nacimiento','Ciudad Nacimiento Cónyuge','text',   'CONYUGE', '[]'::jsonb, false),
  ('conyuge_nacionalidad',    'Nacionalidad Cónyuge',     'text',   'CONYUGE', '[]'::jsonb, false),
  ('conyuge_genero',          'Género Cónyuge',           'select', 'CONYUGE', '["Masculino","Femenino"]'::jsonb, false),
  ('conyuge_fecha_nacimiento','Fecha Nacimiento Cónyuge', 'date',   'CONYUGE', '[]'::jsonb, false),
  ('conyuge_edad',            'Edad Cónyuge',             'number', 'CONYUGE', '[]'::jsonb, false),
  ('conyuge_actividad',       'Actividad Cónyuge',        'select', 'CONYUGE', '["Asalariado","Pensionado","Independiente"]'::jsonb, false),
  ('conyuge_declara_renta',   'Declara Renta Cónyuge',    'select', 'CONYUGE', '["Sí","No"]'::jsonb, false),
  ('conyuge_empleador',       'Empleador Cónyuge',        'text',   'CONYUGE', '[]'::jsonb, false),
  ('conyuge_fecha_ingreso',   'Fecha Ingreso Cónyuge',    'date',   'CONYUGE', '[]'::jsonb, false),
  ('conyuge_cargo',           'Cargo Cónyuge',            'text',   'CONYUGE', '[]'::jsonb, false),
  ('conyuge_salario',         'Salario Cónyuge (COP)',    'number', 'CONYUGE', '[]'::jsonb, false),
  ('conyuge_tipo_contrato',   'Tipo Contrato Cónyuge',    'text',   'CONYUGE', '[]'::jsonb, false),
  ('conyuge_telefono_empresa','Teléfono Empresa Cónyuge', 'text',   'CONYUGE', '[]'::jsonb, false),
  ('conyuge_ingresos',        'Ingresos Cónyuge (COP)',   'number', 'CONYUGE', '[]'::jsonb, false),
  ('conyuge_egresos',         'Egresos Cónyuge (COP)',    'number', 'CONYUGE', '[]'::jsonb, false),
  ('conyuge_activos',         'Total Activos Cónyuge (COP)','number','CONYUGE', '[]'::jsonb, false),
  ('conyuge_pasivos',         'Total Pasivos Cónyuge (COP)','number','CONYUGE', '[]'::jsonb, false),

  -- AUTORIZACIÓN
  ('tipo_cuenta_bancaria',    'Tipo de Cuenta Bancaria',  'select', 'AUTORIZACION', '["Ahorros","Corriente"]'::jsonb, false),
  ('ciudad_firma',            'Ciudad de Firma',          'text',   'AUTORIZACION', '[]'::jsonb, false),
  ('fecha_firma',             'Fecha de Firma',           'date',   'AUTORIZACION', '[]'::jsonb, false)

ON CONFLICT (internal_name) DO NOTHING;

-- 5. Asignar campos a "Skala Vehículo"
WITH veh_entity AS (
  SELECT id FROM financial_entities WHERE name = 'Skala Vehículo'
),
field_config AS (
  SELECT internal_name, sort_order, is_required, conyuge_cond
  FROM (VALUES
    -- DATOS DEL CRÉDITO (orden 1-20)
    ('credito_o_leasing',        1,  true,  false),
    ('rol_solicitante',          2,  true,  false),
    ('fecha_diligenciamiento',   3,  true,  false),
    ('ciudad_diligenciamiento',  4,  true,  false),
    ('linea_vehiculo',           5,  true,  false),
    ('tipo_vehiculo',            6,  true,  false),
    ('uso_vehiculo',             7,  true,  false),
    ('marca_vehiculo',           8,  true,  false),
    ('modelo_vehiculo',          9,  true,  false),
    ('referencia_vehiculo',     10,  false, false),
    ('plazo_meses',             11,  true,  false),
    ('valor_vehiculo',          12,  true,  false),
    ('plan_financiacion',       13,  false, false),
    ('cuota_inicial_vehiculo',  14,  true,  false),
    ('valor_a_financiar',       15,  true,  false),
    ('porcentaje_financiacion', 16,  false, false),
    ('servicio_vehiculo',       17,  true,  false),
    ('otras_garantias',         18,  false, false),
    -- DATOS PERSONALES (21-50)
    ('nombres',                 21,  true,  false),
    ('apellidos',               22,  true,  false),
    ('segundoApellido',         23,  false, false),
    ('tipoDocumento',           24,  true,  false),
    ('numeroDocumento',         25,  true,  false),
    ('fechaExpedicion',         26,  true,  false),
    ('ciudadExpedicion',        27,  true,  false),
    ('ciudadNacimiento',        28,  true,  false),
    ('nacionalidad',            29,  true,  false),
    ('sexo',                    30,  true,  false),
    ('fechaNacimiento',         31,  true,  false),
    ('edad',                    32,  true,  false),
    ('estadoCivil',             33,  true,  false),
    ('personas_a_cargo',        34,  false, false),
    ('tipo_vivienda_residencia',35,  true,  false),
    ('nivel_estudios',          36,  false, false),
    ('titulo_profesional',      37,  false, false),
    ('direccionCompleta',       38,  true,  false),
    ('barrio',                  39,  true,  false),
    ('ciudadResidencia',        40,  true,  false),
    ('pais_residencia',         41,  false, false),
    ('estrato_residencia',      42,  false, false),
    ('tiempo_residencia_meses', 43,  false, false),
    ('correo',                  44,  true,  false),
    ('telefonoCelular',         45,  true,  false),
    ('telefonoFijo',            46,  false, false),
    -- DATOS LABORALES (60-80)
    ('actividad_economica',     60,  true,  false),
    ('declara_renta',           61,  true,  false),
    ('nombre_empleador',        62,  true,  false),
    ('fecha_ingreso_empleo',    63,  true,  false),
    ('cargo_empleo',            64,  true,  false),
    ('salario_empleo',          65,  true,  false),
    ('tipo_contrato',           66,  true,  false),
    ('telefono_empresa',        67,  false, false),
    ('extension_empresa',       68,  false, false),
    ('direccion_empresa',       69,  false, false),
    ('barrio_empresa',          70,  false, false),
    ('ciudad_empresa',          71,  false, false),
    ('pais_empresa',            72,  false, false),
    -- INDEPENDIENTE (80-89): obligatorios SOLO si actividad_economica = Independiente
    ('nit',                     80,  false, false),
    ('tipo_actividad_indep',    81,  false, false),
    ('codigo_ciiu',             82,  false, false),
    ('descripcion_actividad',   83,  false, false),
    -- FINANCIEROS (90-99)
    ('ingresos_mensuales',      90,  true,  false),
    ('descripcion_origen_fondos',91, false, false),
    ('otros_ingresos_mensuales',92,  false, false),
    ('descripcion_otros_ingresos',93,false, false),
    ('egresos_mensuales',       94,  true,  false),
    ('total_activos',           95,  true,  false),
    ('total_pasivos',           96,  true,  false),
    -- REFERENCIAS (100-115): TODAS obligatorias
    ('ref_familiar_nombre',     100, true,  false),
    ('ref_familiar_ciudad_dpto',101, true,  false),
    ('ref_familiar_telefono',   102, true,  false),
    ('ref_personal_nombre',     103, true,  false),
    ('ref_personal_ciudad_dpto',104, true,  false),
    ('ref_personal_telefono',   105, true,  false),
    ('ref_comercial_nombre',    106, true,  false),
    ('ref_comercial_ciudad_dpto',107,true,  false),
    ('ref_comercial_telefono',  108, true,  false),
    -- CÓNYUGE (200-230): condicional al estado civil
    ('conyuge_nombre_completo', 200, true,  true),
    ('conyuge_cedula',          201, true,  true),
    ('conyuge_fecha_expedicion',202, true,  true),
    ('conyuge_ciudad_nacimiento',203,true,  true),
    ('conyuge_nacionalidad',    204, true,  true),
    ('conyuge_genero',          205, true,  true),
    ('conyuge_fecha_nacimiento',206, true,  true),
    ('conyuge_edad',            207, true,  true),
    ('conyuge_actividad',       208, true,  true),
    ('conyuge_declara_renta',   209, true,  true),
    ('conyuge_empleador',       210, false, true),
    ('conyuge_fecha_ingreso',   211, false, true),
    ('conyuge_cargo',           212, false, true),
    ('conyuge_salario',         213, false, true),
    ('conyuge_tipo_contrato',   214, false, true),
    ('conyuge_telefono_empresa',215, false, true),
    ('conyuge_ingresos',        216, true,  true),
    ('conyuge_egresos',         217, false, true),
    ('conyuge_activos',         218, false, true),
    ('conyuge_pasivos',         219, false, true),
    -- AUTORIZACIÓN
    ('tipo_cuenta_bancaria',    250, true,  false),
    ('ciudad_firma',            251, true,  false),
    ('fecha_firma',             252, true,  false)
  ) AS t(internal_name, sort_order, is_required, conyuge_cond)
)
INSERT INTO entity_form_fields (entity_id, field_id, required, order_index, condition)
SELECT
  (SELECT id FROM veh_entity),
  fl.id,
  fc.is_required,
  fc.sort_order,
  CASE
    WHEN fc.conyuge_cond THEN '{"field":"estadoCivil","in":["Casado","Casado(a)","Unión libre","Union libre"]}'::jsonb
    ELSE NULL
  END
FROM field_config fc
JOIN field_library fl ON fl.internal_name = fc.internal_name
WHERE NOT EXISTS (
  SELECT 1 FROM entity_form_fields eff
  WHERE eff.entity_id = (SELECT id FROM veh_entity)
    AND eff.field_id = fl.id
);

import { PDFDocument } from 'pdf-lib';

const TEMPLATE_URL = '/templates/vehicredi.pdf';

// ============ MAPEO internal_name → PDF AcroForm field name ============
// El PDF tiene 134 campos. Llenamos por NOMBRE (no coordenadas).
// Fechas se parten en DD / MM / AA. Checkboxes se marcan según el valor.

interface DateMap { dd: string; mm: string; aa: string; }

// Campos de texto simples
const TEXT_FIELD_MAP: Record<string, string> = {
  // -- DATOS DEL CRÉDITO
  linea_vehiculo:            'Línea de vehículo',
  marca_vehiculo:            'Marca',
  modelo_vehiculo:           'MODELO',
  referencia_vehiculo:       'Referencia',
  valor_vehiculo:            'Valor vehículo',
  plazo_meses:               'Plazomeses',
  plan_financiacion:         'Plan de financiación',
  cuota_inicial_vehiculo:    'Cuota inicial',
  valor_a_financiar:         'Valor a financiar',
  porcentaje_financiacion:   'financiación',
  otras_garantias:           'Otras garantías ofrecidas',
  fecha_diligenciamiento:    'FECHA DILIGENCIAMIENTO',
  ciudad_diligenciamiento:   'CIUDAD',

  // -- TITULAR datos personales
  apellidos:                 'Primer Apellido',
  segundoApellido:           'Segundo Apellido',
  nombres:                   'Nombres',
  numeroDocumento:           'Número documento',
  ciudadNacimiento:          'Ciudad de Nacimiento',
  nacionalidad:               'Nacionalidad',
  estadoCivil:               'Estado Civil',
  personas_a_cargo:          'Personas a Cargo',
  edad:                      'Edad',
  titulo_profesional:        'Título Profesional',
  nivel_estudios:            'Nivel de Estudios',
  direccionCompleta:         'Dirección residencia',
  barrio:                    'Barrio residencia',
  ciudadResidencia:          'Ciudad',
  pais_residencia:           'País',
  estrato_residencia:        'ESTRATO',
  tiempo_residencia_meses:   'Tiempo en residencia actualmeses',
  correo:                    'Correo electrónico',
  telefonoCelular:           'Teléfono Celular',
  telefonoFijo:              'Teléfono Fijo',

  // -- TITULAR datos laborales
  nombre_empleador:          'Nombre del empleador',
  cargo_empleo:              'Cargo',
  salario_empleo:            'Salario',
  tipo_contrato:             'Tipo de contrato',
  telefono_empresa:          'Telefono empresa',
  extension_empresa:         'Extensión',
  direccion_empresa:         'Dirección EmpresaLocal',
  barrio_empresa:            'Barrio',
  ciudad_empresa:            'Ciudad_2',
  pais_empresa:              'País_2',

  // -- INDEPENDIENTE
  nit:                       'NIT',
  tipo_actividad_indep:      'Tipo de actividad',
  codigo_ciiu:               'Código CIIU',
  descripcion_actividad:     'Descripción Actividad',

  // -- FINANCIEROS
  ingresos_mensuales:        'Ingresos  Ventas mensuales',
  descripcion_origen_fondos: 'Descripción declaración origen de fondos',
  otros_ingresos_mensuales:  'Otros Ingresos mensuales',
  descripcion_otros_ingresos:'Descripción otros ingresos mensuales',
  egresos_mensuales:         'Egresos Mensuales',
  total_activos:             'Total Activos',
  total_pasivos:             'Total Pasivos',

  // -- REFERENCIAS (3) — Nombre / Nombre_2 / Nombre_3 + Ciudad y dpto / Telefono
  ref_familiar_nombre:        'Nombre',
  ref_familiar_ciudad_dpto:   'Ciudad y departamento',
  ref_familiar_telefono:      'Telefono',
  ref_personal_nombre:        'Nombre_2',
  ref_personal_ciudad_dpto:   'Ciudad y departamento_2',
  ref_personal_telefono:      'Telefono_2',
  ref_comercial_nombre:       'Nombre_3',
  ref_comercial_ciudad_dpto:  'Ciudad y departamento_3',
  ref_comercial_telefono:     'Telefono_3',

  // -- CÓNYUGE (HOJA 2)
  conyuge_nombre_completo:   'Nombre y Apelido HOJA 2',
  conyuge_cedula:            'Número CC HOJA 2',
  conyuge_ciudad_nacimiento: 'Ciudad de Nacimiento HOJA 2',
  conyuge_nacionalidad:      'Nacionalidas HOJA 2',
  conyuge_edad:              'Edad HOJA 2',
  conyuge_empleador:         'Nombre de empleador HOJA 2',
  conyuge_cargo:             'Cargo HOJA 2',
  conyuge_salario:           'Salario HOJA 2',
  conyuge_tipo_contrato:     'Tipo de contrato HOJA 2',
  conyuge_telefono_empresa:  'Telefono empresa HOJA 2',
  conyuge_ingresos:          'Ingresos  Ventas mensuales HOJA 2',
  conyuge_egresos:           'Egresos Mensuales HOJA 2',
  conyuge_activos:           'Total Activos HOJA 2',
  conyuge_pasivos:           'Total Pasivos HOJA 2',

  // -- AUTORIZACIÓN (HOJA 2) — campos que se rellenan con derivados
  ciudad_firma:              'Ciudad_2 HOJA 2',
  fecha_firma:               'Fecha HOJA 2',
};

// Fechas split DD/MM/AA — mapeo internal_name → triplete de field names
const DATE_FIELD_MAP: Record<string, DateMap> = {
  fechaExpedicion:       { dd: 'DD',         mm: 'MM',         aa: 'AA' },
  fechaNacimiento:       { dd: 'DD_2',       mm: 'MM_2',       aa: 'AA_2' },
  fecha_ingreso_empleo:  { dd: 'DD_3',       mm: 'MM_3',       aa: 'AA_3' },
  conyuge_fecha_expedicion: { dd: 'DD HOJA 2',   mm: 'MM HOJA 2',   aa: 'AA HOJA 2' },
  conyuge_fecha_nacimiento: { dd: 'DD_2 HOJA 2', mm: 'MM_2 HOJA 2', aa: 'AA_2 HOJA 2' },
  conyuge_fecha_ingreso:    { dd: 'DD_3 HOJA 2', mm: 'MM_3 HOJA 2', aa: 'AA_3 HOJA 2' },
};

// Checkboxes — mapeo internal_name → { valor_app: nombre_checkbox_pdf }
// Si el valor de formData coincide con la clave, se marca esa casilla.
const CHECKBOX_GROUPS: Record<string, Record<string, string>> = {
  credito_o_leasing: {
    'Crédito': 'credito',
    'Leasing': 'leasing',
  },
  rol_solicitante: {
    'Deudor': 'DEUDOR',
    'Codeudor': 'CODEUDOR',
  },
  tipo_vehiculo: {
    'Auto': 'AUTO',
    'Moto': 'MOTO',
  },
  uso_vehiculo: {
    'Nuevo': 'NUEVO',
    'Usado': 'USADO',
  },
  servicio_vehiculo: {
    'Particular': 'PARTICULAR',
    'Público': 'PUBLICO',
    'Publico': 'PUBLICO',
  },
  tipoDocumento: {
    'Cédula de Ciudadanía': 'CC',
    'Cedula de Ciudadania': 'CC',
    'CC': 'CC',
    'Cédula de Extranjería': 'CE',
    'CE': 'CE',
  },
  sexo: {
    'M': 'MASCULINO',
    'Masculino': 'MASCULINO',
    'F': 'FEMENINO',
    'Femenino': 'FEMENINO',
  },
  tipo_vivienda_residencia: {
    'Familiar': 'FAMILIAR',
    'Propia': 'PROPIA',
    'Arriendo': 'ARRIENDO',
  },
  actividad_economica: {
    'Asalariado': 'ASALARIADO',
    'Independiente': 'INDEPENDIENTE',
    'Pensionado': 'PENSIONADO',
  },
  declara_renta: {
    'Sí': 'SI DECLARA',
    'Si': 'SI DECLARA',
    'No': 'NO DECLARA',
  },
  // Cónyuge: en el PDF las casillas se llaman simplemente "GENERO", "ACTIVIDAD",
  // "DECLARA RENTA" — son checkboxes binarios; no podemos saber por nombre cuál
  // estado representa cada uno, así que solo marcamos si el valor es no vacío.
};

// Para los campos de cónyuge GENERO / ACTIVIDAD / DECLARA RENTA — un solo
// checkbox por campo: lo marcamos sólo cuando el valor lo amerita.
const CONYUGE_SINGLE_CHECKBOX: Record<string, { fieldName: string; checkIf: (v: any) => boolean }> = {
  conyuge_genero:        { fieldName: 'GENERO',        checkIf: v => v === 'Femenino' },
  conyuge_actividad:     { fieldName: 'ACTIVIDAD',     checkIf: v => v === 'Asalariado' },
  conyuge_declara_renta: { fieldName: 'DECLARA RENTA', checkIf: v => v === 'Sí' || v === 'Si' },
};

const parseDate = (value: string): DateMap => {
  if (!value) return { dd: '', mm: '', aa: '' };
  let dd = '', mm = '', aa = '';
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    [aa, mm, dd] = value.split('T')[0].split('-');
  } else if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(value)) {
    const parts = value.split(/[\/\-]/);
    dd = parts[0].padStart(2, '0');
    mm = parts[1].padStart(2, '0');
    aa = parts[2];
  }
  if (aa.length === 4) aa = aa.slice(2);
  return { dd, mm, aa };
};

const formatNumber = (v: any): string => {
  if (v === null || v === undefined || v === '') return '';
  const n = Number(v);
  if (isNaN(n)) return String(v);
  // Formato colombiano: $ 95.000.000
  return n.toLocaleString('es-CO');
};

const trySetTextField = (form: any, name: string, value: any): void => {
  if (value === null || value === undefined || value === '') return;
  try {
    const field = form.getTextField(name);
    const str = typeof value === 'number' ? formatNumber(value) : String(value);
    field.setText(str);
  } catch {
    // El field no existe — ignorar silenciosamente
  }
};

const tryCheck = (form: any, name: string): void => {
  try {
    form.getCheckBox(name).check();
  } catch {
    // ignorar
  }
};

/**
 * Genera el PDF VehiCredi prellenado usando AcroForm fields del PDF original.
 */
export async function generateVehicrediPdf(data: Record<string, any>): Promise<Blob> {
  const resp = await fetch(TEMPLATE_URL);
  if (!resp.ok) {
    throw new Error(`No se pudo cargar la plantilla VehiCredi (${resp.status}). Verifica que /public/templates/vehicredi.pdf exista.`);
  }
  const templateBytes = await resp.arrayBuffer();
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();

  // 1. Campos de texto simples
  for (const [internalName, pdfFieldName] of Object.entries(TEXT_FIELD_MAP)) {
    trySetTextField(form, pdfFieldName, data[internalName]);
  }

  // 2. Fechas split DD/MM/AA
  for (const [internalName, dateMap] of Object.entries(DATE_FIELD_MAP)) {
    const value = data[internalName];
    if (!value) continue;
    const { dd, mm, aa } = parseDate(String(value));
    trySetTextField(form, dateMap.dd, dd);
    trySetTextField(form, dateMap.mm, mm);
    trySetTextField(form, dateMap.aa, aa);
  }

  // 3. Checkboxes en grupos (radio-style)
  for (const [internalName, options] of Object.entries(CHECKBOX_GROUPS)) {
    const value = data[internalName];
    if (!value) continue;
    const pdfFieldName = options[String(value)];
    if (pdfFieldName) tryCheck(form, pdfFieldName);
  }

  // 4. Cónyuge — single checkboxes
  for (const [internalName, cfg] of Object.entries(CONYUGE_SINGLE_CHECKBOX)) {
    if (cfg.checkIf(data[internalName])) tryCheck(form, cfg.fieldName);
  }

  // 5. Autorización HOJA 2 — campos derivados (nombre completo + cédula)
  const nombreCompleto = `${data.nombres || ''} ${data.segundoNombre || ''} ${data.apellidos || ''} ${data.segundoApellido || ''}`.replace(/\s+/g, ' ').trim();
  const cedula = String(data.numeroDocumento || '');
  // Primera cláusula
  trySetTextField(form, 'Yo HOJA 2', nombreCompleto);
  trySetTextField(form, 'Identificado con la cedula de ciudadanía HOJA 2', cedula);
  // Segunda cláusula (extractos)
  trySetTextField(form, 'Yo_2 HOJA 2', nombreCompleto);
  trySetTextField(form, 'identificadoa con CC   CE   No HOJA 2', cedula);

  // 6. "Aplanar" el formulario para que el texto quede impreso (no editable)
  // Comentarlo si prefieres dejarlo editable para correcciones manuales.
  form.flatten();

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/** Helper que descarga el PDF generado en el navegador. */
export async function downloadVehicrediPdf(data: Record<string, any>, filename?: string): Promise<void> {
  const blob = await generateVehicrediPdf(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const ced = (data.numeroDocumento || 'sin-cedula').toString().replace(/\D/g, '');
  a.download = filename || `VehiCredi_${ced}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

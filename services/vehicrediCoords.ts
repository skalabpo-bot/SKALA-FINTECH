// Mapa de coordenadas para llenar el PDF VehiCredi.
//
// PDF estándar (Letter): 612 x 792 puntos. Origen en (0,0) = esquina inferior izquierda.
// Si un texto sale desalineado, ajusta x/y aquí — son valores estimados a partir
// del layout visual del formulario y conviene refinarlos abriendo el PDF con un
// medidor (Adobe Acrobat → Herramientas → Medida, o pdfescape.com).
//
// type especial:
//  - 'text' (default): escribe el valor como string
//  - 'checkbox': marca una "X" si el valor coincide con `checkIfEquals`
//  - 'split-date': parte una fecha DD/MM/AAAA o YYYY-MM-DD en 3 campos (DD, MM, AA)

export type CoordType = 'text' | 'checkbox' | 'split-date';

export interface FieldCoord {
  page: number;          // 1 = primera página, 2 = segunda
  x: number;
  y: number;
  size?: number;         // tamaño de fuente, default 9
  maxWidth?: number;     // recortar si excede (opcional)
  type?: CoordType;
  checkIfEquals?: string;
  // Para 'split-date': posiciones de DD, MM, AA respectivamente
  dd?: { x: number; y: number };
  mm?: { x: number; y: number };
  aa?: { x: number; y: number };
}

// Estimaciones iniciales basadas en el layout visual del PDF.
// Si tu PDF tiene dimensiones distintas o el layout difiere, ajusta aquí.
// Mantengo size=9 por defecto (texto pequeño que cabe en cajas).
export const VEHICREDI_COORDS: Record<string, FieldCoord> = {
  // ============ PÁGINA 1: TITULAR ============

  // -- DATOS DEL CRÉDITO (esquina superior izquierda)
  'credito_o_leasing':       { page: 1, x: 90,  y: 717, type: 'checkbox', checkIfEquals: 'Crédito' },
  'rol_solicitante':         { page: 1, x: 240, y: 717, type: 'checkbox', checkIfEquals: 'Deudor' },
  'fecha_diligenciamiento':  { page: 1, x: 440, y: 720 },
  'ciudad_diligenciamiento': { page: 1, x: 440, y: 705 },

  'linea_vehiculo':          { page: 1, x: 150, y: 685 },
  'tipo_vehiculo':           { page: 1, x: 340, y: 685, type: 'checkbox', checkIfEquals: 'Auto' },
  'uso_vehiculo':            { page: 1, x: 510, y: 685, type: 'checkbox', checkIfEquals: 'Usado' },
  'marca_vehiculo':          { page: 1, x: 150, y: 670 },
  'modelo_vehiculo':         { page: 1, x: 400, y: 670 },

  'referencia_vehiculo':     { page: 1, x: 150, y: 655 },
  'valor_vehiculo':          { page: 1, x: 280, y: 655 },
  'plazo_meses':             { page: 1, x: 430, y: 655 },
  'plan_financiacion':       { page: 1, x: 500, y: 655 },

  'cuota_inicial_vehiculo':  { page: 1, x: 150, y: 640 },
  'valor_a_financiar':       { page: 1, x: 300, y: 640 },
  'porcentaje_financiacion': { page: 1, x: 530, y: 640 },

  'servicio_vehiculo':       { page: 1, x: 175, y: 622, type: 'checkbox', checkIfEquals: 'Particular' },
  'otras_garantias':         { page: 1, x: 320, y: 622, maxWidth: 280 },

  // -- DATOS PERSONALES TITULAR
  'apellidos':               { page: 1, x: 130, y: 580 },
  'segundoApellido':         { page: 1, x: 305, y: 580 },
  'nombres':                 { page: 1, x: 480, y: 580 },

  'tipoDocumento':           { page: 1, x: 170, y: 562, type: 'checkbox', checkIfEquals: 'C.C' },
  'numeroDocumento':         { page: 1, x: 290, y: 562 },
  'fechaExpedicion':         { page: 1, x: 480, y: 562, type: 'split-date',
                                dd: { x: 480, y: 562 }, mm: { x: 510, y: 562 }, aa: { x: 540, y: 562 } },

  'ciudadNacimiento':        { page: 1, x: 130, y: 544 },
  'nacionalidad':            { page: 1, x: 305, y: 544 },
  'sexo':                    { page: 1, x: 415, y: 544, type: 'checkbox', checkIfEquals: 'M' },
  'fechaNacimiento':         { page: 1, x: 480, y: 544, type: 'split-date',
                                dd: { x: 480, y: 544 }, mm: { x: 510, y: 544 }, aa: { x: 540, y: 544 } },
  'edad':                    { page: 1, x: 540, y: 530 },

  'estadoCivil':             { page: 1, x: 130, y: 525 },
  'personas_a_cargo':        { page: 1, x: 290, y: 525 },
  'tipo_vivienda_residencia':{ page: 1, x: 425, y: 525, type: 'checkbox', checkIfEquals: 'Propia' },

  'nivel_estudios':          { page: 1, x: 130, y: 508 },
  'titulo_profesional':      { page: 1, x: 305, y: 508 },
  'direccionCompleta':       { page: 1, x: 480, y: 508 },

  'barrio':                  { page: 1, x: 130, y: 491 },
  'ciudadResidencia':        { page: 1, x: 250, y: 491 },
  'pais_residencia':         { page: 1, x: 370, y: 491 },
  'estrato_residencia':      { page: 1, x: 460, y: 491 },
  'tiempo_residencia_meses': { page: 1, x: 530, y: 491 },

  'correo':                  { page: 1, x: 130, y: 474 },
  'telefonoCelular':         { page: 1, x: 350, y: 474 },
  'telefonoFijo':            { page: 1, x: 510, y: 474 },

  // -- DATOS LABORALES TITULAR
  'actividad_economica':     { page: 1, x: 175, y: 440, type: 'checkbox', checkIfEquals: 'Asalariado' },
  'declara_renta':           { page: 1, x: 540, y: 440, type: 'checkbox', checkIfEquals: 'Sí' },

  'nombre_empleador':        { page: 1, x: 200, y: 422 },
  'fecha_ingreso_empleo':    { page: 1, x: 480, y: 422, type: 'split-date',
                                dd: { x: 480, y: 422 }, mm: { x: 510, y: 422 }, aa: { x: 540, y: 422 } },

  'cargo_empleo':            { page: 1, x: 130, y: 405 },
  'salario_empleo':          { page: 1, x: 240, y: 405 },
  'tipo_contrato':           { page: 1, x: 350, y: 405 },
  'telefono_empresa':        { page: 1, x: 470, y: 405 },
  'extension_empresa':       { page: 1, x: 555, y: 405 },

  'direccion_empresa':       { page: 1, x: 130, y: 388 },
  'barrio_empresa':          { page: 1, x: 380, y: 388 },
  'ciudad_empresa':          { page: 1, x: 460, y: 388 },
  'pais_empresa':            { page: 1, x: 540, y: 388 },

  // -- INDEPENDIENTE (solo si actividad = Independiente)
  'nit':                     { page: 1, x: 130, y: 362 },
  'tipo_actividad_indep':    { page: 1, x: 250, y: 362 },
  'codigo_ciiu':             { page: 1, x: 430, y: 362 },
  'descripcion_actividad':   { page: 1, x: 530, y: 362 },

  // -- FINANCIEROS
  'ingresos_mensuales':      { page: 1, x: 200, y: 330 },
  'descripcion_origen_fondos':{ page: 1, x: 400, y: 330, maxWidth: 200 },
  'otros_ingresos_mensuales':{ page: 1, x: 200, y: 315 },
  'descripcion_otros_ingresos':{ page: 1, x: 400, y: 315, maxWidth: 200 },
  'egresos_mensuales':       { page: 1, x: 130, y: 300 },
  'total_activos':           { page: 1, x: 350, y: 300 },
  'total_pasivos':           { page: 1, x: 510, y: 300 },

  // -- REFERENCIAS
  'ref_familiar_nombre':     { page: 1, x: 175, y: 268 },
  'ref_familiar_ciudad_dpto':{ page: 1, x: 410, y: 268 },
  'ref_familiar_telefono':   { page: 1, x: 555, y: 268 },
  'ref_personal_nombre':     { page: 1, x: 175, y: 253 },
  'ref_personal_ciudad_dpto':{ page: 1, x: 410, y: 253 },
  'ref_personal_telefono':   { page: 1, x: 555, y: 253 },
  'ref_comercial_nombre':    { page: 1, x: 175, y: 238 },
  'ref_comercial_ciudad_dpto':{ page: 1, x: 410, y: 238 },
  'ref_comercial_telefono':  { page: 1, x: 555, y: 238 },

  // ============ PÁGINA 2: CÓNYUGE + AUTORIZACIÓN ============

  'conyuge_nombre_completo':  { page: 2, x: 175, y: 730 },
  'conyuge_cedula':           { page: 2, x: 405, y: 730 },
  'conyuge_fecha_expedicion': { page: 2, x: 525, y: 730, type: 'split-date',
                                 dd: { x: 525, y: 730 }, mm: { x: 555, y: 730 }, aa: { x: 583, y: 730 } },

  'conyuge_ciudad_nacimiento':{ page: 2, x: 130, y: 712 },
  'conyuge_nacionalidad':     { page: 2, x: 280, y: 712 },
  'conyuge_genero':           { page: 2, x: 405, y: 712, type: 'checkbox', checkIfEquals: 'Masculino' },
  'conyuge_fecha_nacimiento': { page: 2, x: 525, y: 712, type: 'split-date',
                                 dd: { x: 525, y: 712 }, mm: { x: 555, y: 712 }, aa: { x: 583, y: 712 } },
  'conyuge_edad':             { page: 2, x: 540, y: 698 },

  'conyuge_actividad':        { page: 2, x: 230, y: 680, type: 'checkbox', checkIfEquals: 'Asalariado' },
  'conyuge_declara_renta':    { page: 2, x: 540, y: 680, type: 'checkbox', checkIfEquals: 'Sí' },

  'conyuge_empleador':        { page: 2, x: 200, y: 662 },
  'conyuge_fecha_ingreso':    { page: 2, x: 480, y: 662, type: 'split-date',
                                 dd: { x: 480, y: 662 }, mm: { x: 510, y: 662 }, aa: { x: 540, y: 662 } },

  'conyuge_cargo':            { page: 2, x: 130, y: 644 },
  'conyuge_salario':          { page: 2, x: 240, y: 644 },
  'conyuge_tipo_contrato':    { page: 2, x: 350, y: 644 },
  'conyuge_telefono_empresa': { page: 2, x: 470, y: 644 },

  'conyuge_ingresos':         { page: 2, x: 200, y: 610 },
  'conyuge_egresos':          { page: 2, x: 130, y: 595 },
  'conyuge_activos':          { page: 2, x: 350, y: 595 },
  'conyuge_pasivos':          { page: 2, x: 510, y: 595 },

  // -- AUTORIZACIÓN
  'tipo_cuenta_bancaria':     { page: 2, x: 235, y: 305, type: 'checkbox', checkIfEquals: 'Ahorros' },

  'ciudad_firma':             { page: 2, x: 80,  y: 200 },
  'fecha_firma':              { page: 2, x: 200, y: 200 },
};

// Algunos campos derivados que se rellenan automáticamente
// (se computan al generar el PDF, no vienen del form)
export const DERIVED_COORDS: Record<string, FieldCoord> = {
  // En la cláusula de autorización aparece: "Yo _________________ identificado con CC ______"
  'titular_nombre_clausula': { page: 2, x: 75,  y: 442, size: 9 },
  'titular_cedula_clausula': { page: 2, x: 525, y: 442, size: 9 },
  // En la sección de extractos bancarios:
  'titular_nombre_extracto': { page: 2, x: 60,  y: 332, size: 9 },
  'titular_cedula_extracto': { page: 2, x: 460, y: 332, size: 9 },
};

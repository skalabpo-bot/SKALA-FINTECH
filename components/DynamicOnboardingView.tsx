import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Send, ArrowLeft, CheckCircle2, Download, FlaskConical, Upload, FileSignature, FileCheck2 } from 'lucide-react';
import { MockService } from '../services/mockService';
import { CreditType } from '../services/creditTypesService';
import { FieldLibraryService, EntityFormField, FieldCondition } from '../services/fieldLibraryService';
import { DynamicEntityForm } from './DynamicEntityForm';
import { User } from '../types';
import { supabase } from '../services/supabaseClient';
import { downloadVehicrediPdf } from '../services/vehicrediPdf';

interface Props {
  creditType: CreditType;
  currentUser: User;
  onSuccess: () => void;
  onCancel: () => void;
}

const dispatchAlert = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  window.dispatchEvent(new CustomEvent('app-alert', { detail: { message, type } }));
};

// Genera datos de prueba realistas para CUALQUIER conjunto de campos.
// Reconoce nombres comunes y devuelve valores sensatos; para el resto usa heurísticas por tipo.
const generateTestData = (fields: EntityFormField[]): Record<string, any> => {
  const KNOWN: Record<string, any> = {
    // Personales
    nombres: 'CAMILO ANDRÉS', segundoNombre: 'JOSÉ', apellidos: 'PÉREZ', segundoApellido: 'GÓMEZ',
    tipoDocumento: 'Cédula de Ciudadanía', numeroDocumento: '1020304050',
    fechaNacimiento: '1990-05-15', fechaExpedicion: '2008-06-20',
    ciudadNacimiento: 'BOGOTA D.C.', ciudadExpedicion: 'BOGOTA D.C.',
    sexo: 'M', nacionalidad: 'Colombiana', edad: 35,
    estadoCivil: 'Casado', personas_a_cargo: 2,
    nivel_estudios: 'Profesional', titulo_profesional: 'Ingeniero de Sistemas',
    // Contacto
    correo: 'camilo.test@skala.co', telefonoCelular: '3001234567', telefonoFijo: '6012345678',
    // Residencia
    direccionCompleta: 'CLL 100 # 15-30 APTO 502', barrio: 'CHICÓ',
    ciudadResidencia: 'BOGOTA D.C.', pais_residencia: 'Colombia',
    estrato_residencia: '4', tiempo_residencia_meses: 24,
    tipo_vivienda_residencia: 'Propia',
    // Laboral
    actividad_economica: 'Asalariado', declara_renta: 'Sí',
    nombre_empleador: 'EMPRESA DE PRUEBA S.A.S', fecha_ingreso_empleo: '2020-01-15',
    cargo_empleo: 'Director', salario_empleo: 8000000,
    tipo_contrato: 'Indefinido', telefono_empresa: '6014567890', extension_empresa: '101',
    direccion_empresa: 'CRA 7 # 71-21', barrio_empresa: 'CHAPINERO',
    ciudad_empresa: 'BOGOTA D.C.', pais_empresa: 'Colombia',
    // Independiente
    nit: '900123456-7', tipo_actividad_indep: 'Servicios', codigo_ciiu: '7020',
    descripcion_actividad: 'Consultoría empresarial',
    // Financiero
    ingresos_mensuales: 8000000, descripcion_origen_fondos: 'Salario',
    otros_ingresos_mensuales: 500000, descripcion_otros_ingresos: 'Arriendos',
    egresos_mensuales: 3500000, gastosMensuales: 3500000,
    total_activos: 200000000, total_pasivos: 80000000,
    activos: 200000000, pasivos: 80000000,
    // Referencias
    ref_familiar_nombre: 'JUAN PÉREZ GÓMEZ', ref_familiar_ciudad_dpto: 'Medellín, Antioquia', ref_familiar_telefono: '3014567890',
    ref_personal_nombre: 'MARÍA RAMÍREZ', ref_personal_ciudad_dpto: 'Bogotá, Cundinamarca', ref_personal_telefono: '3023334455',
    ref_comercial_nombre: 'COMERCIAL XYZ S.A.S', ref_comercial_ciudad_dpto: 'Bogotá, Cundinamarca', ref_comercial_telefono: '6018887766',
    // Cónyuge
    conyuge_nombre_completo: 'LAURA MARTÍNEZ RUIZ', conyuge_cedula: '52345678',
    conyuge_fecha_expedicion: '2010-03-10', conyuge_ciudad_nacimiento: 'CALI',
    conyuge_nacionalidad: 'Colombiana', conyuge_genero: 'Femenino',
    conyuge_fecha_nacimiento: '1992-08-22', conyuge_edad: 33,
    conyuge_actividad: 'Asalariado', conyuge_declara_renta: 'No',
    conyuge_empleador: 'OTRA EMPRESA S.A', conyuge_fecha_ingreso: '2019-04-01',
    conyuge_cargo: 'Analista', conyuge_salario: 4500000,
    conyuge_tipo_contrato: 'Indefinido', conyuge_telefono_empresa: '6019991111',
    conyuge_ingresos: 4500000, conyuge_egresos: 1500000,
    conyuge_activos: 50000000, conyuge_pasivos: 10000000,
    // Crédito vehículo
    credito_o_leasing: 'Crédito', rol_solicitante: 'Deudor',
    fecha_diligenciamiento: new Date().toISOString().split('T')[0],
    ciudad_diligenciamiento: 'BOGOTA D.C.',
    linea_vehiculo: 'Adquisición',
    tipo_vehiculo: 'Auto', uso_vehiculo: 'Nuevo',
    marca_vehiculo: 'Renault', modelo_vehiculo: '2025', referencia_vehiculo: 'Duster',
    valor_vehiculo: 95000000, plan_financiacion: '60 meses',
    cuota_inicial_vehiculo: 25000000, valor_a_financiar: 70000000,
    porcentaje_financiacion: 73, servicio_vehiculo: 'Particular',
    otras_garantias: 'Prenda sobre el vehículo',
    plazo_meses: 60,
    // Crédito vivienda (Habicredit)
    monto_solicitado: 200000000, valor_inmueble: 350000000,
    tipo_cartera: 'Compra de Vivienda Nueva', tipo_vivienda_credito: 'No VIS',
    tipo_producto_credito: 'Tasa Fija en Pesos',
    banco_preferido: 'BBVA', es_inmueble_habi: 'No',
    documento_firmado_cliente: 'Sí',
    // Autorización
    tipo_cuenta_bancaria: 'Ahorros', ciudad_firma: 'BOGOTA D.C.',
    fecha_firma: new Date().toISOString().split('T')[0],
    // Datos hipotecario antiguos por si están aún
    inmueble_tipo: 'Apartamento', inmueble_direccion: 'CLL 100 # 15-30', inmueble_ciudad: 'BOGOTA D.C.',
    inmueble_matricula: '50C-1234567', inmueble_avaluo: 350000000, inmueble_area: 80, inmueble_estrato: '4',
    garantia_tipo: 'Hipoteca en Primer Grado',
    cuota_inicial_pct: 30, destino_credito: 'Compra de Vivienda Nueva',
  };

  const data: Record<string, any> = {};
  for (const ef of fields) {
    const f = ef.field;
    if (!f) continue;
    if (KNOWN[f.internal_name] !== undefined) {
      data[f.internal_name] = KNOWN[f.internal_name];
      continue;
    }
    // Heurísticas por tipo
    switch (f.type) {
      case 'number':
        data[f.internal_name] = 1000000;
        break;
      case 'date':
        data[f.internal_name] = new Date().toISOString().split('T')[0];
        break;
      case 'select':
        data[f.internal_name] = (f.options && f.options[0]) || '';
        break;
      case 'textarea':
        data[f.internal_name] = `[DATO PRUEBA] ${f.label}`;
        break;
      case 'text':
      default:
        data[f.internal_name] = `[PRUEBA] ${f.label}`;
        break;
    }
  }
  return data;
};

export const DynamicOnboardingView: React.FC<Props> = ({ creditType, currentUser, onSuccess, onCancel }) => {
  const [entityId, setEntityId] = useState<string | null>(null);
  const [entityName, setEntityName] = useState<string>('');
  const [fields, setFields] = useState<EntityFormField[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formKey, setFormKey] = useState(0); // para forzar re-mount al inyectar datos de prueba
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const [signedPdfFile, setSignedPdfFile] = useState<File | null>(null);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  const [uploadingSigned, setUploadingSigned] = useState(false);
  const [cedulaFile, setCedulaFile] = useState<File | null>(null);
  const [cedulaUrl, setCedulaUrl] = useState<string | null>(null);
  const [uploadingCedula, setUploadingCedula] = useState(false);
  const isVehiculo = creditType.name?.toLowerCase().includes('vehículo') || creditType.name?.toLowerCase().includes('vehiculo');
  const isAdmin = currentUser.role === 'ADMIN';

  const fillWithTestData = () => {
    const test = generateTestData(fields);
    setFormData(test);
    setFormKey(k => k + 1); // re-monta DynamicEntityForm con initialData nuevo
    dispatchAlert(`✓ ${Object.keys(test).length} campos rellenados con datos de prueba`, 'success');
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Buscar entidad virtual asociada al tipo de crédito
        const { data: ents } = await supabase
          .from('financial_entities')
          .select('id, name, credit_type_ids, virtual')
          .eq('virtual', true);
        const match = (ents || []).find((e: any) => Array.isArray(e.credit_type_ids) && e.credit_type_ids.includes(creditType.id));
        if (!match) {
          dispatchAlert('No hay entidad virtual configurada para este tipo de crédito. Pide al admin crear una.', 'error');
          setLoading(false);
          return;
        }
        setEntityId(match.id);
        setEntityName(match.name);
        const f = await FieldLibraryService.getEntityFields(match.id);
        setFields(f);
      } catch (e: any) {
        console.error(e);
        dispatchAlert('Error cargando configuración: ' + e.message, 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [creditType.id]);

  const evalCondition = (c: FieldCondition | null | undefined): boolean => {
    if (!c || !c.field) return true;
    const v = formData[c.field];
    if (c.equals !== undefined) return v === c.equals;
    if (c.not_equals !== undefined) return v !== c.not_equals;
    if (Array.isArray(c.in)) return c.in.includes(v);
    return true;
  };

  const missingRequired = useMemo(() => {
    return fields
      .filter(ef => ef.required)
      .filter(ef => evalCondition(ef.condition)) // ignorar requeridos ocultos por condición
      .filter(ef => {
        const v = formData[ef.field?.internal_name || ''];
        return v === undefined || v === null || v === '';
      })
      .map(ef => ef.field?.label || ef.field?.internal_name || '');
  }, [fields, formData]);

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      await downloadVehicrediPdf(formData);
      setPdfGenerated(true);
      dispatchAlert('✓ PDF descargado. Imprime, firma, haz huella y sube el escaneo abajo.', 'success');
    } catch (e: any) {
      dispatchAlert('Error generando PDF: ' + e.message, 'error');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleCedulaUpload = async (file: File) => {
    if (!file) return;
    setUploadingCedula(true);
    try {
      const ced = (formData.numeroDocumento || 'sin-cedula').toString().replace(/\D/g, '');
      const ext = file.name.split('.').pop() || 'pdf';
      const path = `cedulas-150/${ced}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('documents').upload(path, file, { upsert: true, contentType: file.type || 'application/pdf' });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
      setCedulaFile(file);
      setCedulaUrl(urlData.publicUrl);
      dispatchAlert('✓ Cédula escaneada subida', 'success');
    } catch (e: any) {
      dispatchAlert('Error subiendo cédula: ' + e.message, 'error');
    } finally {
      setUploadingCedula(false);
    }
  };

  const handleSignedUpload = async (file: File) => {
    if (!file) return;
    setUploadingSigned(true);
    try {
      const ced = (formData.numeroDocumento || 'sin-cedula').toString().replace(/\D/g, '');
      const ext = file.name.split('.').pop() || 'pdf';
      const path = `vehicredi-signed/${ced}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('documents').upload(path, file, { upsert: true, contentType: file.type || 'application/pdf' });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
      setSignedPdfFile(file);
      setSignedPdfUrl(urlData.publicUrl);
      dispatchAlert('✓ Documento firmado subido', 'success');
    } catch (e: any) {
      dispatchAlert('Error subiendo documento: ' + e.message, 'error');
    } finally {
      setUploadingSigned(false);
    }
  };

  const submit = async () => {
    // Cédula escaneada al 150% es obligatoria para ambos tipos
    if (!cedulaUrl) {
      dispatchAlert('Debes subir la cédula escaneada al 150% antes de radicar.', 'error');
      setShowConfirm(false);
      return;
    }
    // Para vehículo el PDF firmado es obligatorio antes de radicar
    if (isVehiculo && !signedPdfUrl) {
      dispatchAlert('Debes subir el PDF firmado y huellado antes de radicar.', 'error');
      setShowConfirm(false);
      return;
    }
    setSubmitting(true);
    try {
      const montoSource = isVehiculo ? formData.valor_a_financiar : formData.monto_solicitado;
      const documents: any[] = [];
      if (cedulaUrl) {
        documents.push({
          name: cedulaFile?.name || 'Cedula_150.pdf',
          url: cedulaUrl,
          type: 'CEDULA_150',
        });
      }
      if (signedPdfUrl) {
        documents.push({
          name: signedPdfFile?.name || 'VehiCredi_firmado.pdf',
          url: signedPdfUrl,
          type: 'VEHICREDI_FIRMADO',
        });
      }
      const payload: any = {
        ...formData,
        creditTypeId: creditType.id,
        entidadAliada: entityName,
        monto: Number(montoSource || 0),
        plazo: Number(formData.plazo_meses || 0),
        tasa: 0,
        nombres: formData.nombres || '',
        apellidos: formData.apellidos || '',
        numeroDocumento: formData.numeroDocumento || '',
        documents: documents.length > 0 ? documents : undefined,
      };
      await MockService.createCredit(payload, currentUser);
      dispatchAlert(`${creditType.name} radicado exitosamente.`, 'success');
      onSuccess();
    } catch (err: any) {
      const msg = err?.message || '';
      // Errores de validación de negocio se muestran tal cual (ej: cédula duplicada)
      const isBusinessRule = /crédito activo|pagaduría|cuota|monto/i.test(msg);
      if (isBusinessRule) {
        dispatchAlert(msg, 'error');
      } else {
        // Errores técnicos (RLS, red, etc.) → mensaje amigable + log a consola
        console.error('Error técnico al radicar:', err);
        dispatchAlert('No pudimos guardar el crédito. Por favor intenta nuevamente en unos segundos.', 'error');
      }
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 animate-fade-in">
      <button onClick={onCancel} className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 hover:text-slate-600">
        <ArrowLeft size={14} /> Volver a tipos de crédito
      </button>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 md:p-10">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-display font-black text-slate-800">{creditType.name}</h1>
          <p className="text-sm text-slate-500 mt-1">{creditType.description}</p>
        </div>

        {fields.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <p className="text-sm font-bold text-amber-700">No hay campos configurados para este tipo de crédito.</p>
            <p className="text-xs text-amber-600 mt-1">Pide al administrador asignar campos a la entidad "{entityName}" en Admin → Entidades.</p>
          </div>
        ) : entityId ? (
          <>
            {isAdmin && (
              <div className="mb-4 flex justify-end">
                <button
                  onClick={fillWithTestData}
                  className="text-[11px] font-bold px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 flex items-center gap-1.5 border border-purple-200"
                  title="Solo visible para administradores"
                >
                  <FlaskConical size={12} /> Rellenar con datos de prueba
                </button>
              </div>
            )}
            <DynamicEntityForm key={formKey} entityId={entityId} initialData={formData} onChange={setFormData} />

            <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
              <div className="text-[11px] text-slate-400 font-bold">
                {missingRequired.length === 0
                  ? <span className="text-emerald-600 flex items-center gap-1.5"><CheckCircle2 size={14}/> Todos los campos obligatorios completos</span>
                  : <>Faltan {missingRequired.length} campo(s) obligatorio(s)</>}
              </div>

              <div className="space-y-4">
                {/* Stepper visual */}
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider overflow-x-auto pb-1">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap ${missingRequired.length === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                    {missingRequired.length === 0 ? <CheckCircle2 size={12}/> : <span className="w-3 h-3 rounded-full border-2 border-current"/>}
                    1. Datos
                  </div>
                  <span className="text-slate-300">›</span>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap ${cedulaUrl ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                    {cedulaUrl ? <CheckCircle2 size={12}/> : <Upload size={12}/>}
                    2. Cédula 150%
                  </div>
                  {isVehiculo && (<>
                    <span className="text-slate-300">›</span>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap ${pdfGenerated ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                      {pdfGenerated ? <CheckCircle2 size={12}/> : <Download size={12}/>}
                      3. PDF
                    </div>
                    <span className="text-slate-300">›</span>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap ${signedPdfUrl ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                      {signedPdfUrl ? <CheckCircle2 size={12}/> : <FileSignature size={12}/>}
                      4. Firma + Huella
                    </div>
                  </>)}
                  <span className="text-slate-300">›</span>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap ${(cedulaUrl && (!isVehiculo || signedPdfUrl)) ? 'bg-primary/15 text-primary' : 'bg-slate-100 text-slate-400'}`}>
                    <Send size={12}/>
                    {isVehiculo ? '5. Radicar' : '3. Radicar'}
                  </div>
                </div>

                {/* Paso compartido: Subir cédula al 150% */}
                <div className={`p-4 rounded-2xl border ${cedulaUrl ? 'bg-emerald-50 border-emerald-200' : missingRequired.length === 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-slate-800">Cédula del cliente — escaneada al 150%</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {cedulaUrl
                          ? <span className="text-emerald-700">✓ {cedulaFile?.name} subida — listo</span>
                          : 'Sube la cédula escaneada al 150% (ambas caras en PDF o JPG). Es obligatorio para radicar.'}
                      </p>
                    </div>
                    <label className={`cursor-pointer px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition ${
                      missingRequired.length > 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' :
                      cedulaUrl ? 'bg-emerald-600 text-white hover:bg-emerald-700' :
                      'bg-amber-500 text-white hover:bg-amber-600 shadow'
                    }`}>
                      {uploadingCedula ? <Loader2 size={16} className="animate-spin"/> : cedulaUrl ? <FileCheck2 size={16}/> : <Upload size={16}/>}
                      {uploadingCedula ? 'Subiendo...' : cedulaUrl ? 'Cambiar archivo' : 'Subir cédula'}
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        className="hidden"
                        disabled={missingRequired.length > 0 || uploadingCedula}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleCedulaUpload(f); }}
                      />
                    </label>
                  </div>
                </div>

                {/* Pasos solo de vehículo: PDF + escaneo firmado */}
                {isVehiculo && (<>
                  <div className={`p-4 rounded-2xl border ${pdfGenerated ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-sm font-black text-slate-800">Generar PDF prellenado</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Descarga el formulario VehiCredi con los datos. Imprímelo y entrégaselo al cliente.</p>
                      </div>
                      <button
                        onClick={handleDownloadPdf}
                        disabled={downloadingPdf || missingRequired.length > 0}
                        className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow"
                      >
                        {downloadingPdf ? <Loader2 size={16} className="animate-spin"/> : <Download size={16}/>}
                        {pdfGenerated ? 'Descargar de nuevo' : 'Descargar PDF'}
                      </button>
                    </div>
                  </div>

                  <div className={`p-4 rounded-2xl border ${signedPdfUrl ? 'bg-emerald-50 border-emerald-200' : pdfGenerated ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-800">Subir documento firmado y huellado</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {signedPdfUrl
                            ? <span className="text-emerald-700">✓ {signedPdfFile?.name} subido — listo</span>
                            : 'Sube el PDF escaneado con firma y huella del cliente.'}
                        </p>
                      </div>
                      <label className={`cursor-pointer px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition ${
                        !pdfGenerated ? 'bg-slate-200 text-slate-400 cursor-not-allowed' :
                        signedPdfUrl ? 'bg-emerald-600 text-white hover:bg-emerald-700' :
                        'bg-amber-500 text-white hover:bg-amber-600 shadow'
                      }`}>
                        {uploadingSigned ? <Loader2 size={16} className="animate-spin"/> : signedPdfUrl ? <FileCheck2 size={16}/> : <Upload size={16}/>}
                        {uploadingSigned ? 'Subiendo...' : signedPdfUrl ? 'Cambiar archivo' : 'Subir escaneo'}
                        <input
                          type="file"
                          accept="application/pdf,image/*"
                          className="hidden"
                          disabled={!pdfGenerated || uploadingSigned}
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleSignedUpload(f); }}
                        />
                      </label>
                    </div>
                  </div>
                </>)}

                {/* Radicar */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setShowConfirm(true)}
                    disabled={submitting || missingRequired.length > 0 || !cedulaUrl || (isVehiculo && !signedPdfUrl)}
                    className="bg-primary text-white px-7 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
                    title={!cedulaUrl ? 'Sube primero la cédula escaneada al 150%' : (isVehiculo && !signedPdfUrl) ? 'Sube primero el documento firmado' : ''}
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
                    Radicar Crédito
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowConfirm(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-lg text-slate-800 mb-2">Confirmar radicación</h3>
            <p className="text-sm text-slate-500 mb-4">¿Radicar este {creditType.name.toLowerCase()} con los datos diligenciados? Una vez radicado, el crédito entra a la bandeja operativa.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowConfirm(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button onClick={submit} disabled={submitting} className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2">
                {submitting && <Loader2 size={14} className="animate-spin"/>}
                Sí, radicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

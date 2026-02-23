
import React, { useState, useEffect } from 'react';
import { User, CreditDocument, AlliedEntity } from '../types';
import { MockService } from '../services/mockService';
import { 
  ArrowRight, ArrowLeft, Upload, CheckCircle, UserCheck, 
  MapPin, Briefcase, DollarSign, FileCheck, Loader2, Camera, ShieldCheck, CreditCard, Users
} from 'lucide-react';

interface OnboardingProps {
  currentUser: User;
  onSuccess: () => void;
  initialData?: Record<string, any>;
}

const dispatchAlert = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    window.dispatchEvent(new CustomEvent('app-alert', { detail: { message, type } }));
};

const Input = ({ label, name, value, onChange, type = "text", placeholder = "", disabled = false }: any) => (
  <div className="mb-4 w-full px-2">
    <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">{label}</label>
    <input 
      type={type} 
      name={name} 
      value={value || ''} 
      onChange={onChange} 
      disabled={disabled} 
      placeholder={placeholder}
      className={`w-full px-5 py-4 bg-white text-slate-800 border-2 border-slate-100 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all text-sm font-bold placeholder:text-slate-300 ${disabled ? 'bg-slate-50 border-slate-50 text-slate-400 cursor-not-allowed' : 'hover:border-slate-200 shadow-sm'}`}
    />
  </div>
);

const Select = ({ label, name, value, onChange, options }: any) => (
    <div className="mb-4 w-full px-2">
      <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">{label}</label>
      <select 
        name={name} 
        value={value || ''} 
        onChange={onChange}
        className="w-full px-5 py-4 bg-white text-slate-800 border-2 border-slate-100 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all text-sm font-bold cursor-pointer hover:border-slate-200 shadow-sm"
      >
          <option value="">Seleccione...</option>
          {options.map((o: any) => { const val = typeof o === 'object' ? o.value : o; const lbl = typeof o === 'object' ? o.label : o; return <option key={val} value={val}>{lbl}</option>; })}
      </select>
    </div>
);

export const OnboardingForm: React.FC<OnboardingProps> = ({ currentUser, onSuccess, initialData }) => {
  const [step, setStep] = useState(1);
  const [entities, setEntities] = useState<AlliedEntity[]>([]);
  const [pagadurias, setPagadurias] = useState<string[]>([]);
  const [pensionTypes, setPensionTypes] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [banks, setBanks] = useState<string[]>([]);
  const [creditLines, setCreditLines] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [calculatedAge, setCalculatedAge] = useState<number | string>('');

  const [formData, setFormData] = useState<any>({
    nombres: '', apellidos: '', tipoDocumento: 'CEDULA', numeroDocumento: '',
    fechaNacimiento: '', ciudadNacimiento: '', sexo: '', ciudadExpedicion: '', fechaExpedicion: '',
    correo: '', telefonoCelular: '', telefonoFijo: '', direccionCompleta: '', barrio: '',
    ciudadResidencia: '', estadoCivil: '',
    pagaduria: '', clavePagaduria: '', tipoPension: '', resolucionPension: '', fechaPension: '', antiguedadPension: '',
    gastosMensuales: 0, activos: 0, pasivos: 0, patrimonio: 0,
    monto: '', plazo: '', entidadAliada: '', tasa: '',
    ref1Nombre: '', ref1Cedula: '', ref1FechaExpedicion: '', ref1FechaNacimiento: '', ref1Telefono: '', ref1Direccion: '', ref1Ciudad: '', ref1Barrio: '', ref1Parentesco: '',
    ref2Nombre: '', ref2Cedula: '', ref2FechaExpedicion: '', ref2FechaNacimiento: '', ref2Telefono: '', ref2Direccion: '', ref2Ciudad: '', ref2Barrio: '', ref2Parentesco: '',
    beneficiarioNombre: '', beneficiarioCedula: '', beneficiarioFechaExpedicion: '', beneficiarioFechaNacimiento: '', beneficiarioTelefono: '', beneficiarioDireccion: '', beneficiarioCiudad: '', beneficiarioBarrio: '', beneficiarioParentesco: '',
    tipoDesembolso: 'EFECTIVO', banco: '', numeroCuenta: '', tipoCuenta: 'AHORROS',
    cuotaDisponible: '',
    observaciones: '',
    documents: [] as CreditDocument[],
    ...(initialData ?? {}),
  });

  useEffect(() => {
    const load = async () => {
      const [ent, pag, pt, cit, bnk, lines] = await Promise.all([MockService.getEntities(), MockService.getPagadurias(), MockService.getPensionTypes(), MockService.getCities(), MockService.getBanks(), MockService.getCreditLines()]);
      setEntities(ent); setPagadurias(pag); setPensionTypes(pt); setCities(cit); setBanks(bnk);
      setCreditLines(lines);
    };
    load();
  }, []);

  // Cuando las ciudades cargan, ajustar los valores pre-llenados para que coincidan con las opciones reales
  useEffect(() => {
    if (cities.length === 0 || !initialData) return;
    const norm = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
    const matchCity = (raw: string): string => {
      if (!raw) return '';
      const n = norm(raw);
      return cities.find(c => norm(c) === n)
        || cities.find(c => norm(c).includes(n) || n.includes(norm(c)))
        || raw; // si no hay match, mantener el valor original
    };
    setFormData((prev: any) => ({
      ...prev,
      ciudadNacimiento: matchCity(prev.ciudadNacimiento),
      ciudadExpedicion: matchCity(prev.ciudadExpedicion),
      ciudadResidencia: prev.ciudadResidencia ? matchCity(prev.ciudadResidencia) : prev.ciudadResidencia,
    }));
  }, [cities]);

  // Calcular edad automáticamente si viene pre-llenada desde el simulador
  useEffect(() => {
    if (formData.fechaNacimiento) {
      setCalculatedAge(calculateAge(formData.fechaNacimiento));
    }
  }, []);

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return '';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) { age--; }
    return age;
  };

  const handleChange = (e: any) => {
      const { name, value } = e.target;
      setFormData((prev:any) => {
          const newState = { ...prev, [name]: value };
          if (name === 'fechaNacimiento') {
            setCalculatedAge(calculateAge(value));
          }
          if (['activos', 'pasivos'].includes(name)) {
              newState.patrimonio = Number(newState.activos || 0) - Number(newState.pasivos || 0);
          }
          return newState;
      });
  };

  const handleFileUpload = async (e: any, type: string) => {
    if (e.target.files?.[0]) {
      setUploadingType(type);
      try {
        const url = await MockService.uploadImage(e.target.files[0]);
        const newDoc = { id: Math.random().toString(), name: e.target.files[0].name, url, type: type as any, uploadedAt: new Date() };
        setFormData((prev: any) => ({ ...prev, documents: [...prev.documents.filter((d:any) => d.type !== type), newDoc] }));
        dispatchAlert(`Archivo subido: ${type.replace(/_/g, ' ')}`, 'success');
      } catch (err: any) {
        dispatchAlert("Error al subir archivo.", 'error');
      } finally { setUploadingType(null); }
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formData.nombres?.trim() || !formData.apellidos?.trim() || !formData.numeroDocumento?.trim()) {
        dispatchAlert('Nombres, Apellidos y N° Documento son obligatorios para continuar.', 'error');
        return;
      }
    }
    if (step === 2) {
      if (!formData.correo?.trim() || !formData.telefonoCelular?.trim()) {
        dispatchAlert('Correo electrónico y Celular son obligatorios para continuar.', 'error');
        return;
      }
    }
    setStep(step + 1);
  };

  const handleRadicar = async () => {
    if(!formData.monto || !formData.plazo || !formData.numeroDocumento) {
        return dispatchAlert("Monto, Plazo y Cédula son obligatorios.", "error");
    }
    setIsSubmitting(true);
    try {
      await MockService.createCredit(formData, currentUser);
      dispatchAlert("Crédito radicado exitosamente.", "success");
      onSuccess();
    } catch (err: any) { dispatchAlert(err.message, "error"); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="max-w-6xl mx-auto bg-white p-6 md:p-14 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-50 mb-20 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 border-b border-slate-50 pb-10 gap-8">
          <div>
            <h2 className="text-4xl font-display font-black text-slate-800 tracking-tight">Radicación de Crédito</h2>
            <p className="text-sm text-slate-400 font-medium mt-1">Gestión integral de expedientes Skala Fintech.</p>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 w-full md:w-auto custom-scrollbar">
            {[1,2,3,4,5,6].map(s => (
                <div key={s} className="flex flex-col items-center shrink-0">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-base transition-all duration-300 ${step === s ? 'bg-primary text-white shadow-[0_10px_20px_rgba(234,88,12,0.3)] scale-110' : (step > s ? 'bg-green-500 text-white' : 'bg-slate-50 text-slate-300 border-2 border-slate-100')}`}>
                        {step > s ? <CheckCircle size={20}/> : s}
                    </div>
                    <span className={`text-[9px] font-black mt-3 uppercase tracking-widest ${step === s ? 'text-primary' : 'text-slate-300'}`}>{s === step ? 'Paso' : ''}</span>
                </div>
            ))}
          </div>
      </div>

      <div className="min-h-[500px]">
        {step === 1 && (
          <div className="animate-fade-in">
            <h3 className="font-black text-slate-800 text-xl flex items-center gap-3 mb-6 px-2"><UserCheck className="text-primary" size={24}/> IDENTIDAD DEL CLIENTE</h3>
            <div className="bg-gradient-to-br from-slate-50/80 to-orange-50/30 p-6 md:p-8 rounded-2xl border border-slate-100/80 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              <Input label="Nombres" name="nombres" value={formData.nombres} onChange={handleChange} placeholder="Ej: Juan" />
              <Input label="Apellidos" name="apellidos" value={formData.apellidos} onChange={handleChange} placeholder="Ej: Perez" />
              <Select label="Tipo Doc" name="tipoDocumento" value={formData.tipoDocumento} onChange={handleChange} options={['CEDULA', 'CEDULA_EXTRANJERIA', 'PASAPORTE']} />
              <Input label="# Documento" name="numeroDocumento" value={formData.numeroDocumento} onChange={handleChange} placeholder="Ingrese número sin puntos" />
              <Select label="Ciudad Expedición" name="ciudadExpedicion" value={formData.ciudadExpedicion} onChange={handleChange} options={cities} />
              <Input label="Fecha Expedición" name="fechaExpedicion" type="date" value={formData.fechaExpedicion} onChange={handleChange} />
              <Select label="Ciudad Nacimiento" name="ciudadNacimiento" value={formData.ciudadNacimiento} onChange={handleChange} options={cities} />
              <div className="flex gap-2">
                  <Input label="Fecha Nacimiento" name="fechaNacimiento" type="date" value={formData.fechaNacimiento} onChange={handleChange} />
                  <Input label="Edad Actual" value={calculatedAge} disabled={true} />
              </div>
              <Select label="Sexo" name="sexo" value={formData.sexo} onChange={handleChange} options={['MASCULINO', 'FEMENINO', 'OTRO']} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <h3 className="font-black text-slate-800 text-xl flex items-center gap-3 mb-6 px-2"><MapPin className="text-primary" size={24}/> CONTACTO Y RESIDENCIA</h3>
            <div className="bg-gradient-to-br from-slate-50/80 to-orange-50/30 p-6 md:p-8 rounded-2xl border border-slate-100/80 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              <Input label="Correo Electrónico" name="correo" value={formData.correo} onChange={handleChange} placeholder="ejemplo@correo.com" />
              <Input label="Celular" name="telefonoCelular" value={formData.telefonoCelular} onChange={handleChange} placeholder="300 000 0000" />
              <Input label="Teléfono Fijo" name="telefonoFijo" value={formData.telefonoFijo} onChange={handleChange} />
              <Input label="Dirección Completa" name="direccionCompleta" value={formData.direccionCompleta} onChange={handleChange} placeholder="Calle, Carrera # ..." />
              <Input label="Barrio" name="barrio" value={formData.barrio} onChange={handleChange} />
              <Select label="Ciudad Residencia" name="ciudadResidencia" value={formData.ciudadResidencia} onChange={handleChange} options={cities} />
              <Select label="Estado Civil" name="estadoCivil" value={formData.estadoCivil} onChange={handleChange} options={['SOLTERO', 'CASADO', 'UNION_LIBRE', 'DIVORCIADO', 'VIUDO']} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in space-y-6">
            <h3 className="font-black text-slate-800 text-xl flex items-center gap-3 mb-6 px-2"><Briefcase className="text-primary" size={24}/> PENSIONES Y PAGADURÍA</h3>
            <div className="bg-gradient-to-br from-slate-50/80 to-orange-50/30 p-6 md:p-8 rounded-2xl border border-slate-100/80 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              <Select label="Pagaduría" name="pagaduria" value={formData.pagaduria} onChange={handleChange} options={pagadurias} />
              <Input label="Clave Pagaduría" name="clavePagaduria" type="password" value={formData.clavePagaduria} onChange={handleChange} />
              <Select label="Tipo de Pensión" name="tipoPension" value={formData.tipoPension} onChange={handleChange} options={pensionTypes} />
              <Input label="# Resolución Pensión" name="resolucionPension" value={formData.resolucionPension} onChange={handleChange} />
              <Input label="Fecha Pensión" name="fechaPension" type="date" value={formData.fechaPension} onChange={handleChange} />
              <Input label="Antigüedad (Años)" name="antiguedadPension" type="number" value={formData.antiguedadPension} onChange={handleChange} />
            </div>

            {/* Documentos obligatorios según tipo de pensión */}
            {(formData.tipoPension === 'SUSTITUCIÓN' || formData.tipoPension === 'INVALIDEZ') && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 space-y-4">
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">
                  {formData.tipoPension === 'INVALIDEZ' ? '⚠️ Documentos obligatorios — Pensión por Invalidez' : 'Documento requerido — Pensión por Sustitución'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Resolución de Pensión */}
                  <div className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center gap-3 transition-all ${formData.documents.find((d:any)=>d.type==='RESOLUCION_PENSION') ? 'border-green-300 bg-green-50' : 'border-amber-300 bg-white hover:border-amber-400'}`}>
                    <div className={`p-3 rounded-xl ${formData.documents.find((d:any)=>d.type==='RESOLUCION_PENSION') ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                      {uploadingType === 'RESOLUCION_PENSION' ? <Loader2 className="animate-spin" size={22}/> : <FileCheck size={22}/>}
                    </div>
                    <p className="text-[10px] font-black text-center uppercase tracking-widest text-slate-500">Resolución de Pensión <span className="text-red-500">*</span></p>
                    <label className="w-full text-center text-[10px] bg-white border-2 border-slate-100 px-4 py-3 rounded-xl cursor-pointer font-black hover:border-primary hover:text-primary transition-all shadow-sm">
                      {formData.documents.find((d:any)=>d.type==='RESOLUCION_PENSION') ? 'CAMBIAR' : 'SUBIR ARCHIVO'}
                      <input type="file" className="hidden" onChange={(e)=>handleFileUpload(e, 'RESOLUCION_PENSION')}/>
                    </label>
                    {formData.documents.find((d:any)=>d.type==='RESOLUCION_PENSION') && (
                      <span className="text-green-600 font-black text-[9px] flex items-center gap-1"><CheckCircle size={12}/> LISTO</span>
                    )}
                  </div>

                  {/* Dictamen — solo para INVALIDEZ */}
                  {formData.tipoPension === 'INVALIDEZ' && (
                    <div className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center gap-3 transition-all ${formData.documents.find((d:any)=>d.type==='DICTAMEN_INVALIDEZ') ? 'border-green-300 bg-green-50' : 'border-red-300 bg-white hover:border-red-400'}`}>
                      <div className={`p-3 rounded-xl ${formData.documents.find((d:any)=>d.type==='DICTAMEN_INVALIDEZ') ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {uploadingType === 'DICTAMEN_INVALIDEZ' ? <Loader2 className="animate-spin" size={22}/> : <FileCheck size={22}/>}
                      </div>
                      <p className="text-[10px] font-black text-center uppercase tracking-widest text-slate-500">Dictamen de Invalidez <span className="text-red-500">*</span></p>
                      <label className="w-full text-center text-[10px] bg-white border-2 border-slate-100 px-4 py-3 rounded-xl cursor-pointer font-black hover:border-primary hover:text-primary transition-all shadow-sm">
                        {formData.documents.find((d:any)=>d.type==='DICTAMEN_INVALIDEZ') ? 'CAMBIAR' : 'SUBIR ARCHIVO'}
                        <input type="file" className="hidden" onChange={(e)=>handleFileUpload(e, 'DICTAMEN_INVALIDEZ')}/>
                      </label>
                      {formData.documents.find((d:any)=>d.type==='DICTAMEN_INVALIDEZ') && (
                        <span className="text-green-600 font-black text-[9px] flex items-center gap-1"><CheckCircle size={12}/> LISTO</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="animate-fade-in">
            <h3 className="font-black text-slate-800 text-xl flex items-center gap-3 mb-6 px-2"><DollarSign className="text-primary" size={24}/> DATOS FINANCIEROS</h3>
            <div className="bg-gradient-to-br from-slate-50/80 to-orange-50/30 p-6 md:p-8 rounded-2xl border border-slate-100/80 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              <Select label="Línea de Crédito" name="lineaCredito" value={formData.lineaCredito} onChange={handleChange} options={creditLines} />
              <Input label="Monto Solicitado ($)" name="monto" type="number" value={formData.monto} onChange={handleChange} placeholder="0.00" />
              <Input label="Plazo (Meses)" name="plazo" type="number" value={formData.plazo} onChange={handleChange} placeholder="Ej: 48" />
              <Select label="Entidad Aliada" name="entidadAliada" value={formData.entidadAliada} onChange={handleChange} options={entities.map(e=>e.name)} />
              {formData.entidadAliada && (
                <Select label="Tasa Aplicable (% NMV)" name="tasa" value={formData.tasa} onChange={handleChange} options={entities.find(e=>e.name===formData.entidadAliada)?.rates.map(r=>({ value: r.rate, label: `${r.rate}% NMV (Com: ${r.commission}%)` })) || []} />
              )}
              <Input label="Gastos Mensuales" name="gastosMensuales" type="number" value={formData.gastosMensuales} onChange={handleChange} />
              <Input label="Activos" name="activos" type="number" value={formData.activos} onChange={handleChange} />
              <Input label="Pasivos" name="pasivos" type="number" value={formData.pasivos} onChange={handleChange} />
              <Input label="Patrimonio Neto" name="patrimonio" value={formData.patrimonio} disabled={true} />
              <Input label="Cuota Disponible ($)" name="cuotaDisponible" type="number" value={formData.cuotaDisponible} onChange={handleChange} placeholder="0.00" />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="animate-fade-in">
            <h3 className="font-black text-slate-800 text-xl flex items-center gap-3 mb-6 px-2"><Users className="text-primary" size={24}/> REFERENCIAS Y BENEFICIARIO</h3>
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-slate-50/80 to-orange-50/30 p-6 md:p-8 rounded-2xl border border-slate-100/80 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  <p className="col-span-full font-black text-primary text-[11px] uppercase tracking-widest mb-2">REFERENCIA No. 1</p>
                  <Input label="Nombre Completo" name="ref1Nombre" value={formData.ref1Nombre} onChange={handleChange} />
                  <Input label="Cédula" name="ref1Cedula" value={formData.ref1Cedula} onChange={handleChange} placeholder="Sin puntos" />
                  <Input label="Fecha Expedición" name="ref1FechaExpedicion" type="date" value={formData.ref1FechaExpedicion} onChange={handleChange} />
                  <Input label="Fecha Nacimiento" name="ref1FechaNacimiento" type="date" value={formData.ref1FechaNacimiento} onChange={handleChange} />
                  <Input label="Celular / Tel" name="ref1Telefono" value={formData.ref1Telefono} onChange={handleChange} />
                  <Input label="Dirección" name="ref1Direccion" value={formData.ref1Direccion} onChange={handleChange} />
                  <Select label="Ciudad" name="ref1Ciudad" value={formData.ref1Ciudad} onChange={handleChange} options={cities} />
                  <Input label="Barrio" name="ref1Barrio" value={formData.ref1Barrio} onChange={handleChange} />
                  <Input label="Parentesco" name="ref1Parentesco" value={formData.ref1Parentesco} onChange={handleChange} />
              </div>

              <div className="bg-gradient-to-br from-slate-50/80 to-orange-50/30 p-6 md:p-8 rounded-2xl border border-slate-100/80 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  <p className="col-span-full font-black text-primary text-[11px] uppercase tracking-widest mb-2">REFERENCIA No. 2</p>
                  <Input label="Nombre Completo" name="ref2Nombre" value={formData.ref2Nombre} onChange={handleChange} />
                  <Input label="Cédula" name="ref2Cedula" value={formData.ref2Cedula} onChange={handleChange} placeholder="Sin puntos" />
                  <Input label="Fecha Expedición" name="ref2FechaExpedicion" type="date" value={formData.ref2FechaExpedicion} onChange={handleChange} />
                  <Input label="Fecha Nacimiento" name="ref2FechaNacimiento" type="date" value={formData.ref2FechaNacimiento} onChange={handleChange} />
                  <Input label="Celular / Tel" name="ref2Telefono" value={formData.ref2Telefono} onChange={handleChange} />
                  <Input label="Dirección" name="ref2Direccion" value={formData.ref2Direccion} onChange={handleChange} />
                  <Select label="Ciudad" name="ref2Ciudad" value={formData.ref2Ciudad} onChange={handleChange} options={cities} />
                  <Input label="Barrio" name="ref2Barrio" value={formData.ref2Barrio} onChange={handleChange} />
                  <Input label="Parentesco" name="ref2Parentesco" value={formData.ref2Parentesco} onChange={handleChange} />
              </div>

              <div className="bg-gradient-to-br from-slate-50/80 to-orange-50/30 p-6 md:p-8 rounded-2xl border border-slate-100/80 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  <p className="col-span-full font-black text-primary text-[11px] uppercase tracking-widest mb-2">BENEFICIARIO SEGURO</p>
                  <Input label="Nombre Completo" name="beneficiarioNombre" value={formData.beneficiarioNombre} onChange={handleChange} />
                  <Input label="Cédula" name="beneficiarioCedula" value={formData.beneficiarioCedula} onChange={handleChange} placeholder="Sin puntos" />
                  <Input label="Fecha Expedición" name="beneficiarioFechaExpedicion" type="date" value={formData.beneficiarioFechaExpedicion} onChange={handleChange} />
                  <Input label="Fecha Nacimiento" name="beneficiarioFechaNacimiento" type="date" value={formData.beneficiarioFechaNacimiento} onChange={handleChange} />
                  <Input label="Celular / Tel" name="beneficiarioTelefono" value={formData.beneficiarioTelefono} onChange={handleChange} />
                  <Input label="Dirección" name="beneficiarioDireccion" value={formData.beneficiarioDireccion} onChange={handleChange} />
                  <Select label="Ciudad" name="beneficiarioCiudad" value={formData.beneficiarioCiudad} onChange={handleChange} options={cities} />
                  <Input label="Barrio" name="beneficiarioBarrio" value={formData.beneficiarioBarrio} onChange={handleChange} />
                  <Input label="Parentesco" name="beneficiarioParentesco" value={formData.beneficiarioParentesco} onChange={handleChange} />
              </div>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-10 animate-fade-in">
             <h3 className="font-black text-slate-800 text-xl border-b border-slate-50 pb-6 flex items-center gap-3 px-2"><CreditCard className="text-primary" size={24}/> DESEMBOLSO Y DOCUMENTACIÓN</h3>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-10 rounded-[3rem] border-2 border-slate-50 shadow-sm">
                <Select label="Forma de Desembolso" name="tipoDesembolso" value={formData.tipoDesembolso} onChange={handleChange} options={['EFECTIVO', 'CUENTA_BANCARIA']} />
                {formData.tipoDesembolso === 'CUENTA_BANCARIA' && (
                    <>
                        <Select label="Entidad Bancaria" name="banco" value={formData.banco} onChange={handleChange} options={banks} />
                        <Input label="Número de Cuenta" name="numeroCuenta" value={formData.numeroCuenta} onChange={handleChange} placeholder="000-000000-00" />
                        <Select label="Tipo de Cuenta" name="tipoCuenta" value={formData.tipoCuenta} onChange={handleChange} options={['AHORROS', 'CORRIENTE']} />
                    </>
                )}
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
                {['CEDULA_FRONTAL', 'CEDULA_POSTERIOR', 'DESPRENDIBLE_1', 'DESPRENDIBLE_2'].map(type => (
                  <div key={type} className={`p-8 border-3 border-dashed rounded-[2.5rem] flex flex-col items-center gap-5 transition-all duration-500 ${formData.documents.find((d:any)=>d.type===type) ? 'border-green-300 bg-green-50 shadow-inner' : 'border-slate-100 bg-white hover:border-primary/20 hover:bg-slate-50'}`}>
                    <div className={`p-5 rounded-2xl shadow-sm transition-all ${formData.documents.find((d:any)=>d.type===type) ? 'bg-white text-green-500' : 'bg-white text-slate-300'}`}>
                        {uploadingType === type ? <Loader2 className="animate-spin text-primary"/> : <Camera size={28}/>}
                    </div>
                    <p className="text-[10px] font-black text-center uppercase tracking-[0.2em] text-slate-400">{type.replace(/_/g, ' ')}</p>
                    <label className="w-full text-center text-[10px] bg-white border-2 border-slate-100 px-5 py-3.5 rounded-2xl cursor-pointer font-black hover:border-primary hover:text-primary transition-all shadow-sm">
                        {formData.documents.find((d:any)=>d.type===type) ? 'CAMBIAR' : 'SUBIR ARCHIVO'}
                        <input type="file" className="hidden" onChange={(e)=>handleFileUpload(e, type)}/>
                    </label>
                    {formData.documents.find((d:any)=>d.type===type) && (
                        <div className="flex items-center gap-2 text-green-600 font-black text-[9px] bg-white px-3 py-1.5 rounded-full shadow-sm">
                            <CheckCircle size={14}/> LISTO
                        </div>
                    )}
                  </div>
                ))}
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
                {['DOCUMENTO_ADICIONAL_1', 'DOCUMENTO_ADICIONAL_2'].map(type => (
                  <div key={type} className={`p-8 border-3 border-dashed rounded-[2.5rem] flex flex-col items-center gap-5 transition-all duration-500 ${formData.documents.find((d:any)=>d.type===type) ? 'border-green-300 bg-green-50 shadow-inner' : 'border-slate-100 bg-white hover:border-primary/20 hover:bg-slate-50'}`}>
                    <div className={`p-5 rounded-2xl shadow-sm transition-all ${formData.documents.find((d:any)=>d.type===type) ? 'bg-white text-green-500' : 'bg-white text-slate-300'}`}>
                        {uploadingType === type ? <Loader2 className="animate-spin text-primary"/> : <Camera size={28}/>}
                    </div>
                    <p className="text-[10px] font-black text-center uppercase tracking-[0.2em] text-slate-400">{type.replace(/_/g, ' ')}</p>
                    <label className="w-full text-center text-[10px] bg-white border-2 border-slate-100 px-5 py-3.5 rounded-2xl cursor-pointer font-black hover:border-primary hover:text-primary transition-all shadow-sm">
                        {formData.documents.find((d:any)=>d.type===type) ? 'CAMBIAR' : 'SUBIR ARCHIVO'}
                        <input type="file" className="hidden" onChange={(e)=>handleFileUpload(e, type)}/>
                    </label>
                    {formData.documents.find((d:any)=>d.type===type) && (
                        <div className="flex items-center gap-2 text-green-600 font-black text-[9px] bg-white px-3 py-1.5 rounded-full shadow-sm">
                            <CheckCircle size={14}/> LISTO
                        </div>
                    )}
                  </div>
                ))}
             </div>

             <div className="mt-10">
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Observaciones</label>
                <textarea
                    name="observaciones"
                    value={formData.observaciones}
                    onChange={handleChange}
                    placeholder="Ingrese observaciones adicionales sobre el crédito..."
                    rows={4}
                    className="w-full px-5 py-4 bg-white text-slate-800 border-2 border-slate-100 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all text-sm font-bold placeholder:text-slate-300 hover:border-slate-200 shadow-sm resize-none"
                />
             </div>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row justify-between mt-20 pt-10 border-t border-slate-50 gap-6">
          {step > 1 && (
            <button 
                onClick={()=>setStep(step-1)} 
                className="px-12 py-4 border-2 border-slate-100 rounded-2xl font-black flex items-center justify-center gap-3 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all uppercase tracking-widest text-xs"
            >
                <ArrowLeft size={18}/> Anterior
            </button>
          )}
          {step < 6 ? (
            <button
                onClick={handleNext}
                className="ml-auto w-full md:w-auto px-14 py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-slate-800 shadow-xl transition-all uppercase tracking-widest text-xs"
            >
                Siguiente Paso <ArrowRight size={18}/>
            </button>
          ) : (
            <button 
                onClick={handleRadicar} 
                disabled={isSubmitting} 
                className="ml-auto w-full md:w-auto px-20 py-5 bg-primary text-white rounded-[1.8rem] font-black flex items-center justify-center gap-4 shadow-[0_20px_40px_-5px_rgba(234,88,12,0.4)] hover:bg-orange-600 disabled:opacity-50 transition-all uppercase tracking-widest"
            >
              {isSubmitting ? <Loader2 className="animate-spin"/> : (
                  <>RADICAR CRÉDITO <ArrowRight size={22}/></>
              )}
            </button>
          )}
      </div>
    </div>
  );
};

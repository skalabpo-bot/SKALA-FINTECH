import React, { useState, useEffect } from 'react';
import { MockService } from '../../services/mockService';
import type { LhCampo, LhArchivo } from '../../services/productionService';
import { Loader2, CheckCircle2, XCircle, ShieldCheck, Search, Mail, AlertTriangle, Send, FileText } from 'lucide-react';

// Pagadurías que atiende La Hipotecaria.
const PAGADURIAS_LH = ['Colpensiones', 'Fiduprevisora', 'FONCEP', 'FOPEP', 'CASUR'];

const fmt = (v: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);
const onlyDigits = (s: string) => (s || '').replace(/\D/g, '');

export interface PreData {
  nombres: string; apellidos: string; numeroDocumento: string; tipoDocumento: string;
  correo: string; telefonoCelular: string; pagaduria: string;
  monto: number; montoDesembolso: number; tasa: number; plazo: number; cuota: number;
  preaprobado: boolean; preaprobacionNumero: string;
  otpConfirmado: boolean; // el OTP del correo fue validado contra La Hipotecaria
  // Todo lo que se llenó del formulario de la entidad, con su sección y etiqueta legible,
  // para que quede guardado en el crédito de Skala (no solo allá).
  respuestasLH?: { seccion: string; campo: string; label: string; valor: string }[];
  // Documentos que el gestor adjuntó aquí y que Skala aún no tenía → se suben también al crédito.
  documentosLH?: { tipo: string; label: string; file: File }[];
  listo: boolean; // hay datos suficientes, OTP confirmado Y su formulario enviado → se puede radicar
}

// Documentos que el cliente YA subió en Skala y que su formulario vuelve a pedir: se adjuntan solos.
// Solo se mapea lo que es equivalente 1:1; lo que no tenemos (certificación bancaria, contrato de
// corretaje, saldos de deuda, DECRIM) se deja al gestor — mejor vacío que un archivo equivocado.
const DOC_AUTO: { re: RegExp; excl?: RegExp; tipo: string }[] = [
  { re: /cedula|cédula/i, excl: /saldo/i, tipo: 'CEDULA_FRONTAL' },
  { re: /comprobante.*pago|desprendible|nomina|nómina/i, excl: /adicional|segunda/i, tipo: 'DESPRENDIBLE_1' },
  { re: /resoluci[oó]n.*pensi[oó]n/i, tipo: 'RESOLUCION_PENSION' },
];

interface Props {
  entityName: string;
  // Datos que Skala ya conoce del cliente (algunos salen del OCR de la cédula): se usan para
  // prellenar el formulario de La Hipotecaria y no volver a pedirlos.
  prefill: {
    nombres?: string; apellidos?: string; documento?: string; correo?: string; celular?: string;
    ingresos?: number; gastos?: number; pagaduria?: string; plazo?: number;
    sexo?: string; fechaExpedicion?: string; ciudadExpedicion?: string; ciudad?: string; direccion?: string;
    fechaNacimiento?: string; ciudadNacimiento?: string;
  };
  // Archivos ya cargados en el flujo de Skala (cédula, desprendible, resolución…).
  documentosSkala?: { tipo: string; file: File }[];
  // Oferta que YA calculó el simulador de Skala. Si viene, manda sobre la calculadora de la entidad.
  oferta?: { monto: number; tasa: number; plazo: number; cuota?: number };
  onChange: (d: PreData | null) => void;
}

const inputCls = 'w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-primary focus:bg-white transition-all placeholder:text-slate-300';
const labelCls = 'block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1';

export const PreaprobacionPanel: React.FC<Props> = ({ entityName, prefill, documentosSkala = [], oferta: ofertaSkala, onChange }) => {
  // Datos financieros que ya vienen del flujo (no editables aquí; solo se usan para la oferta/radicación).
  const [pagaduria, setPagaduria] = useState(() => PAGADURIAS_LH.find(p => (prefill.pagaduria || '').toUpperCase().includes(p.toUpperCase())) || (prefill.pagaduria || ''));
  const [ingresos] = useState(prefill.ingresos ? String(Math.round(prefill.ingresos)) : '');
  const [gastos] = useState(prefill.gastos ? String(Math.round(prefill.gastos)) : '0');
  const [plazo] = useState(prefill.plazo || 72);
  const [nombres, setNombres] = useState(prefill.nombres || '');
  const [apellidos, setApellidos] = useState(prefill.apellidos || '');
  const [documento, setDocumento] = useState(prefill.documento || '');
  const [correo, setCorreo] = useState(prefill.correo || '');
  const [celular, setCelular] = useState(prefill.celular || '');

  // El OCR de la cédula puede llegar DESPUÉS de montar el panel (el gestor la escanea aparte).
  // Cuando lleguen esos datos, se rellenan los campos que sigan VACÍOS (no se pisa lo que el
  // gestor ya escribió) → así no se piden dos veces los datos que la cédula ya trae.
  useEffect(() => {
    if (prefill.nombres) setNombres(v => v || prefill.nombres!);
    if (prefill.apellidos) setApellidos(v => v || prefill.apellidos!);
    if (prefill.documento) setDocumento(v => v || onlyDigits(prefill.documento!));
    if (prefill.correo) setCorreo(v => v || prefill.correo!);
    if (prefill.celular) setCelular(v => v || onlyDigits(prefill.celular!));
    if (prefill.pagaduria) setPagaduria(v => v || (PAGADURIAS_LH.find(p => prefill.pagaduria!.toUpperCase().includes(p.toUpperCase())) || prefill.pagaduria!));
  }, [prefill.nombres, prefill.apellidos, prefill.documento, prefill.correo, prefill.celular, prefill.pagaduria]); // eslint-disable-line react-hooks/exhaustive-deps

  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState('');
  const [viab, setViab] = useState<{ viable: boolean; mensaje: string; yaRegistrado?: boolean } | null>(null);
  const [oferta, setOferta] = useState<{ monto: number; cuota: number; tasa: number; plazo: number } | null>(null);
  // Cuota mensual que se radica. Viene de la oferta cuando existe; si no, se sugiere por
  // amortización sobre monto/tasa/plazo confirmados. `cuotaTocada` frena el auto-relleno
  // en cuanto el asesor escribe la suya (la de la entidad manda sobre la sugerencia).
  const [cuotaStr, setCuotaStr] = useState('');
  const [cuotaTocada, setCuotaTocada] = useState(false);

  // Paso OTP (correo)
  const [sessionId, setSessionId] = useState('');
  const [otpMode, setOtpMode] = useState(false);
  const [otpOk, setOtpOk] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMsg, setOtpMsg] = useState('');

  // Monto/tasa/plazo EDITABLES para radicar (prellenados con la oferta; el gestor puede ajustar
  // al valor que La Hipotecaria aprobó). Si la oferta no calcula (ej. sin ingresos), se ingresan a mano.
  const [montoStr, setMontoStr] = useState('');
  const [tasaStr, setTasaStr] = useState('');
  const [plazoStr, setPlazoStr] = useState('');

  // Formulario que La Hipotecaria pide DESPUÉS del OTP. Se lee su especificación real y se pinta
  // con la UI de Skala (el cliente nunca ve su sitio); al enviarlo, viaja a ellos y queda en Skala.
  const [spec, setSpec] = useState<LhCampo[]>([]);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [archivos, setArchivos] = useState<Record<string, LhArchivo>>({});
  const [seccion, setSeccion] = useState(1); // su wizard tiene varias secciones encadenadas
  const [titulo, setTitulo] = useState(''); // título de la sección actual ("Información de los ingresos")
  const [respuestasPrevias, setRespuestasPrevias] = useState<PreData['respuestasLH']>([]); // secciones ya enviadas
  const [autoAdjuntados, setAutoAdjuntados] = useState<Set<string>>(new Set()); // documentos traídos de Skala
  const [filesLH, setFilesLH] = useState<Record<string, { file: File; label: string }>>({}); // archivos nuevos → suben a Skala
  const [enviandoForm, setEnviandoForm] = useState(false);
  const [formMsg, setFormMsg] = useState('');
  const [formEnviado, setFormEnviado] = useState(false);

  // Cuota sugerida (sistema francés) sobre los valores confirmados: cuota = M·i / (1-(1+i)^-n).
  // Solo es una sugerencia editable; no reemplaza la cuota real de la entidad.
  const cuotaAmortizacion = (montoV: number, tasaPct: number, plazoV: number): number => {
    const i = tasaPct / 100;
    if (!(montoV > 0) || !(plazoV > 0)) return 0;
    if (!(i > 0)) return Math.round(montoV / plazoV);
    return Math.round((montoV * i) / (1 - Math.pow(1 + i, -plazoV)));
  };

  // Prellenar la cuota: la de la oferta manda; si no hay, se sugiere la amortización.
  // Se detiene apenas el asesor escribe la suya (cuotaTocada).
  useEffect(() => {
    if (!otpOk || cuotaTocada) return;
    if (oferta?.cuota && oferta.cuota > 0) { setCuotaStr(String(Math.round(oferta.cuota))); return; }
    const sugerida = cuotaAmortizacion(Number(onlyDigits(montoStr)), Number(tasaStr) || 0, Number(plazoStr) || plazo);
    setCuotaStr(sugerida > 0 ? String(sugerida) : '');
  }, [otpOk, oferta, montoStr, tasaStr, plazoStr, cuotaTocada]); // eslint-disable-line react-hooks/exhaustive-deps

  // Con el OTP confirmado Y el formulario de ellos enviado, emite el preData listo para radicar.
  useEffect(() => {
    if (!otpOk) return;
    const m = Number(onlyDigits(montoStr));
    const faltaForm = spec.length > 0 && !formEnviado; // su formulario es obligatorio si lo pidió
    onChange({
      nombres: nombres.trim(), apellidos: apellidos.trim(), numeroDocumento: onlyDigits(documento), tipoDocumento: 'CEDULA',
      correo: correo.trim(), telefonoCelular: onlyDigits(celular), pagaduria,
      monto: m, montoDesembolso: m, tasa: Number(tasaStr) || 0, plazo: Number(plazoStr) || plazo,
      cuota: Number(onlyDigits(cuotaStr)) || oferta?.cuota || 0,
      preaprobado: true, preaprobacionNumero: '', otpConfirmado: true,
      respuestasLH: formEnviado ? [...(respuestasPrevias || []), ...entradasSeccion()] : undefined,
      // La comisión NO sale del corretaje (son cosas distintas): La Hipotecaria paga 3% fijo,
      // que aplica createCredit. El corretaje (8.5%) es un dato de la entidad, oculto al asesor.
      documentosLH: formEnviado ? Object.entries(filesLH).map(([campo, f]) => ({ tipo: tipoDoc(f.label, campo), label: f.label, file: f.file })) : undefined,
      listo: m > 0 && !faltaForm,
    });
  }, [otpOk, montoStr, tasaStr, plazoStr, cuotaStr, oferta, pagaduria, spec, formEnviado, valores, respuestasPrevias, filesLH]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Nombre de tipo para guardar el documento en Skala (ej. "Certificación bancaria" → LH_CERTIFICACION_BANCARIA). */
  const tipoDoc = (label: string, campo: string) =>
    'LH_' + (label || campo).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);

  /** Respuestas de la sección que se está viendo, con etiqueta legible (para guardarlas en Skala). */
  const entradasSeccion = (): NonNullable<PreData['respuestasLH']> =>
    spec.map(c => ({
      // Si su formulario no nombra la sección, se usa el subtítulo del bloque o el número de paso:
      // guardar "?" haría ilegible el histórico del crédito.
      seccion: titulo || c.grupo || `Paso ${seccion}`,
      campo: c.name,
      label: c.label,
      valor: c.type === 'file'
        ? (archivos[c.name]?.nombre || '')
        : (c.options?.find(o => o.value === valores[c.name])?.label ?? valores[c.name] ?? ''),
    })).filter(e => e.valor);

  /**
   * Valor inicial sensato para cada campo de su formulario, con lo que Skala ya sabe del cliente.
   * Su wizard tiene varias secciones (datos personales, ingresos, referencia, documentos) y los
   * nombres de campo se leen en vivo: por eso el prellenado va por coincidencia de nombre.
   */
  const prefillCampo = (c: LhCampo, montoOferta: number, tituloSeccion: string): string => {
    const n = `${c.name} ${c.label}`.toLowerCase();
    const pick = (txt: string) => (txt ? c.options?.find(o => o.label.toUpperCase().includes(txt.toUpperCase()))?.value || '' : '');
    if (c.type === 'file') return '';

    // ⚠️ La sección de REFERENCIAS pide nombre/teléfono/ciudad DE UN FAMILIAR, no del cliente.
    // Prellenarla con los datos del titular mandaría información falsa: se deja en blanco.
    if (/referencia/i.test(tituloSeccion)) return '';

    // Corretaje: dato FIJO de La Hipotecaria (8.5%), oculto al asesor. Se elige la opción que
    // coincida con 8.5/8,5; si no existe, la más alta disponible.
    if (/corretaje/.test(n)) {
      const v = pick('8.5') || pick('8,5');
      if (v) return v;
      const alta = (c.options || []).slice().sort((a, b) => (parseFloat(b.label.replace(',', '.')) || 0) - (parseFloat(a.label.replace(',', '.')) || 0))[0];
      return alta?.value || '';
    }
    // Ingresos / crédito
    if (/pagaduria/.test(n)) return pick(pagaduria);
    if (/plazo/.test(n)) return String(plazo || '');
    if (/mesada|ingreso/.test(n)) return onlyDigits(ingresos);
    if (/valor_solicitud|monto/.test(n)) return montoOferta > 0 ? String(montoOferta) : '';
    // Datos personales (del OCR de la cédula que ya hizo Skala)
    if (/genero|sexo/.test(n)) return pick(prefill.sexo || '');
    if (/fecha.*expedicion|expedicion.*documento/.test(n)) return prefill.fechaExpedicion || '';
    if (/fecha.*nacimiento/.test(n)) return prefill.fechaNacimiento || '';
    if (/ciudad.*nacimiento|lugar.*nacimiento/.test(n)) return c.options ? pick(prefill.ciudadNacimiento || '') : (prefill.ciudadNacimiento || '');
    if (/ciudad.*residencia|residencia.*ciudad/.test(n)) return c.options ? pick(prefill.ciudad || '') : (prefill.ciudad || '');
    if (/direccion/.test(n)) return prefill.direccion || '';
    if (/correo|email/.test(n)) return correo.trim();
    if (/celular|telefono/.test(n)) return onlyDigits(celular);
    return '';
  };

  /** Lee un archivo del disco a base64 para mandarlo a La Hipotecaria por la Edge Function. */
  const leerArchivo = (f: File): Promise<LhArchivo> => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res({ nombre: f.name, tipo: f.type || 'application/octet-stream', base64: String(r.result).split(',')[1] || '' });
    r.onerror = () => rej(new Error(`No se pudo leer ${f.name}`));
    r.readAsDataURL(f);
  });

  /** Carga los campos del formulario pendiente y los prellena. */
  // El título llega por parámetro (no por estado) porque setTitulo aún no se ha aplicado cuando
  // se prellenan los campos, y de él depende NO contaminar la sección de referencias.
  const cargarFormulario = async (campos: LhCampo[], montoOferta: number, tituloSeccion: string) => {
    setSpec(campos);
    setTitulo(tituloSeccion);
    setFormEnviado(false);
    setArchivos({});
    setAutoAdjuntados(new Set());
    setValores(Object.fromEntries(campos.map(c => [c.name, prefillCampo(c, montoOferta, tituloSeccion)])));

    // Adjunta solo los documentos que el cliente ya subió en Skala (no se le piden de nuevo).
    const auto: Record<string, LhArchivo> = {};
    const marcados = new Set<string>();
    for (const c of campos.filter(x => x.type === 'file')) {
      const texto = `${c.name} ${c.label}`;
      const regla = DOC_AUTO.find(d => d.re.test(texto) && !(d.excl?.test(texto)));
      const doc = regla && documentosSkala.find(d => d.tipo === regla.tipo);
      if (!doc) continue;
      try { auto[c.name] = await leerArchivo(doc.file); marcados.add(c.name); } catch { /* si falla, lo sube el gestor */ }
    }
    if (Object.keys(auto).length) { setArchivos(auto); setAutoAdjuntados(marcados); }
  };

  const enviarFormulario = async () => {
    setFormMsg('');
    const faltan = spec.filter(c => c.required && !(c.type === 'file' ? archivos[c.name] : String(valores[c.name] || '').trim()));
    if (faltan.length) { setFormMsg(`Completa: ${faltan.map(c => c.label).join(', ')}.`); return; }
    setEnviandoForm(true);
    try {
      const r = await MockService.lahipotecariaContinuar(sessionId, valores, archivos);
      if (!r.ok) { setFormMsg(r.mensaje || 'La Hipotecaria rechazó el formulario.'); return; }
      // El monto solicitado del formulario manda para la radicación.
      const solicitado = Object.entries(valores).find(([k]) => /valor_solicitud|monto/i.test(k))?.[1];
      if (solicitado && onlyDigits(solicitado)) setMontoStr(onlyDigits(solicitado));
      const plazoForm = Object.entries(valores).find(([k]) => /plazo/i.test(k))?.[1];
      if (plazoForm && onlyDigits(plazoForm)) setPlazoStr(onlyDigits(plazoForm));

      if (r.siguienteFormulario && r.spec?.length) {
        // Su wizard sigue con otra sección (datos personales, referencia, documentos…) → se pinta.
        // Antes de cambiar, se guarda lo respondido para que TODO quede en Skala al radicar.
        setRespuestasPrevias(v => [...(v || []), ...entradasSeccion()]);
        await cargarFormulario(r.spec, Number(onlyDigits(solicitado || '')) || 0, r.titulo || '');
        setSeccion(n => n + 1);
        setFormMsg('Sección enviada. Continúa con los siguientes datos.');
      } else {
        setFormEnviado(true);
        setFormMsg(r.mensaje || 'Formulario enviado a La Hipotecaria.');
      }
    } catch (e: any) {
      setFormMsg(e?.message || 'No se pudo enviar el formulario.');
    } finally { setEnviandoForm(false); }
  };

  const buildParams = () => ({
    nombres: nombres.trim(), apellidos: apellidos.trim(), documento: onlyDigits(documento),
    correo: correo.trim(), celular: onlyDigits(celular),
    ingresos: Number(onlyDigits(ingresos)), gastos: Number(onlyDigits(gastos)), pagaduria, plazo,
  });

  // Tras confirmar el OTP: intenta traer la oferta (monto/tasa) de la calculadora y prellena los
  // campos editables. Si no calcula (ej. entrada manual sin ingresos), quedan para que el gestor
  // ingrese el monto que La Hipotecaria aprobó. El useEffect de arriba emite el preData.
  const cargarOfertaYPreData = async (p: ReturnType<typeof buildParams>): Promise<number> => {
    // Si el simulador de Skala ya calculó la oferta, esa manda: no se vuelve a pedir a la entidad.
    if (ofertaSkala && ofertaSkala.monto > 0) {
      setOferta({ monto: ofertaSkala.monto, cuota: ofertaSkala.cuota || 0, tasa: ofertaSkala.tasa, plazo: ofertaSkala.plazo });
      setMontoStr(String(ofertaSkala.monto));
      setTasaStr(String(ofertaSkala.tasa || ''));
      setPlazoStr(String(ofertaSkala.plazo || plazo));
      return ofertaSkala.monto;
    }
    try {
      const c = await MockService.lahipotecariaCalcular({ ingresos: p.ingresos, gastos: p.gastos, pagaduria, plazo });
      if (c.aprobado && c.monto > 0) {
        setOferta({ monto: c.monto, cuota: c.cuota, tasa: c.tasa, plazo: c.plazo });
        setMontoStr(String(c.monto)); setTasaStr(String(c.tasa || '')); setPlazoStr(String(c.plazo || plazo));
        return c.monto;
      }
    } catch { /* la oferta es opcional; el OTP ya se confirmó */ }
    // Sin oferta automática → el gestor pone el monto a mano.
    setOferta(null);
    if (!plazoStr) setPlazoStr(String(plazo));
    return 0;
  };

  const verificar = async () => {
    setError(''); setViab(null); setOferta(null); setOtpMode(false); setOtpOk(false);
    setSessionId(''); setCodigo(''); setOtpMsg(''); onChange(null);
    setSpec([]); setValores({}); setArchivos({}); setFilesLH({}); setRespuestasPrevias([]); setTitulo(''); setSeccion(1); setFormEnviado(false); setFormMsg('');
    // La viabilidad solo necesita datos personales (la decide la cédula). Pagaduría/ingresos no se exigen aquí.
    if (!nombres.trim() || !apellidos.trim() || onlyDigits(documento).length < 5) { setError('Completa nombres, apellidos y documento.'); return; }
    if (!correo.trim()) { setError('El correo es obligatorio (allí llega el código OTP).'); return; }
    setVerificando(true);
    try {
      const p = buildParams();
      const r = await MockService.lahipotecariaViabilidad(p);
      setViab({ viable: r.viable, mensaje: r.mensaje, yaRegistrado: r.yaRegistrado });
      if (r.viable) {
        if (r.otpEnviado && r.sessionId) {
          setSessionId(r.sessionId); setOtpMode(true); setOtpMsg(r.mensaje || ''); // hay que validar el OTP antes de radicar
        }
        // Si viable pero SIN sesión de OTP (ya registrado, sesión vencida): NO se habilita radicar.
        // La Hipotecaria no reenvía el código, así que sin OTP confirmado no se puede continuar.
        // (onChange(null) ya se ejecutó al inicio → preData sigue null → botón radicar deshabilitado.)
      }
    } catch (e: any) {
      setError(e?.message || 'No se pudo verificar la viabilidad con La Hipotecaria.');
    } finally {
      setVerificando(false);
    }
  };

  const validarOtp = async () => {
    setOtpMsg('');
    if (!codigo.trim()) { setOtpMsg('Ingresa el código que llegó al correo.'); return; }
    setOtpLoading(true);
    try {
      const v = await MockService.lahipotecariaVerifyOtp(sessionId, codigo.trim());
      if (v.ok) {
        setOtpOk(true); setOtpMsg(v.mensaje || 'Código verificado.');
        const montoOferta = await cargarOfertaYPreData(buildParams());
        // Tras el OTP su formulario continúa: se traen sus campos y se pintan aquí mismo.
        let campos = v.spec || [];
        let tit = v.titulo || '';
        if (!campos.length) {
          try { const f = await MockService.lahipotecariaFormulario(sessionId); campos = f.spec || []; tit = f.titulo || ''; } catch { /* opcional */ }
        }
        if (campos.length) await cargarFormulario(campos, montoOferta, tit);
      }
      else setOtpMsg(v.mensaje || 'Código incorrecto o vencido.');
    } catch (e: any) {
      setOtpMsg(e?.message || 'No se pudo validar el código.');
    } finally { setOtpLoading(false); }
  };

  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] p-4 sm:p-8 shadow-xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-teal-100 text-teal-700 rounded-xl"><ShieldCheck size={22} /></div>
        <div>
          <h3 className="text-xl font-display font-black text-slate-800">Viabilidad — {entityName}</h3>
          <p className="text-sm text-slate-400">La viabilidad se decide por la cédula del cliente. Ingresa los datos personales y verifica en línea; si es viable, llega un código al correo del cliente para confirmar.</p>
        </div>
      </div>

      {/* La viabilidad de La Hipotecaria se decide SOLO por la cédula: aquí solo datos personales.
          La pagaduría/monto/plazo del crédito se confirman abajo, después del OTP. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div><label className={labelCls}>Nombres</label><input value={nombres} onChange={e => setNombres(e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Apellidos</label><input value={apellidos} onChange={e => setApellidos(e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Documento</label><input value={documento} onChange={e => setDocumento(onlyDigits(e.target.value))} className={inputCls} inputMode="numeric" /></div>
        <div><label className={labelCls}>Correo (llega el OTP)</label><input value={correo} onChange={e => setCorreo(e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Celular</label><input value={celular} onChange={e => setCelular(onlyDigits(e.target.value))} className={inputCls} inputMode="numeric" /></div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={verificar} disabled={verificando} className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-teal-700 disabled:opacity-50">
          {verificando ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Verificar viabilidad
        </button>
        {error && <span className="text-xs text-red-600 font-bold">{error}</span>}
      </div>

      {/* Resultado de viabilidad */}
      {viab && !viab.viable && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5">
          <p className="text-lg font-black text-red-700 flex items-center gap-2"><XCircle size={22} /> Cliente NO VIABLE</p>
          <p className="text-sm text-red-600 mt-1">{viab.mensaje}</p>
        </div>
      )}

      {/* Paso OTP: viable → validar el código del correo */}
      {viab?.viable && otpMode && !otpOk && (
        <div className="bg-teal-50 border-2 border-teal-200 rounded-2xl p-5 space-y-3">
          <p className="text-base font-black text-teal-800 flex items-center gap-2"><Mail size={20} /> {viab.yaRegistrado ? 'Cliente ya registrado — confirma el código del correo' : 'Cliente VIABLE — confirma el código del correo'}</p>
          <p className="text-sm text-teal-700">{viab.yaRegistrado ? 'El cliente ya tenía un registro. Ingresa el ' : 'La Hipotecaria envió un '}<b>código OTP al correo del cliente</b> ({correo}). <b>Es obligatorio confirmarlo</b> para poder radicar.</p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className={labelCls}>Código OTP</label>
              <input value={codigo} onChange={e => setCodigo(e.target.value.replace(/\s/g, ''))} className={`${inputCls} w-48 tracking-[0.3em] text-center`} placeholder="••••••" />
            </div>
            <button onClick={validarOtp} disabled={otpLoading} className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-teal-700 disabled:opacity-50">
              {otpLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Validar código
            </button>
            <button onClick={verificar} disabled={verificando || otpLoading} className="text-xs font-bold text-slate-500 hover:text-slate-800 underline">Reenviar código</button>
          </div>
          {otpMsg && <p className="text-xs text-slate-600 font-semibold">{otpMsg}</p>}
        </div>
      )}

      {/* Bloqueado: viable pero sin sesión de OTP (ya registrado, sesión vencida) → NO se puede radicar */}
      {viab?.viable && !otpMode && !otpOk && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 space-y-2">
          <p className="text-base font-black text-amber-800 flex items-center gap-2"><AlertTriangle size={20} /> Cliente ya registrado — OTP no disponible</p>
          <p className="text-sm text-amber-700">{viab.mensaje}</p>
          <p className="text-xs text-amber-700">La Hipotecaria <b>no reenvía</b> el código para un registro existente, así que no se puede confirmar el OTP desde aquí. <b>No es posible radicar sin confirmar el OTP.</b> Para continuar, el registro debe completarse con La Hipotecaria (o iniciar el proceso con un cliente nuevo).</p>
        </div>
      )}

      {/* Tras el OTP, La Hipotecaria continúa con SU formulario. Se pinta aquí con la UI de Skala
          (el cliente nunca sale a su sitio) y al enviarlo viaja a ellos + queda guardado en Skala. */}
      {viab?.viable && otpOk && spec.length > 0 && !formEnviado && (
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-baseline gap-2 flex-wrap">
            <FileText size={20} className="text-teal-600 shrink-0 self-center" />
            <p className="text-base font-black text-slate-800">{titulo || `Datos de la solicitud — ${entityName}`}</p>
            <span className="text-xs font-bold text-slate-400">· paso {seccion} · {entityName}</span>
          </div>
          <p className="text-xs text-slate-500">Lo que Skala ya sabe viene prellenado. Al enviar, los datos quedan registrados en La Hipotecaria <b>y</b> guardados en el crédito de Skala.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {spec.map((c, i) => (
              // El CORRETAJE es dato fijo de La Hipotecaria (8.5%): oculto al asesor, pero su valor
              // ya quedó prellenado y se envía igual.
              /corretaje/i.test(`${c.name} ${c.label}`) ? null : (
              <React.Fragment key={c.name}>
                {/* Subtítulo del bloque, tal como lo agrupa su formulario */}
                {c.grupo && c.grupo !== spec[i - 1]?.grupo && (
                  <p className="sm:col-span-2 text-sm font-black text-teal-700 uppercase tracking-wide border-b border-teal-100 pb-1 mt-2">{c.grupo}</p>
                )}
              <div className={c.type === 'textarea' || c.type === 'file' ? 'sm:col-span-2' : ''}>
                <label className={labelCls}>{c.label}{c.required && <span className="text-red-500"> *</span>}</label>
                {c.hint && <p className="text-[11px] text-slate-400 font-semibold mb-1 normal-case">{c.hint}</p>}
                {c.type === 'select' ? (
                  <select value={valores[c.name] || ''} onChange={e => setValores(v => ({ ...v, [c.name]: e.target.value }))} className={inputCls}>
                    <option value="">— Selecciona —</option>
                    {c.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : c.type === 'textarea' ? (
                  <textarea value={valores[c.name] || ''} onChange={e => setValores(v => ({ ...v, [c.name]: e.target.value }))} rows={3} className={`${inputCls} font-semibold`} />
                ) : c.type === 'file' ? (
                  <div className="space-y-1">
                    {archivos[c.name] && (
                      <p className={`text-[11px] font-bold flex items-center gap-1.5 ${autoAdjuntados.has(c.name) ? 'text-teal-600' : 'text-slate-500'}`}>
                        <CheckCircle2 size={14} className="shrink-0" />
                        {archivos[c.name].nombre}
                        {autoAdjuntados.has(c.name) && <span className="text-teal-500 font-black uppercase tracking-wider">· ya cargado en Skala</span>}
                      </p>
                    )}
                    <input type="file" className="block w-full text-xs font-bold text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                      onChange={async e => {
                        const f = e.target.files?.[0];
                        setAutoAdjuntados(s => { const n = new Set(s); n.delete(c.name); return n; }); // ya no es el de Skala
                        if (!f) {
                          setArchivos(a => { const { [c.name]: _, ...rest } = a; return rest; });
                          setFilesLH(a => { const { [c.name]: _, ...rest } = a; return rest; });
                          return;
                        }
                        try {
                          const leido = await leerArchivo(f);
                          setArchivos(a => ({ ...a, [c.name]: leido }));
                          setFilesLH(a => ({ ...a, [c.name]: { file: f, label: c.label } })); // también se guarda en Skala
                        } catch (err: any) { setFormMsg(err?.message || 'No se pudo leer el archivo.'); }
                      }} />
                    {archivos[c.name] && autoAdjuntados.has(c.name) && <p className="text-[10px] text-slate-400 font-semibold">Elige otro archivo si quieres reemplazarlo.</p>}
                  </div>
                ) : c.type === 'date' ? (
                  <input type="date" value={valores[c.name] || ''} onChange={e => setValores(v => ({ ...v, [c.name]: e.target.value }))} className={inputCls} />
                ) : (
                  <input value={valores[c.name] || ''} onChange={e => setValores(v => ({ ...v, [c.name]: e.target.value }))} className={inputCls} />
                )}
                {/^\d+$/.test(valores[c.name] || '') && /valor|monto|mesada/i.test(c.name) && (
                  <p className="text-[11px] text-teal-600 font-bold mt-1">{fmt(Number(valores[c.name]))}</p>
                )}
              </div>
              </React.Fragment>
              )
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={enviarFormulario} disabled={enviandoForm} className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-teal-700 disabled:opacity-50">
              {enviandoForm ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Enviar a La Hipotecaria
            </button>
            {formMsg && <span className="text-xs font-bold text-slate-600">{formMsg}</span>}
          </div>
        </div>
      )}

      {/* Confirmado: OTP validado y su formulario enviado → monto/tasa/plazo + listo para radicar */}
      {viab?.viable && otpOk && (spec.length === 0 || formEnviado) && (
        <div className="bg-teal-50 border-2 border-teal-200 rounded-2xl p-5 space-y-3">
          <p className="text-lg font-black text-teal-800 flex items-center gap-2"><CheckCircle2 size={22} /> {formEnviado ? 'Solicitud enviada a La Hipotecaria' : 'OTP confirmado — preaprobación lista'}</p>
          {formEnviado && <p className="text-xs text-teal-700 font-semibold">{formMsg}</p>}
          <p className="text-xs text-teal-700">{oferta ? 'Estos son los valores de la oferta; ajústalos si La Hipotecaria aprobó otro monto.' : 'Confirma la pagaduría e ingresa el monto aprobado por La Hipotecaria para radicar.'}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>Pagaduría</label>
              <select value={pagaduria} onChange={e => setPagaduria(e.target.value)} className={inputCls}>
                {!PAGADURIAS_LH.includes(pagaduria) && pagaduria && <option value={pagaduria}>{pagaduria}</option>}
                {PAGADURIAS_LH.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Monto {Number(montoStr) > 0 && <span className="text-teal-600 normal-case font-bold">{fmt(Number(montoStr))}</span>}</label>
              <input value={montoStr} onChange={e => setMontoStr(onlyDigits(e.target.value))} placeholder="5000000" className={`${inputCls} ${Number(montoStr) > 0 ? '' : 'border-amber-300'}`} inputMode="numeric" />
            </div>
            <div><label className={labelCls}>Tasa (%)</label><input value={tasaStr} onChange={e => setTasaStr(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="1.85" className={inputCls} inputMode="decimal" /></div>
            <div><label className={labelCls}>Plazo (meses)</label><input value={plazoStr} onChange={e => setPlazoStr(onlyDigits(e.target.value))} placeholder="72" className={inputCls} inputMode="numeric" /></div>
          </div>
          {/* La cuota es dato operativo del crédito (lo que se descuenta por nómina). Cuando no
              viene de una oferta del simulador hay que capturarla: si se deja vacía, el crédito
              se radica sin cuota. Se sugiere la de la amortización, pero manda la de la entidad. */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Cuota mensual {Number(cuotaStr) > 0 && <span className="text-teal-600 normal-case font-bold">{fmt(Number(cuotaStr))}</span>}</label>
              <input value={cuotaStr} onChange={e => { setCuotaTocada(true); setCuotaStr(onlyDigits(e.target.value)); }} placeholder="0" className={`${inputCls} ${Number(cuotaStr) > 0 ? '' : 'border-amber-300'}`} inputMode="numeric" />
              {Number(cuotaStr) > 0 && !cuotaTocada && !oferta && (
                <p className="text-[10px] text-teal-600 mt-1">Sugerida por amortización — ajústala a la cuota real de La Hipotecaria.</p>
              )}
            </div>
          </div>
          <p className="text-[11px] text-teal-600">
            {Number(montoStr) > 0
              ? (Number(cuotaStr) > 0 ? '✓ Listo para radicar (botón abajo).' : '⚠ Falta la cuota: el crédito se radicaría sin ella.')
              : 'Falta el monto para habilitar la radicación.'}
          </p>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { MockService } from '../../services/mockService';
import { Loader2, CheckCircle2, XCircle, ShieldCheck, Search, Mail, AlertTriangle } from 'lucide-react';

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
  listo: boolean; // hay datos suficientes Y el OTP confirmado → se puede radicar
}

interface Props {
  entityName: string;
  prefill: { nombres?: string; apellidos?: string; documento?: string; correo?: string; celular?: string; ingresos?: number; gastos?: number; pagaduria?: string; plazo?: number };
  onChange: (d: PreData | null) => void;
}

const inputCls = 'w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-primary focus:bg-white transition-all placeholder:text-slate-300';
const labelCls = 'block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1';

export const PreaprobacionPanel: React.FC<Props> = ({ entityName, prefill, onChange }) => {
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

  const [verificando, setVerificando] = useState(false);
  const [error, setError] = useState('');
  const [viab, setViab] = useState<{ viable: boolean; mensaje: string; yaRegistrado?: boolean } | null>(null);
  const [oferta, setOferta] = useState<{ monto: number; cuota: number; tasa: number; plazo: number } | null>(null);

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

  // Con el OTP confirmado, emite el preData listo para radicar según los valores editables.
  useEffect(() => {
    if (!otpOk) return;
    const m = Number(onlyDigits(montoStr));
    onChange({
      nombres: nombres.trim(), apellidos: apellidos.trim(), numeroDocumento: onlyDigits(documento), tipoDocumento: 'CEDULA',
      correo: correo.trim(), telefonoCelular: onlyDigits(celular), pagaduria,
      monto: m, montoDesembolso: m, tasa: Number(tasaStr) || 0, plazo: Number(plazoStr) || plazo, cuota: oferta?.cuota || 0,
      preaprobado: true, preaprobacionNumero: '', otpConfirmado: true, listo: m > 0,
    });
  }, [otpOk, montoStr, tasaStr, plazoStr, pagaduria]); // eslint-disable-line react-hooks/exhaustive-deps

  const buildParams = () => ({
    nombres: nombres.trim(), apellidos: apellidos.trim(), documento: onlyDigits(documento),
    correo: correo.trim(), celular: onlyDigits(celular),
    ingresos: Number(onlyDigits(ingresos)), gastos: Number(onlyDigits(gastos)), pagaduria, plazo,
  });

  // Tras confirmar el OTP: intenta traer la oferta (monto/tasa) de la calculadora y prellena los
  // campos editables. Si no calcula (ej. entrada manual sin ingresos), quedan para que el gestor
  // ingrese el monto que La Hipotecaria aprobó. El useEffect de arriba emite el preData.
  const cargarOfertaYPreData = async (p: ReturnType<typeof buildParams>) => {
    try {
      const c = await MockService.lahipotecariaCalcular({ ingresos: p.ingresos, gastos: p.gastos, pagaduria, plazo });
      if (c.aprobado && c.monto > 0) {
        setOferta({ monto: c.monto, cuota: c.cuota, tasa: c.tasa, plazo: c.plazo });
        setMontoStr(String(c.monto)); setTasaStr(String(c.tasa || '')); setPlazoStr(String(c.plazo || plazo));
        return;
      }
    } catch { /* la oferta es opcional; el OTP ya se confirmó */ }
    // Sin oferta automática → el gestor pone el monto a mano.
    setOferta(null);
    if (!plazoStr) setPlazoStr(String(plazo));
  };

  const verificar = async () => {
    setError(''); setViab(null); setOferta(null); setOtpMode(false); setOtpOk(false);
    setSessionId(''); setCodigo(''); setOtpMsg(''); onChange(null);
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
      if (v.ok) { setOtpOk(true); setOtpMsg(v.mensaje || 'Código verificado.'); await cargarOfertaYPreData(buildParams()); }
      else setOtpMsg(v.mensaje || 'Código incorrecto o vencido.');
    } catch (e: any) {
      setOtpMsg(e?.message || 'No se pudo validar el código.');
    } finally { setOtpLoading(false); }
  };

  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-xl space-y-6">
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

      <div className="flex items-center gap-3">
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

      {/* Confirmado: SOLO con el OTP validado → monto/tasa/plazo editables + listo para radicar */}
      {viab?.viable && otpOk && (
        <div className="bg-teal-50 border-2 border-teal-200 rounded-2xl p-5 space-y-3">
          <p className="text-lg font-black text-teal-800 flex items-center gap-2"><CheckCircle2 size={22} /> OTP confirmado — preaprobación lista</p>
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
          <p className="text-[11px] text-teal-600">{Number(montoStr) > 0 ? '✓ Listo para radicar (botón abajo).' : 'Falta el monto para habilitar la radicación.'}</p>
        </div>
      )}
    </div>
  );
};

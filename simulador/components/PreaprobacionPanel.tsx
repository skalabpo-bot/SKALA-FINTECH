import React, { useState } from 'react';
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
  const [pagaduria] = useState(() => PAGADURIAS_LH.find(p => (prefill.pagaduria || '').toUpperCase().includes(p.toUpperCase())) || (prefill.pagaduria || ''));
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

  const buildParams = () => ({
    nombres: nombres.trim(), apellidos: apellidos.trim(), documento: onlyDigits(documento),
    correo: correo.trim(), celular: onlyDigits(celular),
    ingresos: Number(onlyDigits(ingresos)), gastos: Number(onlyDigits(gastos)), pagaduria, plazo,
  });

  // Trae la oferta (monto/cuota/tasa) y arma el preData. SOLO se llama tras confirmar el OTP,
  // así que `listo`/`otpConfirmado` siempre quedan en true (regla: obligar OTP antes de radicar).
  const cargarOfertaYPreData = async (p: ReturnType<typeof buildParams>) => {
    try {
      const c = await MockService.lahipotecariaCalcular({ ingresos: p.ingresos, gastos: p.gastos, pagaduria, plazo });
      const monto = c.aprobado ? c.monto : 0;
      setOferta(c.aprobado ? { monto: c.monto, cuota: c.cuota, tasa: c.tasa, plazo: c.plazo } : null);
      onChange({
        nombres: p.nombres, apellidos: p.apellidos, numeroDocumento: p.documento, tipoDocumento: 'CEDULA',
        correo: p.correo, telefonoCelular: p.celular, pagaduria,
        monto, montoDesembolso: monto, tasa: c.tasa || 0, plazo: c.plazo || plazo, cuota: c.cuota || 0,
        preaprobado: true, preaprobacionNumero: '', otpConfirmado: true, listo: monto > 0,
      });
    } catch { /* la oferta es opcional; el OTP ya se confirmó */ }
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

      {/* La viabilidad de La Hipotecaria se decide SOLO por la cédula: pedimos únicamente los
          datos personales. Pagaduría/ingresos/plazo (que ya se recogieron en el flujo) se usan
          después para armar la oferta y radicar; aquí solo se muestran como referencia. */}
      {(pagaduria || Number(ingresos) > 0 || plazo) ? (
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <span className="font-black uppercase tracking-widest text-slate-400">Para la oferta:</span>
          {pagaduria && <span className="bg-slate-100 rounded-full px-3 py-1 font-bold">{pagaduria}</span>}
          {Number(ingresos) > 0 && <span className="bg-slate-100 rounded-full px-3 py-1 font-bold">Ingresos {fmt(Number(ingresos))}</span>}
          {plazo ? <span className="bg-slate-100 rounded-full px-3 py-1 font-bold">{plazo} meses</span> : null}
        </div>
      ) : null}

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

      {/* Confirmado: SOLO con el OTP validado → oferta + listo para radicar */}
      {viab?.viable && otpOk && (
        <div className="bg-teal-50 border-2 border-teal-200 rounded-2xl p-5 space-y-3">
          <p className="text-lg font-black text-teal-800 flex items-center gap-2"><CheckCircle2 size={22} /> OTP confirmado — preaprobación lista</p>
          {oferta && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl border border-teal-200 p-3"><p className="text-[10px] font-black text-slate-400 uppercase">Monto</p><p className="text-lg font-black text-teal-700">{fmt(oferta.monto)}</p></div>
              <div className="bg-white rounded-xl border border-slate-200 p-3"><p className="text-[10px] font-black text-slate-400 uppercase">Cuota</p><p className="text-lg font-black text-slate-700">{fmt(oferta.cuota)}</p></div>
              <div className="bg-white rounded-xl border border-slate-200 p-3"><p className="text-[10px] font-black text-slate-400 uppercase">Tasa</p><p className="text-lg font-black text-slate-700">{oferta.tasa}%</p></div>
              <div className="bg-white rounded-xl border border-slate-200 p-3"><p className="text-[10px] font-black text-slate-400 uppercase">Plazo</p><p className="text-lg font-black text-slate-700">{oferta.plazo} m</p></div>
            </div>
          )}
          <p className="text-[11px] text-teal-600">Puedes radicar el crédito con estos valores (botón abajo).</p>
        </div>
      )}
    </div>
  );
};

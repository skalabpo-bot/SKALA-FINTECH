
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Loader2, CheckCircle2, UserPlus, Eye, EyeOff, Copy, Check, Camera, Clock } from 'lucide-react';

/**
 * Genera el código de supervisor: iniciales + últimos 3 dígitos de cédula
 * Ejemplo: JUAN PÉREZ CC 1012345678 → JP-678
 */
const generateSupervisorCode = (name: string, lastName: string, cedula: string): string => {
  const initial1 = (name || '').trim().charAt(0).toUpperCase();
  const initial2 = (lastName || '').trim().charAt(0).toUpperCase();
  const last3 = (cedula || '').trim().slice(-3);
  return `${initial1}${initial2}-${last3}`;
};

type DocEntry = { name: string; url: string; type: string };

export const SupervisorRegistration: React.FC = () => {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [cedula, setCedula] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [supervisorCode, setSupervisorCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);

  const code = generateSupervisorCode(nombre, apellido, cedula);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(type);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `registration/${Date.now()}_${type}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('skala-bucket')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('skala-bucket').getPublicUrl(filePath);

      setDocs(prev => [
        ...prev.filter(d => d.type !== type),
        { name: file.name, url: urlData.publicUrl, type }
      ]);
    } catch (err: any) {
      setError(`Error al subir ${type.replace(/_/g, ' ')}: ${err.message}`);
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!nombre.trim() || !apellido.trim()) { setError('Nombre y apellido son obligatorios'); return; }
    if (!cedula.trim() || !/^\d{6,12}$/.test(cedula.trim())) { setError('Cedula invalida (solo numeros, 6-12 digitos)'); return; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Correo invalido'); return; }
    if (!password || password.length < 6) { setError('La contrasena debe tener minimo 6 caracteres'); return; }

    // Validar documentos obligatorios
    const requiredDocs = ['CEDULA_FRONTAL', 'CEDULA_POSTERIOR', 'RUT', 'CERTIFICACION_BANCARIA'];
    const uploadedTypes = docs.map(d => d.type);
    const missingDocs = requiredDocs.filter(doc => !uploadedTypes.includes(doc));
    if (missingDocs.length > 0) {
      setError(`Faltan documentos: ${missingDocs.map(d => d.replace(/_/g, ' ')).join(', ')}`);
      return;
    }

    if (!acceptedPolicy) {
      setError('Debes aceptar la politica de tratamiento de datos');
      return;
    }

    setLoading(true);
    try {
      const fullName = `${nombre.trim()} ${apellido.trim()}`;
      const finalCode = generateSupervisorCode(nombre, apellido, cedula);

      // 1. Crear usuario en Auth con estado PENDING (todos los datos en metadata para que el trigger los copie)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone.trim(),
            cedula: cedula.trim(),
            role: 'SUPERVISOR_ASIGNADO',
            status: 'PENDING',
            registration_docs: docs,
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No se pudo crear el usuario');

      // 2. Esperar a que el trigger cree el perfil, luego respaldo manual
      await new Promise(r => setTimeout(r, 1500));

      const { data: existing } = await supabase.from('profiles').select('id').eq('id', authData.user.id).single();
      if (!existing) {
        await supabase.from('profiles').insert({
          id: authData.user.id,
          full_name: fullName,
          email: email.trim(),
          role: 'SUPERVISOR_ASIGNADO',
          status: 'PENDING',
          phone: phone.trim(),
          cedula: cedula.trim(),
          registration_docs: docs,
        }).then(({ error }) => { if (error) console.warn('Insert manual perfil falló (RLS):', error); });
      }

      // 3. Notificar admins
      try {
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'ADMIN');

        if (admins && admins.length > 0) {
          const notifications = admins.map((admin: any) => ({
            user_id: admin.id,
            title: 'Nueva Solicitud de Supervisor',
            message: `${fullName} (${finalCode}) solicita ser supervisor. Revisa sus documentos.`,
            type: 'warning',
            is_read: false,
          }));
          await supabase.from('notifications').insert(notifications);
        }
      } catch { /* silently continue */ }

      setSupervisorCode(finalCode);
      setSuccess(true);
    } catch (err: any) {
      console.error('Error en registro:', err);
      if (err.message?.includes('already registered')) {
        setError('Este correo ya esta registrado. Intenta con otro.');
      } else {
        setError(err.message || 'Error al registrar. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(supervisorCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputCls = 'w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-orange-500 focus:bg-white transition-all placeholder:text-slate-300';

  // Pantalla de éxito
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center space-y-6 animate-fade-in">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
            <Clock size={40} className="text-orange-600" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-800">Solicitud Enviada</h2>
            <p className="text-sm text-slate-500 mt-2">
              <strong>{nombre} {apellido}</strong>, tu solicitud esta siendo revisada por el equipo de SKALA.
            </p>
          </div>

          {/* Código de supervisor (preview) */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 text-white space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Tu codigo de supervisor sera</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl font-mono font-black tracking-wider">{supervisorCode}</span>
              <button
                onClick={handleCopyCode}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
              >
                {copied ? <Check size={20} /> : <Copy size={20} />}
              </button>
            </div>
            <p className="text-xs opacity-80 leading-relaxed">
              Este codigo se activara cuando tu solicitud sea aprobada.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
            <p className="text-xs font-bold text-amber-800">Proceso de aprobacion:</p>
            <ul className="text-xs text-amber-700 mt-1 space-y-1 list-disc list-inside">
              <li>Revisaremos tus documentos (cedula, RUT, cert. bancario)</li>
              <li>Una vez aprobado, podras iniciar sesion y se creara tu zona</li>
              <li>Compartiras tu codigo con tus gestores</li>
            </ul>
          </div>

          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all text-sm"
          >
            Ir a Iniciar Sesion
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-8 text-center text-white">
          <img src="/skala.png" alt="Skala" className="w-16 h-16 rounded-2xl mx-auto mb-4 shadow-lg" />
          <h1 className="text-2xl font-black">Registro de Supervisor</h1>
          <p className="text-sm opacity-80 mt-1">Crea tu cuenta y obtendras tu codigo de supervisor</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Preview del código */}
          {nombre && apellido && cedula.length >= 3 && (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-4 text-center animate-fade-in">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Tu codigo sera</p>
              <p className="text-2xl font-mono font-black text-orange-600 tracking-wider">{code}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Nombre *</label>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ''))}
                placeholder="Juan"
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Apellido *</label>
              <input
                type="text"
                value={apellido}
                onChange={e => setApellido(e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ''))}
                placeholder="Pérez"
                className={inputCls}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Cedula *</label>
            <input
              type="text"
              value={cedula}
              onChange={e => setCedula(e.target.value.replace(/\D/g, '').slice(0, 12))}
              placeholder="1012345678"
              className={inputCls}
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Correo electronico *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="supervisor@correo.com"
              className={inputCls}
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Celular</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="3001234567"
              className={inputCls}
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Contrasena *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimo 6 caracteres"
                className={inputCls}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Documentos */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="font-black text-slate-400 text-[9px] uppercase tracking-widest mb-2">Documentos (Obligatorio)</h4>
            <p className="text-[10px] text-red-600 font-bold mb-4">* Debes subir los 4 documentos para completar tu registro</p>
            <div className="grid grid-cols-2 gap-3">
              {['CEDULA_FRONTAL', 'CEDULA_POSTERIOR', 'RUT', 'CERTIFICACION_BANCARIA'].map(type => (
                <div
                  key={type}
                  className={`p-4 border-2 border-dashed rounded-2xl flex flex-col items-center gap-2 transition-all ${
                    docs.find(d => d.type === type)
                      ? 'bg-green-50 border-green-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  {uploadingDoc === type ? (
                    <Loader2 size={20} className="animate-spin text-orange-500" />
                  ) : (
                    <Camera size={20} className={docs.find(d => d.type === type) ? 'text-green-500' : 'text-slate-400'} />
                  )}
                  <p className="text-[8px] font-black text-center uppercase leading-tight text-slate-500">
                    {type.replace(/_/g, ' ')}
                  </p>
                  <label className="text-[9px] bg-white border-2 px-3 py-1.5 rounded-xl cursor-pointer font-black shadow-sm hover:shadow-md transition-all">
                    {docs.find(d => d.type === type) ? 'CAMBIAR' : 'SUBIR'}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={e => handleFileUpload(e, type)}
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Política de datos */}
          <div className="pt-4 border-t border-slate-100">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={acceptedPolicy}
                onChange={e => setAcceptedPolicy(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded border-2 border-slate-300 text-orange-500 focus:ring-orange-500 accent-orange-500 flex-shrink-0"
                required
              />
              <span className="text-xs text-slate-600 leading-relaxed">
                He leido y acepto la{' '}
                <a href="/?pagina=politicas" target="_blank" className="text-orange-500 font-bold hover:underline">
                  Politica de Tratamiento de Datos Personales
                </a>{' '}
                y autorizo a SKALA para el tratamiento de mis datos conforme a la Ley 1581 de 2012.
              </span>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-bold">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || uploadingDoc !== null}
            className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-black text-sm uppercase tracking-wide rounded-xl transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Creando cuenta...</>
            ) : (
              <><UserPlus size={18} /> Registrarme como Supervisor</>
            )}
          </button>

          <p className="text-center text-xs text-slate-400">
            Ya tienes cuenta? <a href="/" className="text-orange-500 font-bold hover:underline">Inicia sesion</a>
          </p>
        </form>
      </div>
    </div>
  );
};

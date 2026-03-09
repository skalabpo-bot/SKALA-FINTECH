
import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Loader2, CheckCircle2, UserPlus, Eye, EyeOff, Copy, Check } from 'lucide-react';

/**
 * Genera el código de supervisor: iniciales + últimos 3 dígitos de cédula
 * Ejemplo: CAMILO MONCADA CC 1031168620 → CM-620
 */
const generateSupervisorCode = (name: string, lastName: string, cedula: string): string => {
  const initial1 = (name || '').trim().charAt(0).toUpperCase();
  const initial2 = (lastName || '').trim().charAt(0).toUpperCase();
  const last3 = (cedula || '').trim().slice(-3);
  return `${initial1}${initial2}-${last3}`;
};

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

  const code = generateSupervisorCode(nombre, apellido, cedula);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!nombre.trim() || !apellido.trim()) { setError('Nombre y apellido son obligatorios'); return; }
    if (!cedula.trim() || !/^\d{6,12}$/.test(cedula.trim())) { setError('Cedula invalida (solo numeros, 6-12 digitos)'); return; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Correo invalido'); return; }
    if (!password || password.length < 6) { setError('La contrasena debe tener minimo 6 caracteres'); return; }

    setLoading(true);
    try {
      const fullName = `${nombre.trim()} ${apellido.trim()}`;
      const finalCode = generateSupervisorCode(nombre, apellido, cedula);

      // 1. Crear usuario en Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone.trim(),
            cedula: cedula.trim(),
            role: 'SUPERVISOR_ASIGNADO',
            status: 'ACTIVE'
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No se pudo crear el usuario');

      // 2. Esperar a que el trigger cree el perfil
      await new Promise(r => setTimeout(r, 1500));

      // 3. Crear la zona del supervisor con su código
      const zoneName = `${fullName} (${finalCode})`;
      const { data: zoneData, error: zoneError } = await supabase
        .from('zones')
        .insert({ name: zoneName, cities: [] })
        .select()
        .single();

      if (zoneError) {
        console.warn('Error creando zona:', zoneError);
      }

      // 4. Actualizar el perfil con el rol, estado activo y zona asignada
      const profileUpdate: any = {
        role: 'SUPERVISOR_ASIGNADO',
        status: 'ACTIVE',
        full_name: fullName,
        phone: phone.trim(),
        cedula: cedula.trim(),
      };
      if (zoneData?.id) {
        profileUpdate.zone_id = zoneData.id;
      }

      await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', authData.user.id);

      // 5. Notificar admins
      try {
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'ADMIN');

        if (admins && admins.length > 0) {
          const notifications = admins.map((admin: any) => ({
            user_id: admin.id,
            title: 'Nuevo Supervisor Registrado',
            message: `${fullName} (${finalCode}) se ha registrado como supervisor.`,
            type: 'info',
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
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={40} className="text-green-600" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-slate-800">Registro Exitoso</h2>
            <p className="text-sm text-slate-500 mt-2">
              Bienvenido <strong>{nombre} {apellido}</strong>, ya puedes iniciar sesion.
            </p>
          </div>

          {/* Código de supervisor */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 text-white space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Tu codigo de supervisor</p>
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
              Comparte este codigo con tus gestores para que al registrarse queden bajo tu supervision.
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
            <p className="text-xs font-bold text-amber-800">Importante:</p>
            <ul className="text-xs text-amber-700 mt-1 space-y-1 list-disc list-inside">
              <li>Guarda este codigo, lo necesitaras para tus gestores</li>
              <li>Cada gestor debe seleccionar tu zona al registrarse</li>
              <li>Podras ver todos los creditos de tus gestores</li>
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

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
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
                placeholder="Camilo"
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
                placeholder="Moncada"
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
              placeholder="1031168620"
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

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 font-bold">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
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

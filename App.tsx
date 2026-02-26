
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { OnboardingForm } from './components/OnboardingForm';
import { SimulatorView } from './components/SimulatorView';
import { CreditDetail } from './components/CreditDetail';
import { AdminPanel } from './components/AdminPanel';
import { ReportsPanel } from './components/ReportsPanel';
import { NewsPanel } from './components/NewsPanel';
import { AutomationsPanel } from './components/AutomationsPanel';
import { NotificationsView } from './components/NotificationsView';
import { ProfileView } from './components/ProfileView';
import { UserManagement } from './components/UserManagement';
import { WalletView } from './components/WalletView';
import { WithdrawalPanel } from './components/WithdrawalPanel';
import { User, Credit, UserDocument, Zone, UserRole } from './types';
import { MockService } from './services/mockService';
import { supabase } from './services/supabaseClient';
import { Search, UserPlus, Loader2, X, Camera, Paperclip, FileText, AlertCircle, CheckCircle2, Clock, KeyRound } from 'lucide-react';

const dispatchAlert = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    window.dispatchEvent(new CustomEvent('app-alert', { detail: { message, type } }));
};

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const App = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedCreditId, setSelectedCreditId] = useState<string | null>(null);
  const [prefilledCreditData, setPrefilledCreditData] = useState<Record<string, any> | null>(null);
  const [authView, setAuthView] = useState<'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  
  const [regData, setRegData] = useState({
    name: '', email: '', phone: '', password: '', cedula: '', city: '',
    zonaId: '',
    banco: '', tipoCuenta: 'AHORROS', numeroCuenta: '',
    registration_docs: [] as { name: string, url: string, type: string }[]
  });
  const [regCities, setRegCities] = useState<string[]>([]);
  const [regBanks, setRegBanks] = useState<string[]>([]);
  const [regZones, setRegZones] = useState<Zone[]>([]);

  useEffect(() => {
    const loadLists = async () => {
      const [c, b, z] = await Promise.all([MockService.getCities(), MockService.getBanks(), MockService.getZones()]);
      setRegCities(c); setRegBanks(b); setRegZones(z);
    };
    loadLists();
  }, []);

  // Restaurar sesión activa al refrescar la página
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles').select('*').eq('id', session.user.id).single();
          if (profile && profile.status === 'ACTIVE') {
            const user: User = {
              id: profile.id,
              name: profile.full_name || 'Usuario',
              email: profile.email,
              role: profile.role as UserRole,
              avatar: profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || 'U')}&background=EA580C&color=fff`,
              status: profile.status,
              phone: profile.phone,
              cedula: profile.cedula,
              city: profile.city,
              zoneId: profile.zone_id,
              banco: profile.bank_details?.banco,
              tipoCuenta: profile.bank_details?.tipoCuenta,
              numeroCuenta: profile.bank_details?.numeroCuenta,
              permissions: profile.permissions || [],
              documents: profile.registration_docs || [],
            };
            setCurrentUser(user);
          }
        }
      } catch (_) {
        // sin sesión, mostrar login
      } finally {
        setSessionChecked(true);
      }
    };
    checkSession();
  }, []);

  // Detectar token de recuperación de contraseña enviado por Supabase
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowPasswordReset(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== newPasswordConfirm) {
      dispatchAlert('Las contraseñas no coinciden.', 'error');
      return;
    }
    if (newPassword.length < 8) {
      dispatchAlert('La contraseña debe tener al menos 8 caracteres.', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      dispatchAlert('¡Contraseña actualizada! Ya puedes ingresar.', 'success');
      setShowPasswordReset(false);
      setNewPassword('');
      setNewPasswordConfirm('');
    } catch (err: any) {
      dispatchAlert(err.message || 'Error al actualizar contraseña.', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  // Sistema de alertas para pantalla de login
  useEffect(() => {
    if (!currentUser) {
      const handleAlert = (e: any) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, message: e.detail.message, type: e.detail.type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
      };
      window.addEventListener('app-alert', handleAlert);
      return () => window.removeEventListener('app-alert', handleAlert);
    }
  }, [currentUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBusy(true);
    try {
        const user = await MockService.login(email, password);
        if (user) {
          setCurrentUser(user);
          setCurrentView('dashboard');
          dispatchAlert(`Bienvenido, ${user.name}`, 'success');
        } else {
          dispatchAlert('Su cuenta está pendiente de aprobación por administración.', 'info');
        }
    } catch (err: any) {
        dispatchAlert('Credenciales incorrectas.', 'error');
    } finally { setIsBusy(false); }
  };

  const handlePasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail) {
      dispatchAlert('Por favor ingresa tu correo electrónico.', 'error');
      return;
    }
    setIsBusy(true);
    try {
      await MockService.resetPassword(recoveryEmail);
      dispatchAlert('Correo de recuperación enviado. Revisa tu bandeja de entrada.', 'success');
      setAuthView('LOGIN');
      setRecoveryEmail('');
    } catch (err: any) {
      dispatchAlert(err.message || 'Error al enviar correo de recuperación.', 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    if (e.target.files?.[0]) {
      setUploadingDoc(type);
      try {
        const url = await MockService.uploadImage(e.target.files[0]);
        setRegData(prev => ({
          ...prev,
          registration_docs: [
            ...prev.registration_docs.filter(d => d.type !== type),
            { name: e.target.files![0].name, url, type }
          ]
        }));
        dispatchAlert(`Documento cargado: ${type.replace(/_/g, ' ')}`, 'success');
      } catch (err) {
        dispatchAlert("Error al cargar archivo.", 'error');
      } finally {
        setUploadingDoc(null);
      }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsBusy(true);
      try {
          // Validación de contraseña (Supabase requiere mínimo 8 caracteres)
          if (regData.password.length < 8) {
              dispatchAlert('La contraseña debe tener al menos 8 caracteres.', 'error');
              setIsBusy(false);
              return;
          }

          // Validaciones obligatorias
          if (!regData.city) {
              dispatchAlert('Por favor selecciona una ciudad de operación.', 'error');
              setIsBusy(false);
              return;
          }
          if (!regData.banco) {
              dispatchAlert('Por favor selecciona un banco para pagos.', 'error');
              setIsBusy(false);
              return;
          }

          // Validar que se hayan subido los 4 documentos obligatorios
          const requiredDocs = ['CEDULA_FRONTAL', 'CEDULA_POSTERIOR', 'RUT', 'CERTIFICACION_BANCARIA'];
          const uploadedTypes = regData.registration_docs.map(d => d.type);
          const missingDocs = requiredDocs.filter(doc => !uploadedTypes.includes(doc));

          if (missingDocs.length > 0) {
              dispatchAlert(`Faltan documentos obligatorios: ${missingDocs.map(d => d.replace(/_/g, ' ')).join(', ')}`, 'error');
              setIsBusy(false);
              return;
          }

          await MockService.registerGestor(regData);
          dispatchAlert('Tu solicitud fue enviada, te avisaremos cuando sea aprobada.', 'success');
          setAuthView('LOGIN');
      } catch (err: any) {
          console.error('Error en registro:', err);
          dispatchAlert(`Error al enviar solicitud: ${err.message || 'Error desconocido'}`, 'error');
      } finally { setIsBusy(false); }
  };

  const CreditList = () => {
    const [credits, setCredits] = useState<Credit[]>([]);
    const [states, setStates] = useState<any[]>([]);
    const [entities, setEntities] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterEntity, setFilterEntity] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [togglingComm, setTogglingComm] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const [cr, st, ent] = await Promise.all([MockService.getCredits(currentUser!), MockService.getStates(), MockService.getEntities()]);
            setCredits(cr);
            setStates(st);
            setEntities(ent);
        };
        fetchData();
    }, [currentView]);

    const handleToggleCommission = async (creditId: string, currentPaid: boolean) => {
        setTogglingComm(creditId);
        try {
            await MockService.markCommissionPaid(creditId, !currentPaid, currentUser!.id);
            setCredits(prev => prev.map(c => c.id === creditId
                ? { ...c, comisionPagada: !currentPaid, fechaPagoComision: !currentPaid ? new Date().toISOString() : undefined }
                : c
            ));
        } catch (e: any) {
            dispatchAlert(e.message || 'Error al actualizar comisión', 'error');
        } finally {
            setTogglingComm(null);
        }
    };

    const activeFilterCount = [filterStatus, filterEntity, filterDateFrom, filterDateTo].filter(Boolean).length;

    const filtered = credits.filter(c => {
        const matchesSearch = !searchTerm ||
            c.nombreCompleto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.numeroDocumento?.includes(searchTerm) ||
            c.gestorName?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = !filterStatus || c.statusId === filterStatus;
        const matchesEntity = !filterEntity || c.entidadAliada === filterEntity;
        const matchesDateFrom = !filterDateFrom || new Date(c.createdAt) >= new Date(filterDateFrom);
        const matchesDateTo = !filterDateTo || new Date(c.createdAt) <= new Date(filterDateTo + 'T23:59:59');
        return matchesSearch && matchesStatus && matchesEntity && matchesDateFrom && matchesDateTo;
    });

    const clearFilters = () => { setFilterStatus(''); setFilterEntity(''); setFilterDateFrom(''); setFilterDateTo(''); };

    return (
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden animate-fade-in">
        <div className="p-6 md:p-8 border-b border-slate-50 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-display font-black text-slate-800 leading-tight">Bandeja Operativa</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{filtered.length} de {credits.length} expedientes</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Nombre, cédula o gestor..." className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-transparent focus:border-primary focus:bg-white rounded-xl text-sm font-semibold outline-none transition-all" />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 whitespace-nowrap ${showFilters || activeFilterCount > 0 ? 'bg-primary text-white border-primary shadow-lg' : 'bg-slate-50 text-slate-500 border-transparent hover:border-slate-200'}`}
                    >
                        <Search size={14} />
                        Filtros {activeFilterCount > 0 && <span className="bg-white text-primary text-[9px] px-1.5 py-0.5 rounded-full font-black">{activeFilterCount}</span>}
                    </button>
                </div>
            </div>

            {showFilters && (
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Estado</label>
                            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full px-3 py-2.5 bg-white border-2 border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-primary">
                                <option value="">Todos los estados</option>
                                {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Entidad</label>
                            <select value={filterEntity} onChange={e => setFilterEntity(e.target.value)} className="w-full px-3 py-2.5 bg-white border-2 border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-primary">
                                <option value="">Todas las entidades</option>
                                {entities.map((e: any) => <option key={e.id || e.name} value={e.name}>{e.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Desde</label>
                            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="w-full px-3 py-2.5 bg-white border-2 border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-primary" />
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Hasta</label>
                            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="w-full px-3 py-2.5 bg-white border-2 border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-primary" />
                        </div>
                    </div>
                    {activeFilterCount > 0 && (
                        <button onClick={clearFilters} className="mt-3 text-[10px] font-black text-red-500 hover:text-red-600 uppercase tracking-widest flex items-center gap-1 transition-all">
                            <X size={12} /> Limpiar filtros
                        </button>
                    )}
                </div>
            )}
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-50">
                <th className="px-8 py-6">N° Sol</th>
                <th className="px-8 py-6">Cliente</th>
                <th className="px-8 py-6">Gestor</th>
                <th className="px-8 py-6">Entidad</th>
                <th className="px-8 py-6">Monto</th>
                <th className="px-8 py-6">Estado</th>
                <th className="px-8 py-6">Fecha</th>
                <th className="px-8 py-6 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                        <p className="text-2xl font-black text-primary">{c.solicitudNumber || 'N/A'}</p>
                    </td>
                    <td className="px-8 py-6">
                        <p className="font-black text-slate-800 text-base">{c.nombreCompleto}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">CC: {c.numeroDocumento}</p>
                    </td>
                    <td className="px-8 py-6">
                        <p className="text-xs font-bold text-slate-600">{c.gestorName || 'N/A'}</p>
                        {c.analystName && <p className="text-[10px] text-blue-500 font-bold mt-0.5">AN: {c.analystName}</p>}
                    </td>
                    <td className="px-8 py-6">
                        <p className="text-xs font-bold text-slate-600">{c.entidadAliada || '---'}</p>
                    </td>
                    <td className="px-8 py-6 font-black text-slate-800 text-base">${c.monto?.toLocaleString()}</td>
                    <td className="px-8 py-6">
                        <span className={`px-4 py-1.5 rounded-full text-white text-[9px] font-black uppercase tracking-wider shadow-sm ${states.find(s=>s.id===c.statusId)?.color}`}>{states.find(s=>s.id===c.statusId)?.name}</span>
                        {states.find(s=>s.id===c.statusId)?.name?.includes('DESEMBOLSADO') && (
                          c.comisionPagada
                            // Ya cobrada: badge estático bloqueado (no se puede revertir desde la bandeja)
                            ? <div className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                                <CheckCircle2 size={10} /> Cobrada{c.fechaPagoComision ? ` · ${new Date(c.fechaPagoComision).toLocaleDateString('es-CO', {day:'2-digit',month:'2-digit',year:'2-digit'})}` : ''}
                              </div>
                            // Pendiente: botón solo si tiene permiso
                            : MockService.hasPermission(currentUser!, 'MARK_COMMISSION_PAID')
                              ? <button
                                  onClick={e => { e.stopPropagation(); handleToggleCommission(c.id, false); }}
                                  disabled={togglingComm === c.id}
                                  title="Clic para marcar como cobrada"
                                  className="mt-1.5 flex items-center gap-1 text-[9px] font-black rounded-full px-2 py-0.5 transition-all border text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100 disabled:opacity-50"
                                >
                                  {togglingComm === c.id ? <span className="animate-pulse">...</span> : <><Clock size={10} /> Pendiente</>}
                                </button>
                              : <div className="mt-1.5 flex items-center gap-1 text-[9px] font-black text-amber-500">
                                  <Clock size={10} /> Comisión pendiente
                                </div>
                        )}
                    </td>
                    <td className="px-8 py-6">
                        <p className="text-[10px] font-bold text-slate-400">{new Date(c.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="px-8 py-6 text-right">
                        <button onClick={() => { setSelectedCreditId(c.id); setCurrentView('detail'); }} className="px-6 py-2.5 bg-slate-100 group-hover:bg-primary group-hover:text-white text-slate-600 text-[10px] font-black uppercase rounded-xl transition-all tracking-widest shadow-sm">Gestionar</button>
                    </td>
                  </tr>
              ))}
              {filtered.length === 0 && (
                  <tr>
                      <td colSpan={8} className="px-8 py-20 text-center text-slate-300 font-bold italic">No se encontraron expedientes.</td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (showPasswordReset) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl w-full max-w-md border border-slate-100 animate-fade-in space-y-6">
          <div className="text-center">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <KeyRound size={28} className="text-primary" />
            </div>
            <h2 className="text-2xl font-display font-black text-slate-800">Nueva Contraseña</h2>
            <p className="text-sm text-slate-400 mt-1">Ingresa tu nueva contraseña para continuar</p>
          </div>
          <form onSubmit={handleSetNewPassword} className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nueva contraseña</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-primary transition-all"
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Confirmar contraseña</label>
              <input
                type="password"
                value={newPasswordConfirm}
                onChange={e => setNewPasswordConfirm(e.target.value)}
                placeholder="Repite la contraseña"
                className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-primary transition-all"
                required
              />
            </div>
            <button
              type="submit"
              disabled={savingPassword}
              className="w-full bg-primary text-white font-black py-4 rounded-2xl hover:bg-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {savingPassword ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />}
              {savingPassword ? 'Guardando...' : 'Guardar Nueva Contraseña'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 md:p-12 font-sans overflow-y-auto relative">
        {/* Sistema de alertas para login */}
        <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-3 pointer-events-none">
          {toasts.map(t => (
            <div key={t.id} className={`pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border animate-fade-in min-w-[300px] ${
              t.type === 'error' ? 'bg-red-50 border-red-100 text-red-700' :
              t.type === 'success' ? 'bg-green-50 border-green-100 text-green-700' :
              'bg-white border-slate-100 text-slate-700'
            }`}>
              {t.type === 'error' ? <AlertCircle size={20}/> : <CheckCircle2 size={20}/>}
              <p className="text-sm font-bold">{t.message}</p>
              <button onClick={() => setToasts(prev => prev.filter(toast => toast.id !== t.id))} className="ml-auto text-slate-400 hover:text-slate-600">
                <X size={14}/>
              </button>
            </div>
          ))}
        </div>
        <div className="bg-white p-8 md:p-14 rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] w-full max-w-xl border border-slate-100 animate-fade-in my-10">
           <div className="text-center mb-12">
               <img src="https://skalafintech.co/wp-content/uploads/2023/10/Recurso-1@3x-1.png" className="h-12 md:h-16 mx-auto mb-4" alt="Skala"/>
               <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">Un paso adelante</p>
           </div>
           
           {authView === 'LOGIN' ? (
               <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Correo Corporativo</label>
                    <input type="email" placeholder="email@skala.co" value={email} onChange={e=>setEmail(e.target.value)} className="w-full px-6 py-5 bg-white border-2 border-slate-100 rounded-[1.5rem] focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none font-bold transition-all" required/>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Contraseña</label>
                    <input type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} className="w-full px-6 py-5 bg-white border-2 border-slate-100 rounded-[1.5rem] focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none font-bold transition-all" required/>
                    <button type="button" onClick={()=>setAuthView('FORGOT_PASSWORD')} className="text-[10px] font-bold text-slate-400 hover:text-primary transition-all px-2">¿Olvidaste tu contraseña?</button>
                  </div>
                  <button type="submit" disabled={isBusy} className="w-full bg-primary text-white font-black py-5 rounded-[1.5rem] shadow-2xl shadow-primary/30 hover:bg-orange-600 transition-all uppercase tracking-widest text-xs">
                    {isBusy ? <Loader2 className="animate-spin mx-auto"/> : 'Entrar a Plataforma'}
                  </button>
                  <button type="button" onClick={()=>setAuthView('REGISTER')} className="w-full text-sm font-black text-primary/80 mt-6 hover:text-primary transition-all flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-primary/20 hover:border-primary/50 hover:bg-primary/5">🤝 Quiero ser Gestor</button>
               </form>
           ) : authView === 'FORGOT_PASSWORD' ? (
               <form onSubmit={handlePasswordRecovery} className="space-y-6">
                  <h3 className="text-2xl font-display font-black text-slate-800 mb-4">Recuperar Contraseña</h3>
                  <p className="text-sm text-slate-500 font-medium mb-6">Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.</p>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Correo Electrónico</label>
                    <input type="email" placeholder="email@skala.co" value={recoveryEmail} onChange={e=>setRecoveryEmail(e.target.value)} className="w-full px-6 py-5 bg-white border-2 border-slate-100 rounded-[1.5rem] focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none font-bold transition-all" required/>
                  </div>
                  <button type="submit" disabled={isBusy} className="w-full bg-primary text-white font-black py-5 rounded-[1.5rem] shadow-2xl shadow-primary/30 hover:bg-orange-600 transition-all uppercase tracking-widest text-xs">
                    {isBusy ? <Loader2 className="animate-spin mx-auto"/> : 'Enviar Correo de Recuperación'}
                  </button>
                  <button type="button" onClick={()=>setAuthView('LOGIN')} className="w-full text-[10px] font-black text-slate-400 mt-4 uppercase">Volver al Login</button>
               </form>
           ) : (
               <form onSubmit={handleRegister} className="space-y-6 max-h-[70vh] overflow-y-auto pr-4 custom-scrollbar">
                  <h3 className="text-2xl font-display font-black text-slate-800 mb-6 border-b border-slate-50 pb-4">Onboarding Gestor</h3>
                  <div className="space-y-4">
                      <input placeholder="Nombre y Apellido" value={regData.name} onChange={e=>setRegData({...regData, name: e.target.value})} className="w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-primary" required/>
                      <input type="email" placeholder="Correo Personal/Corp" value={regData.email} onChange={e=>setRegData({...regData, email: e.target.value})} className="w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-primary" required/>
                      <div>
                        <input type="password" placeholder="Crea una clave" value={regData.password} onChange={e=>setRegData({...regData, password: e.target.value})} className="w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-primary" required minLength={8}/>
                        <p className="text-[10px] text-slate-500 font-bold mt-2 px-2">* Mínimo 8 caracteres</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <input placeholder="Cédula" value={regData.cedula} onChange={e=>setRegData({...regData, cedula: e.target.value})} className="w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-primary" required/>
                        <input placeholder="Celular" value={regData.phone} onChange={e=>setRegData({...regData, phone: e.target.value})} className="w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-primary" required/>
                      </div>
                      <select value={regData.city} onChange={e=>setRegData({...regData, city: e.target.value})} className="w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-primary" required>
                          <option value="">Ciudad de Operación...</option>
                          {regCities.map(c=><option key={c} value={c}>{c}</option>)}
                      </select>
                      <select value={regData.zonaId} onChange={e=>setRegData({...regData, zonaId: e.target.value})} className="w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-primary">
                          <option value="">Zona de trabajo (opcional)...</option>
                          {regZones.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}
                      </select>
                  </div>
                  
                  <div className="pt-6 border-t border-slate-50">
                    <h4 className="font-black text-slate-400 text-[9px] uppercase tracking-widest mb-4">Información de Pagos</h4>
                    <select value={regData.banco} onChange={e=>setRegData({...regData, banco: e.target.value})} className="w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold outline-none mb-4" required>
                        <option value="">Banco Destino...</option>
                        {regBanks.map(b=><option key={b} value={b}>{b}</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-4">
                      <select value={regData.tipoCuenta} onChange={e=>setRegData({...regData, tipoCuenta: e.target.value as any})} className="w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold outline-none">
                          <option value="AHORROS">AHORROS</option>
                          <option value="CORRIENTE">CORRIENTE</option>
                      </select>
                      <input placeholder="No. Cuenta" value={regData.numeroCuenta} onChange={e=>setRegData({...regData, numeroCuenta: e.target.value})} className="w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-primary" required/>
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-slate-50">
                    <h4 className="font-black text-slate-400 text-[9px] uppercase tracking-widest mb-2">Documentos de Aliado (Obligatorio)</h4>
                    <p className="text-[10px] text-red-600 font-bold mb-4">* Debes subir los 4 documentos para completar tu solicitud</p>
                    <div className="grid grid-cols-2 gap-4">
                        {['CEDULA_FRONTAL', 'CEDULA_POSTERIOR', 'RUT', 'CERTIFICACION_BANCARIA'].map(type => (
                            <div key={type} className={`p-4 border-2 border-dashed rounded-3xl flex flex-col items-center gap-2 transition-all ${regData.registration_docs.find(d=>d.type===type) ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                                {uploadingDoc === type ? <Loader2 size={20} className="animate-spin text-primary"/> : <Camera size={20} className="text-slate-400"/>}
                                <p className="text-[8px] font-black text-center uppercase leading-tight text-slate-500">{type.replace(/_/g, ' ')}</p>
                                <label className="text-[9px] bg-white border-2 px-3 py-1.5 rounded-xl cursor-pointer font-black shadow-sm hover:shadow-md transition-all">
                                    {regData.registration_docs.find(d=>d.type===type) ? 'CAMBIAR' : 'SUBIR'}
                                    <input type="file" className="hidden" onChange={(e)=>handleFileUpload(e, type)}/>
                                </label>
                            </div>
                        ))}
                    </div>
                  </div>

                  <button type="submit" disabled={isBusy || uploadingDoc !== null} className="w-full bg-slate-900 text-white font-black py-5 rounded-[1.5rem] mt-6 shadow-2xl disabled:opacity-50 uppercase tracking-widest text-xs">
                    {isBusy ? <Loader2 className="animate-spin mx-auto"/> : 'Solicitar Acceso'}
                  </button>
                  <button type="button" onClick={()=>setAuthView('LOGIN')} className="w-full text-[10px] font-black text-slate-400 mt-4 uppercase">Volver al Login</button>
               </form>
           )}
        </div>
      </div>
    );
  };

  if (!sessionChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <Layout currentUser={currentUser} onLogout={() => { setCurrentUser(null); setCurrentView('dashboard'); setEmail(''); setPassword(''); supabase.auth.signOut(); }} currentView={currentView} onChangeView={setCurrentView}>
      {currentView === 'dashboard' && <Dashboard currentUser={currentUser} onNavigate={setCurrentView} />}
      {currentView === 'wallet' && <WalletView currentUser={currentUser} onBack={() => setCurrentView('dashboard')} />}
      {currentView === 'withdrawals' && <WithdrawalPanel currentUser={currentUser} />}
      {currentView === 'simulator' && (
        <SimulatorView
          currentUser={currentUser}
          onCreditCreated={(creditId) => {
            setSelectedCreditId(creditId);
            setCurrentView('detail');
          }}
          onFillForm={(prefilled) => {
            setPrefilledCreditData(prefilled);
            setCurrentView('onboarding');
          }}
          onCancel={() => setCurrentView('credits')}
        />
      )}
      {currentView === 'onboarding' && (
        <OnboardingForm
          currentUser={currentUser}
          initialData={prefilledCreditData ?? undefined}
          onSuccess={() => { setPrefilledCreditData(null); setCurrentView('credits'); }}
        />
      )}
      {currentView === 'credits' && <CreditList />}
      {currentView === 'users' && <UserManagement />}
      {currentView === 'reports' && <ReportsPanel currentUser={currentUser} />}
      {currentView === 'admin' && <AdminPanel currentUser={currentUser} />}
      {currentView === 'news' && <NewsPanel />}
      {currentView === 'automations' && <AutomationsPanel />}
      {currentView === 'notifications' && <NotificationsView currentUser={currentUser} onViewCredit={(id) => { setSelectedCreditId(id); setCurrentView('detail'); }} />}
      {currentView === 'profile' && <ProfileView currentUser={currentUser} onUpdate={setCurrentUser} />}
      {currentView === 'detail' && selectedCreditId && <CreditDetail creditId={selectedCreditId} currentUser={currentUser} onBack={() => { setSelectedCreditId(null); setCurrentView('credits'); }} />}
    </Layout>
  );
};

export default App;

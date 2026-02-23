
import React, { useState, useEffect } from 'react';
import { User, UserRole, UserDocument, Zone, Permission, ALL_PERMISSIONS } from '../types';
import { MockService } from '../services/mockService';
import { Users, Plus, Pencil, Trash, X, Eye, CreditCard, MapPin, Shield, CheckCircle, XCircle, FileText, Download, CheckSquare, Square, Paperclip, Loader2, Search } from 'lucide-react';

const InputGroup = ({ label, name, value, onChange, type = "text", options }: any) => (
    <div>
        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{label}</label>
        {options ? (
            <select 
                name={name} 
                value={value || ''} 
                onChange={onChange} 
                className="w-full p-2 border rounded bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
                <option value="">Seleccione...</option>
                {(options || []).map((o: any) => <option key={o} value={o}>{o}</option>)}
            </select>
        ) : (
            <input 
                type={type} 
                name={name} 
                value={value || ''} 
                onChange={onChange} 
                className="w-full p-2 border rounded bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
        )}
    </div>
);

export const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [banks, setBanks] = useState<string[]>([]);
  const [roleNames, setRoleNames] = useState<string[]>(Object.values(UserRole));
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewDetailUser, setViewDetailUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PENDING'>('ACTIVE');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Animation State
  const [animatingId, setAnimatingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<User>>({});
  // Permission Editor State
  const [customPermissions, setCustomPermissions] = useState<Permission[]>([]);
  const [useRoleDefaults, setUseRoleDefaults] = useState(true);

  const refreshUsers = async () => {
      setLoading(true);
      try {
          const [uData, zData, cData, bData, rData] = await Promise.all([MockService.getUsers(), MockService.getZones(), MockService.getCities(), MockService.getBanks(), MockService.getRoles()]);
          setUsers(uData);
          setZones(zData);
          setCities(cData);
          setBanks(bData);
          setRoleNames(rData.map((r: any) => r.name));
      } catch (err) {
          console.error("Error loading users:", err);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => { refreshUsers(); }, []);

  // Update permissions when role changes in form or when opening modal
  useEffect(() => {
      if (formData.role && useRoleDefaults) {
          (async () => {
              const defaults = await MockService.getRoleDefaults(formData.role);
              if (defaults) setCustomPermissions(defaults);
          })();
      }
  }, [formData.role, useRoleDefaults]);

  const handleEdit = async (user: User) => {
      setEditingUser(user);
      setFormData({ ...user });
      const perms = user.permissions && user.permissions.length > 0 ? user.permissions : await MockService.getRoleDefaults(user.role);
      setCustomPermissions(perms);
      setUseRoleDefaults(!user.permissions || user.permissions.length === 0);
      setShowModal(true);
  };

  const handleCreate = async () => {
      setEditingUser(null);
      const defaultRole = UserRole.GESTOR;
      setFormData({ role: defaultRole, status: 'ACTIVE', avatar: 'https://picsum.photos/200' });
      setCustomPermissions(await MockService.getRoleDefaults(defaultRole));
      setUseRoleDefaults(true);
      setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => { 
      e.preventDefault(); 
      // If using defaults, save empty array so login will load from roles table
      const finalPermissions = useRoleDefaults ? [] : customPermissions;
      
      const userToSave = { ...formData, permissions: finalPermissions };

      try {
          if (editingUser) {
              await MockService.updateUserProfile(editingUser.id, userToSave);
              window.dispatchEvent(new CustomEvent('app-alert', { detail: { message: "Usuario actualizado correctamente", type: 'success' } }));
          } else {
              await MockService.createUser(userToSave as User);
              window.dispatchEvent(new CustomEvent('app-alert', { detail: { message: "Usuario creado correctamente", type: 'success' } }));
          }
          await refreshUsers();
          setShowModal(false);
      } catch (err) {
          console.error("Error saving user:", err);
          window.dispatchEvent(new CustomEvent('app-alert', { detail: { message: `Error al guardar usuario: ${(err as any)?.message || 'Error desconocido'}`, type: 'error' } }));
      }
  };
  
  const handleDelete = async (id: string) => {
      if(window.confirm('¿Estás seguro de que deseas eliminar este usuario definitivamente?')) {
          try {
              await MockService.deleteUser(id);
              await refreshUsers();
              window.dispatchEvent(new CustomEvent('app-alert', { detail: { message: "Usuario eliminado correctamente", type: 'success' } }));
          } catch (err) {
              console.error("Error deleting user:", err);
              window.dispatchEvent(new CustomEvent('app-alert', { detail: { message: "Error al eliminar usuario", type: 'error' } }));
          }
      }
  };

  const handleApprove = async (id: string) => { 
      setAnimatingId(id);
      setTimeout(async () => {
          await MockService.approveUser(id); 
          await refreshUsers();
          setAnimatingId(null);
      }, 500); 
  };
  
  const handleReject = async (id: string) => { 
      if(confirm('¿Rechazar solicitud? El usuario será eliminado.')) { 
          await MockService.rejectUser(id); 
          await refreshUsers(); 
      } 
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
  };

  const togglePermission = (perm: Permission) => {
      if (useRoleDefaults) setUseRoleDefaults(false); // Switch to custom mode automatically
      setCustomPermissions(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  };

  const q = search.trim().toLowerCase();
  const matchesSearch = (u: User) =>
    !q ||
    u.name?.toLowerCase().includes(q) ||
    u.email?.toLowerCase().includes(q) ||
    u.cedula?.toLowerCase().includes(q);

  const pendingUsers = users.filter(u => u.status === 'PENDING' && matchesSearch(u));
  const activeUsers = users.filter(u => u.status === 'ACTIVE' && matchesSearch(u));

  return (
    <div className="space-y-6 animate-fade-in pb-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <h2 className="text-3xl font-display font-bold text-slate-800">Gestión de Usuarios</h2>
            <div className="flex gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-72">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                    <input
                        type="text"
                        placeholder="Buscar por nombre, email o cédula..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X size={14}/>
                        </button>
                    )}
                </div>
                <button onClick={handleCreate} className="bg-primary text-white px-4 py-2 rounded-xl font-bold flex gap-2 items-center hover:bg-orange-700 transition-colors whitespace-nowrap">
                    <Plus size={20}/> Nuevo Usuario
                </button>
            </div>
        </div>

        <div className="flex gap-4 border-b border-slate-200">
            <button onClick={() => setActiveTab('ACTIVE')} className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors ${activeTab === 'ACTIVE' ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}>Usuarios Activos ({activeUsers.length})</button>
            <button onClick={() => setActiveTab('PENDING')} className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors relative ${activeTab === 'PENDING' ? 'border-primary text-primary' : 'border-transparent text-slate-500'}`}>
                Solicitudes ({pendingUsers.length})
                {pendingUsers.length > 0 && <span className="absolute top-2 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
            </button>
        </div>
        
        {loading ? (
            <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" size={40}/></div>
        ) : activeTab === 'ACTIVE' ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs">
                            <tr className="border-b">
                                <th className="p-4 text-left">Usuario</th>
                                <th className="p-4 text-left">Rol</th>
                                <th className="p-4 text-left">Zona</th>
                                <th className="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeUsers.map(u => (
                                <tr key={u.id} className="border-b hover:bg-slate-50 transition-colors">
                                    <td className="p-4 flex items-center gap-3">
                                        <img src={u.avatar} className="w-8 h-8 rounded-full object-cover" alt="avatar"/>
                                        <div>
                                            <div className="font-bold text-slate-800">{u.name}</div>
                                            <div className="font-normal text-xs text-slate-500">{u.email}</div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold uppercase border border-slate-200">
                                            {u.role.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-600 font-medium">
                                        {u.city || zones.find(z => z.id === u.zoneId)?.name || '-'}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setViewDetailUser(u)} className="p-2 bg-slate-100 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors" title="Ver Detalle"><Eye size={16}/></button>
                                            <button onClick={() => handleEdit(u)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors" title="Editar"><Pencil size={16}/></button>
                                            <button onClick={() => handleDelete(u.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors" title="Eliminar"><Trash size={16}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pendingUsers.length === 0 && <div className="col-span-2 text-center text-slate-400 py-10">No hay solicitudes pendientes.</div>}
                {pendingUsers.map(u => (
                     <div 
                        key={u.id} 
                        className={`bg-white rounded-2xl shadow-sm border border-orange-100 p-6 relative overflow-hidden animate-fade-in transition-all duration-500 ease-out transform ${animatingId === u.id ? 'opacity-0 -translate-y-10 scale-95' : 'opacity-100 scale-100'}`}
                     >
                        <div className="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex gap-4 items-center">
                                <img src={u.avatar} className="w-14 h-14 rounded-full border-2 border-orange-100"/>
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800">{u.name}</h3>
                                    <p className="text-sm text-slate-500">{u.email}</p>
                                    <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded border border-orange-100 font-bold mt-1 inline-block">SOLICITUD GESTOR</span>
                                </div>
                            </div>
                            <button onClick={() => setViewDetailUser(u)} className="text-slate-400 hover:text-primary p-2 bg-slate-50 rounded-lg"><Eye size={20}/></button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <div><span className="font-bold block text-slate-400 uppercase text-[9px]">Cédula</span>{u.cedula}</div>
                            <div><span className="font-bold block text-slate-400 uppercase text-[9px]">Ciudad</span>{u.city}</div>
                            <div><span className="font-bold block text-slate-400 uppercase text-[9px]">Banco</span>{u.banco}</div>
                            <div><span className="font-bold block text-slate-400 uppercase text-[9px]">Celular</span>{u.phone}</div>
                        </div>
                         <div className="flex gap-3 mt-4 border-t border-slate-100 pt-4">
                            <button onClick={() => handleReject(u.id)} className="flex-1 py-2 rounded-lg border border-red-200 text-red-600 font-bold text-xs hover:bg-red-50 flex items-center justify-center gap-2"><XCircle size={16}/> Rechazar</button>
                            <button onClick={() => handleApprove(u.id)} className="flex-1 py-2 rounded-lg bg-green-500 text-white font-bold text-xs hover:bg-green-600 flex items-center justify-center gap-2 shadow-sm"><CheckCircle size={16}/> Aprobar</button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* Modal Create/Edit */}
        {showModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in custom-scrollbar">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold font-display text-slate-800">{editingUser ? 'Editar' : 'Crear'} Usuario</h3>
                        <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                    </div>
                    
                    <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputGroup label="Nombre" name="name" value={formData.name} onChange={handleInputChange} />
                        <InputGroup label="Email" name="email" type="email" value={formData.email} onChange={handleInputChange} />
                        <InputGroup label="Cédula" name="cedula" value={formData.cedula} onChange={handleInputChange} />
                        <InputGroup label="Celular" name="phone" value={formData.phone} onChange={handleInputChange} />
                        
                        <div className="col-span-1 md:col-span-2">
                            <InputGroup label="Rol" name="role" value={formData.role} onChange={handleInputChange} options={roleNames} />
                            
                            <div className="mt-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <div className="flex justify-between items-center mb-3">
                                     <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><Shield size={12}/> Permisos de Acceso</p>
                                     <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                                         <input type="checkbox" checked={useRoleDefaults} onChange={(e) => setUseRoleDefaults(e.target.checked)} className="rounded text-primary focus:ring-primary"/>
                                         Usar Predeterminados del Rol
                                     </label>
                                </div>
                                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar p-1">
                                    {ALL_PERMISSIONS.map(perm => {
                                        const isChecked = customPermissions.includes(perm);
                                        const isRestrictedForGestor = formData.role === UserRole.GESTOR && ['MANAGE_USERS', 'MANAGE_NEWS', 'CONFIGURE_SYSTEM', 'MANAGE_AUTOMATIONS'].includes(perm);
                                        
                                        return (
                                            <div 
                                                key={perm} 
                                                onClick={() => !useRoleDefaults && !isRestrictedForGestor && togglePermission(perm)}
                                                className={`flex items-center gap-2 p-2 rounded border text-xs cursor-pointer transition-all ${
                                                    isChecked ? 'bg-green-50 border-green-200 text-green-800' : 'bg-white border-slate-200 text-slate-500'
                                                } ${useRoleDefaults || isRestrictedForGestor ? 'opacity-60 cursor-not-allowed' : 'hover:border-primary'}`}
                                            >
                                                {isChecked ? <CheckSquare size={14}/> : <Square size={14}/>}
                                                <span className="truncate" title={perm}>{perm.replace(/_/g, ' ')}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                {formData.role === UserRole.GESTOR && <p className="text-[10px] text-orange-500 mt-2 font-bold flex items-center gap-1"><Shield size={10}/> Restricción: Los Gestores no pueden tener acceso administrativo.</p>}
                            </div>
                        </div>

                        <InputGroup label="Contraseña" name="password" type="password" value={formData.password} onChange={handleInputChange} />
                        
                        <div className="col-span-1 md:col-span-2 border-t border-slate-100 pt-4 mt-2 font-bold text-slate-700 flex items-center gap-2"><MapPin size={16}/> Ubicación</div>
                        <InputGroup label="Ciudad" name="city" value={formData.city} onChange={handleInputChange} options={cities} />
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Zona</label>
                            <select 
                                name="zoneId"
                                value={formData.zoneId || ''} 
                                onChange={handleInputChange} 
                                className="w-full p-2 border rounded bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value="">Global / Sin Zona</option>
                                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                            </select>
                        </div>

                        <div className="col-span-1 md:col-span-2 border-t border-slate-100 pt-4 mt-2 font-bold text-slate-700 flex items-center gap-2"><CreditCard size={16}/> Bancario</div>
                        <InputGroup label="Banco" name="banco" value={formData.banco} onChange={handleInputChange} options={banks} />
                        <InputGroup label="Tipo Cuenta" name="tipoCuenta" value={formData.tipoCuenta} onChange={handleInputChange} options={['AHORROS', 'CORRIENTE']} />
                        <InputGroup label="No. Cuenta" name="numeroCuenta" value={formData.numeroCuenta} onChange={handleInputChange} />

                        <div className="col-span-1 md:col-span-2 flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                            <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors">Cancelar</button>
                            <button type="submit" className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-orange-700 transition-colors shadow-lg shadow-primary/30">Guardar Usuario</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
        
        {/* Detail Modal */}
        {viewDetailUser && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                 <div className="bg-white rounded-2xl w-full max-w-2xl p-8 relative shadow-2xl animate-fade-in overflow-y-auto max-h-[90vh] custom-scrollbar">
                    <button onClick={() => setViewDetailUser(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X/></button>
                    
                    <div className="flex gap-5 items-center mb-8 pb-6 border-b border-slate-100">
                        <img src={viewDetailUser.avatar} className="w-20 h-20 rounded-full object-cover border-4 border-slate-50" alt="avatar"/>
                        <div>
                            <h3 className="text-2xl font-display font-bold text-slate-800">{viewDetailUser.name}</h3>
                            <div className="flex gap-2 mt-1">
                                <span className="text-primary font-bold text-sm bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">{viewDetailUser.role.replace('_', ' ')}</span>
                                <span className={`text-sm font-bold px-2 py-0.5 rounded-md border ${viewDetailUser.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-100' : (viewDetailUser.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100')}`}>
                                    {viewDetailUser.status}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-y-6 gap-x-8 mb-8">
                        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Email</p><p className="font-medium text-slate-800">{viewDetailUser.email}</p></div>
                        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Teléfono</p><p className="font-medium text-slate-800">{viewDetailUser.phone || 'N/A'}</p></div>
                        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Cédula</p><p className="font-medium text-slate-800">{viewDetailUser.cedula || 'N/A'}</p></div>
                        <div><p className="text-[10px] font-bold text-slate-400 uppercase">Ciudad</p><p className="font-medium text-slate-800">{viewDetailUser.city || 'N/A'}</p></div>
                        
                        <div className="col-span-2 pt-4 border-t border-slate-100">
                            <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><CreditCard size={16}/> Información Bancaria</h4>
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm">
                                <div className="grid grid-cols-2 gap-2">
                                    <div><span className="font-bold text-slate-500">Banco:</span> {viewDetailUser.banco || '-'}</div>
                                    <div><span className="font-bold text-slate-500">Tipo:</span> {viewDetailUser.tipoCuenta || '-'}</div>
                                    <div className="col-span-2"><span className="font-bold text-slate-500">Número:</span> {viewDetailUser.numeroCuenta || '-'}</div>
                                </div>
                            </div>
                        </div>

                        {/* DOCUMENTOS CARGADOS */}
                        <div className="col-span-2 pt-4 border-t border-slate-100">
                            <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><FileText size={16}/> Documentos de Registro Obligatorios</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {viewDetailUser.documents && viewDetailUser.documents.length > 0 ? (
                                    viewDetailUser.documents.map((doc: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-all">
                                            <div className="flex items-center gap-3 truncate">
                                                <div className="bg-primary/10 p-2 rounded-lg text-primary">
                                                    <FileText size={18}/>
                                                </div>
                                                <div className="truncate">
                                                    <p className="text-xs font-bold text-slate-700 truncate">{doc.name}</p>
                                                    <p className="text-[10px] text-slate-400 uppercase font-bold">{doc.type?.replace(/_/g, ' ')}</p>
                                                </div>
                                            </div>
                                            <a 
                                                href={doc.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="p-2 text-slate-400 hover:text-primary transition-colors"
                                                title="Descargar / Ver"
                                            >
                                                <Download size={18}/>
                                            </a>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-2 p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-sm italic">
                                        No se han cargado documentos para este usuario.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {viewDetailUser.status === 'PENDING' && (
                        <div className="flex gap-4 pt-6 border-t border-slate-100">
                             <button onClick={async () => { await handleReject(viewDetailUser.id); setViewDetailUser(null); }} className="flex-1 py-3 rounded-xl border-2 border-red-100 text-red-600 font-bold hover:bg-red-50 transition-colors">Rechazar Solicitud</button>
                             <button onClick={async () => { await handleApprove(viewDetailUser.id); setViewDetailUser(null); }} className="flex-1 py-3 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 shadow-lg shadow-green-200 transition-all">Aprobar Usuario</button>
                        </div>
                    )}
                 </div>
            </div>
        )}
    </div>
  );
};

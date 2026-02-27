
import React, { useState, useEffect } from 'react';
import { MockService } from '../services/mockService';
import { User, CreditState, UserRole, Zone, ALL_PERMISSIONS, Permission } from '../types';
import { Workflow, Plus, Trash, ArrowUp, ArrowDown, Map, Briefcase, Users, Layers, Globe, X, MapPin, CreditCard, Pencil, Check, Shield, CheckSquare, Square, Zap } from 'lucide-react';
import { SimuladorMigrationPanel } from './SimuladorMigrationPanel';
import { AdminDashboard as SimuladorAdminDashboard } from '../simulador/components/AdminDashboard';

const STATE_COLORS = [
    { value: 'bg-gray-500', label: 'Gris' },
    { value: 'bg-blue-500', label: 'Azul' },
    { value: 'bg-indigo-500', label: 'Índigo' },
    { value: 'bg-purple-500', label: 'Morado' },
    { value: 'bg-pink-500', label: 'Rosa' },
    { value: 'bg-red-500', label: 'Rojo' },
    { value: 'bg-orange-500', label: 'Naranja' },
    { value: 'bg-orange-600', label: 'Naranja Osc.' },
    { value: 'bg-yellow-500', label: 'Amarillo' },
    { value: 'bg-green-500', label: 'Verde' },
    { value: 'bg-emerald-500', label: 'Esmeralda' },
    { value: 'bg-teal-500', label: 'Teal' },
    { value: 'bg-cyan-500', label: 'Cyan' },
];

interface RoleItem {
    id: string;
    name: string;
    displayName: string;
    permissions: string[];
    isSystem: boolean;
}

export const AdminPanel: React.FC<{ currentUser: User }> = ({ currentUser }) => {
    const [states, setStates] = useState<CreditState[]>([]);
    const [pagadurias, setPagadurias] = useState<string[]>([]);
    const [zones, setZones] = useState<Zone[]>([]);
    const [cities, setCities] = useState<string[]>([]);
    const [banks, setBanks] = useState<string[]>([]);
    const [roles, setRoles] = useState<RoleItem[]>([]);
    const [userCount, setUserCount] = useState(0);

    // Inputs
    const [newPagaduria, setNewPagaduria] = useState('');
    const [newCity, setNewCity] = useState('');
    const [newBank, setNewBank] = useState('');
    const [newZoneName, setNewZoneName] = useState('');
    const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
    const [editingZoneName, setEditingZoneName] = useState('');

    // State Actions
    const [editingStateActions, setEditingStateActions] = useState<any[]>([]);
    const [newActionLabel, setNewActionLabel] = useState('');
    const [newActionRole, setNewActionRole] = useState('');
    const [newActionResultAction, setNewActionResultAction] = useState('none');
    const [newActionResultStateId, setNewActionResultStateId] = useState('');

    // Workflow
    const [newStateName, setNewStateName] = useState('');
    const [newStateRole, setNewStateRole] = useState('ASISTENTE_OPERATIVO');
    const [editingStateId, setEditingStateId] = useState<string | null>(null);
    const [editStateData, setEditStateData] = useState<any>({});

    // Roles
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleDisplay, setNewRoleDisplay] = useState('');
    const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
    const [editRolePerms, setEditRolePerms] = useState<string[]>([]);

    // Feature flags
    const [billeteraEnabled, setBilleteraEnabledState] = useState(false);
    const [billeteraLoading, setBilleteraLoading] = useState(true);

    useEffect(() => {
        refreshData();
        MockService.getBilleteraEnabled?.().then((v: boolean) => {
            setBilleteraEnabledState(v);
            setBilleteraLoading(false);
        }).catch(() => setBilleteraLoading(false));
    }, []);

    const refreshData = async () => {
        const [fetchedStates, fetchedPagadurias, fetchedZones, fetchedUsers, fetchedCities, fetchedBanks, fetchedRoles] = await Promise.all([
            MockService.getStates(), MockService.getPagadurias(), MockService.getZones(),
            MockService.getUsers(), MockService.getCities(), MockService.getBanks(),
            MockService.getRoles()
        ]);
        setStates(fetchedStates);
        setPagadurias(fetchedPagadurias);
        setZones(fetchedZones);
        setUserCount(fetchedUsers.length);
        setCities(fetchedCities);
        setBanks(fetchedBanks);
        setRoles(fetchedRoles);
    };


    const handleAddCityToZone = async (zoneId: string, city: string) => {
        if (!city.trim()) return;
        const zone = zones.find(z => z.id === zoneId);
        if (zone && !zone.cities.includes(city.toUpperCase())) {
            await MockService.updateZoneCities(zoneId, [...zone.cities, city.toUpperCase()]);
            await refreshData();
        }
    };

    // --- State Edit ---
    const startEditState = async (s: CreditState) => {
        setEditingStateId(s.id);
        setEditStateData({ name: s.name, color: s.color, role_responsible: s.roleResponsible, is_final: s.isFinal || false });
        setNewActionLabel(''); setNewActionRole(''); setNewActionResultAction('none'); setNewActionResultStateId('');
        const actions = await MockService.getStateActions?.(s.id) ?? [];
        setEditingStateActions(actions);
    };

    const saveEditState = async () => {
        if (!editingStateId) return;
        await MockService.updateState(editingStateId, editStateData);
        setEditingStateId(null);
        await refreshData();
    };

    // --- Role Edit ---
    const startEditRole = (r: RoleItem) => {
        setEditingRoleId(r.id);
        setEditRolePerms([...r.permissions]);
    };

    const toggleRolePerm = (perm: string) => {
        setEditRolePerms(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
    };

    const saveEditRole = async () => {
        if (!editingRoleId) return;
        await MockService.updateRole(editingRoleId, { default_permissions: editRolePerms });
        setEditingRoleId(null);
        await refreshData();
    };

    const availableRoleNames = roles.map(r => r.name);

    const QuickStat = ({ label, value, icon: Icon, colorClass, bgClass }: any) => (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-3xl font-display font-bold text-slate-800">{value}</p>
            </div>
            <div className={`p-3 rounded-xl ${bgClass} ${colorClass}`}>
                <Icon size={24} />
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in pb-20 max-w-full overflow-x-hidden">
            <div className="flex flex-col md:flex-row justify-between items-end mb-2">
                <div>
                    <h2 className="text-3xl font-display font-bold text-slate-800">Configuración del Sistema</h2>
                    <p className="text-slate-500 text-sm mt-1">Administra flujos, supervisores, roles y parámetros globales.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <QuickStat label="Usuarios Activos" value={userCount} icon={Users} colorClass="text-blue-600" bgClass="bg-blue-50" />
                <QuickStat label="Supervisores" value={zones.length} icon={Globe} colorClass="text-indigo-600" bgClass="bg-indigo-50" />
                <QuickStat label="Estados del Flujo" value={states.length} icon={Layers} colorClass="text-orange-600" bgClass="bg-orange-50" />
                <QuickStat label="Roles del Sistema" value={roles.length} icon={Shield} colorClass="text-violet-600" bgClass="bg-violet-50" />
            </div>

            {/* FLUJO DE CRÉDITO + ZONAS */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-7 flex flex-col gap-6 min-w-0">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-full">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800"><Workflow size={20} className="text-primary"/> Flujo de Crédito</h3>
                            <span className="text-xs font-bold px-2 py-1 bg-slate-100 rounded text-slate-500">{states.length} Pasos</span>
                        </div>

                        <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200 mb-4 flex flex-col sm:flex-row gap-2">
                            <input type="text" placeholder="Nuevo Estado..." value={newStateName} onChange={e => setNewStateName(e.target.value)} className="flex-1 text-xs px-3 py-2 rounded-lg border-none focus:ring-0 bg-transparent text-slate-900 font-bold placeholder:font-normal"/>
                            <select value={newStateRole} onChange={(e) => setNewStateRole(e.target.value)} className="text-xs px-2 py-2 rounded-lg border-none bg-white shadow-sm text-slate-600 focus:ring-0 cursor-pointer w-full sm:w-32">
                                {availableRoleNames.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                            </select>
                            <button type="button" onClick={async () => { if(newStateName.trim()) { await MockService.addState(newStateName, newStateRole as UserRole); await refreshData(); setNewStateName(''); } }} className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-700 shadow-sm flex items-center justify-center"><Plus size={16}/></button>
                        </div>

                        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                            {states.map((s, idx) => (
                                <div key={s.id} className="group bg-white border border-slate-100 rounded-xl shadow-sm hover:border-primary/30 hover:shadow-md transition-all">
                                    {editingStateId === s.id ? (
                                        /* MODO EDICIÓN */
                                        <div className="p-4 space-y-3">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Nombre</label>
                                                    <input value={editStateData.name} onChange={e => setEditStateData({...editStateData, name: e.target.value})} className="w-full text-xs px-3 py-2 border rounded-lg bg-white text-slate-900 font-bold"/>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Color</label>
                                                    <select value={editStateData.color} onChange={e => setEditStateData({...editStateData, color: e.target.value})} className="w-full text-xs px-3 py-2 border rounded-lg bg-white text-slate-900">
                                                        {STATE_COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Rol Responsable</label>
                                                    <select value={editStateData.role_responsible} onChange={e => setEditStateData({...editStateData, role_responsible: e.target.value})} className="w-full text-xs px-3 py-2 border rounded-lg bg-white text-slate-900">
                                                        {availableRoleNames.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                                                    </select>
                                                </div>
                                                <div className="flex items-end pb-1">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input type="checkbox" checked={editStateData.is_final} onChange={e => setEditStateData({...editStateData, is_final: e.target.checked})} className="rounded"/>
                                                        <span className="text-xs font-bold text-slate-600">Estado Final</span>
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-4 h-4 rounded-full ${editStateData.color}`}></div>
                                                <span className="text-[10px] text-slate-400">Vista previa color</span>
                                                <div className="flex-1"></div>
                                                <button onClick={() => setEditingStateId(null)} className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">Cancelar</button>
                                                <button onClick={saveEditState} className="px-4 py-1.5 text-xs bg-primary text-white rounded-lg font-bold hover:bg-orange-700">Guardar</button>
                                            </div>

                                            {/* ACCIONES DEL ESTADO */}
                                            <div className="pt-3 border-t border-slate-100">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Zap size={10}/> Acciones rápidas en este estado</p>
                                                <div className="space-y-1.5 mb-2">
                                                    {editingStateActions.map(a => (
                                                        <div key={a.id} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1.5">
                                                            <Zap size={12} className="text-amber-500 shrink-0"/>
                                                            <span className="text-xs font-bold text-slate-700 flex-1">{a.label}</span>
                                                            {a.roles?.length > 0 && <span className="text-[9px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-bold">{a.roles.join(', ')}</span>}
                                                            {a.result_action === 'change_status' && a.result_state_id && (
                                                                <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">
                                                                    → {states.find(s => s.id === a.result_state_id)?.name ?? a.result_state_id}
                                                                </span>
                                                            )}
                                                            <button type="button" onClick={async () => {
                                                                await MockService.deleteStateAction?.(a.id);
                                                                setEditingStateActions(prev => prev.filter(x => x.id !== a.id));
                                                            }} className="text-slate-300 hover:text-red-500 transition-colors"><X size={12}/></button>
                                                        </div>
                                                    ))}
                                                    {editingStateActions.length === 0 && <p className="text-[10px] text-slate-300 italic px-1">Sin acciones configuradas</p>}
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Ej: OK Validación"
                                                            value={newActionLabel}
                                                            onChange={e => setNewActionLabel(e.target.value)}
                                                            onKeyDown={e => e.key === 'Enter' && e.preventDefault()}
                                                            className="flex-1 text-xs px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-900 font-bold outline-none focus:border-primary"
                                                        />
                                                        <select value={newActionRole} onChange={e => setNewActionRole(e.target.value)} className="text-xs px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-600 outline-none">
                                                            <option value="">Todos los roles</option>
                                                            {availableRoleNames.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="flex gap-2 items-center">
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide whitespace-nowrap">Al ejecutarse:</span>
                                                        <select value={newActionResultAction} onChange={e => { setNewActionResultAction(e.target.value); setNewActionResultStateId(''); }} className="text-xs px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-600 outline-none flex-1">
                                                            <option value="none">Solo registrar</option>
                                                            <option value="change_status">Cambiar estado a...</option>
                                                        </select>
                                                        {newActionResultAction === 'change_status' && (
                                                            <select value={newActionResultStateId} onChange={e => setNewActionResultStateId(e.target.value)} className="text-xs px-2 py-1.5 border border-blue-300 rounded-lg bg-blue-50 text-blue-700 outline-none font-bold flex-1">
                                                                <option value="">— Seleccionar estado —</option>
                                                                {states.filter(s => s.id !== editingStateId).map(s => (
                                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                                ))}
                                                            </select>
                                                        )}
                                                        <button type="button" onClick={async () => {
                                                            if (!newActionLabel.trim() || !editingStateId) return;
                                                            if (newActionResultAction === 'change_status' && !newActionResultStateId) return;
                                                            await MockService.saveStateAction?.({
                                                                state_id: editingStateId,
                                                                label: newActionLabel.trim(),
                                                                roles: newActionRole ? [newActionRole] : [],
                                                                order_index: editingStateActions.length,
                                                                result_action: newActionResultAction,
                                                                result_state_id: newActionResultAction === 'change_status' ? newActionResultStateId : null,
                                                            });
                                                            const updated = await MockService.getStateActions?.(editingStateId) ?? [];
                                                            setEditingStateActions(updated);
                                                            setNewActionLabel(''); setNewActionRole(''); setNewActionResultAction('none'); setNewActionResultStateId('');
                                                        }} className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0">
                                                            + Agregar
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* MODO VISTA */
                                        <div className="flex items-center gap-3 p-3">
                                            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={async () => { await MockService.reorderState(s.id, 'up'); await refreshData();}} className="text-slate-300 hover:text-primary"><ArrowUp size={12}/></button>
                                                <button onClick={async () => { await MockService.reorderState(s.id, 'down'); await refreshData();}} className="text-slate-300 hover:text-primary"><ArrowDown size={12}/></button>
                                            </div>
                                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-xs font-bold text-slate-500 shrink-0">
                                                {idx + 1}
                                            </div>
                                            <div className={`w-2 h-8 rounded-full shrink-0 ${s.color}`}></div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-slate-800 leading-tight truncate">{s.name}</p>
                                                    {s.isFinal && <span className="text-[8px] px-1.5 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded font-bold">FINAL</span>}
                                                </div>
                                                <p className="text-[10px] text-slate-400 font-medium mt-0.5 uppercase tracking-wide">Resp: {s.roleResponsible.replace(/_/g, ' ')}</p>
                                            </div>
                                            <button onClick={() => startEditState(s)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all shrink-0"><Pencil size={14}/></button>
                                            <button onClick={async () => { if(confirm('Eliminar?')) { await MockService.deleteState(s.id); await refreshData(); } }} className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0"><Trash size={14}/></button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="xl:col-span-5 flex flex-col gap-6 min-w-0">
                    {/* ZONES */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800"><Map size={20} className="text-indigo-500"/> Supervisores</h3>
                        </div>
                        <form onSubmit={async (e) => { e.preventDefault(); if(newZoneName) { await MockService.addZone(newZoneName); await refreshData(); setNewZoneName(''); } }} className="flex gap-2 mb-4">
                            <input type="text" placeholder="Nuevo Supervisor..." value={newZoneName} onChange={e => setNewZoneName(e.target.value)} className="flex-1 text-xs px-3 py-2 bg-slate-50 rounded-lg border-none focus:ring-1 focus:ring-indigo-500 text-slate-900"/>
                            <button type="submit" className="bg-indigo-500 text-white p-2 rounded-lg hover:bg-indigo-600"><Plus size={16}/></button>
                        </form>
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                            {zones.map(z => (
                                <div key={z.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 hover:bg-white transition-colors">
                                    <div className="flex justify-between items-center mb-2">
                                        {editingZoneId === z.id ? (
                                            <form onSubmit={async (e) => { e.preventDefault(); if(editingZoneName.trim()) { await MockService.renameZone(z.id, editingZoneName.trim()); await refreshData(); } setEditingZoneId(null); }} className="flex gap-1 flex-1 mr-2">
                                                <input autoFocus type="text" value={editingZoneName} onChange={e => setEditingZoneName(e.target.value)} className="flex-1 text-xs px-2 py-1 border border-indigo-400 rounded bg-white text-slate-900"/>
                                                <button type="submit" className="text-xs px-2 py-1 bg-indigo-500 text-white rounded hover:bg-indigo-600">✓</button>
                                                <button type="button" onClick={() => setEditingZoneId(null)} className="text-xs px-2 py-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300">✕</button>
                                            </form>
                                        ) : (
                                            <button onClick={() => { setEditingZoneId(z.id); setEditingZoneName(z.name); }} className="font-bold text-xs text-slate-700 hover:text-indigo-600 text-left">{z.name}</button>
                                        )}
                                        <button onClick={async () => { await MockService.deleteZone(z.id); await refreshData(); }} className="text-slate-300 hover:text-red-500 ml-1"><Trash size={12}/></button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        {z.cities.map(city => (
                                            <span key={city} className="px-2 py-1 rounded-md text-[9px] font-bold bg-indigo-100 text-indigo-700 shadow-sm flex items-center gap-1">
                                                {city}
                                                <button onClick={async () => {
                                                    const newCities = z.cities.filter(c => c!==city);
                                                    await MockService.updateZoneCities(z.id, newCities); await refreshData();
                                                }} className="hover:text-red-500"><X size={10}/></button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-1">
                                        <input
                                            type="text"
                                            placeholder="Agregar ciudad..."
                                            className="flex-1 text-[10px] p-1 border rounded bg-white"
                                            onKeyDown={async (e) => {
                                                if(e.key === 'Enter') {
                                                    await handleAddCityToZone(z.id, (e.target as HTMLInputElement).value);
                                                    (e.target as HTMLInputElement).value = '';
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ROLES SECTION */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800"><Shield size={20} className="text-violet-500"/> Roles y Permisos</h3>
                    <span className="text-xs font-bold px-2 py-1 bg-violet-50 rounded text-violet-500">{roles.length} Roles</span>
                </div>

                {/* Add Role Form */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-6 flex flex-col sm:flex-row gap-2">
                    <input type="text" placeholder="Nombre interno (ej: SUPERVISOR)" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} className="flex-1 text-xs px-3 py-2 rounded-lg border-none focus:ring-0 bg-white text-slate-900 font-bold placeholder:font-normal shadow-sm"/>
                    <input type="text" placeholder="Nombre visible (ej: Supervisor de Zona)" value={newRoleDisplay} onChange={e => setNewRoleDisplay(e.target.value)} className="flex-1 text-xs px-3 py-2 rounded-lg border-none focus:ring-0 bg-white text-slate-900 font-bold placeholder:font-normal shadow-sm"/>
                    <button type="button" onClick={async () => {
                        if(newRoleName.trim() && newRoleDisplay.trim()) {
                            await MockService.addRole(newRoleName, newRoleDisplay, []);
                            await refreshData();
                            setNewRoleName(''); setNewRoleDisplay('');
                        }
                    }} className="bg-violet-600 text-white p-2 rounded-lg hover:bg-violet-700 shadow-sm flex items-center justify-center gap-1 text-xs font-bold px-4"><Plus size={16}/> Crear Rol</button>
                </div>

                <div className="space-y-3">
                    {roles.map(role => (
                        <div key={role.id} className="border border-slate-100 rounded-xl p-4 bg-white hover:shadow-md transition-all group">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                                        <Shield size={16} className="text-violet-500"/>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-slate-800">{role.displayName}</p>
                                            {role.isSystem && <span className="text-[8px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-bold border">SISTEMA</span>}
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-mono">{role.name}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-violet-500 bg-violet-50 px-2 py-1 rounded">{role.permissions.length} permisos</span>
                                    <button onClick={() => editingRoleId === role.id ? setEditingRoleId(null) : startEditRole(role)} className={`p-2 rounded-lg transition-all ${editingRoleId === role.id ? 'text-primary bg-orange-50' : 'text-slate-300 hover:text-blue-500 hover:bg-blue-50 opacity-0 group-hover:opacity-100'}`}>
                                        <Pencil size={14}/>
                                    </button>
                                    {!role.isSystem && (
                                        <button onClick={async () => { if(confirm('Eliminar rol?')) { await MockService.deleteRole(role.id); await refreshData(); }}} className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                            <Trash size={14}/>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {editingRoleId === role.id && (
                                <div className="mt-3 pt-3 border-t border-slate-100 animate-fade-in">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">Permisos del Rol</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
                                        {ALL_PERMISSIONS.map(perm => (
                                            <button key={perm} onClick={() => toggleRolePerm(perm)} className={`flex items-center gap-2 text-[10px] font-bold px-2.5 py-2 rounded-lg border transition-all ${editRolePerms.includes(perm) ? 'bg-violet-50 border-violet-200 text-violet-700' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}>
                                                {editRolePerms.includes(perm) ? <CheckSquare size={12}/> : <Square size={12}/>}
                                                {perm.replace(/_/g, ' ')}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setEditingRoleId(null)} className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">Cancelar</button>
                                        <button onClick={saveEditRole} className="px-4 py-1.5 text-xs bg-violet-600 text-white rounded-lg font-bold hover:bg-violet-700">Guardar Permisos</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* FUNCIONALIDADES — Feature flags */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 bg-violet-100 rounded-xl">
                        <Layers size={20} className="text-violet-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Funcionalidades</h2>
                        <p className="text-xs text-slate-500">Activa o desactiva módulos del sistema sin necesidad de código.</p>
                    </div>
                </div>
                <div className="divide-y divide-slate-100">
                    <div className="flex items-center justify-between py-4">
                        <div>
                            <p className="font-semibold text-slate-800 text-sm">Módulo Billetera</p>
                            <p className="text-xs text-slate-400 mt-0.5">Muestra "Mi Billetera" y "Retiros" en el menú a los gestores y tesorería.</p>
                        </div>
                        <button
                            disabled={billeteraLoading}
                            onClick={async () => {
                                const next = !billeteraEnabled;
                                setBilleteraEnabledState(next);
                                await MockService.setBilleteraEnabled?.(next);
                                window.dispatchEvent(new CustomEvent('billetera-changed', { detail: { enabled: next } }));
                                window.dispatchEvent(new CustomEvent('app-alert', { detail: { message: next ? 'Módulo Billetera activado.' : 'Módulo Billetera desactivado.', type: 'success' } }));
                            }}
                            className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-40 ${billeteraEnabled ? 'bg-green-500' : 'bg-slate-300'}`}
                        >
                            <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${billeteraEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* SIMULADOR — Entidades & Factores FPM */}
            <div>
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-orange-100 rounded-xl">
                        <CreditCard size={20} className="text-orange-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Simulador de Crédito</h2>
                        <p className="text-xs text-slate-500">Gestiona entidades financieras, factores FPM y pagadurías del simulador.</p>
                    </div>
                </div>
                <SimuladorAdminDashboard />
            </div>

            {/* LISTS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ConfigCard
                    title="Pagadurías"
                    icon={Briefcase}
                    colorClass="text-blue-500"
                    items={pagadurias}
                    newItem={newPagaduria}
                    setNewItem={setNewPagaduria}
                    onAdd={async (v: string) => { await MockService.addPagaduria(v); await refreshData(); }}
                    onDelete={async (v: string) => { await MockService.deletePagaduria(v); await refreshData(); }}
                />

                <ConfigCard
                    title="Ciudades"
                    icon={MapPin}
                    colorClass="text-orange-500"
                    items={cities}
                    newItem={newCity}
                    setNewItem={setNewCity}
                    onAdd={async (v: string) => { await MockService.addCity(v); await refreshData(); }}
                    onDelete={async (v: string) => { await MockService.deleteCity(v); await refreshData(); }}
                />

                <ConfigCard
                    title="Bancos"
                    icon={CreditCard}
                    colorClass="text-purple-500"
                    items={banks}
                    newItem={newBank}
                    setNewItem={setNewBank}
                    onAdd={async (v: string) => { await MockService.addBank(v); await refreshData(); }}
                    onDelete={async (v: string) => { await MockService.deleteBank(v); await refreshData(); }}
                />

            </div>
        </div>
    );
};

const ConfigCard = ({ title, icon: Icon, colorClass, items, newItem, setNewItem, onAdd, onDelete }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-80">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">
            <Icon size={20} className={colorClass}/> {title}
        </h3>
        <form onSubmit={async (e) => { e.preventDefault(); if(newItem.trim()) { await onAdd(newItem.trim()); setNewItem(''); } }} className="flex gap-2 mb-4">
            <input type="text" placeholder={`Nueva ${title}...`} value={newItem} onChange={e => setNewItem(e.target.value)} className="flex-1 text-xs px-3 py-2 bg-slate-50 rounded-lg border-none focus:ring-1 focus:ring-slate-300 text-slate-900"/>
            <button type="submit" className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-700 shadow-sm"><Plus size={16}/></button>
        </form>
        <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
            {items.map((item: string) => (
                <div key={item} className="flex justify-between items-center px-3 py-2 bg-white border border-slate-100 rounded-lg hover:bg-slate-50 transition-colors group">
                    <span className="text-xs font-bold text-slate-600">{item}</span>
                    <button onClick={async () => await onDelete(item)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-opacity"><Trash size={12}/></button>
                </div>
            ))}
        </div>
    </div>
);

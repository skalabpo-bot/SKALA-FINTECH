
import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabaseClient';
import { Users, Phone, Mail, CreditCard, Loader2, UserCheck, TrendingUp, ChevronDown, ChevronUp, MapPin } from 'lucide-react';

interface TeamViewProps {
    currentUser: User;
}

interface TeamMember {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    role: string;
    status: string;
    creditCount: number;
    activeCredits: number;
}

interface ZoneTeam {
    zoneId: string;
    zoneName: string;
    supervisor: { id: string; full_name: string; email: string; phone: string } | null;
    members: TeamMember[];
    expanded: boolean;
}

export const TeamView: React.FC<TeamViewProps> = ({ currentUser }) => {
    const [zones, setZones] = useState<ZoneTeam[]>([]);
    const [loading, setLoading] = useState(true);
    const isAdmin = currentUser.role === 'ADMIN';

    useEffect(() => {
        fetchTeams();
    }, [currentUser]);

    const fetchTeams = async () => {
        setLoading(true);
        try {
            if (isAdmin) {
                await fetchAllZones();
            } else {
                await fetchMyZone();
            }
        } catch (err) {
            console.error('Error cargando equipos:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMyZone = async () => {
        if (!currentUser.zoneId) { setZones([]); return; }

        const { data: zone } = await supabase.from('zones').select('id, name').eq('id', currentUser.zoneId).single();
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email, phone, role, status')
            .eq('zone_id', currentUser.zoneId)
            .neq('id', currentUser.id)
            .order('full_name');

        const members = await enrichWithCredits(profiles || []);
        setZones([{
            zoneId: currentUser.zoneId,
            zoneName: zone?.name || 'Sin zona',
            supervisor: null,
            members,
            expanded: true,
        }]);
    };

    const fetchAllZones = async () => {
        // Obtener todas las zonas
        const { data: allZones } = await supabase.from('zones').select('id, name').order('name');
        if (!allZones || allZones.length === 0) { setZones([]); return; }

        // Obtener todos los perfiles con zona
        const { data: allProfiles } = await supabase
            .from('profiles')
            .select('id, full_name, email, phone, role, status, zone_id')
            .not('zone_id', 'is', null)
            .order('full_name');

        // Obtener todos los creditos para conteo
        const { data: allCredits } = await supabase
            .from('credits')
            .select('assigned_gestor_id, current_state');

        const creditCounts: Record<string, { total: number; active: number }> = {};
        const finalStates = ['DESEMBOLSADO', 'DEVUELTO', 'RECHAZADO', 'ARCHIVADO'];
        (allCredits || []).forEach((c: any) => {
            if (!c.assigned_gestor_id) return;
            if (!creditCounts[c.assigned_gestor_id]) creditCounts[c.assigned_gestor_id] = { total: 0, active: 0 };
            creditCounts[c.assigned_gestor_id].total++;
            if (!finalStates.some(s => (c.current_state || '').toUpperCase().includes(s))) {
                creditCounts[c.assigned_gestor_id].active++;
            }
        });

        const profilesByZone: Record<string, any[]> = {};
        (allProfiles || []).forEach((p: any) => {
            if (!profilesByZone[p.zone_id]) profilesByZone[p.zone_id] = [];
            profilesByZone[p.zone_id].push(p);
        });

        const zoneTeams: ZoneTeam[] = allZones.map((z: any) => {
            const zoneProfiles = profilesByZone[z.id] || [];
            const supervisor = zoneProfiles.find((p: any) => p.role === 'SUPERVISOR_ASIGNADO') || null;
            const members = zoneProfiles
                .filter((p: any) => p.role !== 'SUPERVISOR_ASIGNADO')
                .map((p: any) => ({
                    ...p,
                    creditCount: creditCounts[p.id]?.total || 0,
                    activeCredits: creditCounts[p.id]?.active || 0,
                }));
            return {
                zoneId: z.id,
                zoneName: z.name,
                supervisor: supervisor ? { id: supervisor.id, full_name: supervisor.full_name, email: supervisor.email, phone: supervisor.phone } : null,
                members,
                expanded: false,
            };
        });

        // Ordenar: zonas con miembros primero
        zoneTeams.sort((a, b) => (b.members.length + (b.supervisor ? 1 : 0)) - (a.members.length + (a.supervisor ? 1 : 0)));
        if (zoneTeams.length > 0) zoneTeams[0].expanded = true;

        setZones(zoneTeams);
    };

    const enrichWithCredits = async (profiles: any[]): Promise<TeamMember[]> => {
        if (profiles.length === 0) return [];
        const memberIds = profiles.map((p: any) => p.id);
        const { data: credits } = await supabase
            .from('credits')
            .select('assigned_gestor_id, current_state')
            .in('assigned_gestor_id', memberIds);

        const creditCounts: Record<string, { total: number; active: number }> = {};
        const finalStates = ['DESEMBOLSADO', 'DEVUELTO', 'RECHAZADO', 'ARCHIVADO'];
        (credits || []).forEach((c: any) => {
            if (!creditCounts[c.assigned_gestor_id]) creditCounts[c.assigned_gestor_id] = { total: 0, active: 0 };
            creditCounts[c.assigned_gestor_id].total++;
            if (!finalStates.some(s => (c.current_state || '').toUpperCase().includes(s))) {
                creditCounts[c.assigned_gestor_id].active++;
            }
        });

        return profiles.map((p: any) => ({
            ...p,
            creditCount: creditCounts[p.id]?.total || 0,
            activeCredits: creditCounts[p.id]?.active || 0,
        }));
    };

    const toggleZone = (zoneId: string) => {
        setZones(prev => prev.map(z => z.zoneId === zoneId ? { ...z, expanded: !z.expanded } : z));
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" size={40} /></div>;

    const totalMembers = zones.reduce((sum, z) => sum + z.members.filter(m => m.status === 'ACTIVE').length, 0);
    const totalCredits = zones.reduce((sum, z) => sum + z.members.reduce((s, m) => s + m.creditCount, 0), 0);
    const totalActive = zones.reduce((sum, z) => sum + z.members.reduce((s, m) => s + m.activeCredits, 0), 0);

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h2 className="text-3xl font-display font-bold text-slate-800">{isAdmin ? 'Equipos por Zona' : 'Mi Equipo'}</h2>
                {!isAdmin && zones[0] && <p className="text-slate-500">Zona: <span className="font-bold text-primary">{zones[0].zoneName}</span></p>}
                {isAdmin && <p className="text-slate-500">{zones.length} zonas registradas</p>}
            </div>

            {/* Stats globales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
                    <MapPin size={24} className="mx-auto text-indigo-500 mb-2" />
                    <p className="text-2xl font-black text-slate-800">{zones.length}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{isAdmin ? 'Zonas' : 'Mi Zona'}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
                    <Users size={24} className="mx-auto text-blue-500 mb-2" />
                    <p className="text-2xl font-black text-slate-800">{totalMembers}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Gestores Activos</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
                    <CreditCard size={24} className="mx-auto text-green-500 mb-2" />
                    <p className="text-2xl font-black text-slate-800">{totalCredits}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Creditos Total</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
                    <TrendingUp size={24} className="mx-auto text-purple-500 mb-2" />
                    <p className="text-2xl font-black text-slate-800">{totalActive}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Creditos Activos</p>
                </div>
            </div>

            {/* Zonas */}
            {zones.length === 0 && (
                <div className="text-center py-10 bg-white rounded-2xl border border-slate-100">
                    <Users className="mx-auto text-slate-300 w-12 h-12 mb-3" />
                    <p className="text-slate-500">No hay zonas con equipos.</p>
                </div>
            )}

            {zones.map(zone => {
                const activeMembers = zone.members.filter(m => m.status === 'ACTIVE');
                const pendingMembers = zone.members.filter(m => m.status === 'PENDING');
                const zoneCredits = zone.members.reduce((s, m) => s + m.creditCount, 0);
                const zoneActive = zone.members.reduce((s, m) => s + m.activeCredits, 0);

                return (
                    <div key={zone.zoneId} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                        {/* Zone header — clickable para admin */}
                        <button
                            onClick={() => isAdmin ? toggleZone(zone.zoneId) : null}
                            className={`w-full flex items-center justify-between p-4 text-left ${isAdmin ? 'hover:bg-slate-50 cursor-pointer' : ''}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                                    {zone.zoneName.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{zone.zoneName}</h3>
                                    <div className="flex items-center gap-3 text-xs text-slate-500">
                                        {zone.supervisor && (
                                            <span>Supervisor: <span className="font-bold text-indigo-600">{zone.supervisor.full_name}</span></span>
                                        )}
                                        {!zone.supervisor && <span className="text-orange-500 font-bold">Sin supervisor</span>}
                                        <span>{activeMembers.length} gestores</span>
                                        <span>{zoneCredits} creditos ({zoneActive} activos)</span>
                                    </div>
                                </div>
                            </div>
                            {isAdmin && (zone.expanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />)}
                        </button>

                        {/* Zone content */}
                        {zone.expanded && (
                            <div className="border-t border-slate-100 p-4 space-y-3">
                                {/* Supervisor info */}
                                {zone.supervisor && isAdmin && (
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex items-center gap-3">
                                        <div className="w-8 h-8 bg-indigo-200 rounded-full flex items-center justify-center text-indigo-700 font-bold text-sm">
                                            {zone.supervisor.full_name.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-sm text-indigo-800">{zone.supervisor.full_name} <span className="text-[10px] font-normal text-indigo-500">SUPERVISOR</span></p>
                                            <div className="flex gap-3 text-xs text-indigo-600">
                                                {zone.supervisor.email && <span className="flex items-center gap-1"><Mail size={10} /> {zone.supervisor.email}</span>}
                                                {zone.supervisor.phone && <span className="flex items-center gap-1"><Phone size={10} /> {zone.supervisor.phone}</span>}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Pending */}
                                {pendingMembers.length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-bold text-orange-600 uppercase mb-2">Pendientes ({pendingMembers.length})</p>
                                        {pendingMembers.map(m => (
                                            <div key={m.id} className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center gap-3 mb-2">
                                                <div className="w-8 h-8 bg-orange-200 rounded-full flex items-center justify-center text-orange-700 font-bold text-sm">
                                                    {m.full_name.charAt(0)}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-bold text-sm text-slate-800">{m.full_name}</p>
                                                    <p className="text-xs text-slate-500">{m.email}</p>
                                                </div>
                                                <span className="text-[10px] px-2 py-1 bg-orange-100 text-orange-600 rounded-lg font-bold">PENDIENTE</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Active members */}
                                {activeMembers.length === 0 && pendingMembers.length === 0 ? (
                                    <p className="text-center text-sm text-slate-400 py-4">Sin miembros en esta zona</p>
                                ) : (
                                    activeMembers.map(m => (
                                        <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all">
                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold shrink-0">
                                                {m.full_name.charAt(0)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h4 className="font-bold text-sm text-slate-800">{m.full_name}</h4>
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded font-bold">
                                                        {m.role.replace(/_/g, ' ')}
                                                    </span>
                                                </div>
                                                <div className="flex gap-3 text-xs text-slate-500 mt-0.5">
                                                    {m.email && <span className="flex items-center gap-1"><Mail size={10} /> {m.email}</span>}
                                                    {m.phone && <span className="flex items-center gap-1"><Phone size={10} /> {m.phone}</span>}
                                                </div>
                                            </div>
                                            <div className="flex gap-2 shrink-0">
                                                <div className="text-center px-2 py-1 bg-slate-50 rounded-lg">
                                                    <p className="text-sm font-black text-slate-800">{m.creditCount}</p>
                                                    <p className="text-[8px] text-slate-400 font-bold">TOTAL</p>
                                                </div>
                                                <div className="text-center px-2 py-1 bg-green-50 rounded-lg">
                                                    <p className="text-sm font-black text-green-600">{m.activeCredits}</p>
                                                    <p className="text-[8px] text-green-500 font-bold">ACTIVOS</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};


import React, { useEffect, useState } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabaseClient';
import { Users, Phone, Mail, CreditCard, Loader2, UserCheck, UserX, TrendingUp } from 'lucide-react';

interface TeamViewProps {
    currentUser: User;
    onViewCredit?: (creditId: string) => void;
}

interface TeamMember {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    cedula: string;
    role: string;
    status: string;
    created_at: string;
    creditCount: number;
    activeCredits: number;
}

export const TeamView: React.FC<TeamViewProps> = ({ currentUser }) => {
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [zoneName, setZoneName] = useState('');

    useEffect(() => {
        fetchTeam();
    }, [currentUser]);

    const fetchTeam = async () => {
        setLoading(true);
        try {
            // Obtener nombre de zona
            if (currentUser.zoneId) {
                const { data: zone } = await supabase.from('zones').select('name').eq('id', currentUser.zoneId).single();
                if (zone) setZoneName(zone.name);
            }

            // Obtener miembros de la zona (excluyendo al supervisor mismo)
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, email, phone, cedula, role, status, created_at')
                .eq('zone_id', currentUser.zoneId)
                .neq('id', currentUser.id)
                .order('full_name');

            if (!profiles || profiles.length === 0) {
                setMembers([]);
                setLoading(false);
                return;
            }

            // Contar creditos por gestor
            const memberIds = profiles.map((p: any) => p.id);
            const { data: credits } = await supabase
                .from('credits')
                .select('assigned_gestor_id, current_state')
                .in('assigned_gestor_id', memberIds);

            const creditCounts: Record<string, { total: number; active: number }> = {};
            (credits || []).forEach((c: any) => {
                if (!creditCounts[c.assigned_gestor_id]) {
                    creditCounts[c.assigned_gestor_id] = { total: 0, active: 0 };
                }
                creditCounts[c.assigned_gestor_id].total++;
                // Creditos activos = no finales (no DESEMBOLSADO, DEVUELTO, RECHAZADO, ARCHIVADO)
                const finalStates = ['DESEMBOLSADO', 'DEVUELTO', 'RECHAZADO', 'ARCHIVADO'];
                const isFinal = finalStates.some(s => (c.current_state || '').toUpperCase().includes(s));
                if (!isFinal) creditCounts[c.assigned_gestor_id].active++;
            });

            setMembers(profiles.map((p: any) => ({
                ...p,
                creditCount: creditCounts[p.id]?.total || 0,
                activeCredits: creditCounts[p.id]?.active || 0,
            })));
        } catch (err) {
            console.error('Error cargando equipo:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" size={40} /></div>;

    const activeMembers = members.filter(m => m.status === 'ACTIVE');
    const pendingMembers = members.filter(m => m.status === 'PENDING');
    const totalCredits = members.reduce((sum, m) => sum + m.creditCount, 0);
    const totalActive = members.reduce((sum, m) => sum + m.activeCredits, 0);

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-display font-bold text-slate-800">Mi Equipo</h2>
                <p className="text-slate-500">Zona: <span className="font-bold text-primary">{zoneName || 'Sin zona'}</span></p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
                    <Users size={24} className="mx-auto text-blue-500 mb-2" />
                    <p className="text-2xl font-black text-slate-800">{activeMembers.length}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Gestores Activos</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
                    <UserCheck size={24} className="mx-auto text-orange-500 mb-2" />
                    <p className="text-2xl font-black text-slate-800">{pendingMembers.length}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Pendientes</p>
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

            {/* Pending members */}
            {pendingMembers.length > 0 && (
                <div>
                    <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wide mb-3">Pendientes de Aprobacion</h3>
                    <div className="space-y-2">
                        {pendingMembers.map(m => (
                            <div key={m.id} className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-4">
                                <div className="w-10 h-10 bg-orange-200 rounded-full flex items-center justify-center text-orange-700 font-bold text-sm">
                                    {m.full_name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-slate-800">{m.full_name}</p>
                                    <p className="text-xs text-slate-500">{m.email}</p>
                                </div>
                                <span className="text-[10px] px-2 py-1 bg-orange-100 text-orange-600 rounded-lg font-bold">PENDIENTE</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Active members */}
            <div>
                <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-3">Miembros Activos</h3>
                {activeMembers.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-2xl border border-slate-100">
                        <Users className="mx-auto text-slate-300 w-12 h-12 mb-3" />
                        <p className="text-slate-500">No tienes gestores en tu zona aun.</p>
                        <p className="text-xs text-slate-400 mt-1">Cuando se aprueben gestores en tu zona, apareceran aqui.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {activeMembers.map(m => (
                            <div key={m.id} className="bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md transition-all">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0">
                                        {m.full_name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="font-bold text-slate-800">{m.full_name}</h4>
                                            <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded font-bold">
                                                {m.role.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                                            {m.email && (
                                                <span className="flex items-center gap-1">
                                                    <Mail size={12} /> {m.email}
                                                </span>
                                            )}
                                            {m.phone && (
                                                <span className="flex items-center gap-1">
                                                    <Phone size={12} /> {m.phone}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-4 mt-3">
                                            <div className="text-center px-3 py-1.5 bg-slate-50 rounded-lg">
                                                <p className="text-lg font-black text-slate-800">{m.creditCount}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase">Total</p>
                                            </div>
                                            <div className="text-center px-3 py-1.5 bg-green-50 rounded-lg">
                                                <p className="text-lg font-black text-green-600">{m.activeCredits}</p>
                                                <p className="text-[9px] text-green-500 font-bold uppercase">Activos</p>
                                            </div>
                                            <div className="text-center px-3 py-1.5 bg-blue-50 rounded-lg">
                                                <p className="text-lg font-black text-blue-600">{m.creditCount - m.activeCredits}</p>
                                                <p className="text-[9px] text-blue-500 font-bold uppercase">Finalizados</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

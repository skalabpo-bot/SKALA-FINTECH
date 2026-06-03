
import React, { useEffect, useState } from 'react';
import { User, DashboardStats, NewsItem } from '../types';
import { MockService } from '../services/mockService';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area, CartesianGrid } from 'recharts';
import { Trophy, DollarSign, Clock, AlertCircle, Banknote, CheckCircle, FileText, Users, ArrowUpRight, ArrowDownRight, Activity, ChevronRight, Wallet, Award, Medal, X, ChevronLeft } from 'lucide-react';

interface DashboardProps {
  currentUser: User;
  onNavigate?: (view: string) => void;
}

// --- SUBCOMPONENTS ---

const WelcomeHeader = ({ user }: { user: User }) => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
    const displayName = user?.name ? user.name.split(' ')[0] : 'Usuario';
    
    return (
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 animate-fade-in">
            <div>
                <h1 className="text-3xl font-display font-extrabold text-slate-800 tracking-tight">
                    {greeting}, {displayName} <span className="text-4xl">👋</span>
                </h1>
                <p className="text-slate-500 font-medium mt-1 flex items-center gap-2">
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border border-slate-200">{user.roleDisplayName || user.role.replace(/_/g, ' ')}</span>
                    <span>• Panel de Control General</span>
                </p>
            </div>
            <div className="text-right hidden md:block">
                <p className="text-3xl font-display font-bold text-slate-800">
                    {new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long' })}
                </p>
                <p className="text-slate-400 font-medium text-sm capitalize">
                    {new Date().toLocaleDateString('es-CO', { weekday: 'long' })}, {new Date().getFullYear()}
                </p>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon: Icon, color, bg, trend }: any) => {
    const isPositive = trend > 0;
    
    return (
        <div className="relative overflow-hidden bg-white p-6 rounded-3xl shadow-sm border border-slate-100 group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 w-full min-w-0">
            <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 ${color}`}>
                <Icon size={80} />
            </div>
            
            <div className="flex flex-col h-full justify-between relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-2xl ${bg} shadow-inner`}>
                        <Icon className={`w-6 h-6 ${color}`} />
                    </div>
                    {trend !== undefined && (
                        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                            {isPositive ? <ArrowUpRight size={12}/> : <ArrowDownRight size={12}/>}
                            {Math.abs(trend)}%
                        </div>
                    )}
                </div>
                
                <div className="min-w-0">
                    <h3 className="text-2xl lg:text-3xl xl:text-4xl font-display font-extrabold text-slate-800 tracking-tight mb-1 truncate">
                        {typeof value === 'number' && value > 1000000 
                            ? `$${(value / 1000000).toFixed(1)}M` 
                            : (typeof value === 'number' && value > 1000 ? value.toLocaleString() : value)}
                    </h3>
                    <p className="text-xs lg:text-sm font-bold text-slate-400 uppercase tracking-wide truncate">{title}</p>
                </div>
            </div>
        </div>
    );
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-800 text-white text-xs p-3 rounded-xl shadow-xl border border-slate-700">
                <p className="font-bold mb-1">{label}</p>
                <p className="font-medium text-primary flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary block"></span>
                    {payload[0].value} Solicitudes
                </p>
            </div>
        );
    }
    return null;
};

const NewsCarousel = () => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [curr, setCurr] = useState(0);
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

    useEffect(() => {
        const fetchNews = async () => {
            const data = await MockService.getNews();
            setNews(data);
        };
        fetchNews();
    }, []);

    const isOpen = selectedIdx !== null;
    const selected = isOpen ? news[selectedIdx!] : null;

    const goPrev = () => setSelectedIdx(i => i === null ? null : (i - 1 + news.length) % news.length);
    const goNext = () => setSelectedIdx(i => i === null ? null : (i + 1) % news.length);

    // Autoplay del carrusel del dashboard — pausa cuando el modal está abierto
    useEffect(() => {
        if (!news.length || isOpen) return;
        const i = setInterval(() => setCurr(c => (c + 1) % news.length), 6000);
        return () => clearInterval(i);
    }, [news, isOpen]);

    // Teclado: Escape cierra, flechas navegan (sin autoplay)
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setSelectedIdx(null);
            else if (e.key === 'ArrowLeft') goPrev();
            else if (e.key === 'ArrowRight') goNext();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, news.length]);

    if (!news.length) return null;
    const hasMultiple = news.length > 1;

    return (
        <>
            <button
                type="button"
                onClick={() => setSelectedIdx(curr)}
                className="relative w-full h-52 md:h-64 lg:h-72 rounded-3xl overflow-hidden shadow-md group min-w-0 block text-left cursor-zoom-in"
                title="Click para ver imagen completa"
            >
                <img src={news[curr].imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"/>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent p-6 flex flex-col justify-end">
                    <span className="inline-block bg-primary text-white text-[10px] font-bold px-2 py-1 rounded mb-2 w-fit shadow-sm">NOVEDAD</span>
                    <h3 className="text-xl font-display font-bold text-white leading-tight mb-1 truncate">{news[curr].title}</h3>
                    <p className="text-slate-200 text-sm line-clamp-2">{news[curr].description}</p>
                </div>
                <div className="absolute top-4 right-4 flex gap-1">
                    {news.map((_, i) => <div key={i} className={`h-1 rounded-full transition-all ${i === curr ? 'bg-primary w-6' : 'bg-white/50 w-2'}`}/>)}
                </div>
            </button>

            {selected && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
                    onClick={() => setSelectedIdx(null)}
                >
                    <div
                        className="relative bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => setSelectedIdx(null)}
                            className="absolute top-4 right-4 z-20 bg-white/90 hover:bg-white text-slate-700 rounded-full p-2 shadow-lg transition-all"
                            aria-label="Cerrar"
                        >
                            <X size={20}/>
                        </button>

                        <div className="relative bg-slate-100 flex items-center justify-center max-h-[70vh] overflow-auto custom-scrollbar">
                            {hasMultiple && (
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); goPrev(); }}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white text-slate-700 rounded-full p-2 shadow-lg transition-all"
                                    aria-label="Anterior"
                                >
                                    <ChevronLeft size={22}/>
                                </button>
                            )}

                            <img
                                src={selected.imageUrl}
                                alt={selected.title}
                                className="max-w-full max-h-[70vh] w-auto h-auto object-contain"
                            />

                            {hasMultiple && (
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); goNext(); }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white text-slate-700 rounded-full p-2 shadow-lg transition-all"
                                    aria-label="Siguiente"
                                >
                                    <ChevronRight size={22}/>
                                </button>
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                                <span className="inline-block bg-primary text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">NOVEDAD</span>
                                {hasMultiple && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-bold text-slate-400">
                                            {selectedIdx! + 1} / {news.length}
                                        </span>
                                        <div className="flex gap-1">
                                            {news.map((_, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => setSelectedIdx(i)}
                                                    className={`h-1.5 rounded-full transition-all ${i === selectedIdx ? 'bg-primary w-6' : 'bg-slate-300 w-2 hover:bg-slate-400'}`}
                                                    aria-label={`Ir a novedad ${i + 1}`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <h3 className="text-2xl font-display font-bold text-slate-800 mb-2">{selected.title}</h3>
                            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{selected.description}</p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

const RecentActivityList = ({ currentUser }: { currentUser: User }) => {
    const [activities, setActivities] = useState<any[]>([]);

    useEffect(() => {
        const fetchActivities = async () => {
            try {
                const credits = await MockService.getCredits(currentUser);
                const allHistory: any[] = [];

                for (const credit of credits) {
                    const creditHistory = await MockService.getCreditHistory(credit.id);
                    creditHistory.forEach((h: any) => {
                        allHistory.push({
                            user: h.changedBy || 'Sistema',
                            action: `${credit.nombreCompleto || 'Crédito'} → ${h.statusName}`,
                            time: h.changedAt,
                            color: getColorForStatus(h.statusName)
                        });
                    });
                }

                // Ordenar por fecha más reciente y tomar las primeras 5
                const sortedActivities = allHistory
                    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
                    .slice(0, 5);

                setActivities(sortedActivities);
            } catch (err) {
                console.error('Error fetching activities:', err);
            }
        };

        fetchActivities();
    }, [currentUser]);

    const getColorForStatus = (statusName: string) => {
        if (statusName.includes('DESEMBOLSADO')) return 'bg-green-500';
        if (statusName.includes('DEVUELTO')) return 'bg-red-500';
        if (statusName.includes('APROBADO')) return 'bg-blue-500';
        if (statusName.includes('ESTUDIO')) return 'bg-orange-500';
        return 'bg-purple-500';
    };

    const getTimeAgo = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - new Date(date).getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `Hace ${days} día${days > 1 ? 's' : ''}`;
        if (hours > 0) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
        if (minutes > 0) return `Hace ${minutes} min`;
        return 'Ahora';
    };

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 h-full min-w-0">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-display font-bold text-lg text-slate-800 flex items-center gap-2">
                    <Activity size={20} className="text-primary"/> Actividad Reciente
                </h3>
            </div>
            <div className="space-y-4 relative">
                {/* Timeline Line */}
                <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-100"></div>

                {activities.length === 0 ? (
                    <p className="text-center text-slate-400 text-sm py-10">No hay actividad reciente</p>
                ) : (
                    activities.map((item, i) => (
                        <div key={i} className="flex gap-4 relative items-start">
                            <div className={`mt-1 w-5 h-5 rounded-full border-4 border-white shrink-0 z-10 ${item.color} shadow-sm`}></div>
                            <div className="bg-slate-50 p-3 rounded-xl w-full border border-slate-100 hover:bg-white hover:shadow-sm transition-all min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">{item.action}</p>
                                <div className="flex justify-between items-center mt-1">
                                    <span className="text-[10px] text-slate-500 font-medium truncate">{item.user}</span>
                                    <span className="text-[9px] text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200 whitespace-nowrap">{getTimeAgo(item.time)}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const Leaderboard = ({ title, icon: Icon, entries, periodLabel, accentClass = 'text-amber-500', barColors = 'from-amber-400 to-orange-500' }: any) => {
    const formatMoney = (n: number) => {
        if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
        if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
        return `$${n.toLocaleString('es-CO')}`;
    };
    const medals = ['🥇', '🥈', '🥉'];
    const maxTotal = (entries && entries.length > 0) ? Math.max(...entries.map((e: any) => e.total || 0)) : 0;
    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-5">
                <h3 className="font-display font-bold text-lg text-slate-800 flex items-center gap-2">
                    <Icon size={20} className={accentClass}/> {title}
                </h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 capitalize">{periodLabel || 'Histórico'}</span>
            </div>
            {(!entries || entries.length === 0) ? (
                <p className="text-center text-slate-400 text-sm py-8 italic">Sin desembolsos en este periodo</p>
            ) : (
                <div className="space-y-2">
                    {entries.map((e: any, i: number) => {
                        const pct = maxTotal > 0 ? (e.total / maxTotal) * 100 : 0;
                        return (
                            <div key={e.id} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${i < 3 ? 'bg-gradient-to-r from-amber-50 to-white border border-amber-100' : 'bg-slate-50/50 border border-transparent'}`}>
                                <div className="text-2xl shrink-0 w-8 text-center">{medals[i] || <span className="text-xs font-black text-slate-400">#{i + 1}</span>}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline gap-2">
                                        <p className="text-sm font-black text-slate-800 truncate">{e.name}</p>
                                        <p className="text-sm font-black text-emerald-600 font-mono shrink-0">{formatMoney(e.total)}</p>
                                    </div>
                                    {/* Barra de progreso relativa al líder */}
                                    <div className="mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full bg-gradient-to-r ${barColors} rounded-full transition-all duration-700`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between mt-1 text-[10px] text-slate-500 font-medium">
                                        <span>{e.count} crédito{e.count === 1 ? '' : 's'}{e.zone ? ` · ${e.zone}` : ''}</span>
                                        <span className="text-slate-400 font-bold">{pct.toFixed(0)}%</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// --- MAIN DASHBOARD COMPONENT ---

export const Dashboard: React.FC<DashboardProps> = ({ currentUser, onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [timeFilter, setTimeFilter] = useState<'ALL' | 'THIS_MONTH' | 'LAST_MONTH'>('THIS_MONTH');
  const [billeteraEnabled, setBilleteraEnabled] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
        const data = await MockService.getStats(currentUser, timeFilter);
        setStats(data);
    };
    fetchStats();
  }, [currentUser, timeFilter]);

  useEffect(() => {
    MockService.getBilleteraEnabled?.().then((v: boolean) => setBilleteraEnabled(v)).catch(() => {});
    const handle = (e: any) => setBilleteraEnabled(e.detail.enabled);
    window.addEventListener('billetera-changed', handle);
    return () => window.removeEventListener('billetera-changed', handle);
  }, []);

  if (!stats) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  const COLORS = ['#EA580C', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']; // Primary, Success, Warning, Danger, Purple

  // Data for Charts
  const chartData = stats.byStatus ? Object.keys(stats.byStatus).map(key => ({
    name: key,
    value: stats.byStatus[key]
  })) : [];

  return (
    <div className="space-y-8 animate-fade-in pb-10 w-full overflow-hidden">
      <WelcomeHeader user={currentUser} />

      {/* --- GESTOR: Banner + KPIs lado a lado en PC --- */}
      {!MockService.hasPermission(currentUser, 'VIEW_ALL_CREDITS') ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6">
          {/* Banner (3/5) */}
          <div className="lg:col-span-3 bg-white rounded-3xl shadow-sm border border-slate-100 p-1">
            <NewsCarousel />
          </div>
          {/* KPIs (2/5) — 2x2 en PC */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Billetera — card especial (solo si está habilitada) */}
            {billeteraEnabled && (
            <div
              onClick={() => onNavigate?.('wallet')}
              className="bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl p-5 cursor-pointer hover:shadow-lg transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Wallet size={18} className="text-white/80" />
                  <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">Mi Billetera</span>
                </div>
                <ChevronRight size={16} className="text-white/60 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-2xl font-black text-white font-mono">${(stats.totalCommissionPending || 0).toLocaleString('es-CO')}</p>
              <p className="text-[10px] text-white/70 mt-1">Por cobrar · <span className="font-bold text-white/90">${(stats.totalCommissionPaid || 0).toLocaleString('es-CO')} ya cobrado</span></p>
            </div>
            )}
            <div className="grid grid-cols-2 gap-4 flex-1">
              <StatCard title={`Desembolsados (${stats.periodLabel || 'Histórico'})`} value={stats.disbursedCredits} icon={Trophy} color="text-emerald-600" bg="bg-emerald-100" />
              <StatCard title="En Proceso (Actual)" value={stats.pendingCredits} icon={Clock} color="text-blue-600" bg="bg-blue-100" />
              <StatCard title={`Devueltos (${stats.periodLabel || 'Histórico'})`} value={stats.returnedCredits} icon={AlertCircle} color="text-red-600" bg="bg-red-100" />
              <StatCard title={`Radicados (${stats.periodLabel || 'Histórico'})`} value={stats.totalCredits} icon={FileText} color="text-slate-600" bg="bg-slate-100" />
            </div>
          </div>
        </div>
      ) : (
        /* --- ADMIN/ANALISTA: KPIs en fila --- */
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {!MockService.hasPermission(currentUser, 'CONFIGURE_SYSTEM') && MockService.hasPermission(currentUser, 'EXPORT_DATA') ? (
            <>
              <StatCard title="En Estudio (Actual)" value={stats.pendingCredits} icon={Banknote} color="text-blue-600" bg="bg-blue-100" />
              <StatCard title={`Desembolsado (${stats.periodLabel || 'Histórico'})`} value={stats.totalAmountDisbursed} icon={CheckCircle} color="text-emerald-600" bg="bg-emerald-100" />
              <StatCard title={`Créditos Desembolsados (${stats.periodLabel || 'Histórico'})`} value={stats.disbursedCredits} icon={FileText} color="text-purple-600" bg="bg-purple-100" />
              <StatCard title={`Devueltos (${stats.periodLabel || 'Histórico'})`} value={stats.returnedCredits} icon={AlertCircle} color="text-red-600" bg="bg-red-100" />
            </>
          ) : (
            <>
              <StatCard title={`Radicados (${stats.periodLabel || 'Histórico'})`} value={stats.totalCredits} icon={Users} color="text-blue-600" bg="bg-blue-100" />
              <StatCard title={`Monto Desembolsado (${stats.periodLabel || 'Histórico'})`} value={stats.totalAmountDisbursed} icon={DollarSign} color="text-emerald-600" bg="bg-emerald-100" />
              <StatCard title={`Créditos Desembolsados (${stats.periodLabel || 'Histórico'})`} value={stats.disbursedCredits} icon={CheckCircle} color="text-purple-600" bg="bg-purple-100" />
              <StatCard title="En Estudio (Actual)" value={stats.pendingCredits} icon={Clock} color="text-orange-600" bg="bg-orange-100" />
            </>
          )}
        </div>
      )}

      {/* --- LEADERBOARDS ---
          Admin: ve Top Asesores (todos) + Top Supervisores.
          Supervisor: ve Top Asesores SOLO de su equipo (getCredits ya filtra por snapshot). */}
      {(() => {
          const isAdmin = MockService.hasPermission(currentUser, 'VIEW_ALL_CREDITS');
          const isSupervisor = currentUser.role === 'SUPERVISOR_ASIGNADO';
          if (!isAdmin && !isSupervisor) return null;
          if (!stats.topGestores && !stats.topSupervisores) return null;
          return (
              <div className={`grid grid-cols-1 ${isAdmin ? 'lg:grid-cols-2' : ''} gap-6 lg:gap-8`}>
                  <Leaderboard
                      title={isSupervisor && !isAdmin ? 'Top Asesores de mi equipo' : 'Top Asesores'}
                      icon={Award}
                      entries={stats.topGestores}
                      periodLabel={stats.periodLabel}
                      accentClass="text-amber-500"
                      barColors="from-amber-400 to-orange-500"
                  />
                  {isAdmin && (
                      <Leaderboard
                          title="Top Supervisores"
                          icon={Medal}
                          entries={stats.topSupervisores}
                          periodLabel={stats.periodLabel}
                          accentClass="text-indigo-500"
                          barColors="from-indigo-400 to-purple-500"
                      />
                  )}
              </div>
          );
      })()}

      {/* --- MAIN CONTENT ROW --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          
          {/* LEFT: Charts (2 cols) */}
          <div className="lg:col-span-2 space-y-6 lg:space-y-8 min-w-0">
              {/* Main Bar Chart */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 min-w-0">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                      <div>
                          <h3 className="text-xl font-display font-bold text-slate-800">Distribución de Solicitudes</h3>
                          <p className="text-sm text-slate-500 capitalize">
                              {timeFilter === 'ALL' ? 'Histórico — todos los créditos por estado actual' : `Radicados en ${stats.periodLabel} por estado actual`}
                          </p>
                      </div>
                      <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                          <button onClick={() => setTimeFilter('ALL')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${timeFilter === 'ALL' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Todo</button>
                          <button onClick={() => setTimeFilter('THIS_MONTH')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${timeFilter === 'THIS_MONTH' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Mes actual</button>
                          <button onClick={() => setTimeFilter('LAST_MONTH')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${timeFilter === 'LAST_MONTH' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Mes anterior</button>
                      </div>
                  </div>
                  
                  {/* Fixed height container to prevent layout shifts */}
                  <div className="h-80 w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 10, fill: '#64748b', fontWeight: 600}} 
                            interval={0}
                            angle={-10}
                            textAnchor="end"
                            height={60}
                        />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#94a3b8'}} />
                        <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                        <Bar dataKey="value" fill="#EA580C" radius={[6, 6, 0, 0]} barSize={40}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
              </div>

              {/* Secondary Chart Row (Only for Admin/Analyst/Others) */}
              {MockService.hasPermission(currentUser, 'VIEW_ALL_CREDITS') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 min-w-0">
                        <h3 className="font-display font-bold text-slate-800 mb-4">Composición</h3>
                        <div className="h-48 w-full flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        innerRadius={40}
                                        outerRadius={70}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Legend Overlay */}
                            <div className="flex flex-col gap-2 ml-4 overflow-y-auto max-h-40 custom-scrollbar">
                                {chartData.slice(0, 3).map((entry, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full shrink-0" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                                        <span className="text-xs font-bold text-slate-600 truncate max-w-[100px]">{entry.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* News Component for Internal Staff (Kept here for others) */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-1 min-w-0">
                        <NewsCarousel />
                    </div>
                </div>
              )}
          </div>

          {/* RIGHT: Activity & Lists (1 col) */}
          <div className="space-y-8 min-w-0">
              <RecentActivityList currentUser={currentUser} />
              
              {/* Quick Actions (Admin/Internal) */}
              {(MockService.hasPermission(currentUser, 'CONFIGURE_SYSTEM') || MockService.hasPermission(currentUser, 'VIEW_REPORTS')) && (
                  <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-3xl shadow-lg text-white">
                      <h3 className="font-display font-bold text-lg mb-4">Acciones Rápidas</h3>
                      <div className="space-y-3">
                          <button className="w-full bg-white/10 hover:bg-white/20 p-3 rounded-xl flex items-center justify-between transition-colors">
                              <div className="flex items-center gap-3">
                                  <div className="bg-primary p-2 rounded-lg"><FileText size={16}/></div>
                                  <span className="text-sm font-bold">Generar Reporte Diario</span>
                              </div>
                              <ChevronRight size={16} className="text-slate-400"/>
                          </button>
                          <button className="w-full bg-white/10 hover:bg-white/20 p-3 rounded-xl flex items-center justify-between transition-colors">
                              <div className="flex items-center gap-3">
                                  <div className="bg-blue-500 p-2 rounded-lg"><Users size={16}/></div>
                                  <span className="text-sm font-bold">Gestionar Usuarios</span>
                              </div>
                              <ChevronRight size={16} className="text-slate-400"/>
                          </button>
                      </div>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

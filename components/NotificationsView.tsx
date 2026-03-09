
import React, { useEffect, useState } from 'react';
import { User, type Notification } from '../types';
import { MockService } from '../services/mockService';
import { subscribeToNotifications } from '../services/realtimeService';
import { getNotificationPermission, isPushSupported, subscribeToPush } from '../services/pushNotificationService';
import { Bell, Check, Info, AlertTriangle, CheckCircle, Clock, Loader2, BellOff, Smartphone, Monitor, ExternalLink } from 'lucide-react';

function getDeviceInstructions(): { device: string; icon: React.ReactNode; steps: string[] } {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(ua)) {
        return {
            device: 'iPhone / iPad',
            icon: <Smartphone size={18} />,
            steps: [
                'Abre Ajustes en tu dispositivo',
                'Ve a Safari (o el navegador que uses)',
                'Busca "Sitios web" o "Notificaciones"',
                'Encuentra skala y cambia a "Permitir"',
            ],
        };
    }
    if (/Android/.test(ua)) {
        return {
            device: 'Android',
            icon: <Smartphone size={18} />,
            steps: [
                'Toca el icono de candado o ajustes junto a la URL',
                'Toca "Permisos" o "Configuracion del sitio"',
                'Cambia Notificaciones a "Permitir"',
                'Recarga la pagina',
            ],
        };
    }
    if (/Mac/.test(ua) && /Safari/.test(ua) && !/Chrome/.test(ua)) {
        return {
            device: 'Safari (Mac)',
            icon: <Monitor size={18} />,
            steps: [
                'Ve a Safari > Preferencias > Sitios web',
                'Selecciona "Notificaciones" en el menu lateral',
                'Busca este sitio y cambia a "Permitir"',
                'Recarga la pagina',
            ],
        };
    }
    // Chrome / Edge / Firefox desktop
    return {
        device: 'Navegador',
        icon: <Monitor size={18} />,
        steps: [
            'Haz clic en el icono de candado junto a la URL',
            'Busca "Notificaciones" en los permisos',
            'Cambia a "Permitir"',
            'Recarga la pagina',
        ],
    };
}

interface NotificationsViewProps {
    currentUser: User;
    onViewCredit: (creditId: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ currentUser, onViewCredit }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>('default');
    const [showInstructions, setShowInstructions] = useState(false);
    const [requesting, setRequesting] = useState(false);

    useEffect(() => {
        setPushPermission(getNotificationPermission());

        const fetchNotifications = async () => {
            setLoading(true);
            try {
                const data = await MockService.getNotifications(currentUser.id);
                setNotifications(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            } catch (err) {
                console.error("Error loading notifications:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchNotifications();

        const unsubscribe = subscribeToNotifications(currentUser.id, (notif) => {
            setNotifications(prev => [notif, ...prev]);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handleRequestPermission = async () => {
        setRequesting(true);
        try {
            const result = await subscribeToPush(currentUser.id);
            setPushPermission(getNotificationPermission());
            if (!result && Notification.permission === 'denied') {
                setShowInstructions(true);
            }
        } finally {
            setRequesting(false);
        }
    };

    const handleMarkRead = async (id: string) => {
        await MockService.markNotificationAsRead(id);
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const handleMarkAllRead = async () => {
        await MockService.markAllNotificationsAsRead(currentUser.id);
        setNotifications([]);
    };

    const getIcon = (type: string) => {
        switch(type) {
            case 'success': return <CheckCircle className="text-green-500" />;
            case 'warning': return <AlertTriangle className="text-orange-500" />;
            case 'error': return <AlertTriangle className="text-red-500" />;
            default: return <Info className="text-blue-500" />;
        }
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" size={40}/></div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-display font-bold text-slate-800">Notificaciones</h2>
                    <p className="text-slate-500">Mantente al día con los cambios en tus créditos.</p>
                </div>
                <button 
                    onClick={handleMarkAllRead}
                    className="text-sm font-bold text-primary hover:underline flex items-center gap-1"
                >
                    <Check size={16}/> Marcar todo como leído
                </button>
            </div>

            {/* Banner de estado de notificaciones push */}
            {pushPermission === 'denied' && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                            <BellOff size={20} className="text-red-500" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-red-800 text-sm">Notificaciones push bloqueadas</h4>
                            <p className="text-xs text-red-600 mt-1">
                                No recibiras alertas de creditos, mensajes ni cambios de estado. Activalas desde tu {/Android|iPhone|iPad/.test(navigator.userAgent) ? 'dispositivo' : 'navegador'}.
                            </p>
                            <button
                                onClick={() => setShowInstructions(!showInstructions)}
                                className="mt-2 text-xs font-bold text-red-700 hover:text-red-900 flex items-center gap-1"
                            >
                                <ExternalLink size={12} /> {showInstructions ? 'Ocultar instrucciones' : 'Ver como activarlas'}
                            </button>
                            {showInstructions && (() => {
                                const info = getDeviceInstructions();
                                return (
                                    <div className="mt-3 bg-white rounded-xl p-4 border border-red-100">
                                        <div className="flex items-center gap-2 mb-3">
                                            {info.icon}
                                            <span className="text-xs font-bold text-slate-700">{info.device}</span>
                                        </div>
                                        <ol className="space-y-2">
                                            {info.steps.map((step, i) => (
                                                <li key={i} className="flex gap-2 text-xs text-slate-600">
                                                    <span className="w-5 h-5 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold">{i + 1}</span>
                                                    {step}
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {pushPermission === 'default' && isPushSupported() && (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                            <Bell size={20} className="text-orange-500" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-orange-800 text-sm">Activa las notificaciones push</h4>
                            <p className="text-xs text-orange-600 mt-1">
                                Recibe alertas instantaneas sobre tus creditos, mensajes y cambios de estado.
                            </p>
                        </div>
                        <button
                            onClick={handleRequestPermission}
                            disabled={requesting}
                            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 shrink-0"
                        >
                            {requesting ? <Loader2 size={14} className="animate-spin" /> : 'Activar'}
                        </button>
                    </div>
                </div>
            )}

            {pushPermission === 'granted' && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-3">
                    <div className="flex items-center gap-3">
                        <CheckCircle size={18} className="text-green-500 shrink-0" />
                        <p className="text-xs text-green-700 font-medium">Notificaciones push activas — recibiras alertas en este dispositivo.</p>
                    </div>
                </div>
            )}

            {pushPermission === 'unsupported' && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                    <div className="flex items-center gap-3">
                        <BellOff size={18} className="text-slate-400 shrink-0" />
                        <p className="text-xs text-slate-500 font-medium">Tu navegador no soporta notificaciones push. Prueba con Chrome o Edge para recibirlas.</p>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {notifications.filter(n => !n.isRead).length === 0 && (
                    <div className="text-center py-10 bg-white rounded-2xl border border-slate-100">
                        <Bell className="mx-auto text-slate-300 w-12 h-12 mb-3"/>
                        <p className="text-slate-500">No tienes notificaciones pendientes.</p>
                    </div>
                )}

                {notifications.filter(n => !n.isRead).map(notif => (
                    <div 
                        key={notif.id} 
                        className={`bg-white p-4 rounded-xl border transition-all hover:shadow-md flex gap-4 ${notif.isRead ? 'border-slate-100 opacity-70' : 'border-orange-100 shadow-sm border-l-4 border-l-primary'}`}
                    >
                        <div className="mt-1">
                            {getIcon(notif.type)}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <h4 className={`font-bold ${notif.isRead ? 'text-slate-700' : 'text-slate-900'}`}>{notif.title}</h4>
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                    <Clock size={10}/> {new Date(notif.createdAt).toLocaleString()}
                                </span>
                            </div>
                            <p className="text-sm text-slate-600 mt-1">{notif.message}</p>
                            
                            <div className="flex gap-4 mt-3">
                                {notif.creditId && (
                                    <button 
                                        onClick={() => { handleMarkRead(notif.id); onViewCredit(notif.creditId!); }}
                                        className="text-xs font-bold text-primary hover:underline"
                                    >
                                        Ver Crédito
                                    </button>
                                )}
                                {!notif.isRead && (
                                    <button 
                                        onClick={() => handleMarkRead(notif.id)}
                                        className="text-xs font-bold text-slate-400 hover:text-slate-600"
                                    >
                                        Marcar como leído
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

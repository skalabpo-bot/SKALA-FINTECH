
import React, { useEffect, useState } from 'react';
import { User, Notification } from '../types';
import { MockService } from '../services/mockService';
import { Bell, Check, Info, AlertTriangle, CheckCircle, Clock, Loader2 } from 'lucide-react';

interface NotificationsViewProps {
    currentUser: User;
    onViewCredit: (creditId: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ currentUser, onViewCredit }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotifications = async () => {
            setLoading(true);
            try {
                const data = await MockService.getNotifications(currentUser.id);
                // Sort by newest
                setNotifications(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
            } catch (err) {
                console.error("Error loading notifications:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchNotifications();
    }, [currentUser]);

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

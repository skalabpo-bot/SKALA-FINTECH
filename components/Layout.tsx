
import React, { useEffect, useState } from 'react';
import { User, Notification } from '../types';
import { MockService } from '../services/mockService';
import { LayoutDashboard, FileText, Users, LogOut, PlusCircle, Bell, Menu, X, Filter, Megaphone, Workflow, Settings, AlertCircle, CheckCircle2, Wallet, ArrowDownToLine } from 'lucide-react';

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface LayoutProps {
  children: React.ReactNode;
  currentUser: User;
  onLogout: () => void;
  currentView: string;
  onChangeView: (view: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentUser, onLogout, currentView, onChangeView }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingGestorsCount, setPendingGestorsCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [billeteraEnabled, setBilleteraEnabled] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      const id = Math.random().toString(36).substr(2, 9);
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  };

  useEffect(() => {
    const handleAlert = (e: any) => showToast(e.detail.message, e.detail.type);
    window.addEventListener('app-alert', handleAlert);

    const handleBilleteraChanged = (e: any) => setBilleteraEnabled(e.detail.enabled);
    window.addEventListener('billetera-changed', handleBilleteraChanged);

    const fetchCounts = async () => {
      try {
          const notifs: Notification[] = await MockService.getNotifications(currentUser.id);
          setUnreadCount(notifs.filter(n => !n.isRead).length);

          // Solo para administradores: contar gestores pendientes
          if (MockService.hasPermission(currentUser, 'MANAGE_USERS')) {
            const users = await MockService.getUsers();
            const pendingGestors = users.filter((u: any) => u.status === 'PENDING').length;
            setPendingGestorsCount(pendingGestors);
          }
      } catch (err) { console.error(err); }
    };

    // Cargar flag de billetera
    MockService.getBilleteraEnabled?.().then((v: boolean) => setBilleteraEnabled(v)).catch(() => {});

    // Ejecutar inmediatamente
    fetchCounts();

    // Luego cada 15 segundos
    let interval = setInterval(fetchCounts, 15000);

    // Actualizar badge inmediatamente cuando se marcan notificaciones
    const handleNotifUpdated = () => fetchCounts();
    window.addEventListener('notifications-updated', handleNotifUpdated);

    return () => {
        window.removeEventListener('app-alert', handleAlert);
        window.removeEventListener('billetera-changed', handleBilleteraChanged);
        window.removeEventListener('notifications-updated', handleNotifUpdated);
        clearInterval(interval);
    };
  }, [currentUser]);

  const NavItem = ({ view, icon: Icon, label, badge }: any) => (
    <button
      onClick={() => { onChangeView(view); setIsMobileMenuOpen(false); }}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group relative text-left
        ${currentView === view ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:bg-white hover:text-primary'}`}
    >
      <div className="flex items-center space-x-3 flex-1 overflow-hidden">
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="font-medium truncate">{label}</span>
      </div>
      {badge > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{badge}</span>}
    </button>
  );

  return (
    <div className="min-h-screen flex bg-slate-50">
      <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-3 pointer-events-none">
          {toasts.map(t => (
              <div key={t.id} className={`pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border animate-fade-in min-w-[300px] ${
                  t.type === 'error' ? 'bg-red-50 border-red-100 text-red-700' : 
                  t.type === 'success' ? 'bg-green-50 border-green-100 text-green-700' : 
                  'bg-white border-slate-100 text-slate-700'
              }`}>
                  {t.type === 'error' ? <AlertCircle size={20}/> : <CheckCircle2 size={20}/>}
                  <p className="text-sm font-bold">{t.message}</p>
                  <button onClick={() => setToasts(prev => prev.filter(toast => toast.id !== t.id))} className="ml-auto text-slate-400 hover:text-slate-600"><X size={14}/></button>
              </div>
          ))}
      </div>

      <aside className={`fixed inset-y-0 left-0 w-64 bg-slate-100 border-r z-30 flex flex-col transition-transform md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex justify-between items-center">
          <img src="https://skalafintech.co/wp-content/uploads/2023/10/Recurso-1@3x-1.png" alt="Skala" className="h-10 object-contain"/>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden"><X/></button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
          <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem view="notifications" icon={Bell} label="Notificaciones" badge={unreadCount} />
          {MockService.hasPermission(currentUser, 'CREATE_CREDIT') && <NavItem view="simulator" icon={PlusCircle} label="Nuevo Crédito" />}
          <NavItem view="credits" icon={FileText} label="Bandeja" />
          
          {MockService.hasPermission(currentUser, 'MANAGE_NEWS') && <NavItem view="news" icon={Megaphone} label="Novedades" />}
          {MockService.hasPermission(currentUser, 'MANAGE_AUTOMATIONS') && <NavItem view="automations" icon={Workflow} label="Automatizaciones" />}
          {MockService.hasPermission(currentUser, 'VIEW_REPORTS') && <NavItem view="reports" icon={Filter} label="Reportes" />}
          {billeteraEnabled && MockService.hasPermission(currentUser, 'REQUEST_WITHDRAWAL') && <NavItem view="wallet" icon={Wallet} label="Mi Billetera" />}
          {billeteraEnabled && MockService.hasPermission(currentUser, 'MANAGE_WITHDRAWALS') && <NavItem view="withdrawals" icon={ArrowDownToLine} label="Retiros" />}

          {MockService.hasPermission(currentUser, 'MANAGE_USERS') && <NavItem view="users" icon={Users} label="Usuarios" badge={pendingGestorsCount} />}
          {MockService.hasPermission(currentUser, 'CONFIGURE_SYSTEM') && <NavItem view="admin" icon={Settings} label="Administración" />}
        </nav>

        <div className="p-4 border-t space-y-2">
          <button onClick={() => onChangeView('profile')} className="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-white transition-colors text-left">
            <img src={currentUser.avatar} className="w-8 h-8 rounded-full border object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">{currentUser.name}</p>
              <p className="text-[10px] text-slate-500 uppercase">{currentUser.roleDisplayName || currentUser.role.replace(/_/g, ' ')}</p>
            </div>
          </button>
          <button onClick={onLogout} className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
            <LogOut size={16} /> <span>Salir</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 p-4 md:p-8 h-screen overflow-y-auto">
        <div className="md:hidden flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm">
           <button onClick={() => setIsMobileMenuOpen(true)}><Menu size={28} /></button>
           <img src="https://skalafintech.co/wp-content/uploads/2023/10/Recurso-1@3x-1.png" alt="Skala" className="h-8 object-contain"/>
        </div>
        {children}
      </main>
    </div>
  );
};

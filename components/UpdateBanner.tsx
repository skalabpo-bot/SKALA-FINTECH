import React, { useEffect, useState } from 'react';
import { Sparkles, RefreshCw, X } from 'lucide-react';
import { startVersionCheck } from '../services/versionCheck';

export const UpdateBanner: React.FC = () => {
  const [show, setShow] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handle = startVersionCheck(() => setShow(true));
    return () => handle.stop();
  }, []);

  const refresh = () => {
    setRefreshing(true);
    // Forzar bypass del cache del navegador en la recarga
    // (algunos navegadores soportan location.reload(true), pero ya no es estándar)
    try {
      // Limpiar caches de Service Worker si existen para asegurar bundle fresco
      if ('caches' in window) {
        caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
      }
    } catch (_) {}
    setTimeout(() => window.location.reload(), 200);
  };

  if (!show || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] animate-fade-in max-w-sm">
      <div className="bg-gradient-to-br from-primary to-orange-600 text-white rounded-2xl shadow-2xl shadow-orange-500/30 p-4 flex items-start gap-3 border border-orange-400">
        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
          <Sparkles size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm leading-tight">Nueva versión disponible</p>
          <p className="text-[11px] opacity-90 mt-0.5 leading-snug">Actualiza para obtener las últimas mejoras y correcciones.</p>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="mt-3 bg-white text-primary px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 hover:bg-orange-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Recargando...' : 'Actualizar ahora'}
          </button>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-white/70 hover:text-white p-1 -mt-1 -mr-1"
          title="Descartar (no recomendado)"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

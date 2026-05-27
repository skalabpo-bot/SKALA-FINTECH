import React, { useEffect, useState } from 'react';
import { MockService } from '../services/mockService';
import { User } from '../types';
import { Users } from 'lucide-react';

interface Props {
  currentUser: User;
  value: string;
  onChange: (gestorId: string) => void;
}

// Selector visible SOLO para supervisores: a nombre de qué asesor de su zona radica.
export const SupervisorGestorPicker: React.FC<Props> = ({ currentUser, value, onChange }) => {
  const [gestores, setGestores] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Admin: todos los gestores. Supervisor: solo los de su zona.
    const loader = currentUser.role === 'ADMIN'
      ? MockService.getAllGestores()
      : (currentUser.zoneId ? MockService.getGestoresByZone(currentUser.zoneId) : Promise.resolve([]));
    loader
      .then((g: any[]) => setGestores(g || []))
      .catch(() => setGestores([]))
      .finally(() => setLoading(false));
  }, [currentUser.zoneId, currentUser.role]);

  return (
    <div className="max-w-5xl mx-auto px-4 pt-6">
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 text-indigo-700 shrink-0">
          <Users size={18} />
          <span className="text-sm font-bold">Radicar a nombre de:</span>
        </div>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl border border-indigo-200 bg-white text-sm font-semibold text-slate-700 outline-none focus:border-indigo-400"
        >
          <option value="">— Selecciona el asesor de tu zona —</option>
          {gestores.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        {!loading && gestores.length === 0 && (
          <span className="text-[11px] text-amber-600 font-bold">No hay asesores activos en tu zona.</span>
        )}
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { StateBannersService, StateBanner, BannerType, BannerAudience } from '../services/stateBannersService';
import { MockService } from '../services/mockService';
import { Plus, Edit2, Trash2, Save, X, Bell, Loader2 } from 'lucide-react';

const TYPE_COLORS: Record<BannerType, string> = {
  info: 'bg-blue-100 text-blue-700 border-blue-200',
  warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  error: 'bg-red-100 text-red-700 border-red-200',
};

export const StateBannersAdmin: React.FC = () => {
  const [items, setItems] = useState<StateBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<StateBanner> | null>(null);
  const [states, setStates] = useState<any[]>([]);
  const [entities, setEntities] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const [banners, sts, ents] = await Promise.all([
        StateBannersService.list(),
        MockService.getStates(),
        MockService.getEntities(),
      ]);
      setItems(banners);
      setStates(sts || []);
      setEntities((ents || []).map((e: any) => e.name));
    } catch (e: any) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!editing?.state_id || !editing?.message?.trim()) {
      alert('Estado y mensaje son obligatorios');
      return;
    }
    try {
      await StateBannersService.upsert(editing);
      setEditing(null);
      await load();
    } catch (e: any) { alert('Error: ' + e.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este banner?')) return;
    try {
      await StateBannersService.delete(id);
      await load();
    } catch (e: any) { alert('Error: ' + e.message); }
  };

  const stateName = (id: string) => states.find(s => s.id === id || s.name === id)?.name || id;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Bell size={18} className="text-amber-500" />
          Banners por Estado
        </h3>
        <button
          onClick={() => setEditing({ state_id: '', message: '', banner_type: 'info', audience: 'gestor', is_active: true })}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600"
        >
          <Plus size={14} /> Nuevo Banner
        </button>
      </div>

      {loading ? (
        <div className="py-6 text-center"><Loader2 className="animate-spin mx-auto text-slate-300" /></div>
      ) : items.length === 0 ? (
        <p className="text-xs text-slate-400 italic text-center py-4">No hay banners configurados.</p>
      ) : (
        <div className="space-y-2">
          {items.map(it => (
            <div key={it.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded">{stateName(it.state_id)}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${TYPE_COLORS[it.banner_type]}`}>{it.banner_type.toUpperCase()}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-700 rounded">{it.audience.toUpperCase()}</span>
                  {it.entity_name && <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-100 text-orange-700 rounded">{it.entity_name}</span>}
                  {!it.is_active && <span className="text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded">INACTIVO</span>}
                </div>
                <p className="text-xs text-slate-700">{it.message}</p>
              </div>
              <button onClick={() => setEditing(it)} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500"><Edit2 size={14} /></button>
              <button onClick={() => handleDelete(it.id)} className="p-2 hover:bg-red-100 rounded-lg text-red-500"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">{editing.id ? 'Editar' : 'Nuevo'} Banner</h3>
              <button onClick={() => setEditing(null)}><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Estado del crédito</label>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={editing.state_id || ''} onChange={e => setEditing({ ...editing, state_id: e.target.value })}>
                  <option value="">-- Selecciona estado --</option>
                  {states.map((s: any) => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Entidad (opcional)</label>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={editing.entity_name || ''} onChange={e => setEditing({ ...editing, entity_name: e.target.value || null })}>
                  <option value="">Todas las entidades</option>
                  {entities.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Mensaje</label>
                <textarea className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" rows={3} value={editing.message || ''} onChange={e => setEditing({ ...editing, message: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={editing.banner_type || 'info'} onChange={e => setEditing({ ...editing, banner_type: e.target.value as BannerType })}>
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="success">Success</option>
                    <option value="error">Error</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Audiencia</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={editing.audience || 'gestor'} onChange={e => setEditing({ ...editing, audience: e.target.value as BannerAudience })}>
                    <option value="gestor">Gestor</option>
                    <option value="analista">Analista</option>
                    <option value="admin">Admin</option>
                    <option value="todos">Todos</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.is_active ?? true} onChange={e => setEditing({ ...editing, is_active: e.target.checked })} />
                Activo
              </label>
              <button onClick={handleSave} className="w-full bg-amber-500 text-white py-2.5 rounded-lg font-bold text-sm hover:bg-amber-600 flex items-center justify-center gap-2">
                <Save size={14} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

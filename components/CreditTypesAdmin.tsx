import React, { useEffect, useState } from 'react';
import { CreditTypesService, CreditType, RateCommission } from '../services/creditTypesService';
import { Plus, Trash2, Edit2, Save, X, CreditCard, Building2, Home, Car, Loader2, Percent } from 'lucide-react';

const ICONS = ['CreditCard', 'Building2', 'Home', 'Car'];
const COLORS = ['orange', 'blue', 'emerald', 'purple', 'pink'];

const ICON_MAP: Record<string, any> = { CreditCard, Building2, Home, Car };
const COLOR_MAP: Record<string, string> = {
  orange: 'bg-orange-500', blue: 'bg-blue-500', emerald: 'bg-emerald-500',
  purple: 'bg-purple-500', pink: 'bg-pink-500',
};

export const CreditTypesAdmin: React.FC = () => {
  const [items, setItems] = useState<CreditType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<CreditType> | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await CreditTypesService.listAll();
      setItems(data);
    } catch (e: any) {
      console.error(e);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!editing?.name?.trim()) return;
    try {
      await CreditTypesService.upsert(editing);
      setEditing(null);
      await load();
    } catch (e: any) { alert('Error: ' + e.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este tipo de crédito?')) return;
    try {
      await CreditTypesService.delete(id);
      await load();
    } catch (e: any) { alert('Error: ' + e.message); }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <CreditCard size={18} className="text-primary" />
          Tipos de Crédito
        </h3>
        <button
          onClick={() => setEditing({ name: '', icon: 'CreditCard', color: 'orange', active: true, available: false, order_index: items.length + 1, requires_entity: true })}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-orange-600"
        >
          <Plus size={14} /> Nuevo
        </button>
      </div>

      {loading ? (
        <div className="py-6 text-center"><Loader2 className="animate-spin mx-auto text-slate-300" /></div>
      ) : (
        <div className="space-y-2">
          {items.map(it => {
            const Icon = ICON_MAP[it.icon] || CreditCard;
            return (
              <div key={it.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                <div className={`w-10 h-10 ${COLOR_MAP[it.color] || 'bg-orange-500'} rounded-xl flex items-center justify-center`}>
                  <Icon size={18} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-slate-800 truncate">{it.name}</p>
                    {!it.active && <span className="text-[9px] px-2 py-0.5 bg-slate-200 text-slate-500 rounded font-bold">INACTIVO</span>}
                    {!it.available && <span className="text-[9px] px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded font-bold">PRÓXIMAMENTE</span>}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">{it.description || 'Sin descripción'}</p>
                </div>
                <button onClick={() => setEditing(it)} className="p-2 hover:bg-slate-200 rounded-lg text-slate-500"><Edit2 size={14} /></button>
                <button onClick={() => handleDelete(it.id)} className="p-2 hover:bg-red-100 rounded-lg text-red-500"><Trash2 size={14} /></button>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">{editing.id ? 'Editar' : 'Nuevo'} Tipo de Crédito</h3>
              <button onClick={() => setEditing(null)}><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Nombre</label>
                <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold" value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Descripción</label>
                <textarea className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" rows={2} value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Ícono</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={editing.icon || 'CreditCard'} onChange={e => setEditing({ ...editing, icon: e.target.value })}>
                    {ICONS.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Color</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={editing.color || 'orange'} onChange={e => setEditing({ ...editing, color: e.target.value })}>
                    {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={editing.active ?? true} onChange={e => setEditing({ ...editing, active: e.target.checked })} />
                  Activo
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={editing.available ?? false} onChange={e => setEditing({ ...editing, available: e.target.checked })} />
                  Disponible (no "Próximamente")
                </label>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.requires_entity ?? true}
                    onChange={e => setEditing({ ...editing, requires_entity: e.target.checked })}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-bold text-slate-700">Requiere entidad financiera</span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">Activo = el cliente escoge banco/pagaduría (libranza). Desactivado = va directo al formulario sin entidad (hipotecario, vehículo).</span>
                  </span>
                </label>
              </div>

              {editing.requires_entity === false && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-black text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Percent size={12} /> Comisiones por tasa
                    </label>
                    <button
                      type="button"
                      onClick={() => setEditing({
                        ...editing,
                        rate_commissions: [...(editing.rate_commissions || []), { rate: 0, commission: 0 }]
                      })}
                      className="text-[10px] font-bold px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
                    >
                      <Plus size={10} /> Añadir fila
                    </button>
                  </div>
                  <p className="text-[10px] text-blue-600 mb-2">Configura el % de comisión que aplica para cada tasa que pueda otorgar el aliado. Cuando se capture la tasa real del aliado, el sistema buscará en esta tabla.</p>
                  <div className="space-y-1.5">
                    {(editing.rate_commissions || []).length === 0 && (
                      <p className="text-[10px] text-blue-400 italic text-center py-2">Sin tasas configuradas. Añade al menos una.</p>
                    )}
                    {(editing.rate_commissions || []).map((rc: RateCommission, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 bg-white rounded-lg p-2 border border-blue-100">
                        <div className="flex-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Tasa %</label>
                          <input
                            type="number"
                            step="0.01"
                            value={rc.rate}
                            onChange={e => {
                              const list = [...(editing.rate_commissions || [])];
                              list[idx] = { ...list[idx], rate: Number(e.target.value) };
                              setEditing({ ...editing, rate_commissions: list });
                            }}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-mono"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Comisión %</label>
                          <input
                            type="number"
                            step="0.01"
                            value={rc.commission}
                            onChange={e => {
                              const list = [...(editing.rate_commissions || [])];
                              list[idx] = { ...list[idx], commission: Number(e.target.value) };
                              setEditing({ ...editing, rate_commissions: list });
                            }}
                            className="w-full px-2 py-1 border border-slate-200 rounded text-xs font-mono"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const list = [...(editing.rate_commissions || [])];
                            list.splice(idx, 1);
                            setEditing({ ...editing, rate_commissions: list });
                          }}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded mt-3"
                          title="Quitar fila"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={handleSave} className="w-full bg-primary text-white py-2.5 rounded-lg font-bold text-sm hover:bg-orange-600 flex items-center justify-center gap-2">
                <Save size={14} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

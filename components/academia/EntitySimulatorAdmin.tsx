import React, { useEffect, useState } from 'react';
import { MockService } from '../../services/mockService';
import { getAllEntities } from '../../simulador/services/entityService';
import { EntitySimulator } from '../../types';
import { Plus, Trash2, Pencil, FileSpreadsheet, Eye, EyeOff, Save, X, Loader2, Upload } from 'lucide-react';

/** Admin: gestiona los simuladores (Excel) por entidad (multi-versión). Sube .xlsx/.xlsm/.xlsb. */
export const EntitySimulatorAdmin: React.FC = () => {
  const [entities, setEntities] = useState<{ name: string }[]>([]);
  const [sims, setSims] = useState<EntitySimulator[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<(Partial<EntitySimulator> & { file?: File | null }) | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    setLoading(true);
    const [ents, list] = await Promise.all([getAllEntities().catch(() => []), MockService.getAllEntitySimulators()]);
    setEntities((ents || []).map((e: any) => ({ name: e.name })));
    setSims(list);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const startNew = () => setEditing({ entityName: entities[0]?.name || '', label: 'Vigente', sheetTab: '', isActive: true, orderIndex: 0, file: null });
  const startEdit = (s: EntitySimulator) => setEditing({ ...s, file: null });

  const save = async () => {
    if (!editing?.entityName) { setMsg('Selecciona la entidad'); return; }
    if (!editing.id && !editing.file) { setMsg('Sube el archivo Excel del simulador'); return; }
    setSaving(true); setMsg('');
    try {
      let filePath = editing.filePath, fileName = editing.fileName;
      if (editing.file) { const up = await MockService.uploadSimulatorFile(editing.file); filePath = up.path; fileName = up.name; }
      await MockService.saveEntitySimulator({
        id: editing.id, entityName: editing.entityName!, label: editing.label || 'Vigente',
        filePath, fileName, sheetTab: editing.sheetTab, isActive: editing.isActive !== false, orderIndex: editing.orderIndex ?? 0,
      });
      setEditing(null); await load();
    } catch (e: any) { setMsg(e.message || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const del = async (id: string) => { if (!confirm('¿Eliminar este simulador?')) return; await MockService.deleteEntitySimulator(id); await load(); };
  const toggleActive = async (s: EntitySimulator) => {
    await MockService.saveEntitySimulator({ id: s.id, entityName: s.entityName, label: s.label, sheetTab: s.sheetTab, isActive: !s.isActive, orderIndex: s.orderIndex });
    await load();
  };

  if (loading) return <div className="py-12 text-center text-slate-400"><Loader2 className="animate-spin mx-auto" size={28} /></div>;

  const byEntity: Record<string, EntitySimulator[]> = {};
  sims.forEach(s => { (byEntity[s.entityName] ||= []).push(s); });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Sube el <b>Excel</b> de cada simulador (.xlsx, .xlsm o .xlsb). Para cambiarlo por una versión nueva, edita y sube el archivo nuevo.</p>
        <button onClick={startNew} className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-orange-600 transition-all"><Plus size={15} /> Nuevo simulador</button>
      </div>

      {editing && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Entidad</label>
              <select value={editing.entityName} onChange={e => setEditing({ ...editing, entityName: e.target.value })} className="w-full px-3 py-2.5 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-primary">
                {entities.map(e => <option key={e.name} value={e.name}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Versión / etiqueta</label>
              <input value={editing.label || ''} onChange={e => setEditing({ ...editing, label: e.target.value })} placeholder="Vigente / Tasa especial…" className="w-full px-3 py-2.5 bg-white border-2 border-slate-100 rounded-xl text-sm font-semibold outline-none focus:border-primary" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Archivo Excel {editing.id && <span className="text-slate-300">(deja vacío para conservar el actual: {editing.fileName})</span>}</label>
            <label className="flex items-center gap-2 px-3 py-2.5 bg-white border-2 border-dashed border-slate-200 rounded-xl text-sm font-semibold text-slate-500 cursor-pointer hover:border-primary">
              <Upload size={16} /> {editing.file ? editing.file.name : 'Seleccionar .xlsx / .xlsm / .xlsb'}
              <input type="file" accept=".xlsx,.xlsm,.xlsb" className="hidden" onChange={e => setEditing({ ...editing, file: e.target.files?.[0] || null })} />
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Hoja a abrir (opcional)</label>
              <input value={editing.sheetTab || ''} onChange={e => setEditing({ ...editing, sheetTab: e.target.value })} placeholder="SimuladorV11 / Simulador / FORMULARIO ASESOR" className="w-full px-3 py-2.5 bg-white border-2 border-slate-100 rounded-xl text-sm font-semibold outline-none focus:border-primary" />
            </div>
            <label className="flex items-center gap-2 mt-6 cursor-pointer">
              <input type="checkbox" checked={editing.isActive !== false} onChange={e => setEditing({ ...editing, isActive: e.target.checked })} className="w-4 h-4 accent-primary" />
              <span className="text-sm font-bold text-slate-600">Activo (visible para asesores)</span>
            </label>
          </div>
          {msg && <p className="text-xs font-bold text-red-500">{msg}</p>}
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 disabled:opacity-50">{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar</button>
            <button onClick={() => { setEditing(null); setMsg(''); }} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-200"><X size={14} /> Cancelar</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {Object.keys(byEntity).length === 0 && <p className="text-center text-slate-400 italic py-8">Aún no hay simuladores. Agrega el primero.</p>}
        {Object.entries(byEntity).map(([ent, list]) => (
          <div key={ent} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <h4 className="font-display font-bold text-slate-800 mb-2">{ent}</h4>
            <div className="space-y-2">
              {list.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-2.5 bg-slate-50/60 rounded-xl border border-slate-100">
                  <FileSpreadsheet size={15} className="text-emerald-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-700 truncate">{s.label} {s.sheetTab ? <span className="text-[10px] text-slate-400">· hoja {s.sheetTab}</span> : null}</p>
                    <p className="text-[10px] text-slate-400 truncate">{s.fileName || '(sin archivo)'}</p>
                  </div>
                  <button onClick={() => toggleActive(s)} title={s.isActive ? 'Activo' : 'Inactivo'} className={`p-1.5 rounded-lg ${s.isActive ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-100'}`}>{s.isActive ? <Eye size={15} /> : <EyeOff size={15} />}</button>
                  <button onClick={() => startEdit(s)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"><Pencil size={15} /></button>
                  <button onClick={() => del(s.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-50"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { FieldLibraryService, FieldDefinition, FieldType } from '../services/fieldLibraryService';
import { Plus, Edit2, Trash2, Save, X, Library, Loader2 } from 'lucide-react';

const TYPES: FieldType[] = ['text', 'number', 'date', 'select', 'textarea', 'file'];

export const FieldLibraryAdmin: React.FC = () => {
  const [items, setItems] = useState<FieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<FieldDefinition> | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await FieldLibraryService.list();
      setItems(data);
    } catch (e: any) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!editing?.internal_name?.trim() || !editing?.label?.trim()) {
      alert('Nombre interno y etiqueta son obligatorios');
      return;
    }
    if (!TYPES.includes(editing.type as FieldType)) {
      alert('Tipo de campo inválido. Usa: ' + TYPES.join(', '));
      return;
    }
    if (editing.type === 'select' && (!editing.options || editing.options.length === 0)) {
      if (!confirm('Este campo tipo "select" no tiene opciones. ¿Continuar igual?')) return;
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(editing.internal_name || '')) {
      alert('El nombre interno debe empezar con letra y solo contener letras, números y guiones bajos');
      return;
    }
    try {
      await FieldLibraryService.upsert(editing);
      setEditing(null);
      await load();
    } catch (e: any) { alert('Error: ' + e.message); }
  };

  const handleDelete = async (id: string, isSystem: boolean) => {
    if (isSystem) { alert('No se pueden eliminar campos del sistema'); return; }
    if (!confirm('¿Eliminar este campo? Se quitará de todas las entidades que lo usan.')) return;
    try {
      await FieldLibraryService.delete(id);
      await load();
    } catch (e: any) { alert('Error: ' + e.message); }
  };

  // Agrupar por categoría
  const byCategory = items.reduce((acc, f) => {
    const cat = f.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(f);
    return acc;
  }, {} as Record<string, FieldDefinition[]>);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Library size={18} className="text-indigo-500" />
          Biblioteca de Campos
        </h3>
        <button
          onClick={() => setEditing({ internal_name: '', label: '', type: 'text', category: 'general', options: [], is_system: false })}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 text-white text-xs font-bold rounded-lg hover:bg-indigo-600"
        >
          <Plus size={14} /> Nuevo Campo
        </button>
      </div>

      {loading ? (
        <div className="py-6 text-center"><Loader2 className="animate-spin mx-auto text-slate-300" /></div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byCategory).map(([cat, list]) => (
            <div key={cat}>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{cat}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {list.map(f => (
                  <div key={f.id} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{f.label}</p>
                      <p className="text-[10px] text-slate-500 truncate">
                        <span className="font-mono">{f.internal_name}</span> · {f.type}
                        {f.is_system && <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-bold text-[8px]">SISTEMA</span>}
                      </p>
                    </div>
                    <button onClick={() => setEditing(f)} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500"><Edit2 size={12} /></button>
                    {!f.is_system && (
                      <button onClick={() => handleDelete(f.id, f.is_system)} className="p-1.5 hover:bg-red-100 rounded-lg text-red-500"><Trash2 size={12} /></button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800">{editing.id ? 'Editar' : 'Nuevo'} Campo</h3>
              <button onClick={() => setEditing(null)}><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Nombre interno (no se edita después)</label>
                  <input type="text" disabled={editing.is_system} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono disabled:bg-slate-100" value={editing.internal_name || ''} onChange={e => setEditing({ ...editing, internal_name: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })} placeholder="ej: numeroHijos" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Etiqueta visible</label>
                  <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={editing.label || ''} onChange={e => setEditing({ ...editing, label: e.target.value })} placeholder="ej: Número de Hijos" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={editing.type || 'text'} onChange={e => setEditing({ ...editing, type: e.target.value as FieldType })}>
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Categoría / Sección</label>
                  <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={editing.category || 'general'} onChange={e => setEditing({ ...editing, category: e.target.value })} placeholder="DATOS PERSONALES, LABORAL..." />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Placeholder (opcional)</label>
                <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={editing.placeholder || ''} onChange={e => setEditing({ ...editing, placeholder: e.target.value })} />
              </div>
              {editing.type === 'select' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Opciones (una por línea)</label>
                    <span className="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded font-bold">{(editing.options || []).length} opciones</span>
                  </div>
                  <textarea
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
                    rows={8}
                    value={(editing.options || []).join('\n')}
                    onChange={e => setEditing({ ...editing, options: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
                    placeholder="Opción 1&#10;Opción 2&#10;Opción 3"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Pega muchas opciones de una vez. Una línea = una opción. Las líneas vacías se ignoran.</p>
                </div>
              )}
              <button onClick={handleSave} className="w-full bg-indigo-500 text-white py-2.5 rounded-lg font-bold text-sm hover:bg-indigo-600 flex items-center justify-center gap-2">
                <Save size={14} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { FieldLibraryService, FieldDefinition, EntityFormField } from '../services/fieldLibraryService';
import { Loader2, Save, ListChecks } from 'lucide-react';

interface Props {
  entityId: string;
  entityName: string;
}

export const EntityFieldsAssignment: React.FC<Props> = ({ entityId, entityName }) => {
  const [library, setLibrary] = useState<FieldDefinition[]>([]);
  const [assigned, setAssigned] = useState<EntityFormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Map fieldId -> { selected, required }
  const [selection, setSelection] = useState<Record<string, { selected: boolean; required: boolean }>>({});

  const load = async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const [lib, ent] = await Promise.all([
        FieldLibraryService.list(),
        FieldLibraryService.getEntityFields(entityId),
      ]);
      setLibrary(lib);
      setAssigned(ent);
      const map: Record<string, { selected: boolean; required: boolean }> = {};
      ent.forEach(f => { map[f.field_id] = { selected: true, required: f.required }; });
      setSelection(map);
    } catch (e: any) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [entityId]);

  const toggleField = (id: string) => {
    setSelection(prev => ({
      ...prev,
      [id]: { selected: !prev[id]?.selected, required: prev[id]?.required || false },
    }));
  };

  const toggleRequired = (id: string) => {
    setSelection(prev => ({
      ...prev,
      [id]: { selected: prev[id]?.selected || true, required: !prev[id]?.required },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const allFieldIds = library.map(l => l.id);
      let order = 0;
      for (const fieldId of allFieldIds) {
        const s = selection[fieldId];
        if (s?.selected) {
          await FieldLibraryService.setEntityField(entityId, fieldId, s.required, order++);
        } else {
          // Si estaba asignado y se desmarcó, eliminarlo
          if (assigned.find(a => a.field_id === fieldId)) {
            await FieldLibraryService.removeEntityField(entityId, fieldId);
          }
        }
      }
      await load();
      window.dispatchEvent(new CustomEvent('app-alert', { detail: { message: '✓ Campos guardados', type: 'success' } }));
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally { setSaving(false); }
  };

  const byCategory = library.reduce((acc, f) => {
    const cat = f.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(f);
    return acc;
  }, {} as Record<string, FieldDefinition[]>);

  const totalSelected = Object.values(selection).filter(s => s.selected).length;
  const totalRequired = Object.values(selection).filter(s => s.selected && s.required).length;

  return (
    <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-indigo-900 font-bold flex items-center gap-2">
          <ListChecks size={18} /> Campos del Formulario
        </h4>
        <div className="flex gap-2">
          <span className="text-[10px] px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full font-bold">
            {totalSelected} seleccionados
          </span>
          <span className="text-[10px] px-2 py-1 bg-red-100 text-red-700 rounded-full font-bold">
            {totalRequired} obligatorios
          </span>
        </div>
      </div>
      <p className="text-[10px] text-indigo-600 mb-4">Selecciona qué campos pide esta entidad. Marca como obligatorios los que el cliente debe completar antes de radicar.</p>

      {loading ? (
        <div className="py-6 text-center"><Loader2 className="animate-spin mx-auto text-indigo-300" /></div>
      ) : (
        <>
          {/* Acciones masivas */}
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => {
                const next: typeof selection = {};
                library.forEach(f => { next[f.id] = { selected: true, required: false }; });
                setSelection(next);
              }}
              className="text-[10px] px-2 py-1 bg-white border border-indigo-200 rounded font-bold text-indigo-700 hover:bg-indigo-100"
            >Seleccionar todos</button>
            <button
              type="button"
              onClick={() => setSelection({})}
              className="text-[10px] px-2 py-1 bg-white border border-slate-200 rounded font-bold text-slate-500 hover:bg-slate-100"
            >Limpiar</button>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {Object.entries(byCategory).map(([cat, list]) => (
              <div key={cat}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{cat}</p>
                  <button
                    type="button"
                    onClick={() => {
                      const allSel = list.every(f => selection[f.id]?.selected);
                      const next = { ...selection };
                      list.forEach(f => {
                        next[f.id] = allSel ? { selected: false, required: false } : { selected: true, required: next[f.id]?.required || false };
                      });
                      setSelection(next);
                    }}
                    className="text-[9px] px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded font-bold hover:bg-indigo-200"
                  >Toggle todos en {cat}</button>
                </div>
                <div className="space-y-1">
                  {list.map(f => {
                    const sel = selection[f.id];
                    return (
                      <div key={f.id} className="flex items-center gap-2 p-2 bg-white rounded-lg">
                        <input
                          type="checkbox"
                          checked={sel?.selected || false}
                          onChange={() => toggleField(f.id)}
                          className="w-4 h-4 accent-indigo-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{f.label}</p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">{f.internal_name} · {f.type}</p>
                        </div>
                        {sel?.selected && (
                          <label className="flex items-center gap-1 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={sel.required}
                              onChange={() => toggleRequired(f.id)}
                              className="w-3 h-3 accent-red-500"
                            />
                            <span className={`text-[10px] font-bold ${sel.required ? 'text-red-600' : 'text-slate-400'}`}>
                              {sel.required ? 'OBLIGATORIO' : 'opcional'}
                            </span>
                          </label>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={handleSave}
            disabled={saving || totalSelected === 0}
            className="w-full mt-4 bg-indigo-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving
              ? 'Guardando...'
              : totalSelected === 0
                ? 'Selecciona al menos un campo'
                : `Guardar ${totalSelected} campo(s) para ${entityName}`}
          </button>
        </>
      )}
    </div>
  );
};

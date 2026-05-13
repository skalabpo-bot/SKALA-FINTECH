import React, { useEffect, useMemo, useState } from 'react';
import { FieldLibraryService, EntityFormField, FieldCondition } from '../services/fieldLibraryService';
import { Loader2 } from 'lucide-react';

interface Props {
  entityId: string;
  initialData?: Record<string, any>;
  cities?: string[];
  onChange?: (data: Record<string, any>) => void;
}

const evalCondition = (condition: FieldCondition | null | undefined, data: Record<string, any>): boolean => {
  if (!condition || !condition.field) return true;
  const v = data[condition.field];
  if (condition.equals !== undefined) return v === condition.equals;
  if (condition.not_equals !== undefined) return v !== condition.not_equals;
  if (Array.isArray(condition.in)) return condition.in.includes(v);
  return true;
};

export const DynamicEntityForm: React.FC<Props> = ({ entityId, initialData, cities = [], onChange }) => {
  const [fields, setFields] = useState<EntityFormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Record<string, any>>(initialData || {});

  useEffect(() => {
    if (!entityId) { setFields([]); setLoading(false); return; }
    FieldLibraryService.getEntityFields(entityId)
      .then(f => setFields(f))
      .catch(() => setFields([]))
      .finally(() => setLoading(false));
  }, [entityId]);

  useEffect(() => { setData(initialData || {}); }, [initialData]);

  const updateField = (name: string, value: any) => {
    const next = { ...data, [name]: value };
    setData(next);
    onChange?.(next);
  };

  // Filtrar campos visibles según condiciones (re-evalúa al cambiar data)
  const visibleFields = useMemo(
    () => fields.filter(ef => evalCondition(ef.condition, data)),
    [fields, data]
  );

  if (loading) return <div className="py-6 text-center"><Loader2 className="animate-spin text-slate-300 mx-auto" /></div>;
  if (fields.length === 0) return <p className="text-xs text-slate-400 italic">Esta entidad no tiene campos configurados.</p>;

  // Agrupar por category, preservando el orden de order_index
  const groupedOrdered = visibleFields.reduce((acc, ef) => {
    const cat = ef.field?.category || 'GENERAL';
    if (!acc.map[cat]) {
      acc.map[cat] = [];
      acc.order.push(cat);
    }
    acc.map[cat].push(ef);
    return acc;
  }, { map: {} as Record<string, EntityFormField[]>, order: [] as string[] });

  return (
    <div className="space-y-6">
      {groupedOrdered.order.map(cat => {
        const list = groupedOrdered.map[cat];
        return (
          <div key={cat}>
            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-3">{cat.replace(/_/g, ' ')}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {list.map(ef => {
                const f = ef.field!;
                const value = data[f.internal_name] ?? '';
                const required = ef.required;
                const baseClass = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white";
                return (
                  <div key={ef.id}>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      {f.label} {required && <span className="text-red-500">*</span>}
                    </label>
                    {f.type === 'text' && (
                      <input type="text" required={required} className={baseClass} placeholder={f.placeholder || ''} value={value} onChange={e => updateField(f.internal_name, e.target.value)} />
                    )}
                    {f.type === 'number' && (
                      <input type="number" required={required} className={baseClass} placeholder={f.placeholder || ''} value={value} onChange={e => updateField(f.internal_name, e.target.value)} />
                    )}
                    {f.type === 'date' && (
                      <input type="date" required={required} className={baseClass} value={value} onChange={e => updateField(f.internal_name, e.target.value)} />
                    )}
                    {f.type === 'textarea' && (
                      <textarea required={required} className={baseClass} rows={3} placeholder={f.placeholder || ''} value={value} onChange={e => updateField(f.internal_name, e.target.value)} />
                    )}
                    {f.type === 'select' && (
                      <select required={required} className={baseClass} value={value} onChange={e => updateField(f.internal_name, e.target.value)}>
                        <option value="">-- Selecciona --</option>
                        {(f.internal_name.includes('iudad') ? cities : f.options || []).map((opt: string) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}
                    {f.type === 'file' && (
                      <input type="file" required={required} className={baseClass} onChange={e => updateField(f.internal_name, e.target.files?.[0])} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

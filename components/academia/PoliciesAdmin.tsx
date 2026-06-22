import React, { useEffect, useState } from 'react';
import { MockService } from '../../services/mockService';
import { getAllEntities } from '../../simulador/services/entityService';
import { FileText, Upload, Save, Loader2, X, Trash2 } from 'lucide-react';

/** Admin: edita las políticas (texto + PDFs) de cada entidad. */
export const PoliciesAdmin: React.FC = () => {
  const [entities, setEntities] = useState<string[]>([]);
  const [entity, setEntity] = useState('');
  const [text, setText] = useState('');
  const [files, setFiles] = useState<{ name: string; url: string }[]>([]); // existentes
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { getAllEntities().then((e: any[]) => { const names = (e || []).map(x => x.name); setEntities(names); if (names[0]) setEntity(names[0]); }).catch(() => {}).finally(() => setLoading(false)); }, []);

  useEffect(() => {
    if (!entity) return;
    setMsg(''); setNewFiles([]);
    MockService.getEntityPolicy(entity).then((p: any) => {
      setText(p?.policy_text || '');
      let f: any[] = []; try { f = p?.file_url ? JSON.parse(p.file_url) : []; } catch {}
      setFiles(f);
    });
  }, [entity]);

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      await MockService.saveEntityPolicy(entity, text, newFiles, files);
      setNewFiles([]); setMsg('✓ Guardado');
      const p: any = await MockService.getEntityPolicy(entity);
      let f: any[] = []; try { f = p?.file_url ? JSON.parse(p.file_url) : []; } catch {}
      setFiles(f);
    } catch (e: any) { setMsg(e.message || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="py-8 text-center text-slate-400"><Loader2 className="animate-spin mx-auto" size={24} /></div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">Define las <b>políticas</b> de cada entidad (texto + PDFs). El asesor las verá en el simulador de esa entidad.</p>
      <div>
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Entidad</label>
        <select value={entity} onChange={e => setEntity(e.target.value)} className="w-full md:w-80 px-3 py-2.5 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-primary">
          {entities.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>
      <div>
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Políticas / requisitos (texto)</label>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={6} placeholder="Ej. Edad máxima 84 años, antigüedad mínima…" className="w-full px-3 py-2.5 bg-white border-2 border-slate-100 rounded-xl text-sm outline-none focus:border-primary resize-y" />
      </div>
      <div>
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Documentos PDF</label>
        <div className="space-y-2 mb-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm">
              <FileText size={15} className="text-red-500 shrink-0" />
              <a href={f.url} target="_blank" rel="noreferrer" className="flex-1 truncate font-semibold text-slate-700 hover:text-primary">{f.name}</a>
              <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
            </div>
          ))}
          {newFiles.map((f, i) => (
            <div key={'n' + i} className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl text-sm">
              <Upload size={15} className="text-blue-500 shrink-0" />
              <span className="flex-1 truncate font-semibold text-slate-700">{f.name} <span className="text-[10px] text-blue-500">(nuevo)</span></span>
              <button onClick={() => setNewFiles(newFiles.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-500"><X size={14} /></button>
            </div>
          ))}
        </div>
        <label className="inline-flex items-center gap-2 px-3 py-2 bg-white border-2 border-dashed border-slate-200 rounded-xl text-sm font-semibold text-slate-500 cursor-pointer hover:border-primary">
          <Upload size={15} /> Agregar PDF
          <input type="file" accept=".pdf" multiple className="hidden" onChange={e => { if (e.target.files) setNewFiles([...newFiles, ...Array.from(e.target.files)]); }} />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 disabled:opacity-50">{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar políticas</button>
        {msg && <span className={`text-xs font-bold ${msg.startsWith('✓') ? 'text-emerald-600' : 'text-red-500'}`}>{msg}</span>}
      </div>
    </div>
  );
};

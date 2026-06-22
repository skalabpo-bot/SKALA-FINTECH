import React, { useEffect, useState } from 'react';
import { MockService } from '../../services/mockService';
import { FileText, ChevronDown, ChevronRight, ScrollText } from 'lucide-react';

/** Muestra (solo lectura) las políticas de una entidad: texto + PDFs descargables. */
export const EntityPoliciesPanel: React.FC<{ entityName: string }> = ({ entityName }) => {
  const [policy, setPolicy] = useState<{ policy_text?: string; files: { name: string; url: string }[] } | null>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // intenta nombre exacto y, si no, sin espacios (ej. "COLTEFINANCIERA ")
      let p = await MockService.getEntityPolicy(entityName);
      if (!p && entityName.trim() !== entityName) p = await MockService.getEntityPolicy(entityName.trim());
      if (cancelled) return;
      if (!p) { setPolicy(null); return; }
      let files: { name: string; url: string }[] = [];
      try { files = p.file_url ? JSON.parse(p.file_url) : []; } catch { files = []; }
      setPolicy({ policy_text: p.policy_text, files });
    };
    load();
    return () => { cancelled = true; };
  }, [entityName]);

  if (!policy || (!policy.policy_text?.trim() && policy.files.length === 0)) {
    return (
      <div className="bg-slate-50/60 border border-slate-100 rounded-2xl p-4 text-sm text-slate-400 italic flex items-center gap-2">
        <ScrollText size={16} /> Esta entidad aún no tiene políticas cargadas.
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
        <span className="flex items-center gap-2 font-display font-bold text-slate-800 text-sm"><ScrollText size={18} className="text-indigo-500" /> Políticas de la entidad</span>
        {open ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
          {policy.policy_text?.trim() && (
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{policy.policy_text}</p>
          )}
          {policy.files.length > 0 && (
            <div className="space-y-2">
              {policy.files.map((f, i) => (
                <a key={i} href={f.url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl text-sm font-semibold text-slate-700 transition-colors">
                  <FileText size={16} className="text-red-500 shrink-0" /> {f.name}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

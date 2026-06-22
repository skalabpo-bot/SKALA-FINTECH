import React, { useEffect, useState } from 'react';
import { GraduationCap, Loader2, Settings2, BookOpen } from 'lucide-react';
import { MockService } from '../../services/mockService';
import { EntitySimulator } from '../../types';
import { OnlyOfficeViewer } from './OnlyOfficeViewer';
import { EntitySimulatorAdmin } from './EntitySimulatorAdmin';
import { EntityPoliciesPanel } from './EntityPoliciesPanel';
import { PoliciesAdmin } from './PoliciesAdmin';

/**
 * Academia: por entidad, el asesor usa el simulador real (calculado online con Google
 * Sheets) y puede descargarlo. El admin gestiona los links. Todos ven; solo admin gestiona.
 */
export const AcademiaView: React.FC<{ currentUser?: any }> = ({ currentUser }) => {
  const canManage = MockService.hasPermission(currentUser, 'MANAGE_ACADEMIA');
  const [tab, setTab] = useState<'sim' | 'admin'>('sim');
  const [adminTab, setAdminTab] = useState<'sims' | 'policies'>('sims');
  const [sims, setSims] = useState<EntitySimulator[]>([]);
  const [loading, setLoading] = useState(true);
  const [entity, setEntity] = useState<string>('');
  const [simId, setSimId] = useState<string>('');

  const load = async () => {
    setLoading(true);
    const all = await MockService.getAllEntitySimulators();
    const active = all.filter((s: EntitySimulator) => s.isActive);
    setSims(active);
    if (active.length) {
      const firstEntity = active[0].entityName;
      setEntity(e => e || firstEntity);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const entities = Array.from(new Set(sims.map(s => s.entityName)));
  const versions = sims.filter(s => s.entityName === entity);
  const selected = versions.find(s => s.id === simId) || versions[0];

  useEffect(() => { if (versions.length && !versions.find(s => s.id === simId)) setSimId(versions[0].id); /* eslint-disable-next-line */ }, [entity, sims]);

  return (
    <div className="space-y-6 animate-fade-in pb-16 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 rounded-2xl"><GraduationCap className="text-indigo-600" size={28} /></div>
          <div>
            <h1 className="text-2xl font-display font-black text-slate-800">Academia</h1>
            <p className="text-sm text-slate-500">Simuladores oficiales de cada entidad, calculados en línea.</p>
          </div>
        </div>
        {canManage && (
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            <button onClick={() => setTab('sim')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${tab === 'sim' ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}><BookOpen size={14} /> Simuladores</button>
            <button onClick={() => setTab('admin')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${tab === 'admin' ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}><Settings2 size={14} /> Administrar</button>
          </div>
        )}
      </div>

      {tab === 'admin' && canManage ? (
        <div className="space-y-4">
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1 w-fit">
            <button onClick={() => setAdminTab('sims')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${adminTab === 'sims' ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}>Simuladores</button>
            <button onClick={() => setAdminTab('policies')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${adminTab === 'policies' ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}>Políticas</button>
          </div>
          {adminTab === 'sims' ? <EntitySimulatorAdmin /> : <PoliciesAdmin />}
        </div>
      ) : loading ? (
        <div className="py-20 text-center text-slate-400"><Loader2 className="animate-spin mx-auto" size={32} /></div>
      ) : sims.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center text-slate-400">
          <GraduationCap size={40} className="mx-auto mb-3 opacity-40" />
          <p className="font-bold">Aún no hay simuladores configurados.</p>
          {canManage && <p className="text-sm mt-1">Ve a <b>Administrar</b> para agregar el link del Google Sheet de cada entidad.</p>}
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-4">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div className="flex gap-3 flex-wrap">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Entidad</label>
                <select value={entity} onChange={e => setEntity(e.target.value)}
                  className="px-3 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-primary">
                  {entities.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              {versions.length > 1 && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Versión</label>
                  <select value={selected?.id} onChange={e => setSimId(e.target.value)}
                    className="px-3 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-primary">
                    {versions.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>

          {entity && <EntityPoliciesPanel entityName={entity} />}

          {selected?.filePath ? (
            <OnlyOfficeViewer key={selected.id} filePath={selected.filePath} fileName={selected.fileName} userName={currentUser?.name} />
          ) : (
            <p className="text-sm text-slate-400 italic py-8 text-center">Este simulador aún no tiene archivo. Súbelo en Administrar.</p>
          )}
        </div>
      )}
    </div>
  );
};

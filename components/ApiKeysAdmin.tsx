import React, { useEffect, useState } from 'react';
import { MockService } from '../services/mockService';
import { Key, Plus, RefreshCw, Loader2, Copy, Check, Ban, Eye, Trash2, ShieldCheck, X } from 'lucide-react';

interface ApiKey {
  id: string; name: string; entity_scope: string[] | null; key_prefix: string;
  scopes: string[]; active: boolean; expires_at: string | null; webhook_url: string | null;
  created_at: string; last_used_at: string | null;
}

const fmtDate = (s: string | null) => s ? new Date(s).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const isExpired = (k: ApiKey) => !!k.expires_at && new Date(k.expires_at) < new Date();

const CopyBtn: React.FC<{ text: string; label?: string }> = ({ text, label }) => {
  const [done, setDone] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-900">
      {done ? <Check size={14} /> : <Copy size={14} />} {done ? 'Copiado' : (label || 'Copiar')}
    </button>
  );
};

export const ApiKeysAdmin: React.FC = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [entities, setEntities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  // Form crear
  const [entity, setEntity] = useState('');
  const [expiraDias, setExpiraDias] = useState('365');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [creating, setCreating] = useState(false);

  // Modal de secreto (token / webhook_secret) — se muestra una sola vez
  const [reveal, setReveal] = useState<{ title: string; token?: string; webhook_secret?: string; entity?: string } | null>(null);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [k, e] = await Promise.all([MockService.listApiKeys(), MockService.getEntities()]);
      setKeys(k.keys || []);
      setEntities([...new Set((e || []).map((x: any) => String(x.name || '').trim()).filter(Boolean))].sort());
    } catch (err: any) {
      setError(err?.message || 'No se pudo cargar. ¿Tienes rol ADMIN?');
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const crear = async () => {
    if (!entity) { setError('Elige una entidad.'); return; }
    setCreating(true); setError('');
    try {
      const r = await MockService.createApiKey(entity, {
        expiresInDays: Number(expiraDias) || undefined,
        webhookUrl: webhookUrl.trim() || undefined,
      });
      setReveal({ title: `Llave creada para ${entity}`, token: r.token, webhook_secret: r.webhook_secret, entity });
      setWebhookUrl('');
      await load();
    } catch (err: any) { setError(err?.message || 'No se pudo crear.'); }
    finally { setCreating(false); }
  };

  const rotar = async (k: ApiKey) => {
    if (!confirm(`¿Rotar la llave de ${k.entity_scope?.[0] || k.name}? El token anterior dejará de funcionar.`)) return;
    setBusy(k.id);
    try { const r = await MockService.rotateApiKey(k.id); setReveal({ title: `Nuevo token para ${k.entity_scope?.[0] || k.name}`, token: r.token, entity: k.entity_scope?.[0] }); await load(); }
    catch (err: any) { setError(err?.message); } finally { setBusy(null); }
  };
  const toggle = async (k: ApiKey) => {
    setBusy(k.id);
    try { k.active ? await MockService.revokeApiKey(k.id) : await MockService.enableApiKey(k.id); await load(); }
    catch (err: any) { setError(err?.message); } finally { setBusy(null); }
  };
  const verWebhookSecret = async (k: ApiKey) => {
    setBusy(k.id);
    try { const r = await MockService.revealWebhookSecret(k.id); setReveal({ title: `webhook_secret de ${k.entity_scope?.[0] || k.name}`, webhook_secret: r.webhook_secret || '(no tiene)' }); }
    catch (err: any) { setError(err?.message); } finally { setBusy(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-500">Cada llave da acceso a la API a <b>una entidad/alianza</b>: crear, consultar y actualizar <b>solo</b> los créditos de esa entidad. El token se muestra <b>una sola vez</b>.</p>
        <button onClick={load} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900"><RefreshCw size={14} /> Refrescar</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-xl p-3">{error}</div>}

      {/* Crear */}
      <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-5">
        <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2"><Plus size={14} /> Crear llave para una entidad</h4>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Entidad</label>
            <select value={entity} onChange={e => setEntity(e.target.value)} className="w-full px-3 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-primary">
              <option value="">-- elegir entidad --</option>
              {entities.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Expira (días)</label>
            <input value={expiraDias} onChange={e => setExpiraDias(e.target.value.replace(/\D/g, ''))} placeholder="365 (vacío = nunca)" className="w-full px-3 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-primary" />
          </div>
          <button onClick={crear} disabled={creating} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-orange-600 disabled:opacity-50">
            {creating ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />} Generar
          </button>
        </div>
        <div className="mt-3">
          <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">URL de webhook (opcional — para avisos push firmados)</label>
          <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://… (déjalo vacío si el aliado usará polling)" className="w-full px-3 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm outline-none focus:border-primary" />
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm py-6"><Loader2 className="animate-spin" size={18} /> Cargando llaves…</div>
      ) : keys.length === 0 ? (
        <p className="text-sm text-slate-400 py-4">Aún no hay llaves. Crea una arriba.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-[10px] font-black text-slate-400 uppercase tracking-wider text-left border-b border-slate-100">
              <th className="py-2 pr-3">Entidad / Alianza</th><th className="py-2 pr-3">Prefijo</th><th className="py-2 pr-3">Permisos</th><th className="py-2 pr-3">Estado</th><th className="py-2 pr-3">Expira</th><th className="py-2 pr-3">Último uso</th><th className="py-2">Acciones</th>
            </tr></thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id} className="border-b border-slate-50">
                  <td className="py-3 pr-3 font-bold text-slate-800">{k.entity_scope?.[0] || <span className="text-slate-400">— sin entidad —</span>}<div className="text-[11px] font-normal text-slate-400">{k.name}</div></td>
                  <td className="py-3 pr-3 font-mono text-xs text-slate-600">{k.key_prefix}…</td>
                  <td className="py-3 pr-3 text-[11px] text-slate-500">{(k.scopes || []).map(s => s.replace('credits:', '')).join(' · ')}</td>
                  <td className="py-3 pr-3">
                    {!k.active ? <span className="text-xs font-bold text-slate-400">Revocada</span>
                      : isExpired(k) ? <span className="text-xs font-bold text-amber-600">Expirada</span>
                      : <span className="text-xs font-bold text-green-600 flex items-center gap-1"><ShieldCheck size={13} /> Activa</span>}
                  </td>
                  <td className="py-3 pr-3 text-xs text-slate-500">{fmtDate(k.expires_at)}</td>
                  <td className="py-3 pr-3 text-xs text-slate-400">{fmtDate(k.last_used_at)}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => rotar(k)} disabled={busy === k.id} title="Rotar token" className="p-1.5 text-slate-500 hover:text-primary rounded-lg hover:bg-slate-100"><RefreshCw size={15} /></button>
                      <button onClick={() => verWebhookSecret(k)} disabled={busy === k.id} title="Ver webhook_secret" className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100"><Eye size={15} /></button>
                      <button onClick={() => toggle(k)} disabled={busy === k.id} title={k.active ? 'Revocar' : 'Reactivar'} className={`p-1.5 rounded-lg hover:bg-slate-100 ${k.active ? 'text-slate-500 hover:text-red-600' : 'text-green-600'}`}>{busy === k.id ? <Loader2 size={15} className="animate-spin" /> : <Ban size={15} />}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal secreto (una sola vez) */}
      {reveal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setReveal(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><Key size={20} className="text-primary" /> {reveal.title}</h3>
              <button onClick={() => setReveal(null)} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
            </div>
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-lg p-3">⚠️ Cópialo ahora. El <b>token</b> no se vuelve a mostrar (solo se guarda su hash). Entrégaselo al aliado de forma segura.</div>
            {reveal.token && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Token API (x-api-key)</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-slate-900 text-green-300 text-xs rounded-lg p-3 break-all font-mono">{reveal.token}</code>
                  <CopyBtn text={reveal.token} />
                </div>
              </div>
            )}
            {reveal.webhook_secret && (
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">webhook_secret (para verificar webhooks — solo si usan push)</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-slate-100 text-slate-700 text-xs rounded-lg p-3 break-all font-mono">{reveal.webhook_secret}</code>
                  <CopyBtn text={reveal.webhook_secret} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { MockService } from '../../services/mockService';
import { getAllEntities } from '../../simulador/services/entityService';
import { EntityCalcConfig, EntityCalcProduct } from '../../types';
import { Save, Loader2, Plus, Trash2, Beaker, Calculator } from 'lucide-react';

/**
 * Admin: configura el MOTOR DE CÁLCULO (Excel real) de cada entidad.
 * Define qué celdas llena Skala (cuota, plazo, fecha nacimiento…), cuáles lee
 * (monto, desembolso) y los productos (cada tasa = comisión). Si una entidad
 * tiene esto activo, la radicación usa el Excel real en vez de los factores.
 */
const emptyProduct = (): EntityCalcProduct => ({ nombre: '', rate: 0, comision: 0, discountPct: 0, cellValues: {} });

const emptyCfg = (entityName: string): EntityCalcConfig => ({
  entityName,
  googleSheetId: '',
  sheetTab: '',
  inputCells: { cuota: '', plazo: '', fechaNacimiento: '', pagaduria: '', tipo: '' },
  outputCells: { monto: '', desembolso: '' },
  products: [emptyProduct()],
  commissionByRate: {},
  isActive: true,
});

const extractSheetId = (raw: string): string => {
  const m = /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/.exec(raw || '');
  return m ? m[1] : (raw || '').trim();
};

const lbl = 'text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block';
const inp = 'w-full px-3 py-2 bg-white border-2 border-slate-100 rounded-lg text-sm font-semibold outline-none focus:border-primary';

export const CalcConfigAdmin: React.FC = () => {
  const [entities, setEntities] = useState<string[]>([]);
  const [entity, setEntity] = useState('');
  const [cfg, setCfg] = useState<EntityCalcConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Prueba de cálculo
  const [testCuota, setTestCuota] = useState(800000);
  const [testPlazo, setTestPlazo] = useState(144);
  const [testFecha, setTestFecha] = useState('1975-05-10');
  const [testProduct, setTestProduct] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string>('');

  // Tabla tasa→comisión (editada como filas; se convierte a objeto al guardar)
  const [commRows, setCommRows] = useState<{ tasa: string; comision: string }[]>([]);

  useEffect(() => {
    getAllEntities()
      .then((e: any[]) => { const names = (e || []).map(x => x.name); setEntities(names); if (names[0]) setEntity(names[0]); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!entity) return;
    setMsg(''); setTestResult('');
    MockService.getEntityCalcConfig(entity).then((c: EntityCalcConfig | null) => {
      const cc = c || emptyCfg(entity);
      setCfg(cc);
      setTestProduct(cc?.products?.[0]?.nombre || '');
      setCommRows(Object.entries(cc.commissionByRate || {}).map(([t, v]) => ({ tasa: String(t), comision: String(v) })));
    });
  }, [entity]);

  const patch = (p: Partial<EntityCalcConfig>) => setCfg(prev => prev ? { ...prev, ...p } : prev);
  const patchInput = (k: string, v: string) => setCfg(prev => prev ? { ...prev, inputCells: { ...prev.inputCells, [k]: v } } : prev);
  const patchOutput = (k: string, v: string) => setCfg(prev => prev ? { ...prev, outputCells: { ...prev.outputCells, [k]: v } } : prev);

  const patchProduct = (i: number, p: Partial<EntityCalcProduct>) =>
    setCfg(prev => prev ? { ...prev, products: prev.products.map((pr, j) => j === i ? { ...pr, ...p } : pr) } : prev);
  const addProduct = () => setCfg(prev => prev ? { ...prev, products: [...prev.products, emptyProduct()] } : prev);
  const removeProduct = (i: number) => setCfg(prev => prev ? { ...prev, products: prev.products.filter((_, j) => j !== i) } : prev);

  // Celdas que definen un producto (A1 → valor), ej. tasa
  const setCellValue = (i: number, a1: string, value: string) =>
    setCfg(prev => {
      if (!prev) return prev;
      const products = prev.products.map((pr, j) => {
        if (j !== i) return pr;
        const cv = { ...(pr.cellValues || {}) };
        if (a1) cv[a1] = isNaN(Number(value)) ? value : Number(value);
        return { ...pr, cellValues: cv };
      });
      return { ...prev, products };
    });
  const renameCell = (i: number, oldA1: string, newA1: string) =>
    setCfg(prev => {
      if (!prev) return prev;
      const products = prev.products.map((pr, j) => {
        if (j !== i) return pr;
        const cv: Record<string, any> = {};
        Object.entries(pr.cellValues || {}).forEach(([k, v]) => { cv[k === oldA1 ? newA1 : k] = v; });
        return { ...pr, cellValues: cv };
      });
      return { ...prev, products };
    });
  const removeCell = (i: number, a1: string) =>
    setCfg(prev => {
      if (!prev) return prev;
      const products = prev.products.map((pr, j) => {
        if (j !== i) return pr;
        const cv = { ...(pr.cellValues || {}) }; delete cv[a1];
        return { ...pr, cellValues: cv };
      });
      return { ...prev, products };
    });
  const addCell = (i: number) => setCellValue(i, `Celda${Object.keys(cfg?.products[i].cellValues || {}).length + 1}`, '');

  const save = async () => {
    if (!cfg) return;
    setSaving(true); setMsg('');
    try {
      // Construir la tabla tasa→comisión desde las filas (solo tasas válidas)
      const commissionByRate: Record<string, number> = {};
      commRows.forEach(r => { const t = parseFloat(r.tasa); if (!isNaN(t)) commissionByRate[String(t)] = Number(r.comision) || 0; });
      await MockService.saveEntityCalcConfig({ ...cfg, commissionByRate, googleSheetId: extractSheetId(cfg.googleSheetId) });
      setMsg('✓ Guardado');
      const fresh = await MockService.getEntityCalcConfig(entity);
      if (fresh) { setCfg(fresh); setCommRows(Object.entries(fresh.commissionByRate || {}).map(([t, v]) => ({ tasa: String(t), comision: String(v) }))); }
    } catch (e: any) { setMsg(e.message || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const runTest = async () => {
    if (!cfg) return;
    setTesting(true); setTestResult('');
    try {
      const res = await MockService.calcularCreditoReal(
        entity, testProduct || cfg.products[0]?.nombre || '', testPlazo, testCuota,
        { fechaNacimiento: testFecha, pagaduria: undefined },
        { ...cfg, googleSheetId: extractSheetId(cfg.googleSheetId) },
      );
      const f = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
      setTestResult(`✓ Monto: ${f(res.monto)} · Desembolso: ${f(res.desembolso)} · Comisión: ${res.comision}% · Tasa: ${res.rate}`);
    } catch (e: any) { setTestResult('✕ ' + (e.message || 'Error al calcular')); }
    finally { setTesting(false); }
  };

  if (loading) return <div className="py-8 text-center text-slate-400"><Loader2 className="animate-spin mx-auto" size={24} /></div>;
  if (!cfg) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <Calculator size={18} className="text-indigo-500 shrink-0 mt-0.5" />
        <p className="text-xs text-indigo-800">
          Configura el <b>motor de cálculo real</b> de la entidad. Si está activo, la radicación calcula el monto y el desembolso con el <b>Google Sheet</b> de la entidad (no con factores). Las celdas se escriben en formato A1 (ej. <code className="bg-white px-1 rounded">C9</code>).
        </p>
      </div>

      {/* Entidad + activo */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className={lbl}>Entidad</label>
          <select value={entity} onChange={e => setEntity(e.target.value)} className="px-3 py-2 bg-white border-2 border-slate-100 rounded-lg text-sm font-bold outline-none focus:border-primary">
            {entities.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm font-bold text-slate-600 pb-2">
          <input type="checkbox" checked={cfg.isActive} onChange={e => patch({ isActive: e.target.checked })} className="w-4 h-4 accent-primary" />
          Motor activo (usar Excel real al radicar)
        </label>
      </div>

      {/* Google Sheet */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className={lbl}>Google Sheet (link o ID)</label>
          <input value={cfg.googleSheetId} onChange={e => patch({ googleSheetId: e.target.value })} placeholder="https://docs.google.com/spreadsheets/d/XXXX/edit" className={inp} />
        </div>
        <div>
          <label className={lbl}>Hoja (tab)</label>
          <input value={cfg.sheetTab || ''} onChange={e => patch({ sheetTab: e.target.value })} placeholder="(primera hoja)" className={inp} />
        </div>
      </div>

      {/* Celdas de entrada */}
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
        <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Celdas de entrada (las llena Skala)</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {([
            ['cuota', 'Cuota disponible'],
            ['plazo', 'Plazo (meses)'],
            ['fechaNacimiento', 'Fecha nacimiento'],
            ['pagaduria', 'Pagaduría'],
            ['tipo', 'Tipo crédito'],
          ] as const).map(([k, label]) => (
            <div key={k}>
              <label className={lbl}>{label}</label>
              <input value={cfg.inputCells[k] || ''} onChange={e => patchInput(k, e.target.value.toUpperCase())} placeholder="A1" className={`${inp} font-mono`} />
            </div>
          ))}
        </div>
      </div>

      {/* Celdas de salida */}
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
        <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Celdas de resultado (las lee Skala)</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className={lbl}>Monto a financiar</label>
            <input value={cfg.outputCells.monto || ''} onChange={e => patchOutput('monto', e.target.value.toUpperCase())} placeholder="C9" className={`${inp} font-mono`} />
          </div>
          <div>
            <label className={lbl}>Monto a desembolsar</label>
            <input value={cfg.outputCells.desembolso || ''} onChange={e => patchOutput('desembolso', e.target.value.toUpperCase())} placeholder="C23" className={`${inp} font-mono`} />
          </div>
          <div>
            <label className={lbl}>Tasa (opcional)</label>
            <input value={cfg.outputCells.tasa || ''} onChange={e => patchOutput('tasa', e.target.value.toUpperCase())} placeholder="C12" className={`${inp} font-mono`} />
            <p className="text-[10px] text-slate-400 mt-1">Si la hoja calcula la tasa, ponla aquí y Skala la lee (no la escribas en el producto).</p>
          </div>
        </div>
      </div>

      {/* Productos */}
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Productos (variantes/tasas del simulador) · la comisión se define abajo por tasa</p>
          <button onClick={addProduct} className="flex items-center gap-1 text-xs font-bold text-primary hover:text-orange-600"><Plus size={14} /> Producto</button>
        </div>
        {cfg.products.map((p, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-3 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="col-span-2 sm:col-span-1">
                <label className={lbl}>Nombre</label>
                <input value={p.nombre} onChange={e => patchProduct(i, { nombre: e.target.value })} placeholder="1.5% NMV" className={inp} />
              </div>
              <div>
                <label className={lbl}>Tasa</label>
                <input type="number" step="0.01" value={p.rate} onChange={e => patchProduct(i, { rate: Number(e.target.value) })} className={`${inp} font-mono`} />
              </div>
              <div>
                <label className={lbl}>Seg+Aval % (info)</label>
                <input type="number" step="0.01" value={p.discountPct || 0} onChange={e => patchProduct(i, { discountPct: Number(e.target.value) })} className={`${inp} font-mono`} />
              </div>
            </div>

            {/* Celdas que definen el producto */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Celdas que fija este producto (ej. tasa)</label>
                <button onClick={() => addCell(i)} className="text-[11px] font-bold text-primary hover:text-orange-600 flex items-center gap-0.5"><Plus size={12} /> celda</button>
              </div>
              <div className="space-y-1.5">
                {Object.entries(p.cellValues || {}).map(([a1, value]) => (
                  <div key={a1} className="flex items-center gap-2">
                    <input value={a1} onChange={e => renameCell(i, a1, e.target.value.toUpperCase())} placeholder="C12" className="w-24 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-mono outline-none focus:border-primary" />
                    <span className="text-slate-300">=</span>
                    <input value={String(value)} onChange={e => setCellValue(i, a1, e.target.value)} placeholder="valor" className="flex-1 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-primary" />
                    <button onClick={() => removeCell(i, a1)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                ))}
                {Object.keys(p.cellValues || {}).length === 0 && (
                  <p className="text-[11px] text-slate-400 italic">Sin celdas extra. Si la tasa se escribe en la hoja, agrega una celda (ej. C12 = {p.rate}).</p>
                )}
              </div>
            </div>

            {cfg.products.length > 1 && (
              <button onClick={() => removeProduct(i)} className="text-[11px] font-bold text-red-400 hover:text-red-600 flex items-center gap-1"><Trash2 size={12} /> Quitar producto</button>
            )}
          </div>
        ))}
      </div>

      {/* Comisiones por tasa (se emparejan con la tasa usada al radicar) */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-emerald-800 uppercase tracking-widest">Comisiones por tasa</p>
            <p className="text-[11px] text-emerald-700 mt-0.5">Escribe la comisión (%) de cada tasa. Al radicar/editar, la comisión se empareja con la tasa que use el simulador.</p>
          </div>
          <button onClick={() => setCommRows(r => [...r, { tasa: '', comision: '' }])} className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900"><Plus size={14} /> Tasa</button>
        </div>
        <div className="space-y-2">
          {commRows.length === 0 && <p className="text-[11px] text-slate-400 italic">Sin comisiones. Agrega una tasa (ej. 1.5 → 3%).</p>}
          {commRows.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="relative w-28">
                <input type="number" step="0.01" value={row.tasa} onChange={e => setCommRows(rows => rows.map((r, j) => j === i ? { ...r, tasa: e.target.value } : r))} placeholder="Tasa" className="w-full px-2 py-1.5 pr-6 bg-white border border-emerald-200 rounded-lg text-sm font-mono outline-none focus:border-emerald-500" />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
              </div>
              <span className="text-slate-300">→</span>
              <div className="relative w-28">
                <input type="number" step="0.01" value={row.comision} onChange={e => setCommRows(rows => rows.map((r, j) => j === i ? { ...r, comision: e.target.value } : r))} placeholder="Comisión" className="w-full px-2 py-1.5 pr-6 bg-white border border-emerald-200 rounded-lg text-sm font-mono outline-none focus:border-emerald-500" />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
              </div>
              <button onClick={() => setCommRows(rows => rows.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Guardar */}
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 disabled:opacity-50">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Guardar configuración
        </button>
        {msg && <span className={`text-xs font-bold ${msg.startsWith('✓') ? 'text-emerald-600' : 'text-red-500'}`}>{msg}</span>}
      </div>

      {/* Probar cálculo */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
        <p className="text-xs font-black text-amber-700 uppercase tracking-widest flex items-center gap-1"><Beaker size={14} /> Probar cálculo contra el Excel</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <label className={lbl}>Cuota</label>
            <input type="number" value={testCuota} onChange={e => setTestCuota(Number(e.target.value))} className={`${inp} font-mono`} />
          </div>
          <div>
            <label className={lbl}>Plazo</label>
            <input type="number" value={testPlazo} onChange={e => setTestPlazo(Number(e.target.value))} className={`${inp} font-mono`} />
          </div>
          <div>
            <label className={lbl}>Fecha nac.</label>
            <input type="date" value={testFecha} onChange={e => setTestFecha(e.target.value)} className={`${inp} font-mono`} />
          </div>
          <div>
            <label className={lbl}>Producto</label>
            <select value={testProduct} onChange={e => setTestProduct(e.target.value)} className={inp}>
              {cfg.products.map((p, i) => <option key={i} value={p.nombre}>{p.nombre || `Producto ${i + 1}`}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={runTest} disabled={testing} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-amber-600 disabled:opacity-50">
            {testing ? <Loader2 size={14} className="animate-spin" /> : <Beaker size={14} />} Calcular
          </button>
          {testResult && <span className={`text-xs font-bold ${testResult.startsWith('✓') ? 'text-emerald-700' : 'text-red-500'}`}>{testResult}</span>}
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import { MockService } from '../../services/mockService';
import { Loader2, AlertTriangle, Calculator, RotateCcw } from 'lucide-react';

/**
 * Runner ONLINE de un simulador: calcula con Google Sheets vía la Edge Function.
 * - Carga la hoja (sin inputs) y la renderiza: celdas con fórmula = resultados (verde,
 *   solo lectura); las demás con contenido = entradas editables (azul).
 * - El asesor edita entradas y pulsa "Calcular" → Google recalcula → se actualizan
 *   los resultados. Genérico: no requiere mapear celdas; sirve para cualquier simulador.
 */
interface Props {
  googleSheetId: string;
  sheetTab?: string;
  maxRows?: number;
}

const colLetter = (n: number) => { let s = ''; n++; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };

export const OnlineSimulatorRunner: React.FC<Props> = ({ googleSheetId, sheetTab, maxRows = 40 }) => {
  const [loading, setLoading] = useState(true);
  const [calcing, setCalcing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [grid, setGrid] = useState<{ display: string[][]; formulas: string[][]; sheet: string } | null>(null);
  const inputsRef = useRef<Record<string, any>>({}); // "a1" -> value

  const run = async (withInputs: boolean) => {
    withInputs ? setCalcing(true) : setLoading(true);
    setError(null);
    try {
      const inputs = withInputs
        ? Object.entries(inputsRef.current).map(([a1, value]) => ({ sheet: grid?.sheet || sheetTab, a1, value }))
        : [];
      const r = await MockService.calcSimulator(googleSheetId, sheetTab, inputs);
      if (r.error) throw new Error(r.error);
      setGrid({ display: r.display || [], formulas: r.formulas || [], sheet: r.sheet });
    } catch (e: any) {
      setError(e.message || 'No se pudo calcular');
    } finally { setLoading(false); setCalcing(false); }
  };

  useEffect(() => { inputsRef.current = {}; run(false); /* eslint-disable-next-line */ }, [googleSheetId, sheetTab]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
      <Loader2 className="animate-spin text-primary" size={32} />
      <p className="text-sm font-bold">Cargando simulador…</p>
    </div>
  );
  if (error) return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm font-semibold">
      <AlertTriangle size={18} /> {error}
    </div>
  );
  if (!grid) return null;

  const disp = grid.display, forms = grid.formulas;
  const maxR = Math.min(disp.length, maxRows);
  let maxC = 0; for (let i = 0; i < maxR; i++) maxC = Math.max(maxC, disp[i]?.length || 0);
  maxC = Math.min(maxC, 16);

  const rows: number[] = [];
  for (let r = 0; r < maxR; r++) { if ((disp[r] || []).some(v => v !== '' && v != null)) rows.push(r); }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-[11px] text-amber-700 font-semibold flex-1">
          Cálculo en vivo con el simulador oficial (Google). Celdas <span className="text-blue-700">azules</span> = editables; <span className="text-emerald-700">verdes</span> = resultados. Edita y pulsa Calcular.
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => run(true)} disabled={calcing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-primary text-white hover:bg-orange-600 transition-all disabled:opacity-50">
            {calcing ? <Loader2 size={14} className="animate-spin" /> : <Calculator size={14} />} Calcular
          </button>
          <button onClick={() => { inputsRef.current = {}; run(false); }} disabled={calcing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all">
            <RotateCcw size={13} /> Reiniciar
          </button>
        </div>
      </div>
      <div className="overflow-auto custom-scrollbar border border-slate-200 rounded-xl max-h-[60vh]">
        <table className="text-xs border-collapse">
          <tbody>
            {rows.map(r => (
              <tr key={r}>
                <td className="sticky left-0 z-10 bg-slate-100 text-slate-400 font-mono text-[10px] px-2 py-1 border border-slate-200 text-center select-none">{r + 1}</td>
                {Array.from({ length: maxC + 1 }, (_, c) => c).map(c => {
                  const val = disp[r]?.[c] ?? '';
                  const hasFormula = (forms[r]?.[c] ?? '') !== '';
                  if (val === '' && !hasFormula) return <td key={c} className="border border-slate-100 px-2 py-1"></td>;
                  if (hasFormula) {
                    return <td key={c} className="border border-slate-200 px-2 py-1 text-right font-mono font-bold text-emerald-700 whitespace-nowrap bg-emerald-50/30">{val}</td>;
                  }
                  // entrada editable (no fórmula, con contenido)
                  const a1 = colLetter(c) + (r + 1);
                  return <td key={c} className="border border-slate-200 p-0">
                    <input defaultValue={val}
                      onChange={e => { inputsRef.current[a1] = e.target.value; }}
                      onKeyDown={e => { if (e.key === 'Enter') run(true); }}
                      className="w-28 px-2 py-1 bg-blue-50 text-slate-900 font-semibold text-xs outline-none focus:bg-white focus:ring-1 focus:ring-primary" />
                  </td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

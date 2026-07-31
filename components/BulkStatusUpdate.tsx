import React, { useState, useMemo, useRef } from 'react';
import { Upload, X, CheckCircle2, AlertTriangle, Loader2, Download, FileText, Info, ChevronDown } from 'lucide-react';
import { MockService } from '../services/mockService';

// ── Utilidades ──────────────────────────────────────────────────────────────
const normalizeStr = (s: string) =>
  (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();

const headerKey = (h: string) => normalizeStr(h).replace(/_/g, ' ').trim();
const onlyDigits = (s: string) => (s || '').replace(/\D/g, '');

/** Parsea la columna "tareas": separadas por | y con * al final = requiere adjunto. */
const parseTasks = (raw: string): { title: string; requiresDoc?: boolean }[] =>
  (raw || '').split('|').map(t => t.trim()).filter(Boolean).map(t => {
    const requiresDoc = t.endsWith('*');
    return { title: (requiresDoc ? t.slice(0, -1) : t).trim(), requiresDoc };
  }).filter(t => t.title);

/** Split de una línea CSV respetando comillas dobles. */
const splitLine = (line: string, sep: string): string[] => {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === sep && !inQ) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map(s => s.trim());
};

type MatchType = 'exact' | 'suggested' | 'none';

interface PreviewRow {
  cedula: string;          // clave del CSV
  csvEstado: string;
  csvMotivo: string;
  credit: any | null;      // crédito resuelto (el más reciente si hay varios)
  matchCount: number;      // cuántos créditos tiene esa cédula
  currentStateName: string;
  targetStatusId: string;  // editable
  matchType: MatchType;    // emparejamiento del estado del CSV
  tasks: { title: string; requiresDoc?: boolean }[]; // tareas de devolución (si aplica)
  malformed: boolean;      // fila con columnas corridas (coma extra sin comillas) — se excluye
}

interface Props {
  credits: any[];
  states: any[];           // { id, name, ... }
  currentUser: any;
  onClose: () => void;
  onApplied: () => void;   // refrescar la bandeja
}

/** Empareja un nombre de estado del CSV contra la lista de estados reales. */
const matchState = (csvEstado: string, states: any[]): { statusId: string; matchType: MatchType } => {
  const norm = normalizeStr(csvEstado);
  if (!norm) return { statusId: '', matchType: 'none' };
  const exact = states.find(s => normalizeStr(s.name) === norm);
  if (exact) return { statusId: exact.id, matchType: 'exact' };
  const inc = states.find(s => { const n = normalizeStr(s.name); return n.includes(norm) || norm.includes(n); });
  if (inc) return { statusId: inc.id, matchType: 'suggested' };
  const tokens = norm.split(/\s+/).filter(Boolean);
  let best: any = null, bestScore = 0;
  for (const s of states) {
    const sn = normalizeStr(s.name);
    const score = tokens.filter(t => sn.includes(t)).length;
    if (score > bestScore) { bestScore = score; best = s; }
  }
  if (best && bestScore > 0) return { statusId: best.id, matchType: 'suggested' };
  return { statusId: '', matchType: 'none' };
};

/** Distancia de edición (Levenshtein) para ordenar candidatos por parecido de caracteres. */
const levenshtein = (a: string, b: string): number => {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const dp = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]; dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[n];
};

/** Devuelve los estados más parecidos al texto del CSV (para sugerir cuando no hay match). */
const suggestStates = (csvEstado: string, states: any[], n = 3): any[] => {
  const csvNorm = normalizeStr(csvEstado);
  if (!csvNorm) return [];
  const tokens = csvNorm.split(/\s+/).filter(Boolean);
  const score = (name: string) => {
    const sn = normalizeStr(name);
    let s = 0;
    if (sn.includes(csvNorm) || csvNorm.includes(sn)) s += 100;
    s += tokens.filter(t => sn.includes(t)).length * 10;
    s += Math.max(0, 24 - levenshtein(csvNorm, sn)); // más cerca en caracteres = más puntos
    return s;
  };
  return [...states]
    .map(st => ({ st, sc: score(st.name) }))
    .sort((a, b) => b.sc - a.sc)
    .slice(0, n)
    .map(x => x.st);
};

export const BulkStatusUpdate: React.FC<Props> = ({ credits, states, currentUser, onClose, onApplied }) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [motivo, setMotivo] = useState('');
  const [notifyGestor, setNotifyGestor] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showHelp, setShowHelp] = useState(true);
  const [parseError, setParseError] = useState('');
  const [result, setResult] = useState<{ updatedCount: number; skipped: number; failures: { cedula: string; nombre: string; solicitud: string; estadoName: string; motivo: string; reason: string }[] } | null>(null);
  const [bigConfirm, setBigConfirm] = useState('');
  const applyingRef = useRef(false); // guard anti doble-clic (además del disabled)

  // Índice CÉDULA → créditos (varios posibles, ordenados del más reciente al más antiguo)
  const creditsByCedula = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const c of credits) {
      const ced = onlyDigits(String(c.numeroDocumento || ''));
      if (!ced) continue;
      if (!m.has(ced)) m.set(ced, []);
      m.get(ced)!.push(c);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
    }
    return m;
  }, [credits]);

  // Respaldo: índice por número de solicitud (por si el CSV trae esa columna)
  const creditBySol = useMemo(() => {
    const m = new Map<string, any>();
    for (const c of credits) if (c.solicitudNumber != null) m.set(String(c.solicitudNumber).trim(), c);
    return m;
  }, [credits]);

  const nameOf = (id: string) => states.find(s => s.id === id)?.name || '';
  const isDevolucion = (id: string) => !!(states.find(s => s.id === id) as any)?.enableTasks;

  const handleFile = async (file: File) => {
    setParseError('');
    try {
      let text = await file.text();
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // quitar BOM de Excel/Windows
      if (text.startsWith('PK')) { setParseError('El archivo parece un Excel (.xlsx) renombrado. Ábrelo y expórtalo como CSV.'); return; }
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { setParseError('El CSV no tiene filas de datos.'); return; }
      const MAX_FILAS = 2000;
      if (lines.length - 1 > MAX_FILAS) { setParseError(`El CSV tiene ${lines.length - 1} filas; el máximo por carga es ${MAX_FILAS}. Divide el archivo.`); return; }
      const sep = (lines[0].match(/;/g)?.length || 0) > (lines[0].match(/,/g)?.length || 0) ? ';' : ',';
      const headers = splitLine(lines[0], sep).map(headerKey);
      const idxCedula = headers.findIndex(h => /CEDULA|DOCUMENTO/.test(h) || h === 'CC');
      const idxSol = headers.findIndex(h => /SOLICITUD/.test(h) || h === 'SOL');
      const idxEstado = headers.findIndex(h => /ESTADO/.test(h));
      const idxMotivo = headers.findIndex(h => /MOTIVO/.test(h));
      const idxTareas = headers.findIndex(h => /TAREA/.test(h));
      if ((idxCedula < 0 && idxSol < 0) || idxEstado < 0) {
        setParseError('El CSV debe tener columnas "cedula" (o "solicitud") y "estado". Descarga la plantilla.');
        return;
      }
      const parsed: PreviewRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = splitLine(lines[i], sep);
        // Más columnas que encabezados = coma extra sin comillas → campos corridos.
        // La fila se marca malformada y se excluye (aplicarla sería aplicar datos desalineados).
        const malformed = cols.length > headers.length;
        const cedulaRaw = idxCedula >= 0 ? (cols[idxCedula] || '').trim() : '';
        const cedula = onlyDigits(cedulaRaw);
        const solicitud = idxSol >= 0 ? (cols[idxSol] || '').trim() : '';
        const csvEstado = (cols[idxEstado] || '').trim();
        if (!cedula && !solicitud && !csvEstado) continue;

        // Resolver crédito: primero por cédula; si no, por solicitud
        let credit: any = null;
        let matchCount = 0;
        if (!malformed) {
          if (cedula && creditsByCedula.has(cedula)) {
            const arr = creditsByCedula.get(cedula)!;
            matchCount = arr.length;
            credit = arr[0]; // más reciente
          } else if (solicitud && creditBySol.has(solicitud)) {
            credit = creditBySol.get(solicitud);
            matchCount = 1;
          }
        }

        const { statusId, matchType } = malformed ? { statusId: '', matchType: 'none' as MatchType } : matchState(csvEstado, states);
        parsed.push({
          cedula: cedula || cedulaRaw,
          csvEstado,
          csvMotivo: idxMotivo >= 0 ? (cols[idxMotivo] || '').trim() : '',
          credit,
          matchCount,
          currentStateName: credit ? (states.find(s => s.id === credit.statusId)?.name || '—') : '—',
          targetStatusId: statusId,
          matchType,
          tasks: idxTareas >= 0 ? parseTasks(cols[idxTareas]) : [],
          malformed,
        });
      }
      if (parsed.length === 0) { setParseError('No se encontraron filas válidas.'); return; }
      setRows(parsed);
      setStep('preview');
    } catch (e: any) {
      setParseError('No se pudo leer el archivo: ' + (e?.message || e));
    }
  };

  const downloadTemplate = () => {
    const csv = 'cedula,estado,motivo,tareas\n1020304050,DESEMBOLSADO,Desembolso confirmado,\n79820317,DEVUELTO,Faltan documentos,Corregir cedula|Adjuntar desprendible*|Verificar pagaduria\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'plantilla_actualizacion_estados.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const setRowTarget = (i: number, statusId: string) => {
    setRows(rs => rs.map((r, j) => j === i ? { ...r, targetStatusId: statusId, matchType: statusId ? (normalizeStr(nameOf(statusId)) === normalizeStr(r.csvEstado) ? 'exact' : 'suggested') : 'none' } : r));
  };

  const applicable = rows.filter(r => r.credit && r.targetStatusId);
  const notFound = rows.filter(r => !r.credit && !r.malformed);
  const malformedRows = rows.filter(r => r.malformed);
  const noState = rows.filter(r => r.credit && !r.targetStatusId);
  const multiple = rows.filter(r => r.matchCount > 1);
  const suggestedCount = rows.filter(r => r.credit && r.targetStatusId && r.matchType === 'suggested').length;
  const devSinTareas = rows.filter(r => r.credit && r.targetStatusId && isDevolucion(r.targetStatusId) && r.tasks.length === 0).length;
  // Filas que repiten el mismo crédito (misma cédula duplicada en el archivo): se aplica la última.
  const dupCount = useMemo(() => {
    const seen = new Set<string>(); let d = 0;
    for (const r of rows) { if (!r.credit) continue; if (seen.has(r.credit.id)) d++; else seen.add(r.credit.id); }
    return d;
  }, [rows]);

  // Lote grande: exigir confirmación tecleando el número exacto de créditos.
  const LOTE_GRANDE = 50;
  const needsBigConfirm = applicable.length >= LOTE_GRANDE;
  const bigConfirmOk = !needsBigConfirm || bigConfirm.trim() === String(applicable.length);
  const canApply = applicable.length > 0 && motivo.trim().length > 0 && !applying && bigConfirmOk;

  const apply = async () => {
    if (!canApply || applyingRef.current) return; // guard anti doble-clic
    applyingRef.current = true;
    setApplying(true);
    try {
      const payload = applicable.map(r => ({ creditId: r.credit.id, statusId: r.targetStatusId, motivo: r.csvMotivo || undefined, tasks: isDevolucion(r.targetStatusId) ? r.tasks : undefined }));
      const res = await MockService.bulkUpdateCreditStatusByRows(payload, currentUser, motivo.trim(), { notifyGestor });
      // Mapear los fallos (creditId + motivo del servicio) a datos que el operador entiende: cédula/nombre/solicitud
      const reasonById = new Map<string, string>(((res.failed || []) as { creditId: string; reason: string }[]).map(f => [f.creditId, f.reason]));
      const failedSet = new Set<string>(res.failedIds || []);
      const failures = applicable.filter(r => failedSet.has(r.credit.id)).map(r => ({
        cedula: r.cedula,
        nombre: r.credit.nombreCompleto || '',
        solicitud: String(r.credit.solicitudNumber ?? ''),
        estadoName: nameOf(r.targetStatusId),
        motivo: r.csvMotivo || motivo.trim(),
        reason: reasonById.get(r.credit.id) || 'Error desconocido',
      }));
      setResult({ updatedCount: res.updatedCount, skipped: rows.length - applicable.length, failures });
      setStep('result');
      onApplied();
    } catch (e: any) {
      setParseError('No se aplicó ningún cambio: ' + (e?.message || 'error desconocido'));
    } finally {
      setApplying(false);
      applyingRef.current = false;
    }
  };

  // CSV de fallos para corregir y reintentar solo esos.
  const downloadFailures = () => {
    if (!result?.failures.length) return;
    const esc = (s: string) => /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    const csv = 'cedula,estado,motivo\n' + result.failures.map(f => [f.cedula, f.estadoName, f.motivo].map(esc).join(',')).join('\n') + '\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'fallos_actualizacion_estados.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const matchBadge = (r: PreviewRow) => {
    if (r.malformed) return <span className="inline-flex items-center gap-1 text-red-600 text-[11px] font-bold"><AlertTriangle size={12} /> Fila malformada</span>;
    if (!r.credit) return <span className="inline-flex items-center gap-1 text-red-600 text-[11px] font-bold"><AlertTriangle size={12} /> Cédula no existe</span>;
    if (!r.targetStatusId) return <span className="inline-flex items-center gap-1 text-red-600 text-[11px] font-bold"><AlertTriangle size={12} /> Sin estado</span>;
    if (r.matchType === 'exact') return <span className="inline-flex items-center gap-1 text-emerald-600 text-[11px] font-bold"><CheckCircle2 size={12} /> Exacto</span>;
    return <span className="inline-flex items-center gap-1 text-amber-600 text-[11px] font-bold">~ Sugerido</span>;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><Upload size={18} className="text-primary" /> Actualización masiva de estados (CSV)</h3>
            <p className="text-xs text-slate-500 mt-0.5">Sube un CSV con la <b>cédula</b> y el estado destino. Revisa y autoriza antes de aplicar.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full"><X size={18} /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* PASO 1: CARGAR */}
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Tutorial / instrucciones */}
              <div className="bg-blue-50 border border-blue-200 rounded-2xl overflow-hidden">
                <button onClick={() => setShowHelp(h => !h)} className="w-full flex items-center justify-between px-4 py-3 text-left">
                  <span className="flex items-center gap-2 text-sm font-black text-blue-800"><Info size={16} /> Cómo actualizar estados en masa (tutorial)</span>
                  <ChevronDown size={16} className={`text-blue-500 transition-transform ${showHelp ? 'rotate-180' : ''}`} />
                </button>
                {showHelp && (
                  <div className="px-4 pb-4 text-xs text-blue-900 space-y-2.5">
                    <p><b>1. Prepara un CSV</b> con una fila por crédito. Columnas:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li><code className="bg-white px-1 rounded">cedula</code> — cédula del cliente (obligatoria). Si una cédula tiene varios créditos, se usa el más reciente.</li>
                      <li><code className="bg-white px-1 rounded">estado</code> — nombre del estado destino (ej. <i>DESEMBOLSADO</i>). No importan mayúsculas/acentos; si no coincide exacto, el sistema <b>sugiere</b> el más parecido y tú lo confirmas.</li>
                      <li><code className="bg-white px-1 rounded">motivo</code> — opcional; si lo dejas vacío se usa el motivo que escribas en la pantalla.</li>
                      <li><code className="bg-white px-1 rounded">tareas</code> — solo para <b>devoluciones</b>: separadas por <code className="bg-white px-1 rounded">|</code>, y <code className="bg-white px-1 rounded">*</code> al final = requiere adjunto.</li>
                    </ul>
                    <div className="bg-white border border-blue-100 rounded-lg p-2 font-mono text-[11px] text-slate-700 overflow-x-auto whitespace-pre">cedula,estado,motivo,tareas{'\n'}1041254593,DESEMBOLSADO,Confirmado,{'\n'}79820317,DEVUELTO,Faltan docs,Corregir cédula|Adjuntar desprendible*</div>
                    <p><b>2. Súbelo</b> abajo (o usa <b>Descargar plantilla</b> para empezar con el ejemplo).</p>
                    <p><b>3. Revisa la previsualización:</b> cliente, solicitud, estado actual → estado a aplicar (editable), tareas, y si el estado fue exacto o sugerido. Las cédulas que no existen se marcan y se omiten.</p>
                    <p><b>4. Escribe el motivo, autoriza y aplica.</b> Se actualiza el estado, queda en el historial de cada crédito y (si lo dejas marcado) se notifica al asesor. <b>No</b> dispara webhooks a n8n.</p>
                    <p className="text-amber-700 font-bold">⚠️ Cambia créditos reales. Prueba primero con pocas cédulas.</p>
                  </div>
                )}
              </div>

              <label className="block border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center cursor-pointer hover:border-primary hover:bg-slate-50 transition-colors">
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                <FileText size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="font-bold text-slate-700">Haz clic para seleccionar el CSV</p>
                <p className="text-xs text-slate-400 mt-1">Columnas: <code>cedula</code>, <code>estado</code>, <code>motivo</code>, <code>tareas</code> (opcional). En devoluciones, tareas separadas por <code>|</code> y <code>*</code> = requiere adjunto.</p>
              </label>
              {parseError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">{parseError}</div>}
              <button onClick={downloadTemplate} className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:text-orange-600"><Download size={14} /> Descargar plantilla</button>
            </div>
          )}

          {/* PASO 2: PREVISUALIZAR / AUTORIZAR */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">{applicable.length} se actualizarán</span>
                {suggestedCount > 0 && <span className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">{suggestedCount} con estado sugerido</span>}
                {multiple.length > 0 && <span className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">{multiple.length} cédula con varios créditos (se usa el más reciente)</span>}
                {devSinTareas > 0 && <span className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">{devSinTareas} devolución sin tareas</span>}
                {dupCount > 0 && <span className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">{dupCount} fila(s) repiten crédito (se aplica la última)</span>}
                {notFound.length > 0 && <span className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200">{notFound.length} cédula no existe</span>}
                {malformedRows.length > 0 && <span className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200">{malformedRows.length} fila(s) malformadas (columnas corridas)</span>}
                {noState.length > 0 && <span className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200">{noState.length} sin estado válido</span>}
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 font-black">
                    <tr>
                      <th className="p-2.5">Cédula</th>
                      <th className="p-2.5">Cliente</th>
                      <th className="p-2.5">Solicitud</th>
                      <th className="p-2.5">Estado actual</th>
                      <th className="p-2.5">Estado CSV</th>
                      <th className="p-2.5">Estado a aplicar</th>
                      <th className="p-2.5">Tareas (devolución)</th>
                      <th className="p-2.5">Match</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((r, i) => (
                      <tr key={i} className={!r.credit ? 'bg-red-50/40' : ''}>
                        <td className="p-2.5 font-mono font-bold text-slate-700">{r.cedula || '—'}</td>
                        <td className="p-2.5 text-slate-600">{r.credit ? (r.credit.nombreCompleto || '—') : <span className="text-red-500 italic">no encontrada</span>}</td>
                        <td className="p-2.5 font-mono text-slate-500">
                          {r.credit ? `#${r.credit.solicitudNumber}` : '—'}
                          {r.matchCount > 1 && <span className="ml-1 text-[10px] text-amber-600 font-bold" title="Esta cédula tiene varios créditos; se usa el más reciente">({r.matchCount})</span>}
                        </td>
                        <td className="p-2.5 text-slate-500">{r.currentStateName}</td>
                        <td className="p-2.5 text-slate-500">{r.csvEstado || '—'}</td>
                        <td className="p-2.5">
                          <select
                            value={r.targetStatusId}
                            disabled={!r.credit}
                            onChange={e => setRowTarget(i, e.target.value)}
                            className={`px-2 py-1.5 rounded-lg border text-xs font-bold outline-none focus:border-primary disabled:opacity-40 ${r.targetStatusId ? 'border-slate-200 bg-white' : 'border-red-300 bg-red-50'}`}
                          >
                            <option value="">— elegir —</option>
                            {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                          {r.credit && !r.targetStatusId && (
                            <div className="mt-1.5 flex flex-wrap items-center gap-1">
                              <span className="text-[10px] text-slate-400">¿Quisiste decir?</span>
                              {suggestStates(r.csvEstado, states, 3).map(s => (
                                <button key={s.id} type="button" onClick={() => setRowTarget(i, s.id)} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200 font-bold" title="Usar este estado">{s.name}</button>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-2.5 max-w-[240px]">
                          {isDevolucion(r.targetStatusId) ? (
                            r.tasks.length ? (
                              <div className="flex flex-wrap gap-1">
                                {r.tasks.map((t, k) => (
                                  <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200" title={t.requiresDoc ? 'Requiere adjunto' : ''}>{t.title}{t.requiresDoc ? ' 📎' : ''}</span>
                                ))}
                              </div>
                            ) : <span className="text-[11px] text-amber-600 font-bold">sin tareas</span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="p-2.5">{matchBadge(r)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">Motivo del cambio (obligatorio)</label>
                  <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={2} placeholder="Ej. Actualización masiva por conciliación de tesorería" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary focus:bg-white" />
                  <p className="text-[10px] text-slate-400 mt-1">Se usa para las filas sin motivo propio en el CSV.</p>
                </div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-600 pt-6">
                  <input type="checkbox" checked={notifyGestor} onChange={e => setNotifyGestor(e.target.checked)} className="w-4 h-4 accent-primary" />
                  Notificar a los asesores
                </label>
              </div>

              {/* Confirmación extra para lotes grandes */}
              {needsBigConfirm && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
                  <p className="text-sm font-black text-amber-800">⚠️ Lote grande: vas a cambiar {applicable.length} créditos de una sola vez.</p>
                  <div className="flex flex-wrap gap-1 text-[11px] font-bold text-amber-700">
                    {Object.entries(applicable.reduce((m: Record<string, number>, r) => { const n = nameOf(r.targetStatusId); m[n] = (m[n] || 0) + 1; return m; }, {})).map(([n, c]) => (
                      <span key={n} className="px-2 py-0.5 bg-white border border-amber-200 rounded">{c} → {n}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-amber-800 font-bold">Escribe {applicable.length} para habilitar el botón:</span>
                    <input value={bigConfirm} onChange={e => setBigConfirm(e.target.value)} placeholder={String(applicable.length)} className="w-24 px-2 py-1.5 bg-white border border-amber-300 rounded-lg text-sm font-mono font-bold outline-none focus:border-amber-500" />
                    {bigConfirmOk && <CheckCircle2 size={16} className="text-emerald-600" />}
                  </div>
                </div>
              )}

              {parseError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">{parseError}</div>}
            </div>
          )}

          {/* PASO 3: RESULTADO */}
          {step === 'result' && result && (
            <div className="py-6 space-y-4">
              <div className="text-center space-y-2">
                {result.failures.length === 0 ? (
                  <CheckCircle2 size={48} className="mx-auto text-emerald-500" />
                ) : (
                  <AlertTriangle size={48} className={`mx-auto ${result.updatedCount > 0 ? 'text-amber-500' : 'text-red-500'}`} />
                )}
                <h4 className="text-xl font-black text-slate-800">{result.updatedCount} crédito(s) actualizados</h4>
                {result.skipped > 0 && <p className="text-sm text-slate-500">{result.skipped} fila(s) omitidas (sin crédito, malformadas o sin estado).</p>}
              </div>

              {result.failures.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-black text-red-600">{result.failures.length} no se pudieron actualizar:</p>
                  <div className="border border-red-200 rounded-xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-red-50 text-[10px] uppercase text-red-600 font-black">
                        <tr>
                          <th className="p-2">Cédula</th>
                          <th className="p-2">Cliente</th>
                          <th className="p-2">Solicitud</th>
                          <th className="p-2">Estado destino</th>
                          <th className="p-2">Motivo del fallo</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100">
                        {result.failures.map((f, i) => (
                          <tr key={i}>
                            <td className="p-2 font-mono font-bold text-slate-700">{f.cedula}</td>
                            <td className="p-2 text-slate-600">{f.nombre}</td>
                            <td className="p-2 font-mono text-slate-500">#{f.solicitud}</td>
                            <td className="p-2 text-slate-600">{f.estadoName}</td>
                            <td className="p-2 text-red-600">{f.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button onClick={downloadFailures} className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:text-orange-600">
                    <Download size={14} /> Descargar CSV de fallos (para corregir y reintentar)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-5 border-t border-slate-100 bg-slate-50/50">
          {step === 'preview' && (
            <>
              <button onClick={() => { setStep('upload'); setRows([]); setParseError(''); setBigConfirm(''); }} className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800">← Cambiar archivo</button>
              <button onClick={apply} disabled={!canApply} className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed">
                {applying ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Autorizar y aplicar ({applicable.length})
              </button>
            </>
          )}
          {step === 'upload' && <div className="ml-auto"><button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800">Cancelar</button></div>}
          {step === 'result' && <div className="ml-auto"><button onClick={onClose} className="px-6 py-2.5 bg-slate-900 text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-slate-800">Cerrar</button></div>}
        </div>
      </div>
    </div>
  );
};

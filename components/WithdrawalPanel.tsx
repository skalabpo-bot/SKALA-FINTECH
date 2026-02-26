
import React, { useEffect, useState } from 'react';
import { User, WithdrawalRequest } from '../types';
import { MockService } from '../services/mockService';
import { Download, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, AlertCircle, Square, CheckSquare } from 'lucide-react';

interface WithdrawalPanelProps {
  currentUser: User;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

// Compara la fecha local del registro con el string YYYY-MM-DD del filtro (corrige timezone)
const sameLocalDate = (dateVal: Date | string, filterYMD: string) => {
  const d = new Date(dateVal);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}` === filterYMD;
};

export const WithdrawalPanel: React.FC<WithdrawalPanelProps> = ({ currentUser }) => {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; gestorName: string } | null>(null);
  const [rejectNota, setRejectNota] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [selectedBulk, setSelectedBulk] = useState<Set<string>>(new Set());
  const [bulkProcesando, setBulkProcesando] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await MockService.getWithdrawalRequests(currentUser);
      setRequests(data);
      setSelectedBulk(new Set());
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcess = async (id: string) => {
    setProcesando(id);
    try {
      await MockService.processWithdrawalRequest(id, 'PROCESADO', currentUser.id);
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Error al procesar');
    } finally {
      setProcesando(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setProcesando(rejectModal.id);
    try {
      await MockService.processWithdrawalRequest(rejectModal.id, 'RECHAZADO', currentUser.id, rejectNota);
      setRejectModal(null);
      setRejectNota('');
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Error al rechazar');
    } finally {
      setProcesando(null);
    }
  };

  const handleBulkProcess = async () => {
    if (selectedBulk.size === 0) return;
    setBulkProcesando(true);
    try {
      for (const id of Array.from(selectedBulk)) {
        await MockService.processWithdrawalRequest(id, 'PROCESADO', currentUser.id);
      }
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Error al procesar en lote');
    } finally {
      setBulkProcesando(false);
    }
  };

  const handleExportCSV = () => {
    if ((filterDate || filterEstado) && filtered.length === 0) {
      alert('No hay solicitudes con los filtros aplicados.');
      return;
    }
    const toExport = filtered.length > 0 ? filtered : requests;
    const csv = MockService.generateWithdrawalCSV(toExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retiros_${new Date().toLocaleDateString('es-CO').replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtros con fecha corregida para zona horaria local
  const filtered = requests.filter(r => {
    const dateOk = !filterDate || sameLocalDate(r.createdAt, filterDate);
    const estadoOk = !filterEstado || r.estado === filterEstado;
    return dateOk && estadoOk;
  });

  const pendientes = requests.filter(r => r.estado === 'PENDIENTE');
  const totalPendiente = pendientes.reduce((s, r) => s + r.montoTotal, 0);

  // Pendientes visibles en la lista filtrada para selección bulk
  const pendientesFiltrados = filtered.filter(r => r.estado === 'PENDIENTE');
  const allPendientesSelected = pendientesFiltrados.length > 0 && pendientesFiltrados.every(r => selectedBulk.has(r.id));

  const toggleBulk = (id: string) => {
    const next = new Set(selectedBulk);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedBulk(next);
  };

  const toggleAllPendientes = () => {
    if (allPendientesSelected) {
      setSelectedBulk(new Set());
    } else {
      setSelectedBulk(new Set(pendientesFiltrados.map(r => r.id)));
    }
  };

  const totalBulkSelected = Array.from(selectedBulk).reduce((s, id) => {
    const r = requests.find(x => x.id === id);
    return s + (r?.montoTotal || 0);
  }, 0);

  const estadoChip = (estado: string) => {
    if (estado === 'PROCESADO') return <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-1 rounded-full"><CheckCircle size={10} /> Procesado</span>;
    if (estado === 'RECHAZADO') return <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 text-[10px] font-black px-2 py-1 rounded-full"><XCircle size={10} /> Rechazado</span>;
    return <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-1 rounded-full"><Clock size={10} /> Pendiente</span>;
  };

  // Fecha de hoy en YYYY-MM-DD (zona horaria local)
  const todayYMD = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-black text-slate-800">Retiros de Comisiones</h2>
          <p className="text-sm text-slate-400 mt-1">Gestiona las solicitudes de retiro de los gestores</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-700 transition-all"
        >
          <Download size={16} /> Exportar CSV
        </button>
      </div>

      {/* Resumen de pendientes */}
      {pendientes.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center gap-4">
          <AlertCircle size={24} className="text-amber-500 shrink-0" />
          <div>
            <p className="font-black text-amber-800">{pendientes.length} solicitud{pendientes.length > 1 ? 'es' : ''} pendiente{pendientes.length > 1 ? 's' : ''} de pago</p>
            <p className="text-sm text-amber-700 mt-0.5">Total a procesar: <span className="font-black">{fmt(totalPendiente)}</span></p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm items-end">
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Fecha</label>
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Estado</label>
          <select
            value={filterEstado}
            onChange={e => setFilterEstado(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="">Todos</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="PROCESADO">Procesado</option>
            <option value="RECHAZADO">Rechazado</option>
          </select>
        </div>
        {/* Acceso rápido: Hoy */}
        <button
          onClick={() => setFilterDate(filterDate === todayYMD ? '' : todayYMD)}
          className={`px-3 py-2 rounded-xl text-xs font-black transition-colors border ${filterDate === todayYMD ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-amber-400 hover:text-amber-600'}`}
        >
          Hoy
        </button>
        {(filterDate || filterEstado) && (
          <button onClick={() => { setFilterDate(''); setFilterEstado(''); }} className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-red-500 transition-colors">
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Barra de acción bulk */}
      {selectedBulk.size > 0 && (
        <div className="flex flex-wrap items-center gap-4 bg-amber-50 border-2 border-amber-300 rounded-2xl px-5 py-3 animate-fade-in">
          <span className="text-sm font-black text-amber-800">
            {selectedBulk.size} solicitud{selectedBulk.size > 1 ? 'es' : ''} seleccionada{selectedBulk.size > 1 ? 's' : ''} · <span className="font-mono">{fmt(totalBulkSelected)}</span>
          </span>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => setSelectedBulk(new Set())}
              className="px-4 py-2 rounded-xl text-xs font-black text-slate-600 hover:bg-white transition-colors border border-slate-200"
            >
              Cancelar
            </button>
            <button
              onClick={handleBulkProcess}
              disabled={bulkProcesando}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black transition-all disabled:opacity-50 shadow-sm"
            >
              <CheckCircle size={14} />
              {bulkProcesando ? 'Procesando...' : `Marcar ${selectedBulk.size} como Procesadas`}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <CheckCircle size={40} className="mx-auto mb-4 text-emerald-300" />
          <p className="font-bold">No hay solicitudes{filterDate || filterEstado ? ' con esos filtros' : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Header de selección masiva */}
          {pendientesFiltrados.length > 0 && (
            <div className="flex items-center gap-2 px-2">
              <button
                onClick={toggleAllPendientes}
                className="flex items-center gap-2 text-xs font-black text-slate-500 hover:text-amber-600 transition-colors"
              >
                {allPendientesSelected
                  ? <CheckSquare size={16} className="text-amber-500" />
                  : <Square size={16} />}
                {allPendientesSelected
                  ? 'Deseleccionar todos los pendientes'
                  : `Seleccionar ${pendientesFiltrados.length} pendiente${pendientesFiltrados.length > 1 ? 's' : ''}`}
              </button>
            </div>
          )}

          {filtered.map(req => (
            <div key={req.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${selectedBulk.has(req.id) ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-100'}`}>
              {/* Fila principal */}
              <div className="flex items-center gap-3 px-5 py-4">
                {/* Checkbox solo para pendientes */}
                {req.estado === 'PENDIENTE' ? (
                  <button
                    onClick={e => { e.stopPropagation(); toggleBulk(req.id); }}
                    className="shrink-0 text-slate-400 hover:text-amber-500 transition-colors"
                  >
                    {selectedBulk.has(req.id)
                      ? <CheckSquare size={18} className="text-amber-500" />
                      : <Square size={18} />}
                  </button>
                ) : (
                  <div className="w-[18px] shrink-0" />
                )}

                <div
                  className="flex-1 flex items-center gap-4 cursor-pointer hover:bg-slate-50 transition-all rounded-xl px-3 py-1 -mx-1"
                  onClick={() => setExpanded(expanded === req.id ? null : req.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {estadoChip(req.estado)}
                      <span className="text-[10px] text-slate-400">{new Date(req.createdAt).toLocaleString('es-CO')}</span>
                    </div>
                    <p className="font-black text-slate-800">{req.gestorName || 'Gestor'}</p>
                    <p className="text-xs text-slate-400">{req.creditIds.length} crédito{req.creditIds.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono font-black text-lg text-slate-800">{fmt(req.montoTotal)}</p>
                    {req.processedAt && (
                      <p className="text-[9px] text-slate-400">Procesado: {new Date(req.processedAt).toLocaleDateString('es-CO')}</p>
                    )}
                  </div>
                  {expanded === req.id ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
                </div>
              </div>

              {/* Detalle expandido */}
              {expanded === req.id && (
                <div className="px-6 pb-5 border-t border-slate-100 pt-4 space-y-3">
                  <div className="text-xs text-slate-500">
                    <span className="font-bold">IDs de créditos: </span>
                    <span className="font-mono">{req.creditIds.join(', ')}</span>
                  </div>
                  {req.notas && (
                    <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600">
                      <span className="font-bold">Nota: </span>{req.notas}
                    </div>
                  )}

                  {req.estado === 'PENDIENTE' && (
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => handleProcess(req.id)}
                        disabled={procesando === req.id}
                        className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-black text-sm transition-all disabled:opacity-50 shadow-sm"
                      >
                        <CheckCircle size={14} />
                        {procesando === req.id ? 'Procesando...' : 'Marcar como Procesado'}
                      </button>
                      <button
                        onClick={() => setRejectModal({ id: req.id, gestorName: req.gestorName || 'Gestor' })}
                        disabled={procesando === req.id}
                        className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-5 py-2.5 rounded-xl font-black text-sm transition-all disabled:opacity-50"
                      >
                        <XCircle size={14} /> Rechazar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal rechazar */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-slate-800">Rechazar Solicitud</h3>
            <p className="text-sm text-slate-500">Solicitud de <span className="font-bold text-slate-700">{rejectModal.gestorName}</span></p>
            <div>
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Motivo del rechazo (opcional)</label>
              <textarea
                value={rejectNota}
                onChange={e => setRejectNota(e.target.value)}
                placeholder="Ej: Documentación incompleta, error en datos..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setRejectModal(null); setRejectNota(''); }} className="flex-1 py-3 rounded-xl border-2 border-slate-200 font-black text-slate-600 hover:border-slate-300 transition-all">
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={procesando === rejectModal.id}
                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black transition-all disabled:opacity-50"
              >
                {procesando === rejectModal.id ? 'Rechazando...' : 'Confirmar Rechazo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

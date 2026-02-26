
import React, { useEffect, useState } from 'react';
import { User, Credit, WithdrawalRequest } from '../types';
import { MockService } from '../services/mockService';
import { Wallet, ArrowLeft, AlertCircle, CheckCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';

interface WalletViewProps {
  currentUser: User;
  onBack: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

export const WalletView: React.FC<WalletViewProps> = ({ currentUser, onBack }) => {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedReq, setExpandedReq] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [allCredits, allStates, allRequests] = await Promise.all([
        MockService.getCredits(currentUser),
        MockService.getStates(),
        MockService.getWithdrawalRequests(currentUser),
      ]);
      setStates(allStates);
      const disbursedIds = allStates.filter((s: any) => s.name.includes('DESEMBOLSADO')).map((s: any) => s.id);
      // IDs de créditos ya incluidos en un retiro activo (pendiente o procesado)
      const usedCreditIds = new Set(
        allRequests
          .filter(r => r.estado !== 'RECHAZADO')
          .flatMap(r => r.creditIds)
      );
      // Solo los desembolsados, con comisión no pagada, no incluidos en retiro activo, del gestor actual
      const available = allCredits.filter(c =>
        disbursedIds.includes(c.statusId) &&
        !c.comisionPagada &&
        !usedCreditIds.has(c.id) &&
        c.assignedGestorId === currentUser.id
      );
      setCredits(available);
      setRequests(allRequests);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const selectedCredits = credits.filter(c => selected.has(c.id));
  const totalSelected = selectedCredits.reduce((s, c) => s + (c.estimatedCommission || 0), 0);
  const totalPendiente = credits.reduce((s, c) => s + (c.estimatedCommission || 0), 0);
  const totalCobrado = requests.filter(r => r.estado === 'PROCESADO').reduce((s, r) => s + r.montoTotal, 0);

  // TODO: re-activar límite de 1 retiro por día en producción
  // const today = new Date(); today.setHours(0, 0, 0, 0);
  // const yaRetiroHoy = requests.some(r => new Date(r.createdAt) >= today && r.gestorId === currentUser.id);
  const yaRetiroHoy = false; // deshabilitado temporalmente para pruebas

  const handleSolicitar = async () => {
    if (selected.size === 0) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await MockService.createWithdrawalRequest(
        currentUser.id,
        Array.from(selected),
        totalSelected,
        currentUser
      );
      setShowConfirm(false);
      setSelected(new Set());
      await loadData();
    } catch (e: any) {
      setError(e.message || 'Error al solicitar retiro');
    } finally {
      setIsSubmitting(false);
    }
  };

  const estadoChip = (estado: string) => {
    if (estado === 'PROCESADO') return <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-1 rounded-full uppercase">Procesado</span>;
    if (estado === 'RECHAZADO') return <span className="bg-red-100 text-red-700 text-[10px] font-black px-2 py-1 rounded-full uppercase">Rechazado</span>;
    return <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-1 rounded-full uppercase">Pendiente</span>;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
          <ArrowLeft size={20} className="text-slate-500" />
        </button>
        <div>
          <h2 className="text-2xl font-display font-black text-slate-800 flex items-center gap-2">
            <Wallet size={22} className="text-amber-500" /> Mi Billetera
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Solo créditos desembolsados con comisión pendiente</p>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-5 text-white">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Por Cobrar</p>
          <p className="text-3xl font-mono font-black">{fmt(totalPendiente)}</p>
          <p className="text-[10px] opacity-70 mt-1">{credits.length} crédito{credits.length !== 1 ? 's' : ''} disponible{credits.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Ya Cobrado</p>
          <p className="text-3xl font-mono font-black text-emerald-600">{fmt(totalCobrado)}</p>
          <p className="text-[10px] text-slate-400 mt-1">{requests.filter(r => r.estado === 'PROCESADO').length} retiro{requests.filter(r => r.estado === 'PROCESADO').length !== 1 ? 's' : ''} procesado{requests.filter(r => r.estado === 'PROCESADO').length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Alerta 24h */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <AlertCircle size={16} className="text-blue-500 mt-0.5 shrink-0" />
        <div className="text-xs text-blue-800 space-y-0.5">
          <p className="font-black">Información importante sobre retiros</p>
          <p>• Solo puedes solicitar <span className="font-bold">1 retiro por día</span></p>
          <p>• El pago puede tardar hasta <span className="font-bold">24 horas hábiles</span> en procesarse</p>
          <p>• El retiro incluye el saldo completo de cada crédito seleccionado</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" /></div>
      ) : (
        <>
          {/* Lista de créditos disponibles */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-800 text-sm">Créditos Disponibles para Retirar</h3>
              {credits.length > 0 && (
                <button
                  onClick={() => setSelected(selected.size === credits.length ? new Set() : new Set(credits.map(c => c.id)))}
                  className="text-[10px] font-black text-amber-600 hover:text-amber-800 uppercase tracking-wide"
                >
                  {selected.size === credits.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                </button>
              )}
            </div>
            {credits.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <CheckCircle size={32} className="mx-auto mb-3 text-emerald-400" />
                <p className="font-bold text-sm">No tienes comisiones pendientes</p>
                <p className="text-xs mt-1">Todas tus comisiones han sido cobradas</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {credits.map(credit => {
                  const isSelected = selected.has(credit.id);
                  return (
                    <div
                      key={credit.id}
                      onClick={() => toggleSelect(credit.id)}
                      className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-all ${isSelected ? 'bg-amber-50' : 'hover:bg-slate-50'}`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'bg-amber-500 border-amber-500' : 'border-slate-300'}`}>
                        {isSelected && <span className="text-white text-[10px] font-black">✓</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-slate-800 truncate">{credit.nombreCompleto || `${credit.nombres} ${credit.apellidos}`}</p>
                        <p className="text-[10px] text-slate-400">{credit.entidadAliada || '—'} · {fmt(credit.monto || 0)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-mono font-black text-amber-700 text-sm">{fmt(credit.estimatedCommission || 0)}</p>
                        <p className="text-[9px] text-slate-400 uppercase">{credit.commissionPercentage || 0}% com.</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer con total y botón */}
            {credits.length > 0 && (
              <div className="p-5 border-t border-slate-100 bg-slate-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-slate-600">{selected.size} crédito{selected.size !== 1 ? 's' : ''} seleccionado{selected.size !== 1 ? 's' : ''}</span>
                  <span className="font-mono font-black text-amber-700 text-lg">{fmt(totalSelected)}</span>
                </div>
                {error && <p className="text-xs text-red-600 font-bold mb-3 bg-red-50 p-2 rounded-lg">{error}</p>}
                {yaRetiroHoy ? (
                  <div className="flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-3 rounded-xl text-sm font-bold">
                    <Clock size={16} />
                    Ya solicitaste un retiro hoy. Disponible mañana.
                  </div>
                ) : (
                  <button
                    onClick={() => { if (selected.size > 0) setShowConfirm(true); }}
                    disabled={selected.size === 0}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-3 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20"
                  >
                    Solicitar Retiro de {fmt(totalSelected)}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Historial de solicitudes */}
          {requests.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100">
                <h3 className="font-black text-slate-800 text-sm">Historial de Solicitudes</h3>
              </div>
              <div className="divide-y divide-slate-50">
                {requests.map(req => (
                  <div key={req.id}>
                    <div
                      className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-all"
                      onClick={() => setExpandedReq(expandedReq === req.id ? null : req.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {estadoChip(req.estado)}
                          <span className="text-[10px] text-slate-400">{new Date(req.createdAt).toLocaleDateString('es-CO')}</span>
                        </div>
                        <p className="font-mono font-black text-slate-800">{fmt(req.montoTotal)}</p>
                        <p className="text-[10px] text-slate-400">{req.creditIds.length} crédito{req.creditIds.length !== 1 ? 's' : ''}</p>
                      </div>
                      {expandedReq === req.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </div>
                    {expandedReq === req.id && req.notas && (
                      <div className="px-5 pb-4">
                        <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl"><span className="font-bold">Nota:</span> {req.notas}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal de confirmación */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5">
            <div>
              <h3 className="text-xl font-black text-slate-800">Confirmar Solicitud de Retiro</h3>
              <p className="text-sm text-slate-500 mt-1">Revisa los detalles antes de confirmar</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 font-bold">Créditos incluidos</span>
                <span className="font-black text-slate-800">{selected.size}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-amber-200 pt-2">
                <span className="text-slate-600 font-bold">Total a solicitar</span>
                <span className="font-mono font-black text-amber-700 text-lg">{fmt(totalSelected)}</span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle size={14} className="text-blue-500 mt-0.5 shrink-0" />
              <p className="text-[11px] text-blue-800">
                <span className="font-black">Recuerda:</span> El pago puede tardar hasta <span className="font-bold">24 horas hábiles</span>. Solo puedes hacer una solicitud por día.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl border-2 border-slate-200 font-black text-slate-600 hover:border-slate-300 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSolicitar}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black transition-all disabled:opacity-50 shadow-lg shadow-amber-500/20"
              >
                {isSubmitting ? 'Enviando...' : 'Confirmar Retiro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

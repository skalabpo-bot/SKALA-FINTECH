
import React, { useState, useEffect, useMemo } from 'react';
import { AnalysisResult, LoanConfiguration, CarteraItem, SimulationResult, ProductType } from '../types';
import { getTermsForEntity } from '../services/fpmService';
import { simulateLoan, calculateDisbursement } from '../services/calculatorService';
import { useSimulator } from '../context/SimulatorContext';

interface LoanConfiguratorProps {
  analysis: AnalysisResult;
  onSimulate: (config: LoanConfiguration) => void;
  onBack: () => void;
  selectedPagaduria?: string;
}

export const LoanConfigurator: React.FC<LoanConfiguratorProps> = ({ analysis, onSimulate, onBack, selectedPagaduria }) => {
  const { state: { entities, fpmTable } } = useSimulator();

  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<number | null>(null);
  const [cushion, setCushion] = useState<number>(0);
  const [customQuota, setCustomQuota] = useState<number>(analysis.availableQuota);

  // Buyout Logic State
  const [manualCarteraItems, setManualCarteraItems] = useState<CarteraItem[]>([]);
  const [selectedDeductions, setSelectedDeductions] = useState<Set<number>>(new Set());

  // Visible entities filtered by pagaduría
  const pagKey = selectedPagaduria?.toUpperCase().trim() ?? '';
  const visibleEntities = useMemo(() => {
    if (!selectedPagaduria) return entities;
    return entities.filter(e => e.pagadurias.length > 0 && e.pagadurias.some(p => p.toUpperCase().trim() === pagKey));
  }, [entities, selectedPagaduria, pagKey]);

  // Auto-select first entity
  useEffect(() => {
    if (visibleEntities.length > 0 && !selectedEntityId) {
      setSelectedEntityId(visibleEntities[0].id);
    }
  }, [visibleEntities]);

  // Terms for selected entity
  const selectedEntity = useMemo(() => entities.find(e => e.id === selectedEntityId), [entities, selectedEntityId]);

  const terms = useMemo(() => {
    if (!selectedEntity) return [];
    return getTermsForEntity(selectedEntity.name);
  }, [selectedEntity, fpmTable]);

  // Auto-select first term when entity changes
  useEffect(() => {
    if (terms.length > 0) {
      // Try to keep current term if available, else select last (longest)
      if (selectedTerm && terms.includes(selectedTerm)) return;
      // Default to 144 months if available, otherwise longest term
      setSelectedTerm(terms.includes(144) ? 144 : terms[terms.length - 1]);
    } else {
      setSelectedTerm(null);
    }
  }, [terms]);

  // Check if selected entity+term combo has FPM factors
  const hasFactorsForSelection = useMemo(() => {
    if (!selectedEntity || !selectedTerm) return false;
    return fpmTable.some(f => f.entityName === selectedEntity.name && f.termMonths === selectedTerm);
  }, [selectedEntity, selectedTerm, fpmTable]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
  };

  // Cartera policies
  const effectiveMaxCartera: number | undefined = (() => {
    if (!selectedEntity) return undefined;
    if (selectedPagaduria && selectedEntity.pagaduriaMaxCartera?.[selectedPagaduria] != null) {
      return selectedEntity.pagaduriaMaxCartera[selectedPagaduria];
    }
    return selectedEntity.maxCartera;
  })();
  const totalCarteraCount = selectedDeductions.size + manualCarteraItems.filter(i => Number(i.amount) > 0).length;
  const carteraAtLimit = effectiveMaxCartera != null && totalCarteraCount >= effectiveMaxCartera;

  const toggleDeduction = (index: number) => {
    const newSelected = new Set(selectedDeductions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      if (carteraAtLimit) return; // Block adding when at limit
      newSelected.add(index);
    }
    setSelectedDeductions(newSelected);
  };

  const addManualItem = () => {
    if (carteraAtLimit) return;
    setManualCarteraItems(prev => [...prev, { entity: '', amount: 0 }]);
  };
  const removeManualItem = (i: number) => setManualCarteraItems(prev => prev.filter((_, idx) => idx !== i));
  const updateManualItem = (i: number, field: keyof CarteraItem, value: string | number) =>
    setManualCarteraItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const calculateTotalBuyout = () => {
    let total = 0;
    if (analysis.detailedDeductions) {
      analysis.detailedDeductions.forEach((item, idx) => {
        if (selectedDeductions.has(idx)) total += item.amount;
      });
    }
    manualCarteraItems.forEach(item => { total += Number(item.amount) || 0; });
    return total;
  };

  const currentBuyoutQuota = calculateTotalBuyout();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEntity && selectedTerm) {
      const carteraItems: CarteraItem[] = [];
      if (analysis.detailedDeductions) {
        analysis.detailedDeductions.forEach((item, idx) => {
          if (selectedDeductions.has(idx)) carteraItems.push({ entity: item.name, amount: item.amount });
        });
      }
      manualCarteraItems.forEach(item => {
        if (Number(item.amount) > 0) carteraItems.push({ entity: item.entity || 'Sin nombre', amount: Number(item.amount) });
      });

      onSimulate({
        entityName: selectedEntity.name,
        termMonths: selectedTerm,
        safetyCushion: Number(cushion),
        buyoutQuota: currentBuyoutQuota,
        cashFee: selectedEntity.cashFee ?? 15157,
        bankFee: selectedEntity.bankFee ?? 7614,
        carteraItems: carteraItems.length > 0 ? carteraItems : undefined,
        customQuota: customQuota < analysis.availableQuota ? customQuota : undefined,
        commissions: selectedEntity.commissions,
      });
    }
  };

  const availableAfterCushion = Math.max(0, customQuota + currentBuyoutQuota - cushion);

  // Entity type label for summary
  const entityTypeLabels: Record<string, string> = {
    CREMIL: 'CREMIL — 50% Salario Bruto',
    MIN_DEFENSA: 'Min Defensa — Ley 50 + SMMLV',
    SEGUROS_ALFA: 'Seguros Alfa — 52% Neto',
    GENERAL: '50% Ingreso Neto',
  };

  // Live simulation preview
  const liveSimulations = useMemo((): SimulationResult[] => {
    if (!selectedEntity || !selectedTerm || !hasFactorsForSelection || availableAfterCushion <= 0) return [];
    const results = simulateLoan(availableAfterCushion, {
      entityName: selectedEntity.name,
      termMonths: selectedTerm,
      safetyCushion: 0,
      buyoutQuota: 0,
      cashFee: selectedEntity.cashFee ?? 15157,
      bankFee: selectedEntity.bankFee ?? 7614,
      commissions: selectedEntity.commissions,
    }, fpmTable);
    // Sort by gestor commission (highest first)
    return results.sort((a, b) => (b.commissionPct ?? 0) - (a.commissionPct ?? 0));
  }, [selectedEntity, selectedTerm, hasFactorsForSelection, availableAfterCushion, fpmTable]);

  const viableLive = liveSimulations.filter(s => s.isViable);
  const nonViableLive = liveSimulations.filter(s => !s.isViable);

  const getCardColor = (product: ProductType) => {
    switch (product) {
      case ProductType.ORO: return 'from-amber-400 to-amber-600';
      case ProductType.PLATINO: return 'from-slate-400 to-slate-600';
      case ProductType.ZAFIRO: return 'from-blue-500 to-blue-700';
      case ProductType.LIBRE_INVERSION: return 'from-emerald-400 to-emerald-600';
      case ProductType.COMPRA_CARTERA: return 'from-indigo-400 to-indigo-600';
      default: return 'from-slate-600 to-slate-800';
    }
  };

  const isDataLoading = entities.length === 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

      {/* Columna Izquierda: Resumen */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-slate-900 text-white rounded-2xl shadow-xl p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20 -translate-y-10 translate-x-10 group-hover:opacity-30 transition-opacity duration-500"></div>

          <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Cupo Inicial (Ley)</h4>
          {analysis.entityType !== 'GENERAL' && (
            <span className="inline-flex items-center gap-1 bg-green-500/20 text-green-300 border border-green-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 uppercase tracking-wider">
              {entityTypeLabels[analysis.entityType] || analysis.entityType}
            </span>
          )}
          <div className="text-4xl font-extrabold mb-8 tracking-tight text-white font-mono">
            {formatCurrency(analysis.availableQuota)}
          </div>
          <div className="space-y-4">
             <div className="flex justify-between items-center text-sm border-b border-white/10 pb-3">
               <span className="text-slate-400 font-medium">{['CREMIL', 'MIN_DEFENSA'].includes(analysis.entityType) ? 'Salario Bruto' : 'Ingreso Neto'}</span>
               <span className="font-mono font-bold">{formatCurrency(analysis.netIncome)}</span>
             </div>
             <div className="flex justify-between items-center text-sm border-b border-white/10 pb-3">
               <span className="text-slate-400 font-medium">Capacidad Ley</span>
               <span className="font-mono font-bold text-green-400">{formatCurrency(analysis.legalCapacity)}</span>
             </div>
             <div className="flex justify-between items-center text-sm pt-1">
               <span className="text-slate-400 font-medium">Deducciones</span>
               <span className="font-mono font-bold text-red-400">- {formatCurrency(analysis.others + analysis.embargos)}</span>
             </div>
          </div>
        </div>
      </div>

      {/* Columna Derecha: Formulario */}
      <div className="lg:col-span-2 relative">
        {isDataLoading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mb-2"></div>
                    <p className="text-sm font-bold text-slate-600">Cargando Entidades...</p>
                </div>
            </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">

           <div className="mb-8 border-b border-slate-100 pb-6">
             <h3 className="text-xl font-bold text-slate-800">Parametrizacion del Credito</h3>
             <p className="text-sm text-slate-500 mt-1">Configure los parametros para generar las opciones viables.</p>
           </div>

           <div className="space-y-8">

              {/* Entity Selector - RICH CARDS */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 ml-1">Entidad Financiera</label>
                {visibleEntities.length === 0 && !isDataLoading ? (
                    <div className="text-center p-8 border-dashed border-2 border-slate-200 rounded-2xl text-slate-400 bg-slate-50">
                        {selectedPagaduria
                          ? `No hay entidades disponibles para ${selectedPagaduria}.`
                          : 'No hay entidades activas. Configure en Admin.'}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {visibleEntities.map(ent => {
                        const isSelected = selectedEntityId === ent.id;
                        return (
                            <div
                                key={ent.id}
                                onClick={() => setSelectedEntityId(ent.id)}
                                className={`cursor-pointer relative overflow-hidden rounded-xl p-5 transition-all duration-300 group shadow-sm
                                    ${isSelected ? 'shadow-xl scale-[1.02] ring-2 ring-offset-2 ring-primary-500' : 'hover:shadow-md border border-slate-100 hover:border-slate-300 bg-white hover:bg-slate-50'}
                                `}
                            >
                                {isSelected && (
                                   <div className="absolute inset-0 opacity-10" style={{ background: `linear-gradient(135deg, ${ent.primaryColor}, ${ent.secondaryColor})` }}></div>
                                )}

                                <div className="flex items-center justify-between z-10 relative">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isSelected ? 'bg-white shadow-sm' : 'bg-slate-100'}`}>
                                            {ent.logoUrl ? (
                                                <img src={ent.logoUrl} alt={ent.name} className="w-8 h-8 object-contain" />
                                            ) : (
                                                <span className={`font-bold text-lg ${isSelected ? 'text-primary-600' : 'text-slate-500'}`}>{ent.name.charAt(0)}</span>
                                            )}
                                        </div>
                                        <div>
                                            <span className={`font-bold text-lg block ${isSelected ? 'text-primary-900' : 'text-slate-700'}`}>{ent.name}</span>
                                            {isSelected && <span className="text-[10px] font-bold uppercase tracking-wide text-primary-600">Seleccionado</span>}
                                        </div>
                                    </div>

                                    {isSelected && (
                                        <div className="bg-primary-500 p-1.5 rounded-full text-white shadow-lg transform scale-100 transition-transform">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    </div>
                )}
              </div>

              {/* Term Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 ml-1">Plazo (Meses)</label>
                {terms.length === 0 ? (
                  <div className="text-center p-4 border-dashed border-2 border-amber-200 rounded-xl text-amber-600 bg-amber-50 text-sm font-medium">
                    {selectedEntity ? `No hay factores para ${selectedEntity.name}. Configure en Admin.` : 'Seleccione una entidad.'}
                  </div>
                ) : terms.length <= 12 ? (
                  <div className="flex flex-wrap gap-2">
                    {terms.map(term => {
                      const isActive = selectedTerm === term;
                      return (
                        <button
                          key={term}
                          type="button"
                          onClick={() => setSelectedTerm(term)}
                          className={`px-5 py-3 rounded-xl font-bold text-sm transition-all duration-200
                            ${isActive
                              ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30 scale-105'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                            }`}
                        >
                          {term}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={terms[0]}
                      max={terms[terms.length - 1]}
                      step={1}
                      value={selectedTerm ?? terms[terms.length - 1]}
                      onChange={e => {
                        const val = Number(e.target.value);
                        // Snap to nearest valid term
                        const closest = terms.reduce((prev, curr) => Math.abs(curr - val) < Math.abs(prev - val) ? curr : prev);
                        setSelectedTerm(closest);
                      }}
                      className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <select
                        value={selectedTerm ?? ''}
                        onChange={e => setSelectedTerm(Number(e.target.value))}
                        className="px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-mono font-bold text-lg focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all"
                      >
                        {terms.map(t => (
                          <option key={t} value={t}>{t} meses</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Live Preview Cards — right after term selector */}
              {viableLive.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 ml-1">
                    Vista Previa — {viableLive.length} producto{viableLive.length > 1 ? 's' : ''} viable{viableLive.length > 1 ? 's' : ''}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {viableLive.map((sim, i) => {
                      const gradient = getCardColor(sim.product);
                      const disbursement = calculateDisbursement(sim.maxAmount, sim.discountPct, 'bancaria', selectedEntity?.cashFee ?? 15157, selectedEntity?.bankFee ?? 7614);
                      return (
                        <div key={i} className={`bg-gradient-to-br ${gradient} rounded-xl p-4 text-white shadow-lg transition-all duration-300`}>
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{sim.product}</p>
                          <p className="text-xl font-mono font-extrabold mt-1">{formatCurrency(sim.maxAmount)}</p>
                          {sim.discountPct > 0 && (
                            <p className="text-[10px] font-bold opacity-80 mt-1">Desembolso: {formatCurrency(disbursement)}</p>
                          )}
                          <div className="flex justify-between mt-2 text-[10px] font-bold opacity-70">
                            <span>{sim.rate}% M.V.</span>
                            <span>{sim.term} meses</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {nonViableLive.length > 0 && (
                    <p className="text-xs text-slate-400 mt-2 ml-1">
                      {nonViableLive.length} producto{nonViableLive.length > 1 ? 's' : ''} no viable{nonViableLive.length > 1 ? 's' : ''}: {nonViableLive.map(s => s.product).join(', ')}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {/* Cushion */}
                 <div className="group">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 ml-1 group-focus-within:text-primary-600 transition-colors">Colchon de Seguridad</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-slate-400 font-bold text-lg group-focus-within:text-primary-500 transition-colors">$</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={cushion}
                        onChange={(e) => setCushion(Number(e.target.value))}
                        className="block w-full pl-9 pr-4 py-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-bold text-xl font-mono shadow-sm"
                      />
                    </div>
                 </div>

                 {/* Custom Quota */}
                 <div className="group">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 ml-1 group-focus-within:text-primary-600 transition-colors">Cuota a Utilizar</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-slate-400 font-bold text-lg group-focus-within:text-primary-500 transition-colors">$</span>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={analysis.availableQuota}
                        step={1}
                        value={customQuota}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setCustomQuota(Math.min(analysis.availableQuota, Math.max(0, val)));
                        }}
                        className="block w-full pl-9 pr-4 py-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-bold text-xl font-mono shadow-sm"
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5 ml-1">
                      Cupo disponible: {formatCurrency(analysis.availableQuota)}
                      {customQuota < analysis.availableQuota && (
                        <span className="ml-2 text-amber-500 font-bold">Reducida manualmente</span>
                      )}
                    </p>
                 </div>
              </div>

              {/* Buyout Section */}
              <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 shadow-inner">
                 <div className="flex items-center justify-between mb-4">
                     <h4 className="font-bold text-blue-900 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-blue-500">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" />
                        </svg>
                        Compra de Cartera
                     </h4>
                     <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">Opcional</span>
                 </div>

                 {effectiveMaxCartera != null && (
                   <div className={`flex items-start gap-2 px-3 py-2 rounded-lg mb-4 text-xs font-semibold ${carteraAtLimit ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-amber-50 border border-amber-200 text-amber-800'}`}>
                     <span className="mt-0.5 text-base">{carteraAtLimit ? '' : ''}</span>
                     <span>
                       <strong>{selectedEntity?.name}</strong> acepta maximo{' '}
                       <strong>{effectiveMaxCartera} {effectiveMaxCartera === 1 ? 'compra de cartera' : 'compras de cartera'}</strong>
                       {selectedPagaduria && selectedEntity?.pagaduriaMaxCartera?.[selectedPagaduria] != null && (
                         <> en <strong>{selectedPagaduria}</strong></>
                       )}.
                       {carteraAtLimit && <span className="ml-1 font-bold">Ya alcanzaste el limite.</span>}
                       {!carteraAtLimit && effectiveMaxCartera != null && (
                         <span className="ml-1">Llevas {totalCarteraCount} de {effectiveMaxCartera}.</span>
                       )}
                     </span>
                   </div>
                 )}

                 {analysis.detailedDeductions && analysis.detailedDeductions.length > 0 && (
                    <div className="space-y-2 mb-6">
                       <p className="text-xs text-blue-400 uppercase font-bold tracking-wider mb-2 ml-1">Detectado en Desprendible</p>
                       {analysis.detailedDeductions.map((item, idx) => {
                          const isSelected = selectedDeductions.has(idx);
                          return (
                            <div
                                key={idx}
                                onClick={() => toggleDeduction(idx)}
                                className={`flex justify-between items-center p-3 rounded-lg border cursor-pointer transition-all duration-200
                                    ${isSelected
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-md transform scale-[1.01]'
                                        : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50'}`}
                            >
                               <span className="font-medium text-sm">{item.name}</span>
                               <span className="font-mono font-bold">{formatCurrency(item.amount)}</span>
                            </div>
                          );
                       })}
                    </div>
                 )}

                 {/* Manual cartera rows */}
                 <div>
                     <div className="flex items-center justify-between mb-2">
                         <label className="text-xs text-blue-800 font-bold uppercase tracking-wide ml-1">Agregar Manualmente</label>
                         <button
                             type="button"
                             onClick={addManualItem}
                             disabled={carteraAtLimit}
                             className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                         >
                             + Anadir
                         </button>
                     </div>
                     <div className="space-y-2">
                         {manualCarteraItems.map((item, i) => (
                             <div key={i} className="flex gap-2 items-center">
                                 <input
                                     type="text"
                                     value={item.entity}
                                     onChange={e => updateManualItem(i, 'entity', e.target.value)}
                                     placeholder="Entidad"
                                     className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-blue-200 bg-white text-blue-900 text-sm placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 font-medium"
                                 />
                                 <div className="relative flex-shrink-0">
                                     <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-blue-400 font-bold text-sm pointer-events-none">$</span>
                                     <input
                                         type="number"
                                         value={item.amount || ''}
                                         onChange={e => updateManualItem(i, 'amount', Number(e.target.value))}
                                         placeholder="0"
                                         className="w-36 pl-6 pr-2 py-2 rounded-lg border border-blue-200 bg-white text-blue-900 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                     />
                                 </div>
                                 <button
                                     type="button"
                                     onClick={() => removeManualItem(i)}
                                     className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0 font-bold text-sm"
                                     title="Eliminar"
                                 >x</button>
                             </div>
                         ))}
                         {manualCarteraItems.length === 0 && !carteraAtLimit && (
                             <button
                                 type="button"
                                 onClick={addManualItem}
                                 className="w-full py-2.5 border border-dashed border-blue-200 text-blue-400 text-xs font-bold rounded-xl hover:border-blue-400 hover:text-blue-600 transition-colors"
                             >
                                 + Agregar cartera manual
                             </button>
                         )}
                     </div>
                 </div>

                 <div className="mt-6 pt-4 border-t border-blue-200 flex justify-between items-end">
                     <span className="text-sm text-blue-700 font-medium">Total a Recoger</span>
                     <span className="text-2xl font-mono font-extrabold text-blue-900">{formatCurrency(currentBuyoutQuota)}</span>
                 </div>
              </div>

              {/* FPM Validation Warning */}
              {selectedEntity && selectedTerm && !hasFactorsForSelection && (
                <div className="p-4 bg-amber-50 border-l-4 border-amber-500 text-amber-700 rounded-r-lg text-sm font-medium">
                  No hay factores FPM para <strong>{selectedEntity.name}</strong> a <strong>{selectedTerm} meses</strong>. Configure los factores en Admin.
                </div>
              )}

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-50 p-6 rounded-2xl border border-slate-200 gap-4">
                 <div className="text-center sm:text-left">
                     <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Cupo Final Estimado</p>
                     <p className={`text-2xl font-extrabold font-mono ${availableAfterCushion > 0 ? 'text-slate-800' : 'text-red-600'}`}>
                       {formatCurrency(availableAfterCushion)}
                     </p>
                 </div>
                 <div className="flex gap-4 w-full sm:w-auto">
                    <button type="button" onClick={onBack} className="px-6 py-3 text-slate-500 font-bold hover:text-slate-800 transition-colors flex-1 sm:flex-none">Volver</button>
                    <button
                        type="submit"
                        disabled={!selectedEntityId || !selectedTerm || availableAfterCushion <= 0 || !hasFactorsForSelection}
                        className="bg-primary-600 text-white px-8 py-4 rounded-xl font-bold shadow-xl shadow-primary-600/20 hover:bg-primary-700 hover:shadow-2xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none"
                    >
                      Realizar Simulacion
                    </button>
                 </div>
              </div>

           </div>
        </form>
      </div>
    </div>
  );
};

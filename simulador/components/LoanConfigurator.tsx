
import React, { useState, useEffect } from 'react';
import { AnalysisResult, LoanConfiguration, FinancialEntity } from '../types';
import { loadFPMData, getTermsForEntity } from '../services/fpmService';
import { getAllEntities } from '../services/entityService';

interface LoanConfiguratorProps {
  analysis: AnalysisResult;
  onSimulate: (config: LoanConfiguration) => void;
  onBack: () => void;
}

export const LoanConfigurator: React.FC<LoanConfiguratorProps> = ({ analysis, onSimulate, onBack }) => {
  const [entities, setEntities] = useState<FinancialEntity[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [terms, setTerms] = useState<number[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<number | null>(144);
  const [cushion, setCushion] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Buyout Logic State
  const [manualBuyoutInput, setManualBuyoutInput] = useState<number>(0);
  const [selectedDeductions, setSelectedDeductions] = useState<Set<number>>(new Set()); 

  useEffect(() => {
    const initData = async () => {
        setIsLoading(true);
        // Load FPMs and Entities parallel
        const [_, ents] = await Promise.all([loadFPMData(), getAllEntities()]);
        setEntities(ents);
        
        if (ents.length > 0) setSelectedEntityId(ents[0].id);
        setIsLoading(false);
    };
    initData();
  }, []);

  useEffect(() => {
    if (selectedEntityId) {
      const ent = entities.find(e => e.id === selectedEntityId);
      if (ent) {
          // Pass the NAME to get terms, because FPMs are linked by name
          const entityTerms = getTermsForEntity(ent.name);
          setTerms(entityTerms);
      }
    }
  }, [selectedEntityId, entities]);

  const toggleDeduction = (index: number) => {
    const newSelected = new Set(selectedDeductions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedDeductions(newSelected);
  };

  const calculateTotalBuyout = () => {
    let total = manualBuyoutInput;
    if (analysis.detailedDeductions) {
      analysis.detailedDeductions.forEach((item, idx) => {
        if (selectedDeductions.has(idx)) {
          total += item.amount;
        }
      });
    }
    return total;
  };

  const currentBuyoutQuota = calculateTotalBuyout();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ent = entities.find(e => e.id === selectedEntityId);
    if (ent && selectedTerm) {
      onSimulate({
        entityName: ent.name,
        termMonths: selectedTerm,
        safetyCushion: Number(cushion),
        buyoutQuota: currentBuyoutQuota,
        cashFee: ent.cashFee ?? 15157,
        bankFee: ent.bankFee ?? 7614,
      });
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
  };

  const availableAfterCushion = Math.max(0, analysis.availableQuota + currentBuyoutQuota - cushion);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Columna Izquierda: Resumen */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-slate-900 text-white rounded-2xl shadow-xl p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20 -translate-y-10 translate-x-10 group-hover:opacity-30 transition-opacity duration-500"></div>
          
          <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Cupo Inicial (Ley)</h4>
          {analysis.entityType === 'CREMIL' && (
            <span className="inline-flex items-center gap-1 bg-green-500/20 text-green-300 border border-green-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 uppercase tracking-wider">
              CREMIL — 50% Salario Bruto
            </span>
          )}
          <div className="text-4xl font-extrabold mb-8 tracking-tight text-white font-mono">
            {formatCurrency(analysis.availableQuota)}
          </div>
          <div className="space-y-4">
             <div className="flex justify-between items-center text-sm border-b border-white/10 pb-3">
               <span className="text-slate-400 font-medium">{analysis.entityType === 'CREMIL' ? 'Salario Bruto' : 'Ingreso Neto'}</span>
               <span className="font-mono font-bold">{formatCurrency(analysis.netIncome)}</span>
             </div>
             <div className="flex justify-between items-center text-sm border-b border-white/10 pb-3">
               <span className="text-slate-400 font-medium">50% Ley</span>
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
        {isLoading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mb-2"></div>
                    <p className="text-sm font-bold text-slate-600">Cargando Entidades...</p>
                </div>
            </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
           
           <div className="mb-8 border-b border-slate-100 pb-6">
             <h3 className="text-xl font-bold text-slate-800">Parametrización del Crédito</h3>
             <p className="text-sm text-slate-500 mt-1">Configure los parámetros para generar las opciones viables.</p>
           </div>

           <div className="space-y-8">
              
              {/* Entity Selector - RICH CARDS */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 ml-1">Entidad Financiera</label>
                {entities.length === 0 && !isLoading ? (
                    <div className="text-center p-8 border-dashed border-2 border-slate-200 rounded-2xl text-slate-400 bg-slate-50">
                        No hay entidades activas. Configure en Admin.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {entities.map(ent => {
                        const isSelected = selectedEntityId === ent.id;
                        return (
                            <div 
                                key={ent.id}
                                onClick={() => setSelectedEntityId(ent.id)}
                                className={`cursor-pointer relative overflow-hidden rounded-xl p-5 transition-all duration-300 group shadow-sm
                                    ${isSelected ? 'shadow-xl scale-[1.02] ring-2 ring-offset-2 ring-primary-500' : 'hover:shadow-md border border-slate-100 hover:border-slate-300 bg-white hover:bg-slate-50'}
                                `}
                            >
                                {/* Background color stripe when selected */}
                                {isSelected && (
                                   <div className="absolute inset-0 opacity-10" style={{ background: `linear-gradient(135deg, ${ent.primaryColor}, ${ent.secondaryColor})` }}></div>
                                )}

                                <div className="flex items-center justify-between z-10 relative">
                                    <div className="flex items-center gap-4">
                                        {/* Logo or Fallback */}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {/* Term */}
                 <div className="group">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 ml-1 group-focus-within:text-primary-600 transition-colors">Plazo (Meses)</label>
                    <input
                      type="number"
                      min="1"
                      max="180"
                      step="1"
                      value={selectedTerm || ''}
                      onChange={(e) => setSelectedTerm(e.target.value ? Number(e.target.value) : null)}
                      disabled={terms.length === 0}
                      placeholder="Ej: 36"
                      className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-4 px-5 text-slate-800 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 font-bold shadow-sm transition-all text-xl disabled:opacity-50 disabled:bg-slate-100"
                    />
                    <p className="text-xs text-slate-400 mt-1.5 ml-1">Hasta 180 meses · varía según pagaduría</p>
                 </div>

                 {/* Cushion */}
                 <div className="group">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 ml-1 group-focus-within:text-primary-600 transition-colors">Colchón de Seguridad</label>
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
              </div>

              {/* Buyout Section (Simplified Visual) */}
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
                 
                 {/* List of auto-detected deductions */}
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
                 
                 <div className="group">
                     <label className="text-xs text-blue-800 font-bold uppercase tracking-wide ml-1 mb-2 block group-focus-within:text-blue-600">Agregar Valor Manual</label>
                     <div className="relative">
                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-blue-400 font-bold group-focus-within:text-blue-600">$</span>
                         </div>
                         <input 
                            type="number" 
                            value={manualBuyoutInput} 
                            onChange={(e) => setManualBuyoutInput(Number(e.target.value))} 
                            className="block w-full pl-8 pr-4 py-3 rounded-xl border border-blue-200 bg-white text-blue-900 placeholder-blue-300 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-mono font-bold"
                            placeholder="0"
                         />
                     </div>
                 </div>

                 <div className="mt-6 pt-4 border-t border-blue-200 flex justify-between items-end">
                     <span className="text-sm text-blue-700 font-medium">Total a Recoger</span>
                     <span className="text-2xl font-mono font-extrabold text-blue-900">{formatCurrency(currentBuyoutQuota)}</span>
                 </div>
              </div>

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
                        disabled={!selectedEntityId || !selectedTerm || availableAfterCushion <= 0} 
                        className="bg-primary-600 text-white px-8 py-4 rounded-xl font-bold shadow-xl shadow-primary-600/20 hover:bg-primary-700 hover:shadow-2xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none"
                    >
                      Realizar Simulación
                    </button>
                 </div>
              </div>

           </div>
        </form>
      </div>
    </div>
  );
};


import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FinancialData, AnalysisResult, EntityType } from '../types';
import { calculateCapacity } from '../services/calculatorService';
import { analyzePaystubDocument } from '../services/geminiService';
import { useSimulator } from '../context/SimulatorContext';

interface FinancialFormProps {
  initialData?: FinancialData;
  onAnalysisComplete: (result: AnalysisResult) => void;
  onPaystubFile?: (file: File) => void;
  onEmployerName?: (name: string) => void;
  pagaduria?: string; // Pagaduría seleccionada por el usuario — determina la fórmula de cálculo
}

/** Mapea nombre de pagaduría → EntityType para el cálculo de ley */
const inferEntityType = (name: string): EntityType => {
  const n = name.toUpperCase();
  if (/\bCREMIL\b/.test(n)) return 'CREMIL';
  if (/MIN.*DEFENSA|MINDEFENSA|PENSIONADO.*MINDEFENSA/.test(n)) return 'MIN_DEFENSA';
  if (/SEGUROS ALFA|ALFA/.test(n)) return 'SEGUROS_ALFA';
  return 'GENERAL';
};

// Loading stage messages
const LOADING_STAGES = [
  'Optimizando imagen...',
  'Identificando campos...',
  'Extrayendo datos...',
  'Verificando...',
];

// Utility to compress image before sending to AI
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        const scaleSize = MAX_WIDTH / img.width;

        if (scaleSize < 1) {
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
        } else {
            canvas.width = img.width;
            canvas.height = img.height;
        }

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl.split(',')[1]);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

// Entity type badge config
const ENTITY_BADGES: Record<string, { label: string; color: string }> = {
  GENERAL: { label: 'Ley 1527 — 50% sobre ingreso neto (devengado - salud - pensión)', color: 'gray' },
  CREMIL: { label: 'CREMIL — Ley 50: 50% sobre salario bruto', color: 'green' },
  MIN_DEFENSA: { label: 'Min Defensa — Ley 1527 (>2 SMMLV) / protección SMMLV (≤2 SMMLV)', color: 'blue' },
  SEGUROS_ALFA: { label: 'Seguros Alfa — Ley 1527 al 48%', color: 'purple' },
};

export const FinancialForm: React.FC<FinancialFormProps> = ({ initialData, onAnalysisComplete, onPaystubFile, onEmployerName, pagaduria }) => {
  const { state: { smmlv } } = useSimulator();

  const onPaystubFileRef = useRef(onPaystubFile);
  const onEmployerNameRef = useRef(onEmployerName);
  useEffect(() => { onPaystubFileRef.current = onPaystubFile; }, [onPaystubFile]);
  useEffect(() => { onEmployerNameRef.current = onEmployerName; }, [onEmployerName]);

  const [data, setData] = useState<FinancialData>(initialData || {
    entityType: 'GENERAL',
    monthlyIncome: 0,
    mandatoryDeductions: 0,
    otherDeductions: 0,
    embargos: 0,
    detailedDeductions: [],
    manualQuota: 0
  });
  const [isAnalizing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUploadedPaystub, setHasUploadedPaystub] = useState(false);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [loadingStage, setLoadingStage] = useState(0);

  useEffect(() => {
    if (initialData) {
      setData(initialData);
    }
  }, [initialData]);

  // Animate loading stages
  useEffect(() => {
    if (!isAnalizing) {
      setLoadingStage(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStage(prev => (prev + 1) % LOADING_STAGES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [isAnalizing]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setData(prev => ({ ...prev, [name]: Number(value) }));
  };

  const handleCalculate = (currentData: FinancialData) => {
    // Si hay pagaduría seleccionada, su entityType tiene prioridad sobre lo que leyó Gemini
    const dataToUse = pagaduria
      ? { ...currentData, entityType: inferEntityType(pagaduria) }
      : currentData;
    const result = calculateCapacity(dataToUse, smmlv);
    onAnalysisComplete(result);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: income minimum
    if (!data.manualQuota || data.manualQuota <= 0) {
      if (data.monthlyIncome < 100000) {
        setError('El ingreso mensual debe ser mayor a $100,000.');
        return;
      }
      if (data.mandatoryDeductions + data.otherDeductions + data.embargos > data.monthlyIncome) {
        setError('Las deducciones no pueden ser mayores al ingreso.');
        return;
      }
    }

    if (data.manualQuota && data.manualQuota > 0) {
      handleCalculate(data);
      return;
    }
    if (data.monthlyIncome > 0) {
      handleCalculate(data);
      return;
    }
    setError('Por favor ingrese los datos del desprendible O una cuota directa.');
  };

  const processFile = useCallback(async (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setError('Formato no soportado. Use JPG, PNG o PDF.');
      return;
    }

    setLastFile(file);
    setIsAnalyzing(true);
    setError(null);

    try {
      let base64String = "";
      if (file.type.includes('image')) {
        base64String = await compressImage(file);
      } else {
        base64String = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const res = (reader.result as string).split(',')[1];
                resolve(res);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
      }

      const extractedData = await analyzePaystubDocument(base64String, file.type.includes('image') ? 'image/jpeg' : file.type);

      if (extractedData.employerName) {
        onEmployerNameRef.current?.(extractedData.employerName);
      }

      setData(prev => ({
        ...extractedData,
        // Si Gemini detectó cupo disponible (CREMIL), usarlo; sino, conservar el que el usuario ingresó
        manualQuota: extractedData.manualQuota || prev.manualQuota,
      }));

      setHasUploadedPaystub(true);
      handleCalculate(extractedData);

    } catch (err) {
      setError('No pudimos leer el documento automaticamente. Por favor ingrese los datos manualmente o reintente.');
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [smmlv]);

  const handleRetry = () => {
    if (lastFile) {
      processFile(lastFile);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onPaystubFileRef.current?.(file);
      processFile(file);
    }
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          const file = items[i].getAsFile();
          if (file) {
            onPaystubFileRef.current?.(file);
            processFile(file);
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processFile]);

  const isManualMode = (data.manualQuota || 0) > 0;

  const inputContainerClass = "group relative transition-all duration-300";
  const labelClass = "block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 ml-1 group-focus-within:text-primary-600 transition-colors";
  const inputClass = "block w-full pl-10 pr-4 py-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all font-mono font-bold text-xl shadow-sm group-hover:border-slate-300";
  const iconClass = "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary-500 transition-colors";

  // Entity badge — usar entityType de pagaduría si está disponible, sino el de Gemini
  const effectiveEntityType = pagaduria ? inferEntityType(pagaduria) : data.entityType;
  const badge = ENTITY_BADGES[effectiveEntityType];
  const badgeColors: Record<string, string> = {
    gray: 'bg-slate-100 text-slate-700 border-slate-300',
    green: 'bg-green-100 text-green-800 border-green-300',
    blue: 'bg-blue-100 text-blue-800 border-blue-300',
    purple: 'bg-purple-100 text-purple-800 border-purple-300',
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden font-sans">
      {/* Header */}
      <div className="px-8 py-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span className="bg-primary-100 text-primary-600 p-1.5 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </span>
            Analisis Financiero
          </h3>
          <p className="text-sm text-slate-500 mt-1 ml-10">Digitalizacion de desprendible y calculo de capacidad de ley.</p>
          {badge && (
            <div className={`ml-10 mt-2 inline-flex items-center gap-1.5 border text-xs font-bold px-3 py-1 rounded-full ${badgeColors[badge.color] || badgeColors.green}`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              {badge.label}
            </div>
          )}
          {hasUploadedPaystub && (
            <div className="ml-10 mt-2 inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-bold px-3 py-1 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              Desprendible cargado
            </div>
          )}
        </div>
      </div>

      <div className="p-8 space-y-8">

        {/* Dropzone IA — always visible */}
        <div className={`relative rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden group
          ${isAnalizing ? 'border-primary-400 bg-primary-50' : hasUploadedPaystub ? 'border-emerald-300 bg-emerald-50/30 hover:border-primary-400' : 'border-slate-300 hover:border-primary-400 hover:bg-slate-50'}`}>

          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
            accept="image/*,application/pdf"
            onChange={handleFileUpload}
            disabled={isAnalizing}
          />

          <div className="p-10 flex flex-col items-center justify-center text-center relative z-10">
            {isAnalizing ? (
              <div className="flex flex-col items-center animate-fade-in">
                 <div className="w-16 h-16 relative">
                    <div className="absolute inset-0 rounded-full border-4 border-primary-200"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" style={{animationDuration: '0.6s'}}></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-primary-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                      </svg>
                    </div>
                 </div>
                 <h4 className="mt-4 text-primary-900 font-bold text-lg">{LOADING_STAGES[loadingStage]}</h4>
                 <div className="flex gap-1 mt-3">
                   {LOADING_STAGES.map((_, i) => (
                     <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${i === loadingStage ? 'bg-primary-600 scale-125' : i < loadingStage ? 'bg-primary-300' : 'bg-slate-200'}`} />
                   ))}
                 </div>
              </div>
            ) : (
              <>
                <div className={`w-16 h-16 rounded-2xl shadow-sm border flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 group-hover:shadow-md ${hasUploadedPaystub ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100'}`}>
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-8 h-8 ${hasUploadedPaystub ? 'text-emerald-500' : 'text-primary-600'}`}>
                      {hasUploadedPaystub ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      )}
                   </svg>
                </div>
                <h4 className="text-lg font-bold text-slate-700 group-hover:text-primary-700 transition-colors">
                  {hasUploadedPaystub ? 'Subir otro desprendible' : 'Arrastre su Desprendible aqui'}
                </h4>
                <p className="text-sm text-slate-400 mt-2 max-w-sm">
                  {hasUploadedPaystub
                    ? 'Puede subir otro archivo para reanalizar.'
                    : <>O haga clic para explorar. Soporta imagenes y PDF.
                        <span className="block mt-1 text-xs font-semibold text-primary-500 bg-primary-50 py-1 px-2 rounded-full inline-block">Tambien puede usar Ctrl + V</span>
                      </>
                  }
                </p>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg text-sm flex items-center gap-3 animate-fade-in shadow-sm">
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
               <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
             </svg>
             <span className="flex-1">{error}</span>
             {lastFile && !isAnalizing && (
               <button
                 type="button"
                 onClick={handleRetry}
                 className="ml-2 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold rounded-lg transition-colors flex-shrink-0"
               >
                 Reintentar
               </button>
             )}
          </div>
        )}

        <form onSubmit={handleManualSubmit} className="space-y-8">

          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 transition-all duration-300 ${isManualMode ? 'opacity-40 blur-[1px] pointer-events-none' : 'opacity-100'}`}>

            {/* Input Card 1: Ingreso */}
            <div className={inputContainerClass}>
              <label className={labelClass}>Ingreso Mensual</label>
              <div className="relative">
                <div className={iconClass}>
                  <span className="font-bold text-lg">$</span>
                </div>
                <input
                  type="number"
                  name="monthlyIncome"
                  value={data.monthlyIncome || ''}
                  onChange={handleInputChange}
                  className={inputClass}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Input Card 2: Ley */}
            <div className={inputContainerClass}>
              <label className={labelClass}>Descuentos Ley</label>
              <div className="relative">
                <div className={iconClass}>
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
                    </svg>
                </div>
                <input
                  type="number"
                  name="mandatoryDeductions"
                  value={data.mandatoryDeductions || ''}
                  onChange={handleInputChange}
                  className={inputClass}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Input Card 3: Otros */}
            <div className={inputContainerClass}>
              <label className={labelClass}>Otros Descuentos</label>
              <div className="relative">
                <div className={iconClass}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                </div>
                <input
                  type="number"
                  name="otherDeductions"
                  value={data.otherDeductions || ''}
                  onChange={handleInputChange}
                  className={inputClass}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Input Card 4: Embargos (Red Theme) */}
            <div className="group relative transition-all duration-300">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 ml-1 group-focus-within:text-red-600 transition-colors flex justify-between">
                Embargos
                {data.embargos > 0 && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-extrabold animate-pulse">DETECTADO</span>}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-red-500 transition-colors">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                </div>
                <input
                  type="number"
                  name="embargos"
                  value={data.embargos || ''}
                  onChange={handleInputChange}
                  className={`block w-full pl-10 pr-4 py-4 rounded-xl border bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-4 transition-all font-mono font-bold text-xl shadow-sm group-hover:border-slate-300
                    ${data.embargos > 0
                      ? 'border-red-300 text-red-700 bg-red-50 focus:border-red-500 focus:ring-red-500/20'
                      : 'border-slate-200 text-slate-800 focus:bg-white focus:border-red-500 focus:ring-red-500/10'}`}
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* DIVIDER: OR MANUAL QUOTA */}
          <div className="relative py-2">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-4 text-xs text-slate-400 font-bold uppercase tracking-widest">Opcion Avanzada</span>
              </div>
          </div>

          {/* Manual Quota Section */}
          <div className={`p-1 rounded-2xl transition-all duration-300 ${isManualMode ? 'bg-gradient-to-r from-primary-400 to-indigo-500 shadow-lg scale-[1.01]' : 'bg-transparent'}`}>
            <div className={`p-6 rounded-xl border transition-colors duration-300 ${isManualMode ? 'bg-white border-transparent' : 'bg-slate-50 border-slate-200 hover:border-primary-300'}`}>
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${isManualMode ? 'bg-primary-100 text-primary-600' : 'bg-slate-200 text-slate-500'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.033a.75.75 0 01.918-.165l2.775 1.256a.75.75 0 01.328.748L17.25 21M11.42 15.17l-4.655 5.653a.75.75 0 01-1.08 0l-4.214-4.214a.75.75 0 010-1.08l5.653-4.656a.75.75 0 011.08 0l4.214 4.214a.75.75 0 010 1.08zM6 6.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                          </svg>
                      </div>
                      Ingreso Directo de Cupo
                    </label>
                    <p className="text-xs text-slate-500 leading-relaxed ml-9">
                      Use esto si ya conoce la capacidad de endeudamiento exacta (Ej: Certificaciones CREMIL). <br/>
                      <span className="text-primary-600 font-semibold">Nota: Esto anula el calculo automatico.</span>
                    </p>
                  </div>
                  <div className="relative w-full md:w-72 group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className={`font-bold text-xl transition-colors ${isManualMode ? 'text-primary-500' : 'text-slate-300 group-focus-within:text-primary-400'}`}>$</span>
                      </div>
                      <input
                        type="number"
                        name="manualQuota"
                        value={data.manualQuota || ''}
                        onChange={handleInputChange}
                        className={`block w-full pl-10 pr-4 py-4 rounded-xl border focus:outline-none focus:ring-4 transition-all font-mono font-bold text-2xl shadow-sm
                            ${isManualMode
                                ? 'border-primary-300 bg-white text-primary-900 focus:border-primary-500 focus:ring-primary-500/20'
                                : 'border-slate-300 bg-white text-slate-400 focus:text-slate-900 focus:border-primary-500 focus:ring-primary-500/10'}`}
                        placeholder="0"
                      />
                  </div>
               </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isAnalizing}
              className={`
                px-10 py-4 rounded-xl font-bold shadow-xl transition-all flex items-center gap-3 text-sm uppercase tracking-wide w-full md:w-auto justify-center
                ${isAnalizing
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-2xl hover:-translate-y-1'
                }
              `}
            >
              <span>{isManualMode ? 'Simular Directamente' : 'Procesar Datos'}</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

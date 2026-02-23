import React, { useState } from 'react';
import { FPMEntry, ProductType } from '../types';
import { validateFPMFile } from '../services/calculatorService';

interface FPMLoaderProps {
  onFPMDataLoaded: (data: FPMEntry[]) => void;
}

const DEFAULT_MOCK_FPM = [
  { product: "Oro", term: 12, factor: 90000 },
  { product: "Oro", term: 24, factor: 48000 },
  { product: "Oro", term: 36, factor: 35000 },
  { product: "Oro", term: 48, factor: 29000 },
  { product: "Oro", term: 60, factor: 25000 },
  { product: "Platino", term: 48, factor: 27500 },
  { product: "Platino", term: 60, factor: 23500 },
  { product: "Zafiro", term: 60, factor: 21000 },
  { product: "Zafiro", term: 72, factor: 19500 },
];

export const FPMLoader: React.FC<FPMLoaderProps> = ({ onFPMDataLoaded }) => {
  const [jsonInput, setJsonInput] = useState(JSON.stringify(DEFAULT_MOCK_FPM, null, 2));
  const [error, setError] = useState<string | null>(null);

  const handleLoad = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const validation = validateFPMFile(parsed);
      
      if (!validation.valid) {
        setError(validation.error || 'Error desconocido en FPM');
        return;
      }

      onFPMDataLoaded(validation.entries);
    } catch (e) {
      setError('El formato JSON no es válido.');
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-primary-600">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
        </svg>
        Configuración de Factores (FPM)
      </h2>
      
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <span className="font-bold">Fuente de Verdad:</span> Los FPM cargados aquí serán inmutables durante la sesión. Asegúrese de que correspondan a la campaña vigente.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Pegar JSON de Factores
        </label>
        <textarea
          rows={10}
          className="w-full font-mono text-xs bg-slate-50 border border-slate-300 rounded-md p-3 focus:ring-primary-500 focus:border-primary-500"
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
        />
      </div>

      {error && (
        <div className="mb-4 text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200">
          ⚠️ {error}
        </div>
      )}

      <button
        onClick={handleLoad}
        className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-primary-700 transition-colors shadow-md flex justify-center items-center gap-2"
      >
        <span>Bloquear FPM e Iniciar</span>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
      </button>
    </div>
  );
};

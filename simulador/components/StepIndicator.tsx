import React from 'react';
import { AppStep } from '../types';

interface StepIndicatorProps {
  currentStep: AppStep;
  onGoToStep?: (step: AppStep) => void;
}

// Step icons as inline SVGs
const StepIcon: React.FC<{ step: AppStep; isCompleted: boolean }> = ({ step, isCompleted }) => {
  if (isCompleted) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
      </svg>
    );
  }

  switch (step) {
    case AppStep.PAYSTUB_UPLOAD:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
      );
    case AppStep.VERIFY_DATA:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case AppStep.CONFIGURE_LOAN:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
        </svg>
      );
    case AppStep.RESULTS:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
      );
    default:
      return null;
  }
};

const stepMeta = [
  { id: AppStep.PAYSTUB_UPLOAD, label: 'Desprendible', shortLabel: '1', desc: 'Subir documento' },
  { id: AppStep.VERIFY_DATA, label: 'Validar', shortLabel: '2', desc: 'Revisar datos' },
  { id: AppStep.CONFIGURE_LOAN, label: 'Configurar', shortLabel: '3', desc: 'Entidad y plazo' },
  { id: AppStep.RESULTS, label: 'Resultado', shortLabel: '4', desc: 'Simulacion' },
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, onGoToStep }) => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between w-full">
        {stepMeta.map((step, index) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          const isClickable = isCompleted && onGoToStep;

          return (
            <div key={step.id} className="flex flex-col items-center relative w-full">
              <button
                type="button"
                onClick={() => isClickable && onGoToStep(step.id)}
                disabled={!isClickable}
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 z-10
                  ${isActive ? 'bg-primary-600 text-white shadow-lg ring-4 ring-primary-100' :
                    isCompleted ? 'bg-green-500 text-white cursor-pointer hover:bg-green-600 hover:scale-110' : 'bg-slate-200 text-slate-400'}
                `}
              >
                <StepIcon step={step.id} isCompleted={isCompleted} />
              </button>

              {/* Label: full on sm+, short number on mobile */}
              <span className={`mt-2 text-xs font-semibold hidden sm:block ${isActive ? 'text-primary-700' : isCompleted ? 'text-green-600' : 'text-slate-400'}`}>
                {step.label}
              </span>
              <span className={`mt-1 text-[10px] hidden sm:block ${isActive ? 'text-primary-500' : 'text-slate-300'}`}>
                {step.desc}
              </span>
              {/* Mobile: show short label */}
              <span className={`mt-1.5 text-[10px] font-bold sm:hidden ${isActive ? 'text-primary-700' : isCompleted ? 'text-green-600' : 'text-slate-400'}`}>
                {step.label}
              </span>

              {/* Connector Line */}
              {index < stepMeta.length - 1 && (
                <div className={`absolute top-5 sm:top-6 left-1/2 w-full h-1 -z-0
                  ${isCompleted ? 'bg-green-500' : 'bg-slate-200'}`}></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

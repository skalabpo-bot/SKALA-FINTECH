import React from 'react';
import { AppStep } from '../types';

interface StepIndicatorProps {
  currentStep: AppStep;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  const steps = [
    { id: AppStep.PAYSTUB_UPLOAD, label: 'Desprendible' },
    { id: AppStep.VERIFY_DATA, label: 'Validar' },
    { id: AppStep.CONFIGURE_LOAN, label: 'Configurar' }, // New step
    { id: AppStep.RESULTS, label: 'Resultado' },
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between w-full">
        {steps.map((step, index) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <div key={step.id} className="flex flex-col items-center relative w-full">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 z-10 
                ${isActive ? 'bg-primary-600 text-white shadow-lg ring-4 ring-primary-100' : 
                  isCompleted ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                {isCompleted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <span className={`mt-2 text-xs font-medium hidden sm:block ${isActive ? 'text-primary-700' : 'text-slate-400'}`}>
                {step.label}
              </span>
              
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className={`absolute top-5 left-1/2 w-full h-1 -z-0 
                  ${isCompleted ? 'bg-green-500' : 'bg-slate-200'}`}></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

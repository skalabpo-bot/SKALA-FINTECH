
import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { StepIndicator } from './components/StepIndicator';
import { FinancialForm } from './components/FinancialForm';
import { LoanConfigurator } from './components/LoanConfigurator';
import { SimulationResults } from './components/SimulationResults';
import { AdminDashboard } from './components/AdminDashboard';
import { AdBanner } from './components/AdBanner';
import { PopupAd } from './components/PopupAd';
import { SimulatorProvider, useSimulator } from './context/SimulatorContext';
import { AppStep } from './types';

function SimulatorApp() {
  const {
    state,
    handleAnalysisComplete,
    handleSimulate,
    handleBackToVerify,
    handleReconfigure,
    handleReset,
    handleGoToStep,
    dispatch,
  } = useSimulator();

  const {
    currentStep, analysisResult, loanConfig, simulations,
    isProcessing, paymentMethod, clientData,
  } = state;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Top Banner - High Visibility */}
      <div className="mb-6">
        <AdBanner slotId="top-leaderboard" />
      </div>

      <StepIndicator currentStep={currentStep} onGoToStep={handleGoToStep} />

      <div className="mt-8 transition-all duration-500 min-h-[500px]">

        {(currentStep === AppStep.PAYSTUB_UPLOAD || currentStep === AppStep.VERIFY_DATA) && (
          <div className="animate-fade-in-up space-y-8">
            <FinancialForm
              initialData={analysisResult ? {
                entityType: analysisResult.entityType,
                monthlyIncome: analysisResult.rawIncome,
                mandatoryDeductions: analysisResult.mandatory,
                otherDeductions: analysisResult.others,
                embargos: analysisResult.embargos,
                detailedDeductions: analysisResult.detailedDeductions,
                manualQuota: analysisResult.isManual ? analysisResult.availableQuota : 0
              } : undefined}
              onAnalysisComplete={handleAnalysisComplete}
            />

            {/* Mid-content Banner for Upload Step */}
            <AdBanner slotId="upload-mid-rectangle" format="horizontal" className="opacity-80" />
          </div>
        )}

        {currentStep === AppStep.CONFIGURE_LOAN && analysisResult && (
          <div className="animate-fade-in-up space-y-8">
            <LoanConfigurator
              analysis={analysisResult}
              onSimulate={handleSimulate}
              onBack={handleBackToVerify}
            />

            {/* Bottom Banner for Config Step */}
            <AdBanner slotId="config-footer" />
          </div>
        )}

        {currentStep === AppStep.RESULTS && analysisResult && loanConfig && (
          <div className="animate-fade-in-up space-y-8">
            <SimulationResults
              analysis={analysisResult}
              config={loanConfig}
              simulations={simulations}
              onReset={handleReset}
              onReconfigure={handleReconfigure}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={(m) => dispatch({ type: 'SET_PAYMENT_METHOD', method: m })}
              clientData={clientData}
              onClientDataChange={(d) => dispatch({ type: 'SET_CLIENT_DATA', data: d })}
            />

            {/* Results Page Banner */}
            <AdBanner slotId="results-footer" className="mt-12" />
          </div>
        )}
      </div>

      {isProcessing && (
        <div className="fixed inset-0 bg-white/60 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-xl flex items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="font-bold text-slate-700">Calculando Simulacion...</span>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [isAdminMode, setIsAdminMode] = useState(false);

  const toggleAdmin = () => {
    setIsAdminMode(!isAdminMode);
  };

  return (
    <SimulatorProvider>
      <Layout isAdmin={isAdminMode} onToggleAdmin={toggleAdmin}>
        {!isAdminMode && <PopupAd />}

        {isAdminMode ? (
          <AdminDashboard />
        ) : (
          <SimulatorApp />
        )}
      </Layout>
    </SimulatorProvider>
  );
}

export default App;

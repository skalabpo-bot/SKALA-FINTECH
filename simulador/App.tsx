
import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { StepIndicator } from './components/StepIndicator';
import { FinancialForm } from './components/FinancialForm';
import { LoanConfigurator } from './components/LoanConfigurator';
import { SimulationResults } from './components/SimulationResults';
import { AdminDashboard } from './components/AdminDashboard';
import { AdBanner } from './components/AdBanner'; // Import AdBanner
import { PopupAd } from './components/PopupAd'; // Import PopupAd
import { AppStep, AnalysisResult, LoanConfiguration, SimulationResult, PaymentMethod, ClientData } from './types';
import { simulateLoan } from './services/calculatorService';
import { getFPMTable } from './services/fpmService';

function App() {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.PAYSTUB_UPLOAD);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [loanConfig, setLoanConfig] = useState<LoanConfiguration | null>(null);
  const [simulations, setSimulations] = useState<SimulationResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [clientData, setClientData] = useState<ClientData | null>(null);

  // Step 1: Analysis Complete
  const handleAnalysisComplete = (result: AnalysisResult) => {
    setAnalysisResult(result);
    setCurrentStep(AppStep.CONFIGURE_LOAN);
  };

  // Step 2: Configuration Complete (Simulate)
  const handleSimulate = async (config: LoanConfiguration) => {
    if (!analysisResult) return;
    
    setIsProcessing(true);
    try {
        // Ensure we have the latest FPM data from DB
        const fpmTable = await getFPMTable();
        const results = simulateLoan(analysisResult.availableQuota, config, fpmTable);
        
        setLoanConfig(config);
        setSimulations(results);
        setCurrentStep(AppStep.RESULTS);
    } catch (e) {
        console.error(e);
        alert("Error al simular. Verifique la conexión a base de datos.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleBackToVerify = () => {
    setCurrentStep(AppStep.VERIFY_DATA);
  };

  const handleReconfigure = () => {
    setCurrentStep(AppStep.CONFIGURE_LOAN);
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setLoanConfig(null);
    setSimulations([]);
    setClientData(null);
    setCurrentStep(AppStep.PAYSTUB_UPLOAD);
  };

  const toggleAdmin = () => {
    setIsAdminMode(!isAdminMode);
    // Reset calculator state when switching modes to avoid stale data
    handleReset();
  };

  return (
    <Layout isAdmin={isAdminMode} onToggleAdmin={toggleAdmin}>
      {/* Show Popup Ad ONLY if not in Admin Mode */}
      {!isAdminMode && <PopupAd />}
      
      {isAdminMode ? (
        <AdminDashboard />
      ) : (
        <div className="max-w-4xl mx-auto">
          {/* Top Banner - High Visibility */}
          <div className="mb-6">
             <AdBanner slotId="top-leaderboard" />
          </div>

          <StepIndicator currentStep={currentStep} />
          
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
                {/* We key this component to force re-render if user came back from Admin mode to ensure dropdowns have new entities */}
                <LoanConfigurator 
                  key={Date.now()}
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
                  onPaymentMethodChange={setPaymentMethod}
                  clientData={clientData}
                  onClientDataChange={setClientData}
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
                      <span className="font-bold text-slate-700">Calculando Simulación...</span>
                  </div>
              </div>
          )}
        </div>
      )}
    </Layout>
  );
}

export default App;

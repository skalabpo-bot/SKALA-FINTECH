
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import {
  AppStep, AnalysisResult, LoanConfiguration, SimulationResult,
  PaymentMethod, ClientData, FinancialEntity, FPMEntry
} from '../types';
import { getAllEntities } from '../services/entityService';
import { loadFPMData, getTermsForEntity } from '../services/fpmService';
import { getSmmlv, getRadicacionAbierta } from '../services/settingsService';
import { simulateLoan } from '../services/calculatorService';

// ─── State ───────────────────────────────────────────────────────────────────

interface SimulatorState {
  currentStep: AppStep;
  analysisResult: AnalysisResult | null;
  loanConfig: LoanConfiguration | null;
  simulations: SimulationResult[];
  isProcessing: boolean;
  paymentMethod: PaymentMethod;
  clientData: ClientData | null;
  // Cached data (loaded once)
  entities: FinancialEntity[];
  fpmTable: FPMEntry[];
  smmlv: number;
  radicacionAbierta: boolean;
  dataLoaded: boolean;
}

const initialState: SimulatorState = {
  currentStep: AppStep.PAYSTUB_UPLOAD,
  analysisResult: null,
  loanConfig: null,
  simulations: [],
  isProcessing: false,
  paymentMethod: 'efectivo',
  clientData: null,
  entities: [],
  fpmTable: [],
  smmlv: 1423500,
  radicacionAbierta: true,
  dataLoaded: false,
};

// ─── Actions ─────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_STEP'; step: AppStep }
  | { type: 'SET_ANALYSIS'; result: AnalysisResult }
  | { type: 'SET_CONFIG'; config: LoanConfiguration }
  | { type: 'SET_SIMULATIONS'; simulations: SimulationResult[] }
  | { type: 'SET_PROCESSING'; value: boolean }
  | { type: 'SET_PAYMENT_METHOD'; method: PaymentMethod }
  | { type: 'SET_CLIENT_DATA'; data: ClientData | null }
  | { type: 'SET_CACHED_DATA'; entities: FinancialEntity[]; fpmTable: FPMEntry[]; smmlv: number; radicacionAbierta: boolean }
  | { type: 'RESET' };

function reducer(state: SimulatorState, action: Action): SimulatorState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.step };
    case 'SET_ANALYSIS':
      return { ...state, analysisResult: action.result };
    case 'SET_CONFIG':
      return { ...state, loanConfig: action.config };
    case 'SET_SIMULATIONS':
      return { ...state, simulations: action.simulations };
    case 'SET_PROCESSING':
      return { ...state, isProcessing: action.value };
    case 'SET_PAYMENT_METHOD':
      return { ...state, paymentMethod: action.method };
    case 'SET_CLIENT_DATA':
      return { ...state, clientData: action.data };
    case 'SET_CACHED_DATA':
      return { ...state, entities: action.entities, fpmTable: action.fpmTable, smmlv: action.smmlv, radicacionAbierta: action.radicacionAbierta, dataLoaded: true };
    case 'RESET':
      return {
        ...state,
        currentStep: AppStep.PAYSTUB_UPLOAD,
        analysisResult: null,
        loanConfig: null,
        simulations: [],
        clientData: null,
        isProcessing: false,
      };
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface SimulatorContextValue {
  state: SimulatorState;
  dispatch: React.Dispatch<Action>;
  // Convenience actions
  handleAnalysisComplete: (result: AnalysisResult) => void;
  handleSimulate: (config: LoanConfiguration) => Promise<void>;
  handleBackToVerify: () => void;
  handleReconfigure: () => void;
  handleReset: () => void;
  handleGoToStep: (step: AppStep) => void;
}

const SimulatorContext = createContext<SimulatorContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export const SimulatorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load entities + FPM + SMMLV once
  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      try {
        const [entities, fpmTable, smmlv, radicacionAbierta] = await Promise.all([
          getAllEntities(),
          loadFPMData(),
          getSmmlv(),
          getRadicacionAbierta(),
        ]);
        if (!cancelled) {
          dispatch({ type: 'SET_CACHED_DATA', entities, fpmTable, smmlv, radicacionAbierta });
        }
      } catch (e) {
        console.error('Error loading simulator data:', e);
      }
    };
    loadData();
    return () => { cancelled = true; };
  }, []);

  const handleAnalysisComplete = useCallback((result: AnalysisResult) => {
    dispatch({ type: 'SET_ANALYSIS', result });
    dispatch({ type: 'SET_STEP', step: AppStep.CONFIGURE_LOAN });
  }, []);

  const handleSimulate = useCallback(async (config: LoanConfiguration) => {
    if (!state.analysisResult) return;

    dispatch({ type: 'SET_PROCESSING', value: true });
    try {
      const results = simulateLoan(state.analysisResult.availableQuota, config, state.fpmTable);
      dispatch({ type: 'SET_CONFIG', config });
      dispatch({ type: 'SET_SIMULATIONS', simulations: results });
      dispatch({ type: 'SET_STEP', step: AppStep.RESULTS });
    } catch (e) {
      console.error(e);
      alert('Error al simular. Verifique la conexión a base de datos.');
    } finally {
      dispatch({ type: 'SET_PROCESSING', value: false });
    }
  }, [state.analysisResult, state.fpmTable]);

  const handleBackToVerify = useCallback(() => {
    dispatch({ type: 'SET_STEP', step: AppStep.VERIFY_DATA });
  }, []);

  const handleReconfigure = useCallback(() => {
    dispatch({ type: 'SET_STEP', step: AppStep.CONFIGURE_LOAN });
  }, []);

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const handleGoToStep = useCallback((step: AppStep) => {
    // Only allow going back to completed steps
    if (step < state.currentStep) {
      dispatch({ type: 'SET_STEP', step });
    }
  }, [state.currentStep]);

  const value: SimulatorContextValue = {
    state,
    dispatch,
    handleAnalysisComplete,
    handleSimulate,
    handleBackToVerify,
    handleReconfigure,
    handleReset,
    handleGoToStep,
  };

  return (
    <SimulatorContext.Provider value={value}>
      {children}
    </SimulatorContext.Provider>
  );
};

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useSimulator = (): SimulatorContextValue => {
  const ctx = useContext(SimulatorContext);
  if (!ctx) throw new Error('useSimulator must be used within SimulatorProvider');
  return ctx;
};


import React, { useState, useEffect } from 'react';
import { FinancialForm } from '../simulador/components/FinancialForm';
import { LoanConfigurator } from '../simulador/components/LoanConfigurator';
import { SimulationResults } from '../simulador/components/SimulationResults';
import { SimulatorProvider } from '../simulador/context/SimulatorContext';
import { getRadicacionAbierta } from '../simulador/services/settingsService';
import {
  AppStep,
  AnalysisResult,
  LoanConfiguration,
  SimulationResult,
  PaymentMethod,
  ClientData,
  ProductType,
} from '../simulador/types';
import { simulateLoan, calculateDisbursement } from '../simulador/services/calculatorService';
import { getFPMTable } from '../simulador/services/fpmService';
import { MockService, COLOMBIAN_CITIES } from '../services/mockService';
import { User } from '../types';
import { X, Loader2, CheckCircle2, FileText, Zap } from 'lucide-react';

interface SimulatorViewProps {
  currentUser: User;
  onCreditCreated: (creditId: string) => void;
  onFillForm: (prefilled: Record<string, any>) => void;
  onCancel: () => void;
}

const PRODUCT_COLORS: Record<string, string> = {
  [ProductType.ORO]: 'from-amber-400 to-amber-600',
  [ProductType.PLATINO]: 'from-slate-400 to-slate-600',
  [ProductType.ZAFIRO]: 'from-blue-500 to-blue-700',
  [ProductType.LIBRE_INVERSION]: 'from-emerald-400 to-emerald-600',
  [ProductType.COMPRA_CARTERA]: 'from-indigo-400 to-indigo-600',
};

// Mapeo de ProductType a línea de crédito por defecto
const PRODUCT_TO_LINE: Partial<Record<ProductType, string>> = {
  [ProductType.LIBRE_INVERSION]: 'LIBRE INVERSION',
  [ProductType.COMPRA_CARTERA]: 'COMPRA DE CARTERA',
};

const fmt = (val: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

const parseCedulaDate = (raw: string): string => {
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const match = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!match) return '';
  const [, d, m, y] = match;
  const year = y.length === 2 ? `19${y}` : y;
  return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
};

const normalizeSex = (raw: string): string => {
  const v = (raw || '').trim().toUpperCase();
  if (v === 'M' || v === 'MASCULINO' || v === 'MALE') return 'MASCULINO';
  if (v === 'F' || v === 'FEMENINO' || v === 'FEMALE') return 'FEMENINO';
  return 'OTRO';
};

const mapPaymentMethod = (method: PaymentMethod): string =>
  method === 'bancaria' ? 'CUENTA_BANCARIA' : 'EFECTIVO';

const normalizeStr = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();

const matchCity = (raw: string): string => {
  if (!raw) return '';
  const norm = normalizeStr(raw);
  const exact = COLOMBIAN_CITIES.find(c => c === norm);
  if (exact) return exact;
  const partial = COLOMBIAN_CITIES.find(c => c.includes(norm) || norm.includes(c));
  return partial || '';
};

const inputCls = 'w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-primary focus:bg-white transition-all placeholder:text-slate-300';

export const SimulatorView: React.FC<SimulatorViewProps> = ({ currentUser, onCreditCreated, onFillForm, onCancel }) => {
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.PAYSTUB_UPLOAD);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [loanConfig, setLoanConfig] = useState<LoanConfiguration | null>(null);
  const [simulations, setSimulations] = useState<SimulationResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo');
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [selectedSimIdx, setSelectedSimIdx] = useState<number | null>(null);

  // Archivos capturados desde los componentes del simulador
  const [paystubFile, setPaystubFile] = useState<File | null>(null);
  const [cedulaFront, setCedulaFront] = useState<File | null>(null);
  const [cedulaBack, setCedulaBack] = useState<File | null>(null);
  const [employerName, setEmployerName] = useState('');

  // Tipo de pensión y documentos asociados
  const [pensionTypes, setPensionTypes] = useState<string[]>([]);
  const [tipoPension, setTipoPension] = useState('');
  const [resolucionPensionFile, setResolucionPensionFile] = useState<File | null>(null);
  const [dictamenFile, setDictamenFile] = useState<File | null>(null);
  const [paystub2File, setPaystub2File] = useState<File | null>(null);

  // Datos de contacto obligatorios
  const [correo, setCorreo] = useState('');
  const [telefonoCelular, setTelefonoCelular] = useState('');
  const [direccionCompleta, setDireccionCompleta] = useState('');
  const [barrio, setBarrio] = useState('');
  const [ciudadResidencia, setCiudadResidencia] = useState('');
  const [estadoCivil, setEstadoCivil] = useState('');
  const [cities, setCities] = useState<string[]>([]);

  // Línea de crédito (desde BD)
  const [creditLines, setCreditLines] = useState<string[]>([]);
  const [lineaCredito, setLineaCredito] = useState('');

  // Pagaduría seleccionada (step previo al desprendible)
  const [selectedPagaduria, setSelectedPagaduria] = useState('');
  const [pagaduriaItems, setPagaduriaItems] = useState<{ name: string; tipo: string }[]>([]);

  const [observaciones, setObservaciones] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [radicacionAbierta, setRadicacionAbierta] = useState(true);

  // Cargar líneas de crédito, tipos de pensión, ciudades y pagadurías desde la BD
  useEffect(() => {
    MockService.getCreditLines().then((lines: string[]) => setCreditLines(lines));
    MockService.getPensionTypes().then((types: string[]) => setPensionTypes(types));
    MockService.getCities().then((c: string[]) => setCities(c));
    MockService.getPagaduriaItems().then((items: { name: string; tipo: string }[]) => setPagaduriaItems(items));
    getRadicacionAbierta().then(setRadicacionAbierta);
  }, []);

  // Pre-seleccionar línea de crédito según la simulación elegida
  useEffect(() => {
    if (selectedSimIdx !== null) {
      const sim = simulations[selectedSimIdx];
      const suggested = PRODUCT_TO_LINE[sim.product] ?? '';
      if (suggested && !lineaCredito) setLineaCredito(suggested);
    }
  }, [selectedSimIdx]);

  const handleAnalysisComplete = (result: AnalysisResult) => {
    setAnalysisResult(result);
    setCurrentStep(AppStep.CONFIGURE_LOAN);
  };

  const handleSimulate = async (config: LoanConfiguration) => {
    if (!analysisResult) return;
    setIsProcessing(true);
    try {
      const fpmTable = await getFPMTable();
      const results = simulateLoan(config.customQuota ?? analysisResult.availableQuota, config, fpmTable);
      // Sort by gestor commission (highest first)
      results.sort((a, b) => (b.commissionPct ?? 0) - (a.commissionPct ?? 0));
      setLoanConfig(config);
      setSimulations(results);
      setSelectedSimIdx(null);
      setLineaCredito('');
      setCurrentStep(AppStep.RESULTS);
    } catch (e) {
      console.error(e);
      alert('Error al simular. Verifique la conexión.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReconfigure = () => setCurrentStep(AppStep.CONFIGURE_LOAN);

  const handleReset = () => {
    setAnalysisResult(null);
    setLoanConfig(null);
    setSimulations([]);
    setClientData(null);
    setSelectedSimIdx(null);
    setPaystubFile(null);
    setCedulaFront(null);
    setCedulaBack(null);
    setEmployerName('');
    setCorreo('');
    setTelefonoCelular('');
    setDireccionCompleta('');
    setLineaCredito('');
    setTipoPension('');
    setResolucionPensionFile(null);
    setDictamenFile(null);
    setPaystub2File(null);
    setBarrio('');
    setCiudadResidencia('');
    setEstadoCivil('');
    setSelectedPagaduria('');
    setObservaciones('');
    setCurrentStep(AppStep.PAYSTUB_UPLOAD);
  };

  /** Sube los archivos y devuelve el array de documentos */
  const uploadDocuments = async () => {
    const documents: any[] = [];
    const uploads: Array<{ file: File; docType: string }> = [];
    if (paystubFile) uploads.push({ file: paystubFile, docType: 'DESPRENDIBLE_1' });
    if (paystub2File) uploads.push({ file: paystub2File, docType: 'DESPRENDIBLE_2' });
    if (cedulaFront) uploads.push({ file: cedulaFront, docType: 'CEDULA_FRONTAL' });
    if (cedulaBack)  uploads.push({ file: cedulaBack,  docType: 'CEDULA_POSTERIOR' });
    if (resolucionPensionFile) uploads.push({ file: resolucionPensionFile, docType: 'RESOLUCION_PENSION' });
    if (dictamenFile) uploads.push({ file: dictamenFile, docType: 'DICTAMEN_INVALIDEZ' });
    for (const { file, docType } of uploads) {
      try {
        const url = await MockService.uploadImage(file);
        documents.push({
          id: Math.random().toString(36).substring(2, 11),
          name: file.name || `${docType.toLowerCase()}.jpg`,
          url,
          type: docType,
          uploadedAt: new Date(),
        });
      } catch (err) {
        console.warn(`No se pudo subir ${docType}:`, err);
      }
    }
    return documents;
  };

  /** Construye el objeto de datos del crédito con todo lo disponible */
  const buildCreditData = async () => {
    const sim = selectedSimIdx !== null ? simulations[selectedSimIdx] : null;

    const fromClient: Record<string, any> = {
      nombres: clientData?.firstName || '',
      apellidos: clientData?.lastName || '',
      nombreCompleto: clientData?.fullName || '',
      ...(clientData ? {
        numeroDocumento: clientData.idNumber || '',
        tipoDocumento: 'CEDULA',
        sexo: normalizeSex(clientData.sex),
        fechaNacimiento: parseCedulaDate(clientData.birthDate),
        ciudadNacimiento: matchCity(clientData.birthCity),
        fechaExpedicion: parseCedulaDate(clientData.expeditionDate),
        ciudadExpedicion: matchCity(clientData.expeditionCity),
      } : {}),
    };

    const fromSim: Record<string, any> = sim
      ? {
          monto: sim.maxAmount,
          montoDesembolso: calculateDisbursement(sim.maxAmount, sim.discountPct, paymentMethod),
          plazo: sim.term,
          tasa: sim.rate,
          entidadAliada: sim.entityName,
          lineaCredito: lineaCredito || sim.product,
        }
      : loanConfig
      ? {
          monto: simulations[0]?.maxAmount || 0,
          montoDesembolso: simulations[0] ? calculateDisbursement(simulations[0].maxAmount, simulations[0].discountPct, paymentMethod) : 0,
          plazo: loanConfig.termMonths,
          tasa: simulations[0]?.rate || 0,
          entidadAliada: loanConfig.entityName,
          lineaCredito: lineaCredito || simulations[0]?.product,
        }
      : { lineaCredito };

    const fromContact: Record<string, any> = {
      correo: correo.trim(),
      telefonoCelular: telefonoCelular.trim(),
      ...(direccionCompleta.trim() ? { direccionCompleta: direccionCompleta.trim() } : {}),
      ...(barrio.trim() ? { barrio: barrio.trim() } : {}),
      ...(ciudadResidencia ? { ciudadResidencia } : {}),
      ...(estadoCivil ? { estadoCivil } : {}),
    };

    const fromPayroll: Record<string, any> = {
      tipoDesembolso: mapPaymentMethod(paymentMethod),
      ...(employerName ? { pagaduria: employerName } : {}),
      ...(analysisResult ? { cuotaDisponible: analysisResult.availableQuota + (loanConfig?.buyoutQuota || 0) } : {}),
      ...(loanConfig?.customQuota != null ? { cuotaUtilizar: loanConfig.customQuota } : {}),
      ...(tipoPension ? { tipoPension } : {}),
      ...(loanConfig?.carteraItems && loanConfig.carteraItems.length > 0 ? { carteraItems: loanConfig.carteraItems } : {}),
    };

    const documents = await uploadDocuments();

    return {
      ...fromClient,
      ...fromSim,
      ...fromContact,
      ...fromPayroll,
      ...(documents.length > 0 ? { documents } : {}),
      ...(observaciones.trim() ? { observaciones: observaciones.trim() } : {}),
    };
  };

  /** Estado para modal de confirmación antes de radicar */
  const [showConfirmRadicar, setShowConfirmRadicar] = useState(false);
  const [confirmMode, setConfirmMode] = useState<'radicar' | 'formulario'>('radicar');

  /** Opción 1: Radicar directamente con los datos disponibles */
  const handleRadicarAhora = async () => {
    if (selectedSimIdx === null) {
      alert('Debes seleccionar una tarjeta de oferta antes de radicar.');
      return;
    }
    setConfirmMode('radicar');
    setShowConfirmRadicar(true);
  };

  const confirmarRadicacion = async () => {
    setShowConfirmRadicar(false);
    setIsCreating(true);
    try {
      const creditData = await buildCreditData();
      const result = await MockService.createCredit(creditData, currentUser);
      if (result?.id) onCreditCreated(result.id);
    } catch (err: any) {
      console.error('Error creando crédito:', err);
      alert(`Error al crear el crédito: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsCreating(false);
    }
  };

  /** Opción 2: Continuar llenando el formulario completo */
  const handleCompletarFormulario = async () => {
    if (selectedSimIdx === null) {
      alert('Debes seleccionar una tarjeta de oferta antes de continuar.');
      return;
    }
    setConfirmMode('formulario');
    setShowConfirmRadicar(true);
  };

  const confirmarCompletarFormulario = async () => {
    setShowConfirmRadicar(false);
    setIsCreating(true);
    try {
      const creditData = await buildCreditData();
      onFillForm(creditData);
    } finally {
      setIsCreating(false);
    }
  };

  const viableSimulations = simulations
    .map((s, i) => ({ ...s, originalIdx: i }))
    .filter(s => s.isViable);

  const cedulaReady = clientData !== null;

  // Validaciones inline
  const errCorreo = correo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim()) ? 'Formato inválido (ej: nombre@correo.com)' : '';
  const errCelular = telefonoCelular.trim() && !/^\d{7,10}$/.test(telefonoCelular.replace(/\s/g, '')) ? 'Debe tener 7 a 10 dígitos, sin letras' : '';
  const errDireccion = direccionCompleta.trim() && !/[a-zA-Z]/.test(direccionCompleta) ? 'Incluye letras en la dirección (Ej: Calle 5 # 10-23, no solo números)' : '';
  const errBarrio = barrio.trim() && /^\d+$/.test(barrio.trim()) ? 'El barrio no puede ser solo números' : '';

  const paystubReady = paystubFile !== null;

  const canCreate = cedulaReady &&
    paystubReady &&
    correo.trim() !== '' && !errCorreo &&
    telefonoCelular.trim() !== '' && !errCelular &&
    direccionCompleta.trim() !== '' && !errDireccion &&
    barrio.trim() !== '' && !errBarrio &&
    ciudadResidencia !== '' &&
    estadoCivil !== '';

  const STEP_LABELS = ['Nómina', 'Verificar', 'Configurar', 'Resultados'];
  const stepIndex = currentStep as number;

  return (
    <SimulatorProvider>
    <div className="animate-fade-in">
      {/* Radicación cerrada banner */}
      {!radicacionAbierta && (
        <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-2xl p-5 flex items-start gap-3">
          <span className="text-2xl mt-0.5">🔒</span>
          <div>
            <p className="text-sm font-black text-red-800">Radicacion cerrada temporalmente</p>
            <p className="text-xs text-red-600 mt-1">No es posible crear creditos en este momento. Puedes simular pero no radicar. Un administrador debe reabrir la radicacion.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-display font-black text-slate-800">Simulador de Libranza</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
            Paso {stepIndex + 1} de 4 — {STEP_LABELS[stepIndex]}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all"
        >
          <X size={14} /> Cancelar
        </button>
      </div>

      {/* Step bar */}
      <div className="flex items-center gap-2 mb-8">
        {STEP_LABELS.map((label, i) => (
          <React.Fragment key={i}>
            <div className="flex items-center gap-1.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                  i < stepIndex ? 'bg-green-500 text-white'
                  : i === stepIndex ? 'bg-primary text-white'
                  : 'bg-slate-200 text-slate-400'
                }`}
              >
                {i < stepIndex ? '✓' : i + 1}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-widest hidden sm:block ${i === stepIndex ? 'text-primary' : 'text-slate-400'}`}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`flex-1 h-0.5 rounded ${i < stepIndex ? 'bg-green-400' : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Paso 1 y 2: Nómina — Gate de pagaduría */}
      {(currentStep === AppStep.PAYSTUB_UPLOAD || currentStep === AppStep.VERIFY_DATA) && !selectedPagaduria && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl text-primary text-xl">🏦</div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Selecciona la Pagaduría</h3>
                <p className="text-xs text-slate-500">¿A qué pagaduría pertenece el cliente? Esto filtra las entidades disponibles.</p>
              </div>
            </div>
            <select
              value={selectedPagaduria}
              onChange={e => setSelectedPagaduria(e.target.value)}
              className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 px-4 text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
            >
              <option value="">-- Selecciona una pagaduría --</option>
              {Array.from(new Set(pagaduriaItems.map(p => p.tipo))).map(tipo => (
                <optgroup key={tipo} label={tipo}>
                  {pagaduriaItems.filter(p => p.tipo === tipo).map(p => (
                    <option key={p.name} value={p.name}>{p.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Paso 1 y 2: Nómina (solo si ya seleccionó pagaduría) */}
      {(currentStep === AppStep.PAYSTUB_UPLOAD || currentStep === AppStep.VERIFY_DATA) && selectedPagaduria && (
        <div className="space-y-4">
          {/* Chip de pagaduría seleccionada */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Pagaduría:</span>
            <span className="bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full border border-primary/20">{selectedPagaduria}</span>
            <button onClick={() => setSelectedPagaduria('')} className="text-xs text-slate-400 hover:text-red-500 transition-colors font-medium">Cambiar</button>
          </div>
          <FinancialForm
            initialData={
              analysisResult
                ? {
                    entityType: analysisResult.entityType,
                    monthlyIncome: analysisResult.rawIncome,
                    mandatoryDeductions: analysisResult.mandatory,
                    otherDeductions: analysisResult.others,
                    embargos: analysisResult.embargos,
                    detailedDeductions: analysisResult.detailedDeductions,
                    manualQuota: analysisResult.isManual ? analysisResult.availableQuota : 0,
                  }
                : undefined
            }
            onAnalysisComplete={handleAnalysisComplete}
            onPaystubFile={(file) => setPaystubFile(file)}
            onEmployerName={(name) => setEmployerName(name)}
            pagaduria={selectedPagaduria}
          />

          {/* Notas informativas del simulador */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-2.5">
            <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-3">📌 Notas importantes del simulador</p>
            <div className="space-y-2 text-xs text-blue-800">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">🔒</span>
                <p><span className="font-bold">Producto Vantage:</span> Aún no disponible para simular con IA. Por favor ingresa los datos manualmente.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">🎖️</span>
                <p><span className="font-bold">Mindefensa:</span> Se simula con base en los ingresos del desprendible. Recuerda validar la cuota disponible manualmente con el certificado oficial.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">✅</span>
                <p><span className="font-bold">Cuota disponible:</span> Verifica siempre la cuota con la pagaduría antes de comprometerte con el cliente.</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">🚀</span>
                <p><span className="font-bold">Próximamente:</span> Estaremos haciendo las adecuaciones necesarias para mejorar el simulador para ti. ¡Gracias por tu paciencia!</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paso 3: Configurar */}
      {currentStep === AppStep.CONFIGURE_LOAN && analysisResult && (
        <LoanConfigurator
          key={Date.now()}
          analysis={analysisResult}
          onSimulate={handleSimulate}
          onBack={() => setCurrentStep(AppStep.PAYSTUB_UPLOAD)}
          selectedPagaduria={selectedPagaduria}
        />
      )}

      {/* Paso 4: Resultados */}
      {currentStep === AppStep.RESULTS && analysisResult && loanConfig && (
        <div className="space-y-6">
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
            onCedulaFilesChange={(front, back) => {
              setCedulaFront(front);
              setCedulaBack(back);
            }}
            onSimulationSelect={(idx) => setSelectedSimIdx(idx)}
          />

          {/* Panel Crear Crédito */}
          {viableSimulations.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-xl space-y-6">
              <div>
                <h3 className="text-xl font-display font-black text-slate-800">Crear Crédito</h3>
                <p className="text-sm text-slate-400 mt-1">
                  Elige la simulación y completa los datos de contacto.
                  {(paystubFile || cedulaFront || cedulaBack) && (
                    <span className="ml-1 text-green-600 font-bold">
                      {[paystubFile && 'Nómina', (cedulaFront || cedulaBack) && 'Cédula'].filter(Boolean).join(' y ')} se adjuntarán.
                    </span>
                  )}
                </p>
              </div>

              {/* Indicador cuando no hay simulación seleccionada */}
              {selectedSimIdx === null && (
                <div className="flex flex-col items-center gap-3 py-8 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-slate-400">
                  <FileText size={28} className="opacity-40" />
                  <p className="text-sm font-bold">Selecciona una simulación arriba para ver el resumen</p>
                </div>
              )}

              {/* Tarjeta única de la mejor oferta */}
              {selectedSimIdx !== null && (() => {
                const sim = simulations[selectedSimIdx];
                const gradient = PRODUCT_COLORS[sim.product] ?? 'from-slate-500 to-slate-700';
                const disbursement = calculateDisbursement(sim.maxAmount, sim.discountPct, paymentMethod);
                const seguroAval = Math.floor(sim.maxAmount * (sim.discountPct / 100));
                const base = sim.maxAmount - seguroAval;
                const cuatroXMil = Math.floor(base * 0.004);
                const gastos = paymentMethod === 'bancaria' ? 7614 : 15157;
                return (
                  <div className={`relative rounded-2xl p-6 bg-gradient-to-br ${gradient} text-white shadow-xl`}>
                    <div className="absolute top-4 right-4">
                      <CheckCircle2 size={22} className="text-white/80" />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-0.5">{sim.entityName}</p>
                    <p className="text-base font-black">{sim.product}</p>

                    <div className="mt-4 mb-5">
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Monto Aprobado</p>
                      <p className="text-4xl font-mono font-extrabold">{fmt(sim.maxAmount)}</p>
                    </div>

                    <div className="bg-black/20 rounded-xl p-4 space-y-2 text-[11px] font-bold mb-4">
                      <div className="flex justify-between opacity-80">
                        <span>Seguro y Aval ({sim.discountPct}%)</span>
                        <span>- {fmt(seguroAval)}</span>
                      </div>
                      <div className="flex justify-between opacity-80">
                        <span>4×1000</span>
                        <span>- {fmt(cuatroXMil)}</span>
                      </div>
                      <div className="flex justify-between opacity-80">
                        <span>Gastos {paymentMethod === 'bancaria' ? 'bancarios' : 'efectivo'}</span>
                        <span>- {fmt(gastos)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-white/20 text-sm">
                        <span className="font-black uppercase tracking-wide">A Desembolsar</span>
                        <span className="font-black text-base">{fmt(disbursement)}</span>
                      </div>
                    </div>

                    <div className="flex justify-between text-[11px] font-black opacity-80">
                      <span>{sim.term} meses</span>
                      <span>{sim.rate}% M.V.</span>
                      <span>Factor {sim.fpmUsed.toFixed(8)}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Línea de crédito */}
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Línea de crédito</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {creditLines.map(line => (
                    <button
                      key={line}
                      onClick={() => setLineaCredito(lineaCredito === line ? '' : line)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border-2 transition-all text-left ${
                        lineaCredito === line
                          ? 'bg-primary border-primary text-white shadow-md'
                          : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-primary/40 hover:text-primary'
                      }`}
                    >
                      {line}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tipo de pensión */}
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Tipo de pensión</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {pensionTypes.map(pt => (
                    <button
                      key={pt}
                      onClick={() => { setTipoPension(tipoPension === pt ? '' : pt); setResolucionPensionFile(null); setDictamenFile(null); }}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border-2 transition-all ${
                        tipoPension === pt
                          ? 'bg-primary border-primary text-white shadow-md'
                          : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-primary/40 hover:text-primary'
                      }`}
                    >
                      {pt}
                    </button>
                  ))}
                </div>

                {/* Documentos condicionales por tipo de pensión */}
                {(tipoPension === 'SUSTITUCIÓN' || tipoPension === 'INVALIDEZ') && (
                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                    <p className="text-[9px] font-black text-amber-700 uppercase tracking-widest">
                      {tipoPension === 'INVALIDEZ' ? '⚠️ Documentos obligatorios' : 'Documento requerido'}
                    </p>
                    <div className={`grid gap-3 ${tipoPension === 'INVALIDEZ' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                      {/* Resolución de pensión */}
                      <label className={`flex items-center gap-3 p-3 rounded-xl border-2 border-dashed cursor-pointer transition-all ${resolucionPensionFile ? 'border-green-400 bg-green-50' : 'border-amber-300 bg-white hover:border-amber-400'}`}>
                        <input type="file" className="hidden" onChange={e => setResolucionPensionFile(e.target.files?.[0] || null)} />
                        <span className={`text-lg ${resolucionPensionFile ? '✅' : '📄'}`}>{resolucionPensionFile ? '✅' : '📄'}</span>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wide text-slate-600">Resolución de Pensión <span className="text-red-500">*</span></p>
                          <p className="text-[9px] text-slate-400 mt-0.5">{resolucionPensionFile ? resolucionPensionFile.name : 'Haz clic para subir'}</p>
                        </div>
                      </label>

                      {/* Dictamen — solo INVALIDEZ */}
                      {tipoPension === 'INVALIDEZ' && (
                        <label className={`flex items-center gap-3 p-3 rounded-xl border-2 border-dashed cursor-pointer transition-all ${dictamenFile ? 'border-green-400 bg-green-50' : 'border-red-300 bg-white hover:border-red-400'}`}>
                          <input type="file" className="hidden" onChange={e => setDictamenFile(e.target.files?.[0] || null)} />
                          <span className="text-lg">{dictamenFile ? '✅' : '📋'}</span>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-600">Dictamen de Invalidez <span className="text-red-500">*</span></p>
                            <p className="text-[9px] text-slate-400 mt-0.5">{dictamenFile ? dictamenFile.name : 'Haz clic para subir'}</p>
                          </div>
                        </label>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Segundo desprendible — opcional */}
              <div className={`rounded-2xl border-2 border-dashed p-4 transition-all ${paystub2File ? 'border-green-400 bg-green-50' : 'border-slate-200 bg-slate-50/50 hover:border-primary/30'}`}>
                <label className="flex items-center gap-4 cursor-pointer">
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf,application/pdf"
                    onChange={e => setPaystub2File(e.target.files?.[0] || null)}
                  />
                  <span className="text-2xl">{paystub2File ? '✅' : '📄'}</span>
                  <div className="flex-1">
                    <p className="text-xs font-black text-slate-700 uppercase tracking-wide">
                      Desprendible adicional
                      <span className="ml-2 text-[9px] font-bold bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full normal-case tracking-normal">Opcional</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {paystub2File ? paystub2File.name : 'Si tienes un segundo desprendible de nómina, súbelo aquí — agilizará el análisis de tu crédito'}
                    </p>
                  </div>
                  {paystub2File && (
                    <button
                      type="button"
                      onClick={e => { e.preventDefault(); setPaystub2File(null); }}
                      className="text-slate-300 hover:text-red-500 transition-colors p-1"
                    >
                      ✕
                    </button>
                  )}
                </label>
              </div>

              {/* Gate: desprendible obligatorio */}
              {!paystubReady && (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-5 space-y-2">
                  <p className="text-sm font-black text-orange-800">📄 Desprendible obligatorio</p>
                  <p className="text-xs text-orange-700">Debes subir al menos un desprendible de nomina para poder radicar el credito, asi el calculo se haya hecho manual.</p>
                </div>
              )}

              {/* Gate: cédula obligatoria antes de contacto */}
              {!cedulaReady && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 space-y-2">
                  <p className="text-sm font-black text-amber-800">📷 Paso obligatorio: lee la cédula con IA para continuar</p>
                  <p className="text-xs text-amber-700">Sube las fotos de la cédula en la sección de arriba y presiona "Leer Cédula con IA". No es posible continuar sin este paso.</p>
                </div>
              )}

              {/* Datos de contacto — solo visibles una vez cedulaReady */}
              {cedulaReady && (
                <div className="space-y-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Datos de contacto y residencia <span className="text-red-500">*obligatorios</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Correo */}
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Correo electrónico <span className="text-red-400">*</span></label>
                      <input
                        type="email"
                        placeholder="cliente@correo.com"
                        value={correo}
                        onChange={e => setCorreo(e.target.value)}
                        className={`${inputCls} ${errCorreo ? 'border-red-400 focus:border-red-400' : ''}`}
                      />
                      {errCorreo && <p className="text-[10px] text-red-500 font-bold mt-1 px-1">{errCorreo}</p>}
                    </div>
                    {/* Celular */}
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Celular <span className="text-red-400">*</span></label>
                      <input
                        type="tel"
                        placeholder="3001234567"
                        value={telefonoCelular}
                        onChange={e => setTelefonoCelular(e.target.value.replace(/[^\d\s]/g, ''))}
                        className={`${inputCls} ${errCelular ? 'border-red-400 focus:border-red-400' : ''}`}
                      />
                      {errCelular && <p className="text-[10px] text-red-500 font-bold mt-1 px-1">{errCelular}</p>}
                    </div>
                    {/* Dirección */}
                    <div className="sm:col-span-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Dirección de residencia <span className="text-red-400">*</span></label>
                      <input
                        type="text"
                        placeholder="Calle 5 # 10-23"
                        value={direccionCompleta}
                        onChange={e => setDireccionCompleta(e.target.value)}
                        className={`${inputCls} ${errDireccion ? 'border-red-400 focus:border-red-400' : ''}`}
                      />
                      {errDireccion && <p className="text-[10px] text-red-500 font-bold mt-1 px-1">⚠️ {errDireccion}</p>}
                    </div>
                    {/* Barrio */}
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Barrio <span className="text-red-400">*</span></label>
                      <input
                        type="text"
                        placeholder="Ej: El Poblado"
                        value={barrio}
                        onChange={e => setBarrio(e.target.value)}
                        className={`${inputCls} ${errBarrio ? 'border-red-400 focus:border-red-400' : ''}`}
                      />
                      {errBarrio && <p className="text-[10px] text-red-500 font-bold mt-1 px-1">{errBarrio}</p>}
                    </div>
                    {/* Ciudad residencia */}
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Ciudad de residencia <span className="text-red-400">*</span></label>
                      <select
                        value={ciudadResidencia}
                        onChange={e => setCiudadResidencia(e.target.value)}
                        className={inputCls}
                      >
                        <option value="">Seleccione...</option>
                        {cities.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    {/* Estado civil */}
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Estado civil <span className="text-red-400">*</span></label>
                      <select
                        value={estadoCivil}
                        onChange={e => setEstadoCivil(e.target.value)}
                        className={inputCls}
                      >
                        <option value="">Seleccione...</option>
                        <option value="SOLTERO">Soltero(a)</option>
                        <option value="CASADO">Casado(a)</option>
                        <option value="UNION_LIBRE">Unión libre</option>
                        <option value="DIVORCIADO">Divorciado(a)</option>
                        <option value="VIUDO">Viudo(a)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {cedulaReady && !canCreate && (
                <p className="text-xs text-center text-slate-400 font-medium">
                  Completa todos los campos marcados con <span className="text-red-400">*</span> para continuar
                </p>
              )}

              {/* Observaciones */}
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Observaciones <span className="text-slate-300 normal-case tracking-normal font-bold">(opcional — visible en la bandeja)</span>
                </p>
                <textarea
                  value={observaciones}
                  onChange={e => setObservaciones(e.target.value)}
                  placeholder="Ej: Cliente solicita desembolso urgente, tiene cartera con Bayport..."
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
              </div>

              {/* Botones duales */}
              {canCreate && (
                radicacionAbierta ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {/* Opción 1: Radicar ahora */}
                    <button
                      onClick={handleRadicarAhora}
                      disabled={isCreating}
                      className="flex flex-col items-center gap-2 py-5 px-4 rounded-2xl bg-primary hover:bg-orange-600 shadow-xl shadow-primary/30 transition-all text-white disabled:opacity-40"
                    >
                      {isCreating ? (
                        <Loader2 size={22} className="animate-spin" />
                      ) : (
                        <Zap size={22} />
                      )}
                      <span className="font-black text-sm uppercase tracking-wide">
                        {isCreating ? 'Radicando...' : 'Radicar Ahora'}
                      </span>
                      <span className="text-[10px] text-white/70 text-center leading-tight">Crea el crédito con los datos actuales y completa después</span>
                    </button>

                    {/* Opción 2: Completar formulario */}
                    <button
                      onClick={handleCompletarFormulario}
                      disabled={isCreating}
                      className="flex flex-col items-center gap-2 py-5 px-4 rounded-2xl border-2 border-slate-200 hover:border-primary/60 bg-white hover:bg-primary/5 transition-all text-slate-700 disabled:opacity-40"
                    >
                      <FileText size={22} className="text-slate-400" />
                      <span className="font-black text-sm uppercase tracking-wide">Completar Formulario</span>
                      <span className="text-[10px] text-slate-400 text-center leading-tight">Llena todos los datos del cliente antes de radicar</span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 text-center">
                    <span className="text-xl">🔒</span>
                    <p className="text-sm font-black text-red-800 mt-2">Radicacion cerrada</p>
                    <p className="text-xs text-red-600 mt-1">No es posible crear creditos en este momento.</p>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      {isProcessing && (
        <div className="fixed inset-0 bg-white/60 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-xl flex items-center gap-4">
            <Loader2 className="animate-spin text-primary" size={32} />
            <span className="font-bold text-slate-700">Calculando Simulación...</span>
          </div>
        </div>
      )}

      {/* Modal de confirmación antes de radicar */}
      {showConfirmRadicar && selectedSimIdx !== null && (() => {
        const sim = simulations[selectedSimIdx];
        const disbursement = calculateDisbursement(sim.maxAmount, sim.discountPct, paymentMethod);
        return (
          <div className="fixed inset-0 bg-slate-900/90 z-[60] flex items-center justify-center p-4 backdrop-blur-lg animate-fade-in">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-black text-slate-800 text-center mb-2">Confirmar Radicación</h3>
              <p className="text-xs text-slate-400 text-center mb-6">Verifica las condiciones antes de continuar</p>

              <div className="space-y-3 bg-slate-50 rounded-2xl p-5 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-bold">Cliente</span>
                  <span className="text-sm font-black text-slate-800">{clientData?.fullName || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-bold">Cédula</span>
                  <span className="text-sm font-black text-slate-800">{clientData?.idNumber || 'N/A'}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-bold">Entidad</span>
                  <span className="text-sm font-black text-slate-800">{sim.entityName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-bold">Producto</span>
                  <span className="text-sm font-black text-slate-800">{sim.product}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-bold">Monto Aprobado</span>
                  <span className="text-sm font-black text-green-600">${sim.maxAmount.toLocaleString('es-CO')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-bold">Monto Desembolso</span>
                  <span className="text-sm font-black text-blue-600">${disbursement.toLocaleString('es-CO')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-bold">Plazo</span>
                  <span className="text-sm font-black text-slate-800">{sim.term} meses</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-bold">Tasa</span>
                  <span className="text-sm font-black text-slate-800">{sim.rate}%</span>
                </div>
                {lineaCredito && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500 font-bold">Línea de Crédito</span>
                    <span className="text-sm font-black text-slate-800">{lineaCredito}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmRadicar(false)}
                  className="flex-1 py-4 text-slate-400 font-black uppercase text-[11px] hover:text-slate-600 transition-all tracking-widest"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => confirmMode === 'radicar' ? confirmarRadicacion() : confirmarCompletarFormulario()}
                  className="flex-[2] py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/30 transition-all uppercase text-[11px] tracking-widest hover:bg-orange-600 active:scale-95"
                >
                  {confirmMode === 'radicar' ? 'Confirmar y Radicar' : 'Confirmar y Continuar'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
    </SimulatorProvider>
  );
};


import { AnalysisResult, FinancialData, FPMEntry, SimulationResult, LoanConfiguration, PaymentMethod } from '../types';

// SMMLV default — se sobreescribe con el valor de DB via context
const DEFAULT_SMMLV = 1423500;

/**
 * Registry de métodos de cálculo por EntityType.
 * Cada método recibe (data, smmlv) y retorna AnalysisResult.
 */
type CalculationMethod = (data: FinancialData, smmlv: number) => AnalysisResult;

/** Ley 1527 — 50% del ingreso neto (bruto - deducciones de ley) */
const calculateGeneral: CalculationMethod = (data) => {
  const netIncome = data.monthlyIncome - data.mandatoryDeductions;
  const legalCapacity = Math.floor(netIncome * 0.5);
  const availableQuota = legalCapacity - data.otherDeductions - data.embargos;

  return {
    entityType: 'GENERAL',
    rawIncome: data.monthlyIncome,
    mandatory: data.mandatoryDeductions,
    others: data.otherDeductions,
    embargos: data.embargos,
    netIncome,
    legalCapacity,
    availableQuota: Math.max(0, availableQuota),
    detailedDeductions: data.detailedDeductions || [],
    isManual: false
  };
};

/** Ley 50 — CREMIL: 50% del salario bruto */
const calculateCremil: CalculationMethod = (data) => {
  const legalCapacity = Math.floor(data.monthlyIncome * 0.5);
  const availableQuota = legalCapacity - data.otherDeductions - data.embargos;
  return {
    entityType: 'CREMIL',
    rawIncome: data.monthlyIncome,
    mandatory: 0,
    others: data.otherDeductions,
    embargos: data.embargos,
    netIncome: data.monthlyIncome,
    legalCapacity,
    availableQuota: Math.max(0, availableQuota),
    detailedDeductions: data.detailedDeductions || [],
    isManual: false
  };
};

/** Min Defensa — Ley 50 (50% bruto) + restricción SMMLV para salarios ≤ 2 SMMLV */
const calculateMinDefensa: CalculationMethod = (data, smmlv) => {
  const legalCapacity50 = Math.floor(data.monthlyIncome * 0.5);

  let legalCapacity: number;
  if (data.monthlyIncome <= smmlv * 2) {
    // Si gana ≤ 2 SMMLV: capacidad = bruto - 1 SMMLV (respetar 1 salario mínimo)
    legalCapacity = Math.max(0, Math.floor(data.monthlyIncome - smmlv));
  } else {
    // Si gana > 2 SMMLV: capacidad completa 50%
    legalCapacity = legalCapacity50;
  }

  const availableQuota = legalCapacity - data.otherDeductions - data.embargos;
  return {
    entityType: 'MIN_DEFENSA',
    rawIncome: data.monthlyIncome,
    mandatory: 0,
    others: data.otherDeductions,
    embargos: data.embargos,
    netIncome: data.monthlyIncome,
    legalCapacity,
    availableQuota: Math.max(0, availableQuota),
    detailedDeductions: data.detailedDeductions || [],
    isManual: false
  };
};

/** Seguros Alfa — Ley 1527 pero al 52% (en vez de 50%) */
const calculateSegurosAlfa: CalculationMethod = (data) => {
  const netIncome = data.monthlyIncome - data.mandatoryDeductions;
  const legalCapacity = Math.floor(netIncome * 0.52);
  const availableQuota = legalCapacity - data.otherDeductions - data.embargos;

  return {
    entityType: 'SEGUROS_ALFA',
    rawIncome: data.monthlyIncome,
    mandatory: data.mandatoryDeductions,
    others: data.otherDeductions,
    embargos: data.embargos,
    netIncome,
    legalCapacity,
    availableQuota: Math.max(0, availableQuota),
    detailedDeductions: data.detailedDeductions || [],
    isManual: false
  };
};

/** Registry: EntityType → método de cálculo */
const calculationRegistry: Record<string, CalculationMethod> = {
  GENERAL: calculateGeneral,
  CREMIL: calculateCremil,
  MIN_DEFENSA: calculateMinDefensa,
  SEGUROS_ALFA: calculateSegurosAlfa,
};

/**
 * Calculates the legal capacity based on entity type.
 * Supports: GENERAL (Ley 1527), CREMIL (Ley 50), MIN_DEFENSA, SEGUROS_ALFA.
 * @param smmlv - Salario Mínimo (configurable desde admin, default 1,423,500)
 */
export const calculateCapacity = (data: FinancialData, smmlv: number = DEFAULT_SMMLV): AnalysisResult => {

  // 1. Check for Manual Quota Override
  if (data.manualQuota && data.manualQuota > 0) {
    return {
      entityType: data.entityType || 'GENERAL',
      rawIncome: data.monthlyIncome || 0,
      mandatory: data.mandatoryDeductions || 0,
      others: data.otherDeductions || 0,
      embargos: data.embargos || 0,
      netIncome: 0,
      legalCapacity: data.manualQuota,
      availableQuota: data.manualQuota,
      detailedDeductions: data.detailedDeductions || [],
      isManual: true
    };
  }

  // 2. Use registry to find calculation method
  const method = calculationRegistry[data.entityType] || calculateGeneral;
  return method(data, smmlv);
};

/**
 * Simulates loan based on configuration (Entity, Term, Cushion).
 * Formula: Loan Amount = (AdjustedQuota / FPM_Factor)
 */
export const simulateLoan = (
  availableQuota: number,
  config: LoanConfiguration,
  fpmTable: FPMEntry[]
): SimulationResult[] => {

  const adjustedQuota = Math.max(0, availableQuota + config.buyoutQuota - config.safetyCushion);

  const relevantFPMs = fpmTable.filter(f =>
    f.entityName === config.entityName &&
    f.termMonths === config.termMonths
  );

  const results: SimulationResult[] = [];

  relevantFPMs.forEach(entry => {
    const maxAmount = adjustedQuota / entry.factor;

    results.push({
      entityName: entry.entityName,
      product: entry.product,
      term: config.termMonths,
      rate: entry.rate,
      fpmUsed: entry.factor,
      finalQuotaUsed: adjustedQuota,
      maxAmount: Math.floor(maxAmount),
      isViable: adjustedQuota > 0 && maxAmount > 500000,
      discountPct: entry.discountPct ?? 0,
      commissionPct: config.commissions?.[entry.product] ?? undefined,
    });
  });

  return results;
};

/**
 * Calcula el monto neto a desembolsar después de descuentos.
 */
export const calculateDisbursement = (
  maxAmount: number,
  discountPct: number,
  paymentMethod: PaymentMethod,
  cashFee: number = 15157,
  bankFee: number = 7614
): number => {
  const seguroAval = Math.floor(maxAmount * (discountPct / 100));
  const base = maxAmount - seguroAval;
  const cuatroXMil = Math.floor(base * 0.004);
  const gastos = paymentMethod === 'efectivo' ? cashFee : bankFee;
  return Math.floor(base - cuatroXMil - gastos);
};

export const validateFPMFile = (data: any[]): { valid: boolean; entries: FPMEntry[]; error?: string } => {
  return { valid: true, entries: [] };
};

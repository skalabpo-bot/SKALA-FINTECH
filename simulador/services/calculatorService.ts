
import { AnalysisResult, FinancialData, FPMEntry, SimulationResult, LoanConfiguration, PaymentMethod } from '../types';

/**
 * Calculates the legal capacity strictly according to Law 1527.
 * Supports specialized logic for specific entities like CREMIL.
 * NOW SUPPORTS: Direct Manual Quota Override.
 */
export const calculateCapacity = (data: FinancialData): AnalysisResult => {
  
  // 1. Check for Manual Quota Override
  if (data.manualQuota && data.manualQuota > 0) {
    return {
      entityType: 'GENERAL',
      rawIncome: 0,
      mandatory: 0,
      others: 0,
      embargos: 0,
      netIncome: 0,
      legalCapacity: data.manualQuota, // Assume the manual quota is the capacity
      availableQuota: data.manualQuota,
      detailedDeductions: [],
      isManual: true
    };
  }

  // 2. CREMIL: 50% del salario bruto directamente (sin restar deducciones de ley primero)
  if (data.entityType === 'CREMIL') {
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
  }

  // 3. Cálculo estándar (Ley 1527 - 50% del ingreso neto)
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

/**
 * Simulates loan based on configuration (Entity, Term, Cushion).
 * Formula: Loan Amount = ((AvailableQuota + BuyoutQuota - Cushion) / FPM) * 1,000,000
 */
export const simulateLoan = (
  availableQuota: number,
  config: LoanConfiguration,
  fpmTable: FPMEntry[]
): SimulationResult[] => {
  
  // 1. Calculate Base Capacity Logic
  // Available Quota (from Paystub) + Buyout Quota (Deductions we are removing) - Safety Cushion
  const adjustedQuota = Math.max(0, availableQuota + config.buyoutQuota - config.safetyCushion);

  // 2. Filter FPMs by Entity and Term
  const relevantFPMs = fpmTable.filter(f => 
    f.entityName === config.entityName && 
    f.termMonths === config.termMonths
  );

  const results: SimulationResult[] = [];

  relevantFPMs.forEach(entry => {
    // 3. Calculate Exact Amount
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
 * Fórmula:
 *   base = maxAmount - (maxAmount * discountPct / 100)   [descuento seguro y aval]
 *   4x1000 = base * 0.004
 *   gastos = 15157 (efectivo) | 7614 (bancaria)
 *   desembolso = base - 4x1000 - gastos
 */
export const calculateDisbursement = (
  maxAmount: number,
  discountPct: number,
  paymentMethod: PaymentMethod
): number => {
  const seguroAval = Math.floor(maxAmount * (discountPct / 100));
  const base = maxAmount - seguroAval;
  const cuatroXMil = Math.floor(base * 0.004);
  const gastos = paymentMethod === 'efectivo' ? 15157 : 7614;
  return Math.floor(base - cuatroXMil - gastos);
};

export const validateFPMFile = (data: any[]): { valid: boolean; entries: FPMEntry[]; error?: string } => {
  // Legacy validator - kept for compatibility if needed, but primary source is now internal service
  return { valid: true, entries: [] }; 
};

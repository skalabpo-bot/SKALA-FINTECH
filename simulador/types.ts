
export enum ProductType {
  ORO = 'Oro',
  PLATINO = 'Platino',
  ZAFIRO = 'Zafiro',
  LIBRE_INVERSION = 'Libre Inversión',
  COMPRA_CARTERA = 'Compra de Cartera'
}

export type EntityType = 'GENERAL' | 'CREMIL';

export interface FinancialEntity {
  id: string;
  name: string;
  logoUrl?: string; // Mapped from logo_url
  primaryColor: string; // Mapped from primary_color
  secondaryColor: string; // Mapped from secondary_color
  cashFee: number; // Gastos retiro efectivo, mapped from cash_fee
  bankFee: number; // Gastos retiro bancaria, mapped from bank_fee
}

export interface FPMEntry {
  id: string;
  entityName: string; // Mapped from entity_name
  product: ProductType;
  termMonths: number; // Mapped from term_months
  rate: number;
  factor: number;
  discountPct: number; // Descuento seguro y aval (%), mapped from discount_pct
}

export type PaymentMethod = 'efectivo' | 'bancaria';

export interface ClientData {
  fullName: string;
  firstName: string;
  lastName: string;
  idNumber: string;
  sex: string;
  birthDate: string;
  birthCity: string;
  expeditionDate: string;
  expeditionCity: string;
}

export interface AdConfig {
  id: string;
  slotId: string; // Mapped from slot_id
  name: string; 
  type: 'image' | 'html';
  content: string; 
  linkUrl?: string; // Mapped from link_url
  active: boolean;
  startDate?: string; // Mapped from start_date
  endDate?: string; // Mapped from end_date
}

export interface DeductionItem {
  name: string;
  amount: number;
}

export interface FinancialData {
  entityType: EntityType;
  monthlyIncome: number;
  mandatoryDeductions: number; // Salud, Pensión, Ley
  otherDeductions: number; // Libranzas, préstamos, etc.
  embargos: number; // Retenciones judiciales
  detailedDeductions?: DeductionItem[]; // AI extracted list of deductions
  manualQuota?: number; // New field for direct quota entry
  employerName?: string; // AI extracted employer/pagaduría name
}

export interface AnalysisResult {
  entityType: EntityType;
  rawIncome: number;
  mandatory: number;
  others: number;
  embargos: number;
  netIncome: number;
  legalCapacity: number; // 50% of Net Income
  availableQuota: number; // Legal Capacity - Others - Embargos
  detailedDeductions: DeductionItem[]; // Passed through to UI
  isManual: boolean; // Flag to indicate manual override
}

export interface LoanConfiguration {
  entityName: string;
  termMonths: number;
  safetyCushion: number; // El "colchón" que se resta del cupo
  buyoutQuota: number; // Valor de cuota de cartera que se va a recoger (se suma al cupo)
  cashFee: number; // Gastos retiro efectivo de la entidad
  bankFee: number; // Gastos retiro bancaria de la entidad
}

export interface SimulationResult {
  entityName: string;
  product: ProductType;
  term: number;
  rate: number; // Added to carry the rate through to UI
  fpmUsed: number;
  finalQuotaUsed: number; // The quota after cushion and buyouts
  maxAmount: number;
  isViable: boolean;
  discountPct: number; // Descuento seguro y aval (%)
}

export enum AppStep {
  PAYSTUB_UPLOAD = 0, // Start here
  VERIFY_DATA = 1,
  CONFIGURE_LOAN = 2, // New step: Entity, Term, Cushion
  RESULTS = 3
}

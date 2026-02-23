
import { FPMEntry, ProductType } from '../types';
import { supabase, isConfigured } from './supabaseClient';

const TABLE_NAME = 'fpm_factors';
let cachedData: FPMEntry[] = [];

const mapFromDb = (row: any): FPMEntry => ({
  id: row.id,
  entityName: row.entity_name,
  product: row.product as ProductType,
  termMonths: row.term_months,
  rate: Number(row.rate),
  factor: Number(row.factor),
  discountPct: Number(row.discount_pct ?? 0),
});

export const loadFPMData = async (): Promise<FPMEntry[]> => {
  if (!isConfigured) return [];

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .order('entity_name', { ascending: true })
    .order('term_months', { ascending: true });

  if (error) {
    console.error("Error cargando FPM:", error);
    return [];
  }

  cachedData = data.map(mapFromDb);
  return cachedData;
};

export const getFPMTable = async (): Promise<FPMEntry[]> => {
  if (cachedData.length === 0) {
    return await loadFPMData();
  }
  return cachedData;
};

// Filter local cache or fetch if empty
export const getFPMsByEntity = async (entityName: string): Promise<FPMEntry[]> => {
  const all = await getFPMTable();
  return all.filter(f => f.entityName === entityName);
};

export const getTermsForEntity = (entityName: string): number[] => {
  const terms = new Set(
    cachedData
      .filter(e => e.entityName === entityName)
      .map(e => e.termMonths)
  );
  return Array.from(terms).sort((a, b) => a - b);
};

export const addFPMEntry = async (entry: Omit<FPMEntry, 'id'>): Promise<void> => {
  const payload = {
    entity_name: entry.entityName,
    product: entry.product,
    term_months: entry.termMonths,
    rate: entry.rate,
    factor: entry.factor,
    discount_pct: entry.discountPct ?? 0,
  };

  const { error } = await supabase.from(TABLE_NAME).insert([payload]);
  if (error) throw error;
  
  await loadFPMData();
};

export const deleteFPMEntry = async (id: string): Promise<void> => {
  const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id);
  if (error) throw error;
  cachedData = cachedData.filter(e => e.id !== id);
};

// --- NEW: Entity Specific Batch Operations ---

export const deleteFactorsByEntity = async (entityName: string): Promise<void> => {
  const { error } = await supabase.from(TABLE_NAME).delete().eq('entity_name', entityName);
  if (error) throw error;
  // Update cache locally to avoid full refetch if possible, but loadFPMData is safer
  await loadFPMData();
};

export const updateEntityNameInFactors = async (oldName: string, newName: string): Promise<void> => {
  const { error } = await supabase
    .from(TABLE_NAME)
    .update({ entity_name: newName })
    .eq('entity_name', oldName);
  
  if (error) throw error;
  await loadFPMData();
};

export const importFactorsForEntity = async (entityName: string, entries: Omit<FPMEntry, 'id' | 'entityName'>[]): Promise<number> => {
  // 1. Delete existing for this entity (Clean Slate strategy)
  await deleteFactorsByEntity(entityName);

  if (entries.length === 0) return 0;

  // 2. Prepare payload
  const payload = entries.map(e => ({
    entity_name: entityName,
    product: e.product,
    term_months: e.termMonths,
    rate: e.rate,
    factor: e.factor,
    discount_pct: e.discountPct ?? 0,
  }));

  // 3. Insert new (use select to confirm insertion)
  const { data, error } = await supabase.from(TABLE_NAME).insert(payload).select();
  
  if (error) throw error;

  await loadFPMData();
  return data ? data.length : 0;
};

// Legacy global bulk (kept for backward compatibility if needed)
export const bulkAppendFPMData = async (entries: Omit<FPMEntry, 'id'>[]): Promise<void> => {
  const payload = entries.map(e => ({
    entity_name: e.entityName,
    product: e.product,
    term_months: e.termMonths,
    rate: e.rate,
    factor: e.factor
  }));
  const { error } = await supabase.from(TABLE_NAME).insert(payload);
  if (error) throw error;
  await loadFPMData();
};

export const bulkOverrideFPMData = async (entries: Omit<FPMEntry, 'id'>[]): Promise<void> => {
    // Implement globally if needed, currently unused in new UI flow
    await loadFPMData();
};

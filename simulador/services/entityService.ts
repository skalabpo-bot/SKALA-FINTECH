
import { FinancialEntity } from '../types';
import { supabase, isConfigured } from './supabaseClient';

const TABLE_NAME = 'financial_entities';
const BUCKET_NAME = 'logos';

// Mapeo DB (snake_case) a App (camelCase)
const mapFromDb = (row: any): FinancialEntity => ({
  id: row.id,
  name: row.name,
  logoUrl: row.logo_url,
  primaryColor: row.primary_color,
  secondaryColor: row.secondary_color,
  cashFee: Number(row.cash_fee ?? 15157),
  bankFee: Number(row.bank_fee ?? 7614),
  pagadurias: Array.isArray(row.pagadurias) ? row.pagadurias : [],
  maxCartera: row.max_cartera != null ? Number(row.max_cartera) : undefined,
  pagaduriaMaxCartera: row.pagaduria_max_cartera ?? undefined,
  commissions: row.commissions ?? undefined,
  requiresFullForm: row.requires_full_form ?? false,
  validationUrl: row.validation_url ?? undefined,
});

export const getAllEntities = async (): Promise<FinancialEntity[]> => {
  if (!isConfigured) return []; // Fallback simple
  
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .order('name');
    
  if (error) {
    console.error("Error cargando entidades:", error);
    return [];
  }
  return data.map(mapFromDb);
};

export const uploadLogo = async (file: File): Promise<string> => {
  if (!isConfigured) throw new Error("Supabase no configurado");

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file);

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return data.publicUrl;
};

export const saveEntity = async (entity: Omit<FinancialEntity, 'id'>, id?: string): Promise<void> => {
  const payload = {
    name: entity.name,
    logo_url: entity.logoUrl,
    primary_color: entity.primaryColor,
    secondary_color: entity.secondaryColor,
    cash_fee: entity.cashFee ?? 15157,
    bank_fee: entity.bankFee ?? 7614,
    max_cartera: entity.maxCartera ?? null,
    pagaduria_max_cartera: entity.pagaduriaMaxCartera ?? {},
    commissions: entity.commissions ?? {},
    validation_url: entity.validationUrl ?? null,
  };

  if (id) {
    const { error } = await supabase
      .from(TABLE_NAME)
      .update(payload)
      .eq('id', id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from(TABLE_NAME)
      .insert([payload]);
    if (error) throw error;
  }

  // Sincronizar con allied_entities (sistema principal) — convertir commissions a rates
  try {
    const comms = entity.commissions || {};
    // Obtener tasas únicas de FPM para esta entidad
    const { data: fpmRows } = await supabase.from('fpm_factors').select('rate').eq('entity_name', entity.name);
    const uniqueRates = [...new Set((fpmRows || []).map((r: any) => Number(r.rate)))].sort((a, b) => b - a);
    // Crear array de rates con la comisión más alta de los productos
    const maxComm = Math.max(...Object.values(comms).map(Number), 0);
    const rates = uniqueRates.map(rate => ({ rate, commission: maxComm }));
    // Si hay comisiones por producto, usar la del primer producto encontrado
    if (Object.keys(comms).length > 0) {
      // Mapear cada tasa con su producto y comisión correspondiente
      const { data: fpmDetailed } = await supabase.from('fpm_factors').select('rate, product').eq('entity_name', entity.name);
      const ratesMap = new Map<number, number>();
      for (const row of (fpmDetailed || [])) {
        const r = Number(row.rate);
        const c = comms[row.product] ?? maxComm;
        if (!ratesMap.has(r) || c > (ratesMap.get(r) || 0)) ratesMap.set(r, c);
      }
      rates.length = 0;
      for (const [rate, commission] of ratesMap) rates.push({ rate, commission });
      rates.sort((a, b) => b.rate - a.rate);
    }

    const { data: existing } = await supabase.from('allied_entities').select('id').eq('name', entity.name).single();
    if (existing) {
      await supabase.from('allied_entities').update({ rates }).eq('name', entity.name);
    } else {
      await supabase.from('allied_entities').insert({ name: entity.name, rates });
    }
  } catch (syncErr) {
    console.warn('Sync allied_entities falló (no crítico):', syncErr);
  }
};

export const deleteEntity = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', id);
  if (error) throw error;
};

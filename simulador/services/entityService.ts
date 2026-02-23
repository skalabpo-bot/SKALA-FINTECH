
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
};

export const deleteEntity = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('id', id);
  if (error) throw error;
};

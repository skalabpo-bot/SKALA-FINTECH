
import { supabase, isConfigured } from './supabaseClient';

const DEFAULT_SMMLV = 1423500;

export const getSmmlv = async (): Promise<number> => {
  if (!isConfigured) return DEFAULT_SMMLV;

  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'smmlv')
      .single();

    if (error || !data) return DEFAULT_SMMLV;
    return Number(data.value) || DEFAULT_SMMLV;
  } catch {
    return DEFAULT_SMMLV;
  }
};

export const updateSmmlv = async (value: number): Promise<void> => {
  if (!isConfigured) throw new Error('Supabase no configurado');

  const { error } = await supabase
    .from('app_settings')
    .upsert({ key: 'smmlv', value: String(value), updated_at: new Date().toISOString() });

  if (error) throw error;
};

// --- Radicación toggle ---

export const getRadicacionAbierta = async (): Promise<boolean> => {
  if (!isConfigured) return true;

  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'radicacion_abierta')
      .single();

    if (error || !data) return true; // Default: open
    return data.value === 'true';
  } catch {
    return true;
  }
};

export const updateRadicacionAbierta = async (open: boolean): Promise<void> => {
  if (!isConfigured) throw new Error('Supabase no configurado');

  const { error } = await supabase
    .from('app_settings')
    .upsert({ key: 'radicacion_abierta', value: String(open), updated_at: new Date().toISOString() });

  if (error) throw error;
};

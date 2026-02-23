
import { AdConfig } from '../types';
import { supabase, isConfigured } from './supabaseClient';

const TABLE_NAME = 'app_ads';
const BUCKET_NAME = 'logos'; // Reusing the public bucket for simplicity

const mapFromDb = (row: any): AdConfig => ({
  id: row.id,
  slotId: row.slot_id,
  name: row.name,
  type: row.type,
  content: row.content,
  linkUrl: row.link_url,
  active: row.active,
  startDate: row.start_date,
  endDate: row.end_date
});

export const getAllAds = async (): Promise<AdConfig[]> => {
  if (!isConfigured) return [];
  const { data, error } = await supabase.from(TABLE_NAME).select('*');
  if (error) return [];
  return data.map(mapFromDb);
};

export const getAdBySlot = async (slotId: string): Promise<AdConfig | null> => {
  if (!isConfigured) return null;

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Supabase complex filter query
  // Active = true AND slot_id = slotId
  // AND (start_date IS NULL OR start_date <= today)
  // AND (end_date IS NULL OR end_date >= today)
  
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('slot_id', slotId)
    .eq('active', true)
    .or(`start_date.is.null,start_date.lte.${today}`)
    .or(`end_date.is.null,end_date.gte.${today}`)
    .limit(1);

  if (error || !data || data.length === 0) return null;
  return mapFromDb(data[0]);
};

export const uploadAdImage = async (file: File): Promise<string> => {
  if (!isConfigured) throw new Error("Supabase no configurado");

  const fileExt = file.name.split('.').pop();
  const fileName = `ad_${Date.now()}.${fileExt}`; // Prefix to distinguish
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

export const saveAd = async (ad: Omit<AdConfig, 'id'>, id?: string): Promise<void> => {
  const payload = {
    slot_id: ad.slotId,
    name: ad.name,
    type: ad.type,
    content: ad.content,
    link_url: ad.linkUrl,
    active: ad.active,
    start_date: ad.startDate || null,
    end_date: ad.endDate || null
  };

  if (id) {
    const { error } = await supabase.from(TABLE_NAME).update(payload).eq('id', id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from(TABLE_NAME).insert([payload]);
    if (error) throw error;
  }
};

export const deleteAd = async (id: string): Promise<void> => {
  const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id);
  if (error) throw error;
};

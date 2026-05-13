import { supabase } from './supabaseClient';

export type BannerType = 'info' | 'warning' | 'success' | 'error';
export type BannerAudience = 'gestor' | 'analista' | 'admin' | 'todos';

export interface StateBanner {
  id: string;
  state_id: string;
  entity_name?: string | null;
  message: string;
  banner_type: BannerType;
  audience: BannerAudience;
  is_active: boolean;
  created_at?: string;
}

export const StateBannersService = {
  list: async (): Promise<StateBanner[]> => {
    const { data, error } = await supabase
      .from('state_banners')
      .select('*')
      .order('state_id');
    if (error) throw error;
    return (data || []) as StateBanner[];
  },

  // Banners aplicables al estado actual + entidad + rol del usuario
  getApplicable: async (stateId: string, entityName: string | null, role: string): Promise<StateBanner[]> => {
    let query = supabase
      .from('state_banners')
      .select('*')
      .eq('state_id', stateId)
      .eq('is_active', true);
    const { data, error } = await query;
    if (error) return [];
    const list = (data || []) as StateBanner[];
    return list.filter(b => {
      // Match entidad: null = aplica a todas
      if (b.entity_name && b.entity_name !== entityName) return false;
      // Match audiencia
      if (b.audience === 'todos') return true;
      const roleLower = (role || '').toLowerCase();
      if (b.audience === 'gestor' && roleLower.includes('gestor')) return true;
      if (b.audience === 'analista' && roleLower.includes('analista')) return true;
      if (b.audience === 'admin' && roleLower === 'admin') return true;
      return false;
    });
  },

  upsert: async (b: Partial<StateBanner>): Promise<void> => {
    if (b.id) {
      const { error } = await supabase.from('state_banners').update({
        state_id: b.state_id,
        entity_name: b.entity_name || null,
        message: b.message,
        banner_type: b.banner_type,
        audience: b.audience,
        is_active: b.is_active,
      }).eq('id', b.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('state_banners').insert({
        state_id: b.state_id,
        entity_name: b.entity_name || null,
        message: b.message,
        banner_type: b.banner_type || 'info',
        audience: b.audience || 'gestor',
        is_active: b.is_active ?? true,
      });
      if (error) throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('state_banners').delete().eq('id', id);
    if (error) throw error;
  },
};

import { supabase } from './supabaseClient';

export interface RateCommission {
  rate: number;
  commission: number;
}

export interface CreditType {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  active: boolean;
  available: boolean;
  order_index: number;
  requires_entity?: boolean;
  rate_commissions?: RateCommission[];
}

export const CreditTypesService = {
  list: async (): Promise<CreditType[]> => {
    const { data, error } = await supabase
      .from('credit_types')
      .select('*')
      .eq('active', true)
      .order('order_index');
    if (error) throw error;
    return (data || []) as CreditType[];
  },

  listAll: async (): Promise<CreditType[]> => {
    const { data, error } = await supabase
      .from('credit_types')
      .select('*')
      .order('order_index');
    if (error) throw error;
    return (data || []) as CreditType[];
  },

  upsert: async (ct: Partial<CreditType>): Promise<void> => {
    if (ct.id) {
      const { error } = await supabase.from('credit_types').update({
        name: ct.name,
        description: ct.description,
        icon: ct.icon,
        color: ct.color,
        active: ct.active,
        available: ct.available,
        order_index: ct.order_index,
        requires_entity: ct.requires_entity ?? true,
        rate_commissions: ct.rate_commissions ?? [],
      }).eq('id', ct.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('credit_types').insert({
        name: ct.name,
        description: ct.description,
        icon: ct.icon || 'CreditCard',
        color: ct.color || 'orange',
        active: ct.active ?? true,
        available: ct.available ?? false,
        order_index: ct.order_index ?? 99,
        requires_entity: ct.requires_entity ?? true,
        rate_commissions: ct.rate_commissions ?? [],
      });
      if (error) throw error;
    }
  },

  // Setear tasa del aliado externo y recalcular comisión
  setCreditRate: async (creditId: string, rate: number): Promise<{ commissionPercent: number; commissionEst: number }> => {
    const { data: credit, error: cErr } = await supabase
      .from('credits')
      .select('id, amount, credit_type_id')
      .eq('id', creditId)
      .single();
    if (cErr) throw cErr;
    if (!credit.credit_type_id) throw new Error('Este crédito no tiene tipo asignado.');

    const { data: ctype, error: tErr } = await supabase
      .from('credit_types')
      .select('rate_commissions')
      .eq('id', credit.credit_type_id)
      .single();
    if (tErr) throw tErr;

    const table: RateCommission[] = Array.isArray(ctype?.rate_commissions) ? ctype!.rate_commissions : [];
    const match = table.find(r => Number(r.rate) === Number(rate));
    const commissionPercent = match ? Number(match.commission) : 0;
    const commissionEst = (Number(credit.amount || 0) * commissionPercent) / 100;

    const { error: uErr } = await supabase
      .from('credits')
      .update({
        interest_rate: Number(rate),
        commission_percent: commissionPercent,
        commission_est: commissionEst,
      })
      .eq('id', creditId);
    if (uErr) throw uErr;

    return { commissionPercent, commissionEst };
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('credit_types').delete().eq('id', id);
    if (error) throw error;
  },
};

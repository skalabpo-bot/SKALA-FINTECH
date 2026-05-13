import { supabase } from './supabaseClient';

export type FieldType = 'text' | 'number' | 'date' | 'select' | 'textarea' | 'file';

export interface FieldDefinition {
  id: string;
  internal_name: string;
  label: string;
  type: FieldType;
  category: string;
  options: string[];
  placeholder?: string;
  validation?: { required?: boolean; min?: number; max?: number; pattern?: string };
  default_value?: string;
  is_system: boolean;
}

export interface FieldCondition {
  field: string;       // internal_name del campo que dispara la condición
  in?: string[];       // valores permitidos para mostrar
  equals?: string;     // valor exacto
  not_equals?: string; // valor que NO debe tener
}

export interface EntityFormField {
  id: string;
  entity_id: string;
  field_id: string;
  required: boolean;
  order_index: number;
  section_name?: string;
  condition?: FieldCondition | null;
  // populado en el join
  field?: FieldDefinition;
}

export const FieldLibraryService = {
  list: async (): Promise<FieldDefinition[]> => {
    const { data, error } = await supabase
      .from('field_library')
      .select('*')
      .order('category')
      .order('label');
    if (error) throw error;
    return (data || []) as FieldDefinition[];
  },

  upsert: async (f: Partial<FieldDefinition>): Promise<void> => {
    const payload = {
      internal_name: f.internal_name,
      label: f.label,
      type: f.type || 'text',
      category: f.category || 'general',
      options: f.options || [],
      placeholder: f.placeholder || null,
      validation: f.validation || {},
      default_value: f.default_value || null,
      is_system: f.is_system || false,
    };
    if (f.id) {
      const { error } = await supabase.from('field_library').update(payload).eq('id', f.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('field_library').insert(payload);
      if (error) throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('field_library').delete().eq('id', id);
    if (error) throw error;
  },

  // Campos asignados a una entidad (con info del field library)
  getEntityFields: async (entityId: string): Promise<EntityFormField[]> => {
    const { data, error } = await supabase
      .from('entity_form_fields')
      .select('*, field:field_library(*)')
      .eq('entity_id', entityId)
      .order('order_index');
    if (error) throw error;
    return (data || []) as EntityFormField[];
  },

  // Asignar/quitar/actualizar un campo a una entidad
  setEntityField: async (entityId: string, fieldId: string, required: boolean, orderIndex: number): Promise<void> => {
    const { data: existing } = await supabase
      .from('entity_form_fields')
      .select('id')
      .eq('entity_id', entityId)
      .eq('field_id', fieldId)
      .single();
    if (existing?.id) {
      const { error } = await supabase.from('entity_form_fields').update({
        required, order_index: orderIndex,
      }).eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('entity_form_fields').insert({
        entity_id: entityId, field_id: fieldId, required, order_index: orderIndex,
      });
      if (error) throw error;
    }
  },

  removeEntityField: async (entityId: string, fieldId: string): Promise<void> => {
    const { error } = await supabase.from('entity_form_fields').delete()
      .eq('entity_id', entityId)
      .eq('field_id', fieldId);
    if (error) throw error;
  },
};

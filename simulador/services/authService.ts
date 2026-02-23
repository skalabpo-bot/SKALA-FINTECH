
import { supabase, isConfigured } from './supabaseClient';

const TABLE_NAME = 'app_admins';

export const verifyCredentials = async (username: string, password: string): Promise<boolean> => {
  if (!isConfigured) {
    // Fallback si no hay supabase configurado
    return username === 'admin' && password === 'admin123';
  }

  try {
    // 1. Intentar Autenticación Nativa de Supabase (Requerido para RLS Write Policies)
    // Se asume que el 'username' puede ser un email.
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: username,
      password: password
    });

    if (!authError && authData.session) {
      return true; // Autenticación exitosa y sesión establecida para RLS
    }

    // 2. Fallback: Chequeo de Tabla Personalizada (Legacy)
    // IMPORTANTE: Esto valida credenciales pero NO inicia sesión en Supabase Auth.
    // Si la base de datos tiene RLS activado, las escrituras fallarán ("new row violates row-level security policy").
    // Se mantiene para compatibilidad si RLS está desactivado o configurado para 'anon'.
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('id')
      .eq('username', username)
      .eq('password', password) // Nota: En producción usar bcrypt/argon2
      .maybeSingle();

    if (error || !data) {
      console.warn("Auth failed:", authError?.message || error?.message);
      return false;
    }

    return !!data; // Retorna true si encontró un registro en app_admins
  } catch (e) {
    console.error("Connection error:", e);
    return false;
  }
};

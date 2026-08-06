
import { createClient } from '@supabase/supabase-js';

// URL y Key proporcionadas por el usuario
// URL de API: https://yfosumpmtmcomfpbspaz.supabase.co
// Key: sb_publishable_eEaNTqLKWFp7IYv0PetQ7Q_u2V9uv1t

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yfosumpmtmcomfpbspaz.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ Falta VITE_SUPABASE_ANON_KEY en las variables de entorno.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ⛔️ NUNCA volver a crear un cliente con la service_role key aquí.
// Todo lo que se compila en este proyecto viaja al navegador: la service_role key
// saltea RLS (acceso total a la BD) y quedaba legible en el bundle público.
// Las operaciones que la necesitan (cambiar correo/contraseña de login, alta masiva)
// pasan por la Edge Function `admin-users`, que valida rol ADMIN del lado servidor.
export const supabaseAdmin = null;

export const authLogin = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass
    });
    if (error) throw error;
    
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
        
    return { user: data.user, profile };
};


import { createClient } from '@supabase/supabase-js';

// URL y Key proporcionadas por el usuario
// URL de API: https://yfosumpmtmcomfpbspaz.supabase.co
// Key: sb_publishable_eEaNTqLKWFp7IYv0PetQ7Q_u2V9uv1t

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yfosumpmtmcomfpbspaz.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlmb3N1bXBtdG1jb21mcGJzcGF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MTU0NTMsImV4cCI6MjA4NTI5MTQ1M30.J5eEMRX_A6OnjAD08YIOT_Vk7TJqsQ_0YDGGRGebBrY';
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY || '';

console.log('🔧 Supabase Configuration:', {
    url: supabaseUrl,
    hasKey: !!supabaseAnonKey,
    keyPrefix: supabaseAnonKey?.substring(0, 20) + '...'
});

if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === '') {
    console.error("❌ CRITICAL: Supabase Key is missing. Ensure VITE_SUPABASE_ANON_KEY is set.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente con service role key para operaciones de admin (ej: cambiar contraseñas)
export const supabaseAdmin = supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    : null;

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

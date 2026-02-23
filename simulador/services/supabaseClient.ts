
// Base de datos unificada: re-exportamos el cliente Supabase del proyecto principal
// para que el simulador y la app principal compartan la misma BD.
export { supabase } from '../../services/supabaseClient';
export const isConfigured = true;

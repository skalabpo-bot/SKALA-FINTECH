
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // ⛔️ NUNCA poner aquí `process.env` completo. Eso volcaba TODO el entorno del servidor
    // de build dentro del bundle público: la service_role key de Supabase (acceso total a la
    // BD saltándose RLS) y los tokens de Netlify quedaban legibles para cualquiera que
    // abriera el JS de la app. Se deja un objeto vacío para que `process.env?.X` no reviente
    // en el código que aún lo consulta; las llaves reales viven en Edge Functions.
    'process.env': {}
  }
})

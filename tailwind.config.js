/** @type {import('tailwindcss').Config} */
// Tema idéntico al que estaba embebido en index.html cuando los estilos venían del
// CDN de Tailwind. Ahora el CSS se compila en el build y viaja en el bundle: si el
// CDN queda inalcanzable (DNS/antivirus/firewall del usuario) la app ya no se rompe.
export default {
  content: [
    './index.html',
    './App.tsx',
    './index.tsx',
    './types.ts',
    './components/**/*.{ts,tsx}',
    './simulador/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
  ],
  // Colores que NO están escritos en el código: los elige el admin y se guardan en la
  // BD (credit_states_config.color = 'bg-yellow-500', etc.). El escáner de Tailwind no
  // puede verlos, así que se generan siempre o los estados perderían su color.
  safelist: [
    {
      pattern:
        /^(bg|text|border|ring)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)$/,
    },
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
        display: ['Barlow', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#EA580C',
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        primaryLight: '#FFF7ED',
        secondary: '#1E293B',
        accent: '#F97316',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
      },
      boxShadow: {
        '3d': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 4px 4px 0px 0px rgba(234, 88, 12, 0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

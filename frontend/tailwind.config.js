/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forsa: {
          // Palette Officielle FORSA
          dark: '#0B2C25',       // Vert forêt profond
          leaf: '#84B140',       // Vert feuille vif
          emerald: '#17664E',    // Vert émeraude
          cream: '#FFFDF0',      // Fond crème chaud
          sand: '#C0B49B',       // Taupe / sable chaleureux
          muted: '#4A5B55',      // Gris vert atténué
          border: 'rgba(11, 44, 37, 0.12)',
          
          // Compatibilité composants catalogue
          primary: '#10B981',
          primaryHover: '#059669',
          secondary: '#F59E0B',
          light: '#F8FAFC',
          card: '#FFFFFF',
          accent: '#EC4899',

          // Statuts fonctionnels
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          info: '#3B82F6',
        },
        ui: {
          // Tokens validés Figma Lot R0 (Namespace isolé)
          page: '#fffaf0',
          ink: '#0b2c25',
          emerald: '#17664e',
          mint: '#eef7ec',
          'card-border': '#dbf0dd',
          'field-border': '#e8ebdf',
          'success-border': '#a9d3a0',
          error: '#b3261e',
          'error-bg': '#fdecea',
          warn: '#8a5a00',
          'warn-bg': '#fff4dc',
          'warn-border': '#f0cf8f',
          'map-ok': '#dfeadb',
          'map-down': '#ecebe6',
          'text-70': 'rgba(11, 44, 37, 0.7)',
          'text-80': 'rgba(11, 44, 37, 0.8)',
          info: '#026aa7',
          'info-bg': '#f0f9ff',
          'info-border': '#b9e6fe',
          'auth-bg': '#dce1d0',
        },
        glass: {
          DEFAULT: 'rgba(255, 255, 255, 0.40)',
          card: 'rgba(255, 255, 255, 0.42)',
          input: 'rgba(255, 255, 255, 0.70)',
          hover: 'rgba(255, 255, 255, 0.55)',
          border: 'rgba(255, 255, 255, 0.80)',
        }
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
      },
      borderRadius: {
        'card': '28px',
        'card-lg': '32px',
        'btn': '16px',
        'input': '14px',
        'pill': '9999px',
        'ui-card': '24px',
        'ui-ctl': '14px',
        'ui-panel': '16px',
        'ui-pill': '100px',
      },
      boxShadow: {
        'glass': '0 20px 40px -15px rgba(11, 44, 37, 0.10)',
        'glass-hover': '0 24px 50px -10px rgba(11, 44, 37, 0.16)',
        'btn': '0 10px 20px -5px rgba(11, 44, 37, 0.28)',
      },
      backdropBlur: {
        'xs': '2px',
        'glass': '40px',
        'glass-lg': '48px',
      },
      screens: {
        'xs': '390px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1440px',
      }
    },
  },
  plugins: [],
}

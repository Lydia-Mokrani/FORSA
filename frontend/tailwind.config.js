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

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
          // Palette Officielle FORSA extraite de Figma
          dark: '#0B2C25',       // Vert forêt profond (Textes principaux, Header, Boutons primaires)
          leaf: '#84B140',       // Vert feuille vif (Accents, badges nature, logos)
          emerald: '#17664E',    // Vert émeraude (Liens, actions secondaires, validation)
          cream: '#FFFDF0',      // Fond crème chaud officiel
          sand: '#C0B49B',       // Taupe / sable chaleureux
          muted: '#4A5B55',      // Gris vert atténué pour placeholders et sous-titres
          border: 'rgba(11, 44, 37, 0.12)', // Bordures subtiles
          
          // Statuts fonctionnels (MS1 à MS4)
          success: '#10B981',    // Approuvé, Actif, Vendu
          warning: '#F59E0B',    // En attente de validation, Date limite proche
          danger: '#EF4444',     // Rejeté, Suspendu, Expiré
          info: '#3B82F6',       // Notification, En cours
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
        'xs': '390px',  // Mobile référence Figma
        'sm': '640px',
        'md': '768px',  // Tablette
        'lg': '1024px', // PC portable
        'xl': '1280px',
        '2xl': '1440px',// Desktop référence Figma
      }
    },
  },
  plugins: [],
}

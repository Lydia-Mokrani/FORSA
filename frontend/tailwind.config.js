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
          primary: '#10B981',       // Green (anti-waste, freshness)
          primaryHover: '#059669',
          secondary: '#F59E0B',     // Amber/gold (savings, discount)
          dark: '#1E293B',
          light: '#F8FAFC',
          card: '#FFFFFF',
          accent: '#EC4899',
        }
      }
    },
  },
  plugins: [],
}

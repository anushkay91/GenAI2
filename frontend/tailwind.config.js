/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        govblue: {
          50: '#f0f7ff',
          100: '#e0efff',
          500: '#0066cc',
          600: '#0052a3',
          900: '#0c2340',
        },
        smartdark: {
          bg: '#0a0f1d',
          card: '#121829',
          border: '#1e293b',
          text: '#94a3b8',
          highlight: '#38bdf8',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

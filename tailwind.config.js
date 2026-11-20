/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        mk: {
          navy: '#0B132B',
          royal: '#000065',
          'navy-mid': '#131C42',
          'navy-light': '#1E2B58',
          gold: '#C5A880',
          'gold-dark': '#9E7B46',
          'gold-light': '#E2CFAF',
          'gold-soft': '#F7F1E7',
        },
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};

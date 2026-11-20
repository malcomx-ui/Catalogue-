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
          navy: '#162238',
          royal: '#000065',
          'navy-mid': '#1E2F4D',
          'navy-light': '#263B61',
          gold: '#D99B26',
          'gold-dark': '#B57E1A',
          'gold-light': '#E8C06B',
          'gold-soft': '#FBF5E8',
          canvas: '#F4F6F9',
          border: '#E2E8F0',
        },
      },
      fontFamily: {
        display: [
          '"Plus Jakarta Sans"',
          '"Inter"',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
        sans: [
          '"Inter"',
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

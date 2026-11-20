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
          navy: '#000065',
          royal: '#000065',
          'navy-mid': '#121285',
          'navy-light': '#20209E',
          'navy-deep': '#00004A',
          tint: '#EEF1FA',
          gold: '#D99B26',
          'gold-dark': '#B57E1A',
          'gold-light': '#E8C06B',
          'gold-soft': '#FBF5E8',
          canvas: '#F5F7FB',
          border: '#DFE5F2',
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

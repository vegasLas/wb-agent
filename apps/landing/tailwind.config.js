/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        deep: {
          bg: '#0A0A0F',
          card: '#15151C',
          elevated: '#1E1E28',
          border: '#2A2A35',
        },
        purple: {
          DEFAULT: '#6A39F4',
          light: '#8B69F6',
          dark: '#5B21B6',
        },
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'Noto Sans',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};

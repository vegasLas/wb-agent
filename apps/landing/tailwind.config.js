/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        deep: {
          bg: 'var(--color-bg)',
          card: 'var(--color-card)',
          elevated: 'var(--color-elevated)',
          border: 'var(--color-border)',
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

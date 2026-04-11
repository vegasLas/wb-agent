/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./apps/frontend/src/**/*.{vue,js,ts,jsx,tsx}",
    "./apps/frontend/index.html",
  ],
  theme: {
    extend: {
      colors: {
        // Deep Dark - Backgrounds
        deep: {
          bg: '#0A0A0F',
          card: '#15151C',
          elevated: '#1E1E28',
          border: '#2A2A35',
        },
        // Purple - Primary accent
        purple: {
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#C084FC',
          500: '#A855F7',
          600: '#9333EA',
          700: '#6A39F4', // Main purple
          800: '#7C3AED',
          900: '#6B21A8',
          950: '#3B0764',
        },
        // Violet - Secondary accent
        violet: {
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#8B69F6', // Light purple hover
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
          950: '#2E1065',
        },
        // Gray - Text and UI
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280', // Secondary text
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
          950: '#030712',
        },
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px',
      },
      boxShadow: {
        'card': '0 4px 20px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 8px 30px rgba(0, 0, 0, 0.5)',
        'dialog': '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
        'soft': '0 2px 8px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
}

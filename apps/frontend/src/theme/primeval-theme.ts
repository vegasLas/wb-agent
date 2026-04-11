/**
 * Primeval Theme Configuration
 * Crypto/Finance Dark Theme with Purple Accents
 * 
 * Color Palette from Image:
 * - Deep Dark Background: #0A0A0F - Almost black
 * - Card Background: #15151C - Dark cards
 * - Card Hover: #1E1E28 - Elevated cards
 * - Purple Primary: #6A39F4 - Main accent, buttons
 * - Purple Light: #8B69F6 - Hover states
 * - Green Success: #22C55E - Positive values
 * - Red Danger: #EF4444 - Negative values
 * - Text Primary: #FFFFFF - Main text
 * - Text Secondary: #6B7280 - Muted text
 * - Border: #2A2A35 - Subtle borders
 */

import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

// Color Palette - Crypto Finance Dark Theme
export const colors = {
  // Deep Dark - Backgrounds
  dark: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
    950: '#030712',
  },
  // Deep Background (custom)
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
    700: '#6A39F4', // Main purple from image
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
};

// PrimeVue Theme Preset
export const PrimevalPreset = definePreset(Aura, {
  primitive: {
    borderRadius: {
      none: '0',
      xs: '6px',
      sm: '10px',
      md: '14px',
      lg: '18px',
      xl: '22px',
      '2xl': '26px',
    },
    slate: colors.gray,
    purple: colors.purple,
    violet: colors.violet,
  },
  semantic: {
    transitionDuration: '0.2s',
    focusRing: {
      width: '2px',
      style: 'solid',
      color: '{primary.color}',
      offset: '2px',
    },
    // Primary color (Purple from image)
    primary: {
      50: colors.purple[50],
      100: colors.purple[100],
      200: colors.purple[200],
      300: colors.purple[300],
      400: colors.purple[400],
      500: colors.purple[500],
      600: colors.purple[600],
      700: colors.purple[700],
      800: colors.purple[800],
      900: colors.purple[900],
      950: colors.purple[950],
    },
    // Semantic colors
    colorScheme: {
      light: {
        surface: {
          0: '#FFFFFF',
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
          950: '#030712',
        },
        primary: {
          color: colors.purple[700],
          contrastColor: '#FFFFFF',
          hoverColor: colors.violet[400],
          activeColor: colors.purple[500],
        },
        highlight: {
          background: colors.purple[700],
          focusBackground: colors.violet[400],
          color: '#FFFFFF',
          focusColor: '#FFFFFF',
        },
        mask: {
          background: 'rgba(10, 10, 15, 0.8)',
          color: '#FFFFFF',
        },
        formField: {
          background: '#15151C',
          disabledBackground: '#0A0A0F',
          filledBackground: '#15151C',
          filledHoverBackground: '#1E1E28',
          filledFocusBackground: '#15151C',
          borderColor: '#2A2A35',
          hoverBorderColor: '#3D3D4D',
          focusBorderColor: colors.purple[700],
          invalidBorderColor: '#EF4444',
          color: '#FFFFFF',
          disabledColor: '#6B7280',
          placeholderColor: '#6B7280',
          invalidPlaceholderColor: '#EF4444',
          floatLabelColor: '#6B7280',
          floatLabelFocusColor: '#6B7280',
          floatLabelActiveColor: '#6B7280',
          floatLabelInvalidColor: '#EF4444',
          iconColor: '#6B7280',
          shadow: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        },
        text: {
          color: '#111827',
          hoverColor: '#030712',
          mutedColor: '#6B7280',
          hoverMutedColor: '#4B5563',
        },
        content: {
          background: '#FFFFFF',
          hoverBackground: '#F9FAFB',
          borderColor: '#E5E7EB',
          color: '#111827',
          hoverColor: '#030712',
        },
        overlay: {
          background: '#FFFFFF',
          borderColor: '#E5E7EB',
          color: '#111827',
        },
        secondary: {
          background: '#F3F4F6',
          color: '#111827',
        },
        info: {
          color: '#3B82F6',
          contrastColor: '#FFFFFF',
          background: '#EFF6FF',
        },
        success: {
          color: '#22C55E',
          contrastColor: '#FFFFFF',
          background: '#F0FDF4',
        },
        warn: {
          color: '#F59E0B',
          contrastColor: '#FFFFFF',
          background: '#FFFBEB',
        },
        danger: {
          color: '#EF4444',
          contrastColor: '#FFFFFF',
          background: '#FEF2F2',
        },
      },
      dark: {
        surface: {
          0: '#0A0A0F',
          50: '#15151C',
          100: '#1E1E28',
          200: '#2A2A35',
          300: '#3D3D4D',
          400: '#6B7280',
          500: '#9CA3AF',
          600: '#D1D5DB',
          700: '#E5E7EB',
          800: '#F3F4F6',
          900: '#F9FAFB',
          950: '#FFFFFF',
        },
        primary: {
          color: colors.purple[700],
          contrastColor: '#FFFFFF',
          hoverColor: colors.violet[400],
          activeColor: colors.purple[300],
        },
        highlight: {
          background: colors.purple[700],
          focusBackground: colors.violet[400],
          color: '#FFFFFF',
          focusColor: '#FFFFFF',
        },
        mask: {
          background: 'rgba(0, 0, 0, 0.8)',
          color: '#FFFFFF',
        },
        formField: {
          background: '#15151C',
          disabledBackground: '#0A0A0F',
          filledBackground: '#15151C',
          filledHoverBackground: '#1E1E28',
          filledFocusBackground: '#15151C',
          borderColor: '#2A2A35',
          hoverBorderColor: '#3D3D4D',
          focusBorderColor: colors.purple[700],
          invalidBorderColor: '#EF4444',
          color: '#FFFFFF',
          disabledColor: '#6B7280',
          placeholderColor: '#6B7280',
          invalidPlaceholderColor: '#EF4444',
          floatLabelColor: '#6B7280',
          floatLabelFocusColor: '#6B7280',
          floatLabelActiveColor: '#6B7280',
          floatLabelInvalidColor: '#EF4444',
          iconColor: '#6B7280',
          shadow: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
        },
        text: {
          color: '#FFFFFF',
          hoverColor: '#F9FAFB',
          mutedColor: '#6B7280',
          hoverMutedColor: '#9CA3AF',
        },
        content: {
          background: '#15151C',
          hoverBackground: '#1E1E28',
          borderColor: '#2A2A35',
          color: '#FFFFFF',
          hoverColor: '#F9FAFB',
        },
        overlay: {
          background: '#15151C',
          borderColor: '#2A2A35',
          color: '#FFFFFF',
        },
        secondary: {
          background: '#1E1E28',
          color: '#FFFFFF',
        },
        info: {
          color: '#60A5FA',
          contrastColor: '#FFFFFF',
          background: 'rgba(59, 130, 246, 0.15)',
        },
        success: {
          color: '#22C55E',
          contrastColor: '#FFFFFF',
          background: 'rgba(34, 197, 94, 0.15)',
        },
        warn: {
          color: '#FBBF24',
          contrastColor: '#FFFFFF',
          background: 'rgba(251, 191, 36, 0.15)',
        },
        danger: {
          color: '#F87171',
          contrastColor: '#FFFFFF',
          background: 'rgba(239, 68, 68, 0.15)',
        },
      },
    },
  },
  components: {
    // Card component styling
    card: {
      background: '#15151C',
      borderRadius: '20px',
      shadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
      color: '#FFFFFF',
    },
    // Button component styling
    button: {
      borderRadius: '14px',
      padding: {
        x: '1.5rem',
        y: '0.875rem',
      },
      font: {
        size: '0.875rem',
        weight: 600,
      },
    },
    // Input styling
    inputtext: {
      background: '#15151C',
      borderColor: '#2A2A35',
      color: '#FFFFFF',
      borderRadius: '14px',
      padding: {
        x: '1rem',
        y: '0.875rem',
      },
    },
    // Select styling
    select: {
      background: '#15151C',
      borderColor: '#2A2A35',
      color: '#FFFFFF',
      borderRadius: '14px',
      overlay: {
        background: '#15151C',
        borderColor: '#2A2A35',
        borderRadius: '14px',
        shadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
      },
      option: {
        focusBackground: '#1E1E28',
        selectedBackground: 'rgba(106, 57, 244, 0.2)',
        selectedFocusBackground: 'rgba(106, 57, 244, 0.3)',
        color: '#FFFFFF',
        focusColor: '#FFFFFF',
        selectedColor: '#6A39F4',
        selectedFocusColor: '#8B69F6',
        padding: '0.75rem 1rem',
        borderRadius: '10px',
      },
      optionGroup: {
        background: 'transparent',
        color: '#6B7280',
        fontWeight: 600,
        padding: '0.75rem 1rem',
      },
    },
    // Dialog styling
    dialog: {
      background: '#15151C',
      borderRadius: '24px',
      shadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
      color: '#FFFFFF',
      border: {
        width: '0',
        color: 'transparent',
      },
    },
    // Tag styling
    tag: {
      borderRadius: '8px',
      padding: {
        x: '0.625rem',
        y: '0.375rem',
      },
      font: {
        size: '0.75rem',
        weight: 600,
      },
    },
    // Toast styling
    toast: {
      borderRadius: '16px',
      shadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
    },
  },
});

export default PrimevalPreset;

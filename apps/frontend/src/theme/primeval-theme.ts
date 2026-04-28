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
    // Custom colors for theme support
    color: {
      bg: '#0A0A0F',
      card: '#15151C',
      elevated: '#1E1E28',
      border: '#2A2A35',
      text: '#FFFFFF',
      secondary: '#6B7280',
    },
    // Semantic colors
    colorScheme: {
      light: {
        color: {
          bg: '#F9FAFB',
          card: '#FFFFFF',
          elevated: '#F3F4F6',
          border: '#E5E7EB',
          text: '#111827',
          secondary: '#6B7280',
        },
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
          background: '#FFFFFF',
          disabledBackground: '#F3F4F6',
          filledBackground: '#FFFFFF',
          filledHoverBackground: '#F9FAFB',
          filledFocusBackground: '#FFFFFF',
          borderColor: '#E5E7EB',
          hoverBorderColor: '#D1D5DB',
          focusBorderColor: colors.purple[700],
          invalidBorderColor: '#EF4444',
          color: '#111827',
          disabledColor: '#6B7280',
          placeholderColor: '#9CA3AF',
          invalidPlaceholderColor: '#EF4444',
          floatLabelColor: '#6B7280',
          floatLabelFocusColor: colors.purple[700],
          floatLabelActiveColor: '#6B7280',
          floatLabelInvalidColor: '#EF4444',
          iconColor: '#6B7280',
          shadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
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
          modal: {
            background: '#FFFFFF',
            borderColor: '#E5E7EB',
            color: '#111827',
            padding: '1.25rem',
          },
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
        color: {
          bg: '#0A0A0F',
          card: '#15151C',
          elevated: '#1E1E28',
          border: '#2A2A35',
          text: '#FFFFFF',
          secondary: '#6B7280',
        },
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
          floatLabelFocusColor: colors.violet[400],
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
          modal: {
            background: '#15151C',
            borderColor: '#2A2A35',
            color: '#FFFFFF',
            padding: '1.25rem',
          },
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
    // DataTable component styling
    datatable: {
      root: {
        borderColor: '{color.border}',
      },
      header: {
        background: '{color.card}',
        borderColor: '{color.border}',
        color: '{color.text}',
        borderWidth: '0 0 1px 0',
        padding: '1rem 1.5rem',
      },
      headerCell: {
        background: '{color.card}',
        hoverBackground: '{color.elevated}',
        borderColor: '{color.border}',
        color: '{color.secondary}',
        gap: '0.5rem',
        padding: '0.875rem 1.25rem',
        sm: { padding: '0.625rem 0.875rem' },
      },
      columnTitle: {
        fontWeight: '600',
      },
      row: {
        background: 'transparent',
        hoverBackground: '{color.elevated}',
        selectedBackground: 'rgba(106, 57, 244, 0.1)',
        color: '{color.text}',
        hoverColor: '{color.text}',
        selectedColor: '{color.text}',
        stripedBackground: '{color.bg}',
      },
      bodyCell: {
        borderColor: '{color.border}',
        padding: '1rem 1.25rem',
        sm: { padding: '0.75rem 0.875rem' },
      },
      footerCell: {
        background: '{color.card}',
        borderColor: '{color.border}',
        color: '{color.text}',
        padding: '0.875rem 1.25rem',
        sm: { padding: '0.625rem 0.875rem' },
      },
      columnFooter: {
        fontWeight: '600',
      },
      footer: {
        background: '{color.card}',
        borderColor: '{color.border}',
        color: '{color.text}',
        borderWidth: '1px 0 0 0',
        padding: '0.875rem 1.25rem',
      },
      sortIcon: {
        color: '{color.secondary}',
        hoverColor: '{color.text}',
        size: '0.875rem',
      },
      paginatorTop: {
        borderColor: '{color.border}',
        borderWidth: '0 0 1px 0',
      },
      paginatorBottom: {
        borderColor: '{color.border}',
        borderWidth: '1px 0 0 0',
      },
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
    // Select styling - uses CSS variables for theme support
    select: {
      background: '{color.card}',
      borderColor: '{color.border}',
      color: '{color.text}',
      borderRadius: '14px',
      overlay: {
        background: '{color.card}',
        borderColor: '{color.border}',
        borderRadius: '14px',
        shadow: 'none',
      },
      option: {
        focusBackground: '{color.elevated}',
        selectedBackground: 'rgba(106, 57, 244, 0.2)',
        selectedFocusBackground: 'rgba(106, 57, 244, 0.3)',
        color: '{color.text}',
        focusColor: '{color.text}',
        selectedColor: '#6A39F4',
        selectedFocusColor: '#8B69F6',
        padding: '0.75rem 1rem',
        borderRadius: '10px',
      },
      optionGroup: {
        background: 'transparent',
        color: '{color.secondary}',
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
    // Badge styling - override severity colors to match semantic palette
    badge: {
      borderRadius: '{borderRadius.md}',
      font: {
        size: '0.75rem',
        weight: 700,
      },
      colorScheme: {
        light: {
          root: {
            background: '{surface.200}',
            color: '{text.color}',
          },
          secondary: {
            background: '{secondary.background}',
            color: '{secondary.color}',
          },
          info: {
            background: '{info.background}',
            color: '{info.color}',
          },
          success: {
            background: '{success.background}',
            color: '{success.color}',
          },
          warn: {
            background: '{warn.background}',
            color: '{warn.color}',
          },
          danger: {
            background: '{danger.background}',
            color: '{danger.color}',
          },
          contrast: {
            background: '{surface.950}',
            color: '{surface.0}',
          },
        },
        dark: {
          root: {
            background: '{surface.800}',
            color: '{surface.0}',
          },
          secondary: {
            background: '{secondary.background}',
            color: '{secondary.color}',
          },
          info: {
            background: '{info.background}',
            color: '{info.color}',
          },
          success: {
            background: '{success.background}',
            color: '{success.color}',
          },
          warn: {
            background: '{warn.background}',
            color: '{warn.color}',
          },
          danger: {
            background: '{danger.background}',
            color: '{danger.color}',
          },
          contrast: {
            background: '{surface.0}',
            color: '{surface.950}',
          },
        },
      },
    },
    // Toast styling
    toast: {
      borderRadius: '16px',
      shadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
      colorScheme: {
        light: {
          root: {
            background: '{surface.0}',
            borderColor: '{content.borderColor}',
            color: '{text.color}',
          },
          message: {
            background: '{surface.0}',
            borderColor: '{content.borderColor}',
            color: '{text.color}',
          },
          content: {
            background: '{surface.0}',
            color: '{text.color}',
          },
          summary: {
            color: '{text.color}',
          },
          detail: {
            color: '{text.mutedColor}',
          },
          closeButton: {
            color: '{text.mutedColor}',
            hoverColor: '{text.color}',
          },
        },
        dark: {
          root: {
            background: '{color.card}',
            borderColor: '{color.border}',
            color: '{color.text}',
          },
          message: {
            background: '{color.card}',
            borderColor: '{color.border}',
            color: '{color.text}',
          },
          content: {
            background: '{color.card}',
            color: '{color.text}',
          },
          summary: {
            color: '{color.text}',
          },
          detail: {
            color: '{text.mutedColor}',
          },
          closeButton: {
            color: '{text.mutedColor}',
            hoverColor: '{color.text}',
          },
        },
      },
    },
    // Menu styling - popup menus
    menu: {
      background: '#15151C',
      borderColor: '#2A2A35',
      color: '#FFFFFF',
      borderRadius: '14px',
      shadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
      item: {
        focusBackground: '#1E1E28',
        focusColor: '#FFFFFF',
        activeBackground: 'rgba(106, 57, 244, 0.15)',
        activeColor: '#6A39F4',
        icon: {
          color: '#6B7280',
          focusColor: '#FFFFFF',
          activeColor: '#6A39F4',
        },
      },
    },
    // Popover styling
    popover: {
      root: {
        borderRadius: '14px',
        gutter: '10px',
        arrowOffset: '1.25rem',
      },
      content: {
        padding: '0',
      },
      colorScheme: {
        light: {
          root: {
            background: '{color.card}',
            borderColor: '{color.border}',
            color: '{color.text}',
            shadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
          },
        },
        dark: {
          root: {
            background: '{color.card}',
            borderColor: '{color.border}',
            color: '{color.text}',
            shadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
          },
        },
      },
    },
    // Drawer styling
    drawer: {
      root: {
        background: '{color.card}',
        borderColor: '{color.border}',
        color: '{color.text}',
        shadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
      },
      header: {
        padding: '1rem',
      },
      content: {
        padding: '0',
      },
    },
    // Chip styling
    chip: {
      root: {
        borderRadius: '10px',
        paddingX: '0.625rem',
        paddingY: '0.375rem',
      },
      colorScheme: {
        light: {
          root: {
            background: '{color.elevated}',
            color: '{color.text}',
          },
          icon: {
            color: '{color.secondary}',
          },
          removeIcon: {
            color: '{color.secondary}',
          },
        },
        dark: {
          root: {
            background: '{color.elevated}',
            color: '{color.text}',
          },
          icon: {
            color: '{color.secondary}',
          },
          removeIcon: {
            color: '{color.secondary}',
          },
        },
      },
    },
    // Checkbox styling
    checkbox: {
      borderRadius: '6px',
      width: '20px',
      height: '20px',
      borderColor: '#D1D5DB',
      checked: {
        background: '#6A39F4',
        borderColor: '#6A39F4',
        hoverBackground: '#8B69F6',
        hoverBorderColor: '#8B69F6',
      },
    },
    // MultiSelect styling - using semantic tokens for light/dark mode support
    multiselect: {
      background: '{color.card}',
      borderColor: '{color.border}',
      color: '{color.text}',
      borderRadius: '14px',
      chip: {
        background: 'rgba(106, 57, 244, 0.15)',
        color: '#6A39F4',
        borderRadius: '8px',
      },
      overlay: {
        background: '{color.card}',
        borderColor: '{color.border}',
        borderRadius: '14px',
        shadow: 'none',
      },
      option: {
        focusBackground: '{color.elevated}',
        selectedBackground: 'rgba(106, 57, 244, 0.2)',
        selectedFocusBackground: 'rgba(106, 57, 244, 0.3)',
        color: '{color.text}',
        focusColor: '{color.text}',
        selectedColor: '#6A39F4',
        selectedFocusColor: '#8B69F6',
        padding: '0.75rem 1rem',
        borderRadius: '10px',
      },
      optionGroup: {
        background: 'transparent',
        color: '{color.secondary}',
        fontWeight: 600,
      },
      checkbox: {
        borderColor: '{color.border}',
        background: '{color.bg}',
        checked: {
          background: '#6A39F4',
          borderColor: '#6A39F4',
        },
      },
    },
  },
});

export default PrimevalPreset;

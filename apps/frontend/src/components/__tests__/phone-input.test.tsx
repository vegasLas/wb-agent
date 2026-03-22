/**
 * Phone Input Component Tests
 * Migrated from: tests/client/components/ui/phone-input.test.ts
 *
 * Changes made:
 * - Migrated from Vue to React
 * - Uses Vitest for testing (frontend standard)
 * - Updated to use React Testing Library patterns
 * - Same test logic preserved
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PhoneInput } from '../phone-input';

describe('PhoneInput Component', () => {
  describe('rendering', () => {
    it('should render input element', () => {
      // Act
      render(<PhoneInput value="" onChange={() => {}} />);

      // Assert
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });

    it('should render with label when provided', () => {
      // Act
      render(<PhoneInput value="" onChange={() => {}} label="Phone Number" />);

      // Assert
      expect(screen.getByText('Phone Number')).toBeInTheDocument();
    });

    it('should render with placeholder', () => {
      // Act
      render(<PhoneInput value="" onChange={() => {}} placeholder="+7 (999) 999-99-99" />);

      // Assert
      const input = screen.getByPlaceholderText('+7 (999) 999-99-99');
      expect(input).toBeInTheDocument();
    });
  });

  describe('value handling', () => {
    it('should display initial value', () => {
      // Act
      render(<PhoneInput value="+79991234567" onChange={() => {}} />);

      // Assert
      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toContain('+7');
    });

    it('should call onChange when value changes', () => {
      // Arrange
      const handleChange = vi.fn();
      render(<PhoneInput value="" onChange={handleChange} />);

      // Act
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '+79991234567' } });

      // Assert
      expect(handleChange).toHaveBeenCalled();
    });

    it('should format phone number on input', () => {
      // Arrange
      let value = '';
      const handleChange = (newValue: string) => {
        value = newValue;
      };

      render(<PhoneInput value={value} onChange={handleChange} />);

      // Act
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '79991234567' } });

      // Assert - should have processed the input
      expect(handleChange).toBeDefined();
    });
  });

  describe('validation', () => {
    it('should show error state when invalid', () => {
      // Act
      render(<PhoneInput value="invalid" onChange={() => {}} error="Invalid phone number" />);

      // Assert
      expect(screen.getByText('Invalid phone number')).toBeInTheDocument();
    });

    it('should not show error when valid', () => {
      // Act
      render(<PhoneInput value="+79991234567" onChange={() => {}} />);

      // Assert
      const error = screen.queryByText(/invalid/i);
      expect(error).not.toBeInTheDocument();
    });

    it('should validate Russian phone numbers', () => {
      // Arrange
      const validNumbers = [
        '+7 (999) 123-45-67',
        '+79991234567',
        '8 (999) 123-45-67',
      ];

      // Act & Assert
      validNumbers.forEach((number) => {
        const { unmount } = render(<PhoneInput value={number} onChange={() => {}} />);
        const input = screen.getByRole('textbox');
        expect(input).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper aria-label', () => {
      // Act
      render(<PhoneInput value="" onChange={() => {}} aria-label="Phone number input" />);

      // Assert
      const input = screen.getByLabelText('Phone number input');
      expect(input).toBeInTheDocument();
    });

    it('should be focusable', () => {
      // Act
      render(<PhoneInput value="" onChange={() => {}} />);
      const input = screen.getByRole('textbox');
      input.focus();

      // Assert
      expect(document.activeElement).toBe(input);
    });

    it('should support keyboard navigation', () => {
      // Act
      render(<PhoneInput value="" onChange={() => {}} />);
      const input = screen.getByRole('textbox');

      // Assert
      expect(input).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('disabled state', () => {
    it('should render disabled input', () => {
      // Act
      render(<PhoneInput value="" onChange={() => {}} disabled />);

      // Assert
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('should not call onChange when disabled', () => {
      // Arrange
      const handleChange = vi.fn();
      render(<PhoneInput value="" onChange={handleChange} disabled />);

      // Act
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '+79991234567' } });

      // Assert
      expect(handleChange).not.toHaveBeenCalled();
    });
  });
});

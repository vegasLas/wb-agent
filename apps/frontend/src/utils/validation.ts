/**
 * Shared validation utilities for forms
 */

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return 'Введите email';
  if (!emailRegex.test(trimmed)) return 'Введите корректный email';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Введите пароль';
  if (password.length < 8) return 'Пароль должен быть не менее 8 символов';
  return null;
}

export function validateConfirmPassword(
  password: string,
  confirmPassword: string,
): string | null {
  if (!confirmPassword) return 'Подтвердите пароль';
  if (password !== confirmPassword) return 'Пароли не совпадают';
  return null;
}

export function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Введите имя';
  if (trimmed.length < 2) return 'Имя должно быть не менее 2 символов';
  return null;
}

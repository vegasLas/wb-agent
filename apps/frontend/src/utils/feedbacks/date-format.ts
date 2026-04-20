/**
 * Date formatting utilities for feedback components
 */

export function formatDate(timestamp: number | undefined): string {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

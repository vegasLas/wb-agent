import { computed } from 'vue';
import type { UIMessage } from 'ai';

export interface QuickReply {
  value: string;
  label: string;
  isNumbered?: boolean;
}

export function useQuickReplies(
  messages: () => UIMessage[],
  isLoading: () => boolean,
) {
  return computed<QuickReply[]>(() => {
    if (isLoading()) return [];

    const msgs = messages();
    const lastMsg = msgs[msgs.length - 1];
    if (!lastMsg || lastMsg.role !== 'assistant') return [];

    const text = getMessageText(lastMsg);
    if (!isChoiceMessage(text)) return [];

    return extractQuickReplies(text);
  });
}

function getMessageText(message: UIMessage | undefined): string {
  if (!message || !message.parts) return '';
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p?.type === 'text')
    .map((p) => p.text)
    .join('');
}

function isChoiceMessage(text: string): boolean {
  const lower = text.toLowerCase();
  const indicators = [
    'выберите',
    'выбери',
    'какой',
    'какую',
    'какое',
    'какие',
    'хотите',
    'да или нет',
    'вариант',
    'option',
    'choose',
    'select',
    'pick',
    'which',
    'скажите номер',
    'номер варианта',
    'всё верно',
    'создаём',
    'правильный черновик',
    'подтвердите',
    'создать',
  ];
  return indicators.some((w) => lower.includes(w));
}

function stripMarkdown(text: string): string {
  return text.replace(/\*\*/g, '').replace(/(?<!\*)\*(?!\*)/g, '');
}

function extractQuickReplies(text: string): QuickReply[] {
  const lower = text.toLowerCase();

  // Confirmation patterns
  if (
    lower.includes('всё верно') ||
    lower.includes('все верно') ||
    lower.includes('создаём автобронирование') ||
    lower.includes('создаем автобронирование')
  ) {
    return [
      { value: 'Да, создаём', label: 'Да, создаём' },
      { value: 'Нет', label: 'Нет, изменить' },
    ];
  }

  if (lower.includes('это правильный черновик')) {
    return [
      { value: 'Да', label: 'Да' },
      { value: 'Нет', label: 'Нет' },
    ];
  }

  // Normalize so that inline numbered items like "text: 1. Option" are split onto new lines
  const normalizedText = text.replace(/([^\n])(\d+[.\)]\s+)/g, '$1\n$2');
  const lines = normalizedText.split('\n');

  // Find the last contiguous block of NUMBERED lines only (never bullets)
  const suggestions: QuickReply[] = [];
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const match = line.match(/^\s*(\d+)[.\)]\s+(.+)$/);
    if (match) {
      const num = match[1];
      const label = stripMarkdown(match[2].trim());
      if (label.length > 0 && label.length < 120) {
        suggestions.unshift({ value: num, label, isNumbered: true });
      }
    } else if (suggestions.length > 0) {
      // Stop once we leave the last choice block
      break;
    }
  }

  // Hide chips if there is only 1 option or more than 6
  if (suggestions.length <= 1 || suggestions.length > 6) return [];
  return suggestions;
}

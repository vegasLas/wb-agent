import { prisma } from '@/config/database';

export interface PendingOption {
  number: number;
  label: string;
  value: string;
}

export interface PendingActionContext {
  [key: string]: unknown;
}

export async function getPendingAction(conversationId: string) {
  return prisma.aiPendingAction.findUnique({
    where: { conversationId },
  });
}

export async function createPendingAction(
  conversationId: string,
  actionType: string,
  options: PendingOption[],
  context: PendingActionContext = {},
  ttlMinutes = 10,
) {
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  await prisma.aiPendingAction.deleteMany({
    where: { conversationId },
  });

  return prisma.aiPendingAction.create({
    data: {
      conversationId,
      actionType,
      options: options as any,
      context: context as any,
      expiresAt,
    },
  });
}

export async function resolvePendingOption(
  conversationId: string,
  userReply: string,
): Promise<{ resolved: boolean; value?: string; context?: PendingActionContext; actionType?: string }> {
  const action = await getPendingAction(conversationId);
  if (!action) return { resolved: false };

  if (new Date() > action.expiresAt) {
    await clearPendingAction(conversationId);
    return { resolved: false };
  }

  const options = (action.options as any) as PendingOption[];
  const normalized = userReply.toLowerCase().trim();

  // If there's only one option and user confirms with yes/да, resolve it
  if (options.length === 1) {
    const confirmations = ['да', 'yes', 'создавай', 'верно', 'правильно', 'ok', 'ок', 'го', 'создай', 'подтверждаю', 'верно', 'так точно'];
    if (confirmations.includes(normalized)) {
      await clearPendingAction(conversationId);
      return { resolved: true, value: options[0].value, context: action.context as PendingActionContext, actionType: action.actionType };
    }
  }

  // Try to match by option number (e.g. "1", "опция 1", "вариант 2")
  const numberMatch = normalized.match(/(?:опция|вариант|option|#)?\s*(\d+)/);
  if (numberMatch) {
    const num = parseInt(numberMatch[1], 10);
    const found = options.find((o) => o.number === num);
    if (found) {
      await clearPendingAction(conversationId);
      return { resolved: true, value: found.value, context: action.context as PendingActionContext, actionType: action.actionType };
    }
  }

  // Try exact label match
  const labelMatch = options.find((o) => o.label.toLowerCase() === normalized);
  if (labelMatch) {
    await clearPendingAction(conversationId);
    return { resolved: true, value: labelMatch.value, context: action.context as PendingActionContext, actionType: action.actionType };
  }

  return { resolved: false };
}

export async function clearPendingAction(conversationId: string) {
  return prisma.aiPendingAction.deleteMany({
    where: { conversationId },
  });
}

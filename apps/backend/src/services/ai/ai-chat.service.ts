import { deepseek } from '@ai-sdk/deepseek';
import {
  convertToModelMessages,
  streamText,
  stepCountIs,
  smoothStream,
  UIMessage,
  CoreMessage,
  Tool,
} from 'ai';
import { prisma } from '@/config/database';
import { buildContextMessage } from './context-builder.service';
import { autobookingTools } from './tools/autobooking.tools';
import { triggerTools } from './tools/trigger.tools';
import { externalTools } from './tools/external.tools';
import { supplierTools } from './tools/supplier.tools';
import { mpstatsTools } from './tools/mpstats.tools';
import { advertsTools } from './tools/adverts.tools';
import { reportsTools } from './tools/reports.tools';
import { userContextTools } from './tools/user-context.tools';
import { resolvePendingOption, clearPendingAction } from './ai-pending-action.service';

import type { AttachmentMeta } from './file-extraction.service';

interface HandleChatInput {
  userId: number;
  conversationId?: string;
  messages: UIMessage[];
  attachments?: AttachmentMeta[];
}

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p: any) => p.type === 'text')
    .map((p: any) => p.text)
    .join('');
}

export class AIChatService {
  async handleChat({ userId, conversationId, messages, attachments }: HandleChatInput) {
    // 1. Load or create conversation
    let convId = conversationId;
    if (!convId) {
      const conv = await prisma.aiConversation.create({
        data: {
          userId,
          title: getMessageText(messages[0]).slice(0, 80) || 'New chat',
        },
      });
      convId = conv.id;
    }

    // 2. Persist the latest user message
    const lastUserMessage = messages[messages.length - 1];
    const lastUserText = lastUserMessage ? getMessageText(lastUserMessage) : '';
    if (lastUserMessage?.role === 'user' && lastUserText) {
      await prisma.aiMessage.create({
        data: {
          conversationId: convId,
          role: 'user',
          content: lastUserText,
          attachments: attachments?.length ? attachments : undefined,
        },
      });

      // Bump conversation to top of the list
      await prisma.aiConversation.update({
        where: { id: convId },
        data: { updatedAt: new Date() },
      });
    }

    // 3. Resolve any pending action based on the user's reply
    let pendingContextInjection = '';
    const pending = await resolvePendingOption(convId, lastUserText);
    if (pending.resolved && pending.actionType && pending.value) {
      pendingContextInjection = `\n[SYSTEM NOTE] Пользователь только что выбрал опцию для действия "${pending.actionType}". Выбранное значение: ${pending.value}. Сохраненный контекст: ${JSON.stringify(pending.context)}. Используй это значение и продолжи выполнение.\n`;
    }

    // 4. Build system context
    const systemMessage: CoreMessage = {
      role: 'system',
      content: (await buildContextMessage(userId)) + pendingContextInjection,
    };

    // 5. Convert client UIMessages to CoreMessages
    const convertedMessages = await convertToModelMessages(messages);
    const modelMessages: CoreMessage[] = [systemMessage, ...convertedMessages];

    // 6. Model routing
    const userText = lastUserText.toLowerCase();
    const wantsReasoning =
      userText.includes('почему') ||
      userText.includes('why') ||
      userText.includes('объясни') ||
      userText.includes('analyze');

    const model = wantsReasoning
      ? deepseek('deepseek-reasoner')
      : deepseek('deepseek-chat');

    const tools: Record<string, Tool> | undefined = wantsReasoning
      ? undefined
      : Object.assign(
          {} as Record<string, Tool>,
          autobookingTools(userId, convId),
          triggerTools(userId),
          externalTools(userId),
          supplierTools(userId),
          mpstatsTools(userId),
          advertsTools(userId),
          reportsTools(userId),
          userContextTools(userId),
        );

    // 7. Stream
    const result = streamText<Record<string, Tool>>({
      model,
      messages: modelMessages,
      tools: tools as any,
      stopWhen: wantsReasoning ? stepCountIs(1) : stepCountIs(5),
      maxTokens: 2048,
      experimental_transform: smoothStream({
        delayInMs: 40,
        chunking: 'word',
      }),
      onFinish: async ({ text, usage }) => {
        // Extract suggestions from assistant text if any
        const suggestions = extractSuggestions(text);

        await prisma.aiMessage
          .create({
            data: {
              conversationId: convId!,
              role: 'assistant',
              content: text,
              suggestions,
            },
          })
          .catch((err) => {
            console.error('[AI-CHAT] Failed to save assistant message:', err);
          });
      },
    });

    return result;
  }
}

/**
 * Extracts quick-reply suggestions from assistant text.
 * Looks for numbered lists or lines starting with option markers.
 */
function extractSuggestions(text: string): string[] {
  const suggestions: string[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    // Match "1. Option text" or "1) Option text" or "- Option text"
    const match = line.match(/^\s*(?:\d+[.\)]\s+|[\-\*]\s+)(.+)$/);
    if (match) {
      const label = match[1].trim();
      // Only use relatively short labels
      if (label.length > 0 && label.length < 120) {
        suggestions.push(label);
      }
    }
  }

  // Limit to first 6 suggestions
  return suggestions.slice(0, 6);
}

export const aiChatService = new AIChatService();

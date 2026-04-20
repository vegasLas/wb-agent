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
import { contentCardsTools } from './tools/content-cards.tools';
import { userContextTools } from './tools/user-context.tools';
import { promotionsTools } from './tools/promotions.tools';
import { feedbackTools } from './tools/feedback.tools';

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

    // 3. Build system context
    const systemMessage: CoreMessage = {
      role: 'system',
      content: await buildContextMessage(userId),
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
          contentCardsTools(userId),
          userContextTools(userId),
          promotionsTools(userId),
          feedbackTools(userId),
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
        await prisma.aiMessage
          .create({
            data: {
              conversationId: convId!,
              role: 'assistant',
              content: text,
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

export const aiChatService = new AIChatService();

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

interface HandleChatInput {
  userId: number;
  conversationId?: string;
  messages: UIMessage[];
}

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p: any) => p.type === 'text')
    .map((p: any) => p.text)
    .join('');
}

export class AIChatService {
  async handleChat({ userId, conversationId, messages }: HandleChatInput) {
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
        },
      });
    }

    // 3. Build system context
    const systemMessage: CoreMessage = {
      role: 'system',
      content: await buildContextMessage(userId),
    };

    // 4. Convert client UIMessages to CoreMessages
    const convertedMessages = await convertToModelMessages(messages);
    const modelMessages: CoreMessage[] = [systemMessage, ...convertedMessages];

    // 5. Model routing
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
          autobookingTools(userId),
          triggerTools(userId),
          externalTools(userId),
          supplierTools(userId),
          mpstatsTools(userId),
          advertsTools(userId),
          reportsTools(userId),
        );

    // 6. Stream

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
      onFinish: ({ text, usage }) => {
        prisma.aiMessage
          .create({
            data: {
              conversationId: convId!,
              role: 'assistant',
              content: text,
            },
          })
          .then(() => {
            console.log(
              `[AI-CHAT] user=${userId} conv=${convId} tokens=${JSON.stringify(usage)}`,
            );
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

import { deepseek } from '@ai-sdk/deepseek';
import {
  convertToModelMessages,
  streamText,
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

export class AIChatService {
  async handleChat({ userId, conversationId, messages }: HandleChatInput) {
    // 1. Load or create conversation
    let convId = conversationId;
    if (!convId) {
      const conv = await prisma.aiConversation.create({
        data: { userId, title: messages[0]?.content?.slice(0, 80) || 'New chat' },
      });
      convId = conv.id;
    }

    // 2. Persist the latest user message
    const lastUserMessage = messages[messages.length - 1];
    if (lastUserMessage?.role === 'user') {
      await prisma.aiMessage.create({
        data: {
          conversationId: convId,
          role: 'user',
          content: lastUserMessage.content as string,
        },
      });
    }

    // 3. Build system context
    const systemMessage: CoreMessage = {
      role: 'system',
      content: await buildContextMessage(userId),
    };

    // 4. Load history (last 20 stored messages)
    const history = await prisma.aiMessage.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    const historyMessages: CoreMessage[] = history.map(m => ({
      role: m.role as 'user' | 'assistant' | 'tool',
      content: m.content,
    }));

    const modelMessages: CoreMessage[] = [
      systemMessage,
      ...historyMessages,
      ...convertToModelMessages(messages),
    ];

    // 5. Model routing
    const userText = (lastUserMessage?.content as string)?.toLowerCase() ?? '';
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
      maxSteps: wantsReasoning ? 1 : 5,
      maxTokens: 2048,
      onFinish: async ({ text, usage }) => {
        await prisma.aiMessage.create({
          data: {
            conversationId: convId!,
            role: 'assistant',
            content: text,
          },
        });
        // TODO: log usage for cost monitoring
        console.log(`[AI-CHAT] user=${userId} conv=${convId} tokens=${JSON.stringify(usage)}`);
      },
    });

    return result;
  }
}

export const aiChatService = new AIChatService();

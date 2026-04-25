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
import { filterToolsByPermissions } from './ai-tool-permissions';
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

import type { AttachmentMeta } from './file-extraction.service';

interface HandleChatInput {
  userId: number;
  conversationId?: string;
  messages: UIMessage[];
  attachments?: AttachmentMeta[];
  abortSignal?: AbortSignal;
}

interface ChatResult {
  result: any;
  assistantMessageId: string;
  forceSave: () => Promise<string>;
}

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p: any) => p.type === 'text')
    .map((p: any) => p.text)
    .join('');
}

export class AIChatService {
  async handleChat({
    userId,
    conversationId,
    messages,
    attachments,
    abortSignal,
  }: HandleChatInput): Promise<ChatResult> {
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

    // 3. Create placeholder assistant message for partial persistence
    const assistantMessage = await prisma.aiMessage.create({
      data: {
        conversationId: convId,
        role: 'assistant',
        content: '',
      },
    });

    // 4. Build system context
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
      ? deepseek('deepseek-v4-flash')
      : deepseek('deepseek-v4-flash');

    // Resolve active supplier permissions for tool filtering
    const userWithAccounts = await prisma.user.findUnique({
      where: { id: userId },
      include: { accounts: { include: { suppliers: true } } },
    });
    const activeAccount =
      userWithAccounts?.accounts.find(
        (a) => a.id === userWithAccounts.selectedAccountId,
      ) || userWithAccounts?.accounts[0];
    const activeSupplier =
      activeAccount?.suppliers.find(
        (s) => s.supplierId === activeAccount.selectedSupplierId,
      ) || activeAccount?.suppliers[0];
    const permissions = (activeSupplier?.permissions as import('@prisma/client').Permission[]) || [];

    const tools: Record<string, Tool> | undefined = wantsReasoning
      ? undefined
      : Object.assign(
          {} as Record<string, Tool>,
          filterToolsByPermissions(autobookingTools(userId, convId), 'autobookingTools', permissions),
          filterToolsByPermissions(triggerTools(userId), 'triggerTools', permissions),
          filterToolsByPermissions(externalTools(userId), 'externalTools', permissions),
          filterToolsByPermissions(supplierTools(userId), 'supplierTools', permissions),
          filterToolsByPermissions(mpstatsTools(userId), 'mpstatsTools', permissions),
          filterToolsByPermissions(advertsTools(userId), 'advertsTools', permissions),
          filterToolsByPermissions(reportsTools(userId), 'reportsTools', permissions),
          filterToolsByPermissions(contentCardsTools(userId), 'contentCardsTools', permissions),
          filterToolsByPermissions(userContextTools(userId), 'userContextTools', permissions),
          filterToolsByPermissions(promotionsTools(userId), 'promotionsTools', permissions),
        );

    // 7. Set up accumulation and debounced persistence
    let accumulatedText = '';
    let lastDbUpdate = Date.now();
    const debounceMs = 2000;
    let toolCallsSnapshot: any = null;
    let toolResultsSnapshot: any = null;
    let isFinished = false;

    const saveToDb = async (text: string, calls?: any, results?: any) => {
      try {
        await prisma.aiMessage.update({
          where: { id: assistantMessage.id },
          data: {
            content: text,
            toolCalls: calls ?? undefined,
            toolResults: results ?? undefined,
          },
        });
      } catch (err) {
        console.error('[AI-CHAT] Failed to update assistant message:', err);
      }
    };

    const debouncedSave = (text: string) => {
      accumulatedText = text;
      const now = Date.now();
      if (now - lastDbUpdate >= debounceMs && !isFinished) {
        lastDbUpdate = now;
        saveToDb(accumulatedText).catch(() => {});
      }
    };

    const forceSave = async (): Promise<string> => {
      if (!isFinished && accumulatedText) {
        await saveToDb(accumulatedText, toolCallsSnapshot, toolResultsSnapshot);
      }
      return accumulatedText;
    };

    // 8. Stream
    const result = streamText<Record<string, Tool>>({
      model,
      messages: modelMessages,
      providerOptions: { deepseek: { thinking: { type: 'disabled' } } },
      tools: tools as any,
      stopWhen: wantsReasoning ? stepCountIs(1) : stepCountIs(5),
      maxTokens: 2048,
      abortSignal,
      experimental_transform: smoothStream({
        delayInMs: 40,
        chunking: 'word',
      }),
      onChunk: ({ chunk }: { chunk: any }) => {
        if (chunk.type === 'text-delta' && chunk.textDelta) {
          accumulatedText += chunk.textDelta;
          debouncedSave(accumulatedText);
        }
      },
      onStepFinish: ({ text, toolCalls, toolResults }) => {
        accumulatedText = text;
        toolCallsSnapshot = toolCalls ?? toolCallsSnapshot;
        toolResultsSnapshot = toolResults ?? toolResultsSnapshot;
        saveToDb(accumulatedText, toolCallsSnapshot, toolResultsSnapshot).catch(
          () => {},
        );
      },
      onError: ({ error }: { error: Error }) => {
        console.error('[AI-CHAT] streamText error:', error);
        // Skip overwriting on client abort — partial text is already saved by forceSave
        if (error.name === 'AbortError' || error.message?.includes('abort')) {
          return;
        }
        // Preserve accumulated text and append error note rather than overwriting
        const preservedText = accumulatedText
          ? `${accumulatedText}\n\n[Ошибка: ${error.message}]`
          : `Ошибка: не удалось получить ответ от ИИ. ${error.message}`;
        accumulatedText = preservedText;
        saveToDb(preservedText).catch(() => {});
      },
      onFinish: async ({ text, toolCalls, toolResults }) => {
        isFinished = true;
        accumulatedText = text;
        await saveToDb(text, toolCalls, toolResults);
      },
    });

    // Keep consuming the stream in the background so it finishes
    // even if the client disconnects (page reload, close tab).
    // This ensures onFinish fires and the full message is persisted.
    (result as any).consumeStream?.();

    return { result, assistantMessageId: assistantMessage.id, forceSave };
  }
}

export const aiChatService = new AIChatService();

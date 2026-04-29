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
import { aiUsageTrackingService } from './ai-usage-tracking.service';
import { filterToolsByPermissions } from './ai-tool-permissions';
import { AI_CHAT_BUDGET_USD, UserTier } from '@/constants/payments';
import { getBillingPeriodStart } from '@/utils/subscription';
import { ApiError } from '@/utils/errors';
import { createLogger } from '@/utils/logger';
import { calculateCost } from '@/config/ai-pricing';
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

const logger = createLogger('AIChatService');

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
  private async checkChatBudget(
    userId: number,
    tier: UserTier,
  ): Promise<{ allowed: boolean; spent: number; max: number }> {
    const max = AI_CHAT_BUDGET_USD[tier];
    const periodStart = await getBillingPeriodStart(userId);

    const result = await prisma.aiUsageLog.aggregate({
      _sum: { cost: true },
      where: {
        userId,
        feature: 'ai_chat',
        createdAt: { gte: periodStart },
      },
    });

    const spent = result._sum.cost ?? 0;

    return { allowed: spent < max, spent, max };
  }

  async handleChat({
    userId,
    conversationId,
    messages,
    attachments,
    abortSignal,
  }: HandleChatInput): Promise<ChatResult> {
    // 0. Check token budget
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscriptions: { orderBy: { startedAt: 'desc' }, take: 1 } },
    });
    const tier = (user?.subscriptions?.[0]?.tier ?? 'FREE') as UserTier;
    const budget = await this.checkChatBudget(userId, tier);

    if (!budget.allowed) {
      throw new ApiError(
        429,
        'Вы исчерпали лимит ИИ-чата. Обновите подписку для продолжения.',
        'AI_BUDGET_EXHAUSTED',
      );
    }

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
      onFinish: async ({ text, toolCalls, toolResults, usage }) => {
        isFinished = true;
        accumulatedText = text;
        await saveToDb(text, toolCalls, toolResults);

        if (usage) {
          // Read new AI SDK v6 fields (DeepSeek provider populates these correctly)
          let inputTokens = usage.inputTokens ?? 0;
          let outputTokens = usage.outputTokens ?? 0;
          const totalTokens = usage.totalTokens ?? 0;
          const cacheReadTokens = usage.inputTokenDetails?.cacheReadTokens ?? 0;
          let noCacheTokens = usage.inputTokenDetails?.noCacheTokens ?? 0;

          // Fallback: read from raw provider data if AI SDK fields are empty
          if (inputTokens === 0 && outputTokens === 0 && totalTokens > 0 && usage.raw) {
            const raw = usage.raw as Record<string, number>;
            logger.warn(
              `[AI-CHAT] User ${userId} | Message ${assistantMessage.id} | AI SDK fields empty, reading from raw usage: ${JSON.stringify(raw)}`,
            );
            inputTokens = raw.prompt_tokens ?? 0;
            outputTokens = raw.completion_tokens ?? 0;
            const rawCacheHit = raw.prompt_cache_hit_tokens ?? 0;
            const rawCacheMiss = raw.prompt_cache_miss_tokens ?? 0;
            if (rawCacheHit || rawCacheMiss) {
              noCacheTokens = rawCacheMiss;
            } else {
              noCacheTokens = Math.max(0, inputTokens - cacheReadTokens);
            }
          }

          // Final fallback: if still 0, attribute all to output
          if (inputTokens === 0 && outputTokens === 0 && totalTokens > 0) {
            logger.warn(
              `[AI-CHAT] User ${userId} | Message ${assistantMessage.id} | No token breakdown available, attributing all ${totalTokens} tokens to output.`,
            );
            outputTokens = totalTokens;
          }

          const cost = calculateCost(
            'deepseek-v4-flash',
            noCacheTokens,
            cacheReadTokens,
            outputTokens,
          );

          logger.info(
            `[AI-CHAT] User ${userId} | Message ${assistantMessage.id} | ` +
            `Total: ${totalTokens} | Input: ${inputTokens} (cacheMiss=${noCacheTokens} cacheHit=${cacheReadTokens}) | Output: ${outputTokens} | Cost: $${cost}`,
          );

          aiUsageTrackingService.trackUsage({
            userId,
            feature: 'ai_chat',
            model: 'deepseek-v4-flash',
            usage: {
              promptTokens: inputTokens,
              completionTokens: outputTokens,
              totalTokens,
              inputTokens,
              outputTokens,
              cacheReadTokens,
              noCacheTokens,
            },
            conversationId: convId,
            messageId: assistantMessage.id,
            metadata: {
              toolCount: toolCalls?.length ?? 0,
              usageBreakdownMissing: inputTokens === 0 && outputTokens === totalTokens && totalTokens > 0,
            },
          });
        }
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

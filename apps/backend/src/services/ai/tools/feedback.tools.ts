import { tool, Tool } from 'ai';
import { z } from 'zod';
import { prisma } from '@/config/database';
import { wbFeedbackService } from '@/services/external/wb/wb-feedback.service';
import { feedbackReviewService } from '@/services/domain/feedback/feedback-review.service';
import { safeTool, loggedTool, cachedExecute } from './safe-tool.utils';

async function resolveSupplierId(userId: number): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      accounts: {
        include: {
          suppliers: true,
        },
      },
    },
  });

  if (!user) throw new Error('User not found');

  const account = user.accounts.find((a) => a.id === user.selectedAccountId);
  if (!account) throw new Error('No account selected');

  const supplierId = account.selectedSupplierId || account.suppliers[0]?.supplierId;
  if (!supplierId) throw new Error('No supplier found');

  return supplierId;
}

export function feedbackTools(userId: number): Record<string, Tool> {
  return {
    generateFeedbackAnswer: tool({
      description: `Generate an AI-powered answer for a specific customer feedback/review on Wildberries.
Call this when the user wants to respond to a specific feedback or review.
Required: feedbackId (the WB feedback ID).`,
      inputSchema: z.object({
        feedbackId: z.string().describe('The WB feedback ID to answer'),
      }),
      execute: safeTool('generateFeedbackAnswer', async ({ feedbackId }) => {
        return loggedTool('generateFeedbackAnswer', userId, async () => {
          const supplierId = await resolveSupplierId(userId);
          const answerText = await feedbackReviewService.generateAnswerForFeedback(
            userId,
            supplierId,
            feedbackId,
          );
          return { answerText, feedbackId };
        });
      }),
    }),

    getFeedbackTemplates: tool({
      description: `Get the seller's prepared feedback answer templates from WB.
Call this when the user wants to see their saved response templates.
Required: none.`,
      inputSchema: z.object({}),
      execute: safeTool('getFeedbackTemplates', async () => {
        return loggedTool('getFeedbackTemplates', userId, async () => {
          return cachedExecute('feedback-templates', 60000, async () => {
            const data = await wbFeedbackService.getFeedbackTemplates({ userId });
            return { templates: data.templates || [] };
          });
        });
      }),
    }),

    getRecentFeedbacks: tool({
      description: `Get recent answered feedbacks for a specific product (nmId).
Useful for understanding the tone and style of previous responses.
Required: nmId (product WB article number).`,
      inputSchema: z.object({
        nmId: z.number().int().describe('The WB article number (nmId)'),
        limit: z.number().int().min(1).max(100).optional().describe('Max feedbacks to return'),
      }),
      execute: safeTool('getRecentFeedbacks', async ({ nmId, limit = 20 }) => {
        return loggedTool('getRecentFeedbacks', userId, async () => {
          const allAnswered = await wbFeedbackService.getAllFeedbacks({
            userId,
            isAnswered: true,
          });

          const filtered = allAnswered
            .filter((f) => f.productInfo?.wbArticle === nmId && f.answer)
            .slice(0, limit)
            .map((f) => ({
              feedbackId: f.id,
              feedbackText: f.feedbackInfo.feedbackText,
              answerText: f.answer?.answerText,
              rating: f.valuation,
              createdDate: f.createdDate,
            }));

          return { feedbacks: filtered, count: filtered.length };
        });
      }),
    }),

    getUnansweredFeedbacks: tool({
      description: `Get all unanswered feedbacks for the user's account.
Call this when the user wants to see which reviews need a response.
Required: none.`,
      inputSchema: z.object({}),
      execute: safeTool('getUnansweredFeedbacks', async () => {
        return loggedTool('getUnansweredFeedbacks', userId, async () => {
          const data = await wbFeedbackService.getAllFeedbacks({
            userId,
            isAnswered: false,
          });

          const mapped = data.map((f) => ({
            feedbackId: f.id,
            productName: f.productInfo?.name,
            brand: f.productInfo?.brand,
            nmId: f.productInfo?.wbArticle,
            feedbackText: f.feedbackInfo.feedbackText,
            pros: f.feedbackInfo.feedbackTextPros,
            cons: f.feedbackInfo.feedbackTextCons,
            rating: f.valuation,
            userName: f.feedbackInfo.userName,
            hasPhotos: (f.feedbackInfo.photos?.length || 0) > 0,
            hasVideo: !!f.feedbackInfo.video,
            createdDate: f.createdDate,
          }));

          return { feedbacks: mapped, count: mapped.length };
        });
      }),
    }),

    postFeedbackAnswer: tool({
      description: `Post an answer to a specific feedback on Wildberries.
Call this after generating an answer that the user has approved.
Required: feedbackId, nmId, answerText.`,
      inputSchema: z.object({
        feedbackId: z.string().describe('The WB feedback ID'),
        nmId: z.number().int().describe('The WB article number'),
        answerText: z.string().describe('The answer text to post'),
      }),
      execute: safeTool('postFeedbackAnswer', async ({ feedbackId, nmId, answerText }) => {
        return loggedTool('postFeedbackAnswer', userId, async () => {
          const result = await wbFeedbackService.answerFeedback({
            userId,
            feedbackId,
            nmId,
            answerText,
          });

          return {
            success: !result.error,
            errorText: result.errorText,
          };
        });
      }),
    }),
  };
}

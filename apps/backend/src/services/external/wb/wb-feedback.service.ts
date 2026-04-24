/**
 * WB Feedback Service
 * Handles Wildberries seller feedback/review API endpoints:
 * - Get feedbacks list (seller-reviews.wildberries.ru)
 * - Get feedback templates
 * - Post feedback answer
 */

import { wbAccountRequest, wbAccountRequestSlowRetry } from '@/utils/wb-request';
import { resolveAccountContext } from '@/utils/supplier-resolver';
import { createLogger } from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('WBFeedback');

const DEFAULT_PAGE_LIMIT = 100;
const MAX_FEEDBACKS_FETCH = 5000;

import type {
  FeedbackResponse,
  FeedbackData,
  FeedbackItem,
  FeedbackTemplateResponse,
  FeedbackTemplateData,
  FeedbackAnswerResponse,
} from '@/types/wb';

export class WBFeedbackService {
  /**
   * Get feedbacks list from seller-reviews.wildberries.ru
   * @param userId - User ID
   * @param isAnswered - Filter by answered status (true/false)
   * @param limit - Number of records (default: 100)
   * @param cursor - Pagination cursor
   * @param searchText - Search text filter
   */
  async getFeedbacks({
    userId,
    isAnswered = false,
    limit = 100,
    cursor = '',
    searchText = '',
    valuations,
  }: {
    userId: number;
    isAnswered?: boolean;
    limit?: number;
    cursor?: string;
    searchText?: string;
    valuations?: number[];
  }): Promise<FeedbackData> {
    const { accountId, supplierId, userAgent, proxy } =
      await resolveAccountContext(userId);

    let url =
      `https://seller-reviews.wildberries.ru/ns/fa-seller-api/reviews-ext-seller-portal/api/v2/feedbacks` +
      `?cursor=${encodeURIComponent(cursor)}` +
      `&isAnswered=${isAnswered}` +
      `&limit=${limit}` +
      `&searchText=${encodeURIComponent(searchText)}` +
      `&sortOrder=dateDesc`;

    if (valuations && valuations.length > 0) {
      for (const v of valuations) {
        url += `&valuations=${v}`;
      }
    }

    logger.info(`Fetching feedbacks for user ${userId}, isAnswered=${isAnswered}`);

    const response = await wbAccountRequest<FeedbackResponse>({
      url,
      accountId,
      userAgent,
      proxy,
      supplierId,
      method: 'GET',
    });

    return response.data;
  }

  /**
   * Get all feedbacks by paginating through the API until no more pages
   */
  async getAllFeedbacks({
    userId,
    isAnswered = false,
    searchText = '',
    valuations,
  }: {
    userId: number;
    isAnswered?: boolean;
    searchText?: string;
    valuations?: number[];
  }): Promise<FeedbackItem[]> {
    const allFeedbacks: FeedbackItem[] = [];
    let cursor = '';
    let hasMore = true;

    while (hasMore) {
      const data = await this.getFeedbacks({
        userId,
        isAnswered,
        limit: DEFAULT_PAGE_LIMIT,
        cursor,
        searchText,
        valuations,
      });

      if (data.feedbacks && data.feedbacks.length > 0) {
        allFeedbacks.push(...data.feedbacks);
      }

      if (data.pages?.next) {
        cursor = data.pages.next;
      } else {
        hasMore = false;
      }

      // Safety break
      if (allFeedbacks.length >= MAX_FEEDBACKS_FETCH) {
        logger.warn(`Reached safety limit of ${MAX_FEEDBACKS_FETCH} feedbacks for user ${userId}`);
        break;
      }
    }

    return allFeedbacks;
  }

  /**
   * Get feedback templates from seller-reviews.wildberries.ru
   * @param userId - User ID
   */
  async getFeedbackTemplates({
    userId,
  }: {
    userId: number;
  }): Promise<FeedbackTemplateData> {
    const { accountId, supplierId, userAgent, proxy } =
      await resolveAccountContext(userId);

    const url =
      `https://seller-reviews.wildberries.ru/ns/fa-seller-api/reviews-ext-seller-portal/api/v1/templates/feedbacks`;

    logger.info(`Fetching feedback templates for user ${userId}`);

    const response = await wbAccountRequest<FeedbackTemplateResponse>({
      url,
      accountId,
      userAgent,
      proxy,
      supplierId,
      method: 'GET',
    });

    return response.data;
  }

  /**
   * Post an answer to a feedback
   * @param userId - User ID
   * @param feedbackId - Feedback ID
   * @param nmId - NM ID (product ID)
   * @param answerText - Answer text
   */
  async answerFeedback({
    userId,
    feedbackId,
    nmId,
    answerText,
  }: {
    userId: number;
    feedbackId: string;
    nmId: number;
    answerText: string;
  }): Promise<FeedbackAnswerResponse> {
    const { accountId, supplierId, userAgent, proxy } =
      await resolveAccountContext(userId);

    const url =
      `https://seller-reviews.wildberries.ru/ns/fa-seller-api/reviews-ext-seller-portal/api/v2/feedbacks/answer`;

    const body = {
      requestId: uuidv4(),
      answerText,
      feedbackId,
      nmId,
    };

    logger.info(`Posting feedback answer for user ${userId}, feedbackId=${feedbackId}`);

    return wbAccountRequestSlowRetry<FeedbackAnswerResponse>({
      url,
      accountId,
      userAgent,
      proxy,
      supplierId,
      method: 'POST',
      body,
    });
  }
}

// Export singleton instance
export const wbFeedbackService = new WBFeedbackService();

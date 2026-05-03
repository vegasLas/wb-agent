import { wbOfficialRequest } from '@/utils/wb-official-request';
import { createLogger } from '@/utils/logger';
import type {
  FeedbackResponse,
  FeedbackItem,
  FeedbackAnswerResponse,
} from '@/types/wb';
import {
  mapOfficialResponseToFeedbackResponse,
  type OfficialFeedbacksApiResponse,
} from './wb-feedback-official.mapper';

const logger = createLogger('WBFeedbackOfficial');

const BASE_URL = 'https://feedbacks-api.wildberries.ru';
const CATEGORY = 'QUESTIONS_AND_REVIEWS';

export interface GetFeedbacksParams {
  supplierId: string;
  isAnswered?: boolean;
  limit?: number;
  offset?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface GetArchiveFeedbacksParams {
  supplierId: string;
  limit?: number;
  offset?: number;
}

export interface AnswerFeedbackParams {
  supplierId: string;
  feedbackId: string;
  answerText: string;
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function validateSupplierId(supplierId: string): void {
  if (!supplierId || supplierId.trim().length === 0) {
    throw new Error('supplierId is required');
  }
}

function validatePagination(limit: number, offset: number): void {
  if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
    throw new Error('limit must be between 1 and 100');
  }
  if (!Number.isFinite(offset) || offset < 0) {
    throw new Error('offset must be a non-negative number');
  }
}

function validateDateRange(dateFrom?: string, dateTo?: string): void {
  if (dateFrom && !ISO_DATE_REGEX.test(dateFrom)) {
    throw new Error('dateFrom must be in YYYY-MM-DD format');
  }
  if (dateTo && !ISO_DATE_REGEX.test(dateTo)) {
    throw new Error('dateTo must be in YYYY-MM-DD format');
  }
}

export class WBFeedbackOfficialService {
  async getFeedbacks({
    supplierId,
    isAnswered = false,
    limit = 100,
    offset = 0,
    dateFrom,
    dateTo,
  }: GetFeedbacksParams): Promise<FeedbackResponse> {
    validateSupplierId(supplierId);
    validatePagination(limit, offset);
    validateDateRange(dateFrom, dateTo);

    let path = `/api/v1/feedbacks?isAnswered=${isAnswered}&take=${limit}&skip=${offset}`;
    if (dateFrom) path += `&dateFrom=${dateFrom}`;
    if (dateTo) path += `&dateTo=${dateTo}`;

    const response = await wbOfficialRequest<OfficialFeedbacksApiResponse>({
      baseUrl: BASE_URL,
      path,
      supplierId,
      category: CATEGORY,
      method: 'GET',
    });

    return mapOfficialResponseToFeedbackResponse(response, limit, offset);
  }

  /**
   * Fetch archived feedbacks.
   * The archive contains feedbacks that are no longer in the active list.
   */
  async getArchiveFeedbacks({
    supplierId,
    limit = 100,
    offset = 0,
  }: GetArchiveFeedbacksParams): Promise<FeedbackResponse> {
    validateSupplierId(supplierId);
    validatePagination(limit, offset);

    const path = `/api/v1/feedbacks/archive?take=${limit}&skip=${offset}`;

    const response = await wbOfficialRequest<OfficialFeedbacksApiResponse>({
      baseUrl: BASE_URL,
      path,
      supplierId,
      category: CATEGORY,
      method: 'GET',
    });

    return mapOfficialResponseToFeedbackResponse(response, limit, offset);
  }

  /**
   * Post an answer to a feedback.
   * NOTE: `wasViewed` is NOT sent — the official API rejects this field.
   */
  async answerFeedback({
    supplierId,
    feedbackId,
    answerText,
  }: AnswerFeedbackParams): Promise<FeedbackAnswerResponse> {
    validateSupplierId(supplierId);
    if (!feedbackId || feedbackId.trim().length === 0) {
      throw new Error('feedbackId is required');
    }
    if (!answerText || answerText.trim().length === 0) {
      throw new Error('answerText is required');
    }

    return wbOfficialRequest<FeedbackAnswerResponse>({
      baseUrl: BASE_URL,
      path: '/api/v1/feedbacks/answer',
      supplierId,
      category: CATEGORY,
      method: 'POST',
      body: {
        id: feedbackId,
        text: answerText,
      },
    });
  }

  /**
   * Collect all active unanswered feedbacks for batch processing.
   */
  async getAllUnansweredFeedbacks({
    supplierId,
  }: {
    supplierId: string;
  }): Promise<FeedbackItem[]> {
    validateSupplierId(supplierId);

    const all: FeedbackItem[] = [];
    const limit = 100;
    const maxPages = 50; // Safety break: 50 × 100 = 5000 feedbacks max

    let offset = 0;
    let hasMore = true;
    let pagesFetched = 0;

    while (hasMore && pagesFetched < maxPages) {
      const res = await this.getFeedbacks({
        supplierId,
        isAnswered: false,
        limit,
        offset,
      });
      const batch = res.data.feedbacks || [];
      all.push(...batch);
      hasMore = batch.length === limit;
      offset += limit;
      pagesFetched++;
    }

    if (pagesFetched >= maxPages) {
      logger.warn(
        `Reached safety limit of ${maxPages} pages for active feedbacks for supplier ${supplierId}`,
      );
    }

    return all;
  }

  /**
   * Fetch a small number of answered feedbacks to use as examples
   * for AI-generated answers (replaces templates).
   */
  async getAnsweredFeedbackExamples({
    supplierId,
    limit = 10,
  }: {
    supplierId: string;
    limit?: number;
  }): Promise<FeedbackItem[]> {
    validateSupplierId(supplierId);
    if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
      throw new Error('limit must be between 1 and 100');
    }

    const res = await this.getFeedbacks({
      supplierId,
      isAnswered: true,
      limit,
      offset: 0,
    });
    return (res.data.feedbacks || []).filter((f) => f.answer);
  }
}

export const wbFeedbackOfficialService = new WBFeedbackOfficialService();

import apiClient from '../client';
import type {
  FeedbacksResponse,
  FeedbackStatistics,
  FeedbackSettingsResponse,
  FeedbackSettings,
  FeedbackProductSetting,
  FeedbackTemplatesResponse,
  GenerateAnswerResponse,
  ProcessResult,
  FetchFeedbacksParams,
} from './types';

/**
 * Feedbacks API
 * Endpoints for WB feedback/review management
 */

export const feedbacksAPI = {
  /**
   * GET /api/v1/feedbacks
   * Get feedbacks list
   */
  async fetchFeedbacks(params?: FetchFeedbacksParams): Promise<FeedbacksResponse> {
    const response = await apiClient.get<{ data: FeedbacksResponse }>(
      '/feedbacks',
      { params },
    );
    return response.data.data;
  },

  /**
   * GET /api/v1/feedbacks/count-unanswered
   * Count total unanswered feedbacks
   */
  async countUnansweredFeedbacks(): Promise<number> {
    const response = await apiClient.get<{ data: { count: number } }>(
      '/feedbacks/count-unanswered',
    );
    return response.data.data.count;
  },

  /**
   * POST /api/v1/feedbacks/answer-all
   * Batch process all unanswered feedbacks
   */
  async answerAllFeedbacks(): Promise<ProcessResult> {
    const response = await apiClient.post<{ data: ProcessResult }>(
      '/feedbacks/answer-all',
    );
    return response.data.data;
  },

  /**
   * POST /api/v1/feedbacks/generate
   * Generate answer for a single feedback
   */
  async generateAnswer(feedbackId: string, feedback: unknown): Promise<GenerateAnswerResponse> {
    const response = await apiClient.post<{ data: GenerateAnswerResponse }>(
      '/feedbacks/generate',
      { feedbackId, feedback },
    );
    return response.data.data;
  },

  /**
   * POST /api/v1/feedbacks/accept
   * Accept and post generated answer
   */
  async acceptAnswer(feedbackId: string): Promise<void> {
    await apiClient.post('/feedbacks/accept', { feedbackId });
  },

  /**
   * POST /api/v1/feedbacks/reject
   * Reject generated answer
   */
  async rejectAnswer(feedbackId: string): Promise<void> {
    await apiClient.post('/feedbacks/reject', { feedbackId });
  },

  /**
   * GET /api/v1/feedbacks/statistics
   * Get auto-answer statistics
   */
  async fetchStatistics(): Promise<FeedbackStatistics> {
    const response = await apiClient.get<{ data: FeedbackStatistics }>(
      '/feedbacks/statistics',
    );
    return response.data.data;
  },

  /**
   * GET /api/v1/feedbacks/settings
   * Get user feedback settings
   */
  async fetchSettings(): Promise<FeedbackSettingsResponse> {
    const response = await apiClient.get<{ data: FeedbackSettingsResponse }>(
      '/feedbacks/settings',
    );
    return response.data.data;
  },

  /**
   * PUT /api/v1/feedbacks/settings
   * Update global auto-answer setting
   */
  async updateSettings(autoAnswerEnabled: boolean): Promise<FeedbackSettings> {
    const response = await apiClient.put<{ data: FeedbackSettings }>(
      '/feedbacks/settings',
      { autoAnswerEnabled },
    );
    return response.data.data;
  },

  /**
   * PUT /api/v1/feedbacks/settings/product
   * Update per-product auto-answer setting
   */
  async updateProductSetting(
    nmId: number,
    autoAnswerEnabled: boolean,
  ): Promise<FeedbackProductSetting> {
    const response = await apiClient.put<{ data: FeedbackProductSetting }>(
      '/feedbacks/settings/product',
      { nmId, autoAnswerEnabled },
    );
    return response.data.data;
  },

  /**
   * GET /api/v1/feedbacks/templates
   * Get seller feedback templates
   */
  async fetchTemplates(): Promise<FeedbackTemplatesResponse> {
    const response = await apiClient.get<{ data: FeedbackTemplatesResponse }>(
      '/feedbacks/templates',
    );
    return response.data.data;
  },
};

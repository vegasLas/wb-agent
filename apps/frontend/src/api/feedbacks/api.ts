import apiClient from '../client';
import type {
  FeedbacksResponse,
  FeedbackStatistics,
  FeedbackSettingsResponse,
  FeedbackSettings,
  FeedbackProductSetting,
  FeedbackTemplatesResponse,
  GenerateAnswerResponse,
  RegenerateAnswerResponse,
  RejectedAnswerContext,
  FeedbackGoodsGroup,
  ProcessResult,
  FetchFeedbacksParams,
  GoodsItem,
  FeedbackRule,
  CreateFeedbackRuleInput,
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
  async rejectAnswer(feedbackId: string, userFeedback?: string): Promise<void> {
    await apiClient.post('/feedbacks/reject', { feedbackId, userFeedback });
  },

  /**
   * POST /api/v1/feedbacks/regenerate
   * Regenerate answer for a feedback
   */
  async regenerateAnswer(feedbackId: string, feedback: unknown, userFeedback?: string): Promise<RegenerateAnswerResponse> {
    const response = await apiClient.post<{ data: RegenerateAnswerResponse }>(
      '/feedbacks/regenerate',
      { feedbackId, feedback, userFeedback },
    );
    return response.data.data;
  },

  /**
   * GET /api/v1/feedbacks/rejected
   * Get recent rejected answers
   */
  async fetchRejectedAnswers(): Promise<RejectedAnswerContext[]> {
    const response = await apiClient.get<{ data: { rejectedAnswers: RejectedAnswerContext[] } }>(
      '/feedbacks/rejected',
    );
    return response.data.data.rejectedAnswers;
  },

  /**
   * PUT /api/v1/feedbacks/rejected/:id
   * Update a rejected answer
   */
  async updateRejected(
    id: string,
    userFeedback?: string,
  ): Promise<void> {
    await apiClient.put(`/feedbacks/rejected/${id}`, { userFeedback });
  },

  /**
   * GET /api/v1/feedbacks/goods-groups
   * Get goods groups
   */
  async fetchGoodsGroups(): Promise<FeedbackGoodsGroup[]> {
    const response = await apiClient.get<{ data: { groups: FeedbackGoodsGroup[] } }>(
      '/feedbacks/goods-groups',
    );
    return response.data.data.groups;
  },

  /**
   * POST /api/v1/feedbacks/goods-groups
   * Create a goods group
   */
  async createGoodsGroup(nmIds: number[]): Promise<FeedbackGoodsGroup> {
    const response = await apiClient.post<{ data: { group: FeedbackGoodsGroup } }>(
      '/feedbacks/goods-groups',
      { nmIds },
    );
    return response.data.data.group;
  },

  /**
   * PUT /api/v1/feedbacks/goods-groups/:id
   * Update a goods group
   */
  async updateGoodsGroup(id: string, nmIds: number[]): Promise<FeedbackGoodsGroup> {
    const response = await apiClient.put<{ data: { group: FeedbackGoodsGroup } }>(
      `/feedbacks/goods-groups/${id}`,
      { nmIds },
    );
    return response.data.data.group;
  },

  /**
   * DELETE /api/v1/feedbacks/goods-groups/:id
   * Delete a goods group
   */
  async deleteGoodsGroup(id: string): Promise<void> {
    await apiClient.delete(`/feedbacks/goods-groups/${id}`);
  },

  /**
   * POST /api/v1/feedbacks/goods-groups/merge
   * Merge two goods
   */
  async mergeGoods(sourceNmId: number, targetNmId: number): Promise<FeedbackGoodsGroup> {
    const response = await apiClient.post<{ data: { group: FeedbackGoodsGroup } }>(
      '/feedbacks/goods-groups/merge',
      { sourceNmId, targetNmId },
    );
    return response.data.data.group;
  },

  /**
   * POST /api/v1/feedbacks/goods-groups/:id/remove
   * Remove a nmId from a group
   */
  async removeNmIdFromGroup(groupId: string, nmId: number): Promise<void> {
    await apiClient.post(`/feedbacks/goods-groups/${groupId}/remove`, { nmId });
  },

  /**
   * DELETE /api/v1/feedbacks/rejected/:id
   * Delete a rejected answer
   */
  async deleteRejected(id: string): Promise<void> {
    await apiClient.delete(`/feedbacks/rejected/${id}`);
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



  /**
   * GET /api/v1/feedbacks/goods
   * Get account goods grouped by category
   */
  async fetchGoodsByCategory(): Promise<Record<string, GoodsItem[]>> {
    const response = await apiClient.get<{ data: { goodsByCategory: Record<string, GoodsItem[]> } }>(
      '/feedbacks/goods',
    );
    return response.data.data.goodsByCategory;
  },

  /**
   * GET /api/v1/feedbacks/rules
   * Get all product rules
   */
  async fetchFeedbackRules(): Promise<FeedbackRule[]> {
    const response = await apiClient.get<{ data: { rules: FeedbackRule[] } }>(
      '/feedbacks/rules',
    );
    return response.data.data.rules;
  },

  /**
   * POST /api/v1/feedbacks/rules
   * Create a feedback rule
   */
  async createFeedbackRule(input: CreateFeedbackRuleInput): Promise<FeedbackRule> {
    const response = await apiClient.post<{ data: { rule: FeedbackRule } }>(
      '/feedbacks/rules',
      input,
    );
    return response.data.data.rule;
  },

  /**
   * PUT /api/v1/feedbacks/rules/:id
   * Update a feedback rule
   */
  async updateFeedbackRule(
    id: string,
    input: Partial<CreateFeedbackRuleInput>,
  ): Promise<FeedbackRule> {
    const response = await apiClient.put<{ data: { rule: FeedbackRule } }>(
      `/feedbacks/rules/${id}`,
      input,
    );
    return response.data.data.rule;
  },

  /**
   * DELETE /api/v1/feedbacks/rules/:id
   * Delete a feedback rule
   */
  async deleteFeedbackRule(id: string): Promise<void> {
    await apiClient.delete(`/feedbacks/rules/${id}`);
  },
};

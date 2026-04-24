/**
 * Feedbacks Store Types
 * Domain types are re-exported from the API layer to maintain a single source of truth.
 * Only store-specific types are defined here.
 */

export type {
  FeedbackItem,
  AiFeedbackItem,
  FeedbackAnswer,
  FeedbackInfo,
  FeedbackPhoto,
  FeedbackVideo,
  FeedbackProductInfo,
  FeedbackStatistics,
  FeedbackSettings,
  FeedbackProductSetting,
  ProcessResult,
  FeedbackRule,
  RejectedAnswerContext,
  FeedbackGoodsGroup,
  CreateFeedbackRuleInput,
  FeedbacksResponse,
} from '@/api/feedbacks/types';

export type FeedbackTab = 'unanswered' | 'ai-posted' | 'ai-pending';

export interface GeneratedAnswer {
  feedbackId: string;
  answerText: string;
}

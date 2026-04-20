/**
 * Feedbacks Store Types
 * Domain types are re-exported from the API layer to maintain a single source of truth.
 * Only store-specific types are defined here.
 */

export type {
  FeedbackItem,
  FeedbackAnswer,
  FeedbackInfo,
  FeedbackPhoto,
  FeedbackVideo,
  FeedbackProductInfo,
  FeedbackStatistics,
  FeedbackSettings,
  FeedbackProductSetting,
  ProcessResult,
} from '@/api/feedbacks/types';

export type FeedbackTab = 'answered' | 'unanswered';

export interface GeneratedAnswer {
  feedbackId: string;
  answerText: string;
}

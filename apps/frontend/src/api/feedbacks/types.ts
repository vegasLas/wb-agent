/**
 * Feedbacks API Types
 */

export interface FeedbackItem {
  id: string;
  answer: FeedbackAnswer | null;
  createdDate: number;
  feedbackInfo: FeedbackInfo;
  productInfo: FeedbackProductInfo;
  trustFactor: string;
  valuation: number;
  parentFeedbackId?: string;
  childFeedbackId?: string;
}

export interface AiFeedbackItem extends FeedbackItem {
  aiAnswer: {
    answerText: string;
    status: string;
  };
}

export interface FeedbackAnswer {
  answerText: string;
  createdDate: number;
  isEditable: boolean;
  status: string;
}

export interface FeedbackInfo {
  feedbackText: string;
  feedbackTextPros: string;
  feedbackTextCons: string;
  photos: FeedbackPhoto[] | null;
  video: FeedbackVideo | null;
  userName: string;
  purchaseDate: number;
  isHidden: boolean;
}

export interface FeedbackPhoto {
  fullSizeUrl: string;
  thumbUrl: string;
}

export interface FeedbackVideo {
  durationSec: number;
  link: string;
  previewImage: string;
}

export interface FeedbackProductInfo {
  brand: string;
  category: string;
  name: string;
  supplierArticle: string;
  wbArticle: number;
}

export interface FeedbacksResponse {
  countUnanswered: number;
  feedbacks: FeedbackItem[];
  pages: {
    last: string;
    next: string;
  };
}

export interface ProductStat {
  nmId: number;
  postedCount: number;
  rejectedCount: number;
}

export interface FeedbackStatistics {
  today: number;
  week: number;
  allTime: number;
  products: ProductStat[];
}

export interface FeedbackSettings {
  id: string;
  userId: number;
  autoAnswerEnabled: boolean;
}

export interface FeedbackProductSetting {
  id: string;
  userId: number;
  nmId: number;
  autoAnswerEnabled: boolean;
}

export interface FeedbackSettingsResponse {
  settings: FeedbackSettings;
  productSettings: FeedbackProductSetting[];
}

export interface FeedbackTemplate {
  id: string;
  name: string;
  content: string;
}

export interface FeedbackTemplatesResponse {
  templates: FeedbackTemplate[];
}

export interface GenerateAnswerResponse {
  answerText: string;
  feedbackId: string;
}

export interface RegenerateAnswerResponse {
  answerText: string;
  feedbackId: string;
}

export interface RejectedAnswerContext {
  id: string;
  feedbackText: string;
  rejectedAnswerText: string;
  aiAnalysis: string | null;
  mistakeCategory: string | null;
  userFeedback: string | null;
  nmId: number;
  createdAt: string;
}

export interface FeedbackGoodsGroup {
  id: string;
  userId: number;
  supplierId: string;
  nmIds: number[];
  createdAt: string;
  updatedAt: string;
}

export interface ProcessResult {
  processed: number;
  posted: number;
  skipped: number;
  failed: number;
}

export interface FetchFeedbacksParams {
  tab?: 'unanswered' | 'ai-posted' | 'ai-pending';
  limit?: number;
  cursor?: string;
  searchText?: string;
}

export interface GoodsItem {
  title: string;
  nmID: number;
  currentPrice: number | null;
  stocks: number;
  subject: string;
  feedbackRating: number;
  vendorCode: string;
  thumbnail: string | null;
}

export interface FeedbackProductRule {
  id: string;
  userId: number;
  supplierId: string;
  nmIds: number[];
  minRating: number | null;
  maxRating: number | null;
  excludeKeywords: string[];
  requireApproval: boolean;
  enabled: boolean;
}

export interface CreateProductRuleInput {
  nmIds: number[];
  minRating?: number | null;
  maxRating?: number | null;
  excludeKeywords?: string[];
  requireApproval?: boolean;
  enabled?: boolean;
}

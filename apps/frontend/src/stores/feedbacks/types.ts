export interface FeedbackItem {
  id: string;
  answer: FeedbackAnswer | null;
  createdDate: number;
  feedbackInfo: FeedbackInfo;
  productInfo: FeedbackProductInfo;
  trustFactor: string;
  valuation: number;
  wasViewed: boolean;
  parentFeedbackId?: string;
  childFeedbackId?: string;
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
  badReasons: string[];
  goodReasons: string[];
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
  brandId: number;
  category: string;
  name: string;
  supplierArticle: string;
  wbArticle: number;
}

export interface FeedbackStatistics {
  today: number;
  week: number;
  allTime: number;
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

export type FeedbackTab = 'answered' | 'unanswered';

export interface GeneratedAnswer {
  feedbackId: string;
  answerText: string;
}

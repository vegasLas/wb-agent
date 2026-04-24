/**
 * Feedback Mapper
 * Maps raw WB API FeedbackItem to a slimmed DTO containing only fields the frontend needs.
 */

import type {
  FeedbackItem as WBFeedbackItem,
  FeedbackAnswer as WBFeedbackAnswer,
  FeedbackPhoto,
  FeedbackVideo,
} from '@/types/wb';

export interface FeedbackItemDTO {
  id: string;
  createdDate: number;
  valuation: number;
  trustFactor: string;
  parentFeedbackId?: string;
  childFeedbackId?: string;
  answer: {
    answerText: string;
    createdDate: number;
    isEditable: boolean;
    status: string;
  } | null;
  feedbackInfo: {
    feedbackText: string;
    feedbackTextPros: string;
    feedbackTextCons: string;
    photos: FeedbackPhoto[] | null;
    video: FeedbackVideo | null;
    userName: string;
    purchaseDate: number;
    isHidden: boolean;
  };
  productInfo: {
    brand: string;
    name: string;
    supplierArticle: string;
    wbArticle: number;
    category: string;
  };
}

export interface AiFeedbackItemDTO extends FeedbackItemDTO {
  aiAnswer: {
    answerText: string;
    status: string;
  };
}

function mapAnswer(answer: WBFeedbackAnswer | null): FeedbackItemDTO['answer'] {
  if (!answer) return null;
  return {
    answerText: answer.answerText,
    createdDate: answer.createdDate,
    isEditable: answer.isEditable,
    status: answer.status,
  };
}

export function mapFeedbackItemToDTO(raw: WBFeedbackItem): FeedbackItemDTO {
  return {
    id: raw.id,
    createdDate: raw.createdDate,
    valuation: raw.valuation,
    trustFactor: raw.trustFactor,
    parentFeedbackId: raw.parentFeedbackId,
    childFeedbackId: raw.childFeedbackId,
    answer: mapAnswer(raw.answer),
    feedbackInfo: {
      feedbackText: raw.feedbackInfo?.feedbackText ?? '',
      feedbackTextPros: raw.feedbackInfo?.feedbackTextPros ?? '',
      feedbackTextCons: raw.feedbackInfo?.feedbackTextCons ?? '',
      photos: raw.feedbackInfo?.photos ?? null,
      video: raw.feedbackInfo?.video ?? null,
      userName: raw.feedbackInfo?.userName ?? '',
      purchaseDate: raw.feedbackInfo?.purchaseDate ?? 0,
      isHidden: raw.feedbackInfo?.isHidden ?? false,
    },
    productInfo: {
      brand: raw.productInfo?.brand ?? '',
      name: raw.productInfo?.name ?? '',
      supplierArticle: raw.productInfo?.supplierArticle ?? '',
      wbArticle: raw.productInfo?.wbArticle ?? 0,
    },
  };
}

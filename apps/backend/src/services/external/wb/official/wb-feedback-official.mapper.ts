import type { FeedbackItem, FeedbackResponse } from '@/types/wb';

// ---------------------------------------------------------------------------
// Upstream types (internal — not exported)
// ---------------------------------------------------------------------------

interface OfficialFeedbackAnswer {
  text: string;
  state: string;
  editable: boolean;
  createDate: string;
}

interface OfficialProductDetails {
  imtId: number;
  nmId: number;
  productName: string;
  supplierArticle: string;
  brandName: string;
}

interface OfficialFeedback {
  id: string;
  text: string;
  productValuation: number;
  createdDate: string;
  answer: OfficialFeedbackAnswer | null;
  productDetails: OfficialProductDetails;
  video: Array<{ url: string; previewImage: string; durationSec: number }> | null;
  photoLinks: string[] | null;
  textPros: string;
  textCons: string;
  bables: string[];
  subjectName: string;
  parentFeedbackId: string | null;
  childFeedbackId: string | null;
  size: string | null;
}

export interface OfficialFeedbacksApiResponse {
  data: {
    countUnanswered: number;
    feedbacks: OfficialFeedback[];
  };
  error: boolean;
  errorText: string;
}

// ---------------------------------------------------------------------------
// DTO — only fields the frontend consumes
// ---------------------------------------------------------------------------

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
    photos: { fullSizeUrl: string; thumbUrl: string }[] | null;
    video: { durationSec: number; link: string; previewImage: string } | null;
    userName: string;
    purchaseDate: number;
  };
  productInfo: {
    brand: string;
    name: string;
    supplierArticle: string;
    wbArticle: number;
    category: string;
  };
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

export function mapOfficialFeedbackToFeedbackItem(
  f: OfficialFeedback,
): FeedbackItem {
  return {
    id: f.id,
    createdDate: new Date(f.createdDate).getTime(),
    valuation: f.productValuation,
    trustFactor: '',
    answer: f.answer
      ? {
          answerText: f.answer.text,
          createdDate: new Date(f.answer.createDate).getTime(),
          isEditable: f.answer.editable,
          status: f.answer.state,
        }
      : null,
    feedbackInfo: {
      feedbackText: f.text,
      feedbackTextPros: f.textPros,
      feedbackTextCons: f.textCons,
      photos: f.photoLinks?.map((url) => ({ fullSizeUrl: url, thumbUrl: url })) ?? null,
      video: f.video?.[0]
        ? {
            durationSec: f.video[0].durationSec || 0,
            link: f.video[0].url || '',
            previewImage: f.video[0].previewImage || '',
          }
        : null,
      userName: '',
      purchaseDate: new Date(f.createdDate).getTime(),
      isHidden: false,
    },
    productInfo: {
      brand: f.productDetails.brandName,
      name: f.productDetails.productName,
      supplierArticle: f.productDetails.supplierArticle,
      wbArticle: f.productDetails.nmId,
      category: f.subjectName,
    },
    parentFeedbackId: f.parentFeedbackId || undefined,
    childFeedbackId: f.childFeedbackId || undefined,
  };
}

export function mapOfficialResponseToFeedbackResponse(
  response: OfficialFeedbacksApiResponse,
  limit: number,
  offset: number,
): FeedbackResponse {
  return {
    data: {
      countUnanswered: response.data.countUnanswered,
      feedbacks: response.data.feedbacks.map(mapOfficialFeedbackToFeedbackItem),
      pages: {
        last: '',
        next: response.data.feedbacks.length === limit ? String(offset + limit) : '',
      },
    },
    error: response.error,
    errorText: response.errorText,
    additionalErrors: null,
  };
}

export function mapFeedbackItemToDTO(item: FeedbackItem): FeedbackItemDTO {
  return {
    id: item.id,
    createdDate: item.createdDate,
    valuation: item.valuation,
    trustFactor: item.trustFactor,
    parentFeedbackId: item.parentFeedbackId,
    childFeedbackId: item.childFeedbackId,
    answer: item.answer
      ? {
          answerText: item.answer.answerText,
          createdDate: item.answer.createdDate,
          isEditable: item.answer.isEditable,
          status: item.answer.status,
        }
      : null,
    feedbackInfo: {
      feedbackText: item.feedbackInfo?.feedbackText ?? '',
      feedbackTextPros: item.feedbackInfo?.feedbackTextPros ?? '',
      feedbackTextCons: item.feedbackInfo?.feedbackTextCons ?? '',
      photos: item.feedbackInfo?.photos ?? null,
      video: item.feedbackInfo?.video ?? null,
      userName: item.feedbackInfo?.userName ?? '',
      purchaseDate: item.feedbackInfo?.purchaseDate ?? 0,
    },
    productInfo: {
      brand: item.productInfo?.brand ?? '',
      name: item.productInfo?.name ?? '',
      supplierArticle: item.productInfo?.supplierArticle ?? '',
      wbArticle: item.productInfo?.wbArticle ?? 0,
      category: item.productInfo?.category ?? '',
    },
  };
}

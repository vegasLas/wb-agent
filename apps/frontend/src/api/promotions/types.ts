import type {
  PromotionsTimelineResponse,
  PromotionDetailResponse,
  PromotionApiPayload,
  PromotionManageParams,
} from '../../types';

export interface TimelineParams {
  startDate?: string;
  endDate?: string;
  filter?: string;
}

export interface DetailParams {
  promoID: number;
}

export interface GoodsParams {
  promoID: number;
  periodID: number;
  mode: 'participating' | 'excluded';
}

export {
  PromotionsTimelineResponse,
  PromotionDetailResponse,
  PromotionApiPayload,
  PromotionManageParams,
};

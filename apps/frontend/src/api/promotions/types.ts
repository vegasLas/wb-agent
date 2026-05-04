import type {
  PromotionsTimelineResponse,
  PromotionDetailResponse,
  PromotionApiPayload,
  PromotionManageParams,
  PromotionRecoveryParams,
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

/** @deprecated Use GoodsParams instead */
export interface ExcelParams {
  periodID: number;
  isRecovery?: boolean;
  hasStarted?: boolean;
}

export {
  PromotionsTimelineResponse,
  PromotionDetailResponse,
  PromotionApiPayload,
  PromotionManageParams,
  PromotionRecoveryParams,
};

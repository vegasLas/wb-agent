import type {
  PromotionsTimelineResponse,
  PromotionDetailResponse,
  PromotionApiPayload,
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

export interface ExcelParams {
  periodID: number;
  isRecovery?: boolean; // true = recovery mode, false = exclusion mode (default: true)
  hasStarted?: boolean; // true = promotion already started, false = not started yet
}

export {
  PromotionsTimelineResponse,
  PromotionDetailResponse,
  PromotionApiPayload,
  PromotionRecoveryParams,
};

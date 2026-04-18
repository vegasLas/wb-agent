// Re-export all promotion composables and their types

// From main.ts
export {
  usePromotions,
  type FilterTab,
} from './main';

// From calendar.ts
export {
  usePromotionsCalendar,
  type MonthInfo,
  type GroupedPromotions,
} from './calendar';

// From item.ts
export {
  usePromotionItem,
  usePromotionDetail,
  isCurrentLevel,
  isPromotionStarted,
  isPromotionEditable,
  type ParticipationStatus,
  type PromotionType,
  type Severity,
  type ParticipationCounts,
} from './item';

// From timeline.ts
export {
  usePromotionsTimeline,
  type MonthInfo as TimelineMonthInfo,
  type PromotionPosition,
  type UsePromotionsTimelineReturn,
} from './timeline';

// From unified.ts
export {
  usePromotionsUnified,
  type UsePromotionsUnifiedOptions,
  type UsePromotionsUnifiedReturn,
  type EmptyStateConfig,
} from './unified';

// From detailEnhanced.ts
export {
  usePromotionDetailEnhanced,
  type RangingLevelDisplay,
  type UsePromotionDetailEnhancedReturn,
} from './detailEnhanced';

// Re-export PromotionFilter from types since it's used across composables
export type { PromotionFilter } from '@/types';

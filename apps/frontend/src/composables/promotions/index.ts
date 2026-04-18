// Re-export all promotion composables and their types

// From main.ts
export {
  usePromotions,
  type FilterTab,
} from './main';

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
  type UsePromotionItemReturn,
  type UsePromotionDetailReturn,
  type RangingLevelDisplay,
} from './item';

// From timeline.ts
export {
  usePromotionsTimeline,
  type MonthInfo,
  type PromotionPosition,
  type UsePromotionsTimelineReturn,
  type GroupedPromotions,
} from './timeline';

// From unified.ts
export {
  usePromotionsUnified,
  type UsePromotionsUnifiedOptions,
  type UsePromotionsUnifiedReturn,
  type EmptyStateConfig,
} from './unified';

// From tableDisplay.ts
export { usePromotionTableDisplay } from './tableDisplay';

// Re-export PromotionFilter from types since it's used across composables
export type { PromotionFilter } from '@/types';

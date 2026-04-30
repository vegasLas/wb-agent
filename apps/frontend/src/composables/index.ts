// composables/index.ts

// Autobooking
export {
  useAutobookingValidation,
  useDraftsFetcher,
} from './autobooking';

// Promotions
export {
  usePromotions,
  usePromotionItem,
  usePromotionDetail,
  usePromotionsTimeline,
  usePromotionsUnified,
  usePromotionTableDisplay,
  isCurrentLevel,
  isPromotionStarted,
  isPromotionEditable,
  type PromotionFilter,
  type FilterTab,
  type MonthInfo,
  type GroupedPromotions,
  type ParticipationStatus,
  type PromotionType,
  type Severity,
  type ParticipationCounts,
  type PromotionPosition,
  type UsePromotionsTimelineReturn,
  type UsePromotionsUnifiedOptions,
  type UsePromotionsUnifiedReturn,
  type EmptyStateConfig,
  type RangingLevelDisplay,
  type UsePromotionDetailReturn,
} from './promotions';

// Warehouse
export { useWarehouseSuggestions } from './warehouse';

// Auth
export {
  useLoginForm,
  useRegisterForm,
  useForgotPasswordForm,
  useResetPasswordForm,
} from './auth';

// UI
export {
  useSkeleton,
  useViewReady,
} from './ui';

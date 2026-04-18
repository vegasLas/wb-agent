/**
 * usePromotionItem Composable
 *
 * Transforms raw promotion data into display-ready computed properties.
 * Handles all the complex formatting and status calculations for a single promotion item.
 *
 * Features:
 * - Participation status labels and severity
 * - Type detection (auto-action vs regular)
 * - Date range formatting
 * - Product count calculations
 * - Participation percentage
 * - Coefficient/boost detection
 *
 * @example
 * const promotionCard = usePromotionItem(promotion);
 *
 * // In template:
 * // <Tag :value="promotionCard.participationStatusLabel" :severity="promotionCard.participationStatusSeverity" />
 * // <span>{{ promotionCard.dateRangeText }}</span>
 * // <span>{{ promotionCard.participationText }}</span>
 */

import {
  computed,
  type ComputedRef,
  type MaybeRefOrGetter,
  toValue,
} from 'vue';
import type {
  PromotionItem,
  PromotionDetail,
  PromotionParticipation,
} from '@/types';

export type ParticipationStatus =
  | 'PARTICIPATING'
  | 'WILL_PARTICIPATE'
  | 'AVAILABLE'
  | 'SKIPPED'
  | 'UNKNOWN';
export type PromotionType = 'AUTO_ACTION' | 'REGULAR';
export type Severity =
  | 'success'
  | 'info'
  | 'warn'
  | 'secondary'
  | 'contrast'
  | 'danger'
  | undefined;

export interface ParticipationCounts {
  participating: number;
  eligible: number;
  available: number;
  total: number;
}

export interface UsePromotionItemReturn {
  // Basic info
  id: ComputedRef<number>;
  name: ComputedRef<string>;
  type: ComputedRef<PromotionType>;
  typeLabel: ComputedRef<string>;
  isAutoAction: ComputedRef<boolean>;

  // Status
  participationStatus: ComputedRef<ParticipationStatus>;
  participationStatusLabel: ComputedRef<string>;
  participationStatusSeverity: ComputedRef<Severity>;

  // Counts
  counts: ComputedRef<ParticipationCounts>;
  participationText: ComputedRef<string>;
  productCountText: ComputedRef<string>;

  // Dates
  startDate: ComputedRef<Date | null>;
  endDate: ComputedRef<Date | null>;
  dateRangeText: ComputedRef<string>;
  durationDays: ComputedRef<number>;

  // Participation
  participationPercentage: ComputedRef<number>;
  isParticipating: ComputedRef<boolean>;
  canParticipate: ComputedRef<boolean>;
  isSkipped: ComputedRef<boolean>;

  // Boost/Coefficient
  hasBoost: ComputedRef<boolean>;
  boostValue: ComputedRef<number | null>;
  boostText: ComputedRef<string>;

  // Expiration
  isExpired: ComputedRef<boolean>;

  // Not started (start date in future - can exclude items)
  isNotStarted: ComputedRef<boolean>;

  // Raw access
  raw: ComputedRef<PromotionItem>;
}

export interface RangingLevelDisplay {
  nomenclatures: number;
  coefficient: number;
  isActive: boolean;
  isCompleted: boolean;
}

export interface UsePromotionDetailReturn {
  // Basic info
  promoId: ComputedRef<number>;
  periodId: ComputedRef<number>;
  groupId: ComputedRef<number>;
  name: ComputedRef<string>;
  description: ComputedRef<string>;
  formattedDescription: ComputedRef<string>;
  parsedDescription: ComputedRef<string>;

  // Flags
  isAutoAction: ComputedRef<boolean>;
  isImportant: ComputedRef<boolean>;
  isAnnouncement: ComputedRef<boolean>;
  isHasRecovery: ComputedRef<boolean>;
  isMultiLevels: ComputedRef<boolean>;

  // Status
  statusLabel: ComputedRef<string>;
  statusSeverity: ComputedRef<'success' | 'info' | 'warn' | 'secondary'>;

  // Dates
  startDate: ComputedRef<Date | null>;
  endDate: ComputedRef<Date | null>;
  formattedStartDate: ComputedRef<string>;
  formattedEndDate: ComputedRef<string>;
  formattedStartDateShort: ComputedRef<string>;
  formattedEndDateShort: ComputedRef<string>;
  formattedStartDateOnly: ComputedRef<string>;

  // Stats
  participationPercentage: ComputedRef<number>;
  inPromoStock: ComputedRef<{ current: number; total: number }>;
  notInPromoStock: ComputedRef<{ current: number; total: number }>;
  actionInStock: ComputedRef<number>;
  eligibleProducts: ComputedRef<number>;
  participatingProducts: ComputedRef<number>;
  participatingWithStock: ComputedRef<number>;
  notParticipatingProducts: ComputedRef<number>;
  notParticipatingWithStock: ComputedRef<number>;

  // Ranging
  currentCoefficient: ComputedRef<number>;
  maxCoefficient: ComputedRef<number>;
  rangingLevels: ComputedRef<
    Array<{ nomenclatures: number; coefficient: number }>
  >;
  rangingLevelsDisplay: ComputedRef<RangingLevelDisplay[]>;
  isMaxLevel: ComputedRef<boolean>;
  nmToNextLevel: ComputedRef<number>;
  currentLevelIndex: ComputedRef<number>;
  progressPercentage: ComputedRef<number>;

  // Advantages
  advantages: ComputedRef<readonly string[]>;
  advantagesTranslated: ComputedRef<readonly string[]>;

  // Status helpers
  participationPercentageClass: ComputedRef<string>;

  // Raw access
  raw: ComputedRef<PromotionDetail | null>;
}

// Status labels in Russian
const STATUS_LABELS: Record<ParticipationStatus, string> = {
  PARTICIPATING: 'Участвую',
  WILL_PARTICIPATE: 'Буду участвовать',
  AVAILABLE: 'Доступно',
  SKIPPED: 'Не участвую',
  UNKNOWN: 'Неизвестно',
};

// Status to severity mapping
const STATUS_SEVERITIES: Record<ParticipationStatus, Severity> = {
  PARTICIPATING: 'success',
  WILL_PARTICIPATE: 'success',
  AVAILABLE: 'info',
  SKIPPED: 'secondary',
  UNKNOWN: 'secondary',
};

/**
 * Composable for promotion item display logic
 */
export function usePromotionItem(
  promotion: MaybeRefOrGetter<PromotionItem>,
): UsePromotionItemReturn {
  const item = () => toValue(promotion);

  // Basic info
  const id = computed(() => item().promoID);
  const name = computed(() => item().name);
  const type = computed(
    (): PromotionType =>
      item().type === 'AUTO_ACTION' ? 'AUTO_ACTION' : 'REGULAR',
  );
  const isAutoAction = computed(() => type.value === 'AUTO_ACTION');
  const typeLabel = computed(() => (isAutoAction.value ? 'Автоакция. ' : ''));

  // Participation status
  const participationStatus = computed((): ParticipationStatus => {
    const status = item().participation?.status;
    if (status === 'PARTICIPATING') return 'PARTICIPATING';
    if (status === 'WILL_PARTICIPATE') return 'WILL_PARTICIPATE';
    if (status === 'AVAILABLE') return 'AVAILABLE';
    if (status === 'SKIPPED') return 'SKIPPED';
    return 'UNKNOWN';
  });

  const participationStatusLabel = computed(
    () => STATUS_LABELS[participationStatus.value],
  );

  const participationStatusSeverity = computed(
    () => STATUS_SEVERITIES[participationStatus.value],
  );

  // Counts
  const counts = computed((): ParticipationCounts => {
    const p = item().participation;
    if (!p?.counts) {
      return { participating: 0, eligible: 0, available: 0, total: 0 };
    }

    const participating = p.counts.participating || 0;
    const eligible = p.counts.eligible || 0;
    const available = p.counts.available || 0;

    return {
      participating,
      eligible,
      available,
      total: participating + available,
    };
  });

  // Participation percentage text
  const participationText = computed(() => {
    const { participating, eligible } = counts.value;
    if (eligible === 0) return '0 из 0';
    const percentage = Math.round((participating / eligible) * 100);
    return `${percentage} из ${eligible}%`;
  });

  // Product count text based on status
  const productCountText = computed(() => {
    const { participating, available, total } = counts.value;
    const status = participationStatus.value;

    switch (status) {
      case 'PARTICIPATING':
        return `Участвует ${participating} из ${total} товаров`;
      case 'WILL_PARTICIPATE':
        return `Добавлено ${participating} из ${total} товаров`;
      case 'AVAILABLE':
      default:
        return `Доступно ${available} товаров`;
    }
  });

  // Dates
  const startDate = computed(() => {
    const date = item().startDate;
    return date ? new Date(date) : null;
  });

  const endDate = computed(() => {
    const date = item().endDate;
    return date ? new Date(date) : null;
  });

  const durationDays = computed(() => {
    if (!startDate.value || !endDate.value) return 0;
    const diff = endDate.value.getTime() - startDate.value.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  });

  // Date range formatting
  const dateRangeText = computed(() => {
    if (!startDate.value || !endDate.value) return '';

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
      });
    };

    return `${formatDate(startDate.value)} - ${formatDate(endDate.value)}`;
  });

  // Participation helpers
  const participationPercentage = computed(() => {
    const { participating, eligible } = counts.value;
    if (eligible === 0) return 0;
    return Math.round((participating / eligible) * 100);
  });

  const isParticipating = computed(
    () =>
      participationStatus.value === 'PARTICIPATING' ||
      participationStatus.value === 'WILL_PARTICIPATE',
  );

  const canParticipate = computed(
    () => participationStatus.value === 'AVAILABLE',
  );

  const isSkipped = computed(() => participationStatus.value === 'SKIPPED');

  // Boost/Coefficient (placeholder - would come from detail)
  const hasBoost = computed(() => false);
  const boostValue = computed(() => null);
  const boostText = computed(() =>
    boostValue.value ? `+${boostValue.value}` : '',
  );

  // Expiration check - promotion is expired if end date is in the past
  const isExpired = computed(() => {
    if (!endDate.value) return false;
    const now = new Date();
    // Set time to end of day for accurate date comparison
    const end = new Date(endDate.value);
    end.setHours(23, 59, 59, 999);
    return now > end;
  });

  // Not started check - promotion hasn't started yet (start date is in the future)
  // This means items can still be excluded from the promotion
  const isNotStarted = computed(() => {
    if (!startDate.value) return false;
    const now = new Date();
    // Set time to start of day for accurate date comparison
    const start = new Date(startDate.value);
    start.setHours(0, 0, 0, 0);
    return now < start;
  });

  return {
    // Basic
    id,
    name,
    type,
    typeLabel,
    isAutoAction,

    // Status
    participationStatus,
    participationStatusLabel,
    participationStatusSeverity,

    // Counts
    counts,
    participationText,
    productCountText,

    // Dates
    startDate,
    endDate,
    dateRangeText,
    durationDays,

    // Participation
    participationPercentage,
    isParticipating,
    canParticipate,
    isSkipped,

    // Boost
    hasBoost,
    boostValue,
    boostText,

    // Expiration
    isExpired,

    // Not started
    isNotStarted,

    // Raw
    raw: computed(() => item()),
  };
}

/**
 * Pure utility: check if a promotion has already started.
 * Uses start-of-day comparison so promotions starting today are NOT considered started.
 *
 * NOTE: This differs from the `isNotStarted` computed inside `usePromotionItem`.
 * `isNotStarted` checks if start is strictly in the future (un-normalized `now`),
 * while this utility uses start-of-day for both sides, matching the backend
 * `canEditPromotion` semantics (editable = today or future).
 */
export function isPromotionStarted(promotion: PromotionItem): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(promotion.startDate);
  startDate.setHours(0, 0, 0, 0);
  return startDate < today;
}

/**
 * Pure utility: check if a promotion is editable (hasn't started yet or starts today).
 */
export function isPromotionEditable(promotion: PromotionItem): boolean {
  return !isPromotionStarted(promotion);
}

/**
 * Parse Lexical editor JSON format to plain text
 */
function parseLexicalDescription(jsonString: string): string {
  if (!jsonString) return '';
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.root?.children) return '';
    const paragraphs: string[] = [];
    for (const node of parsed.root.children) {
      if (node.type === 'paragraph' && node.children) {
        const text = node.children
          .filter((child: any) => child.type === 'text')
          .map((child: any) => child.text)
          .join('');
        if (text.trim()) {
          paragraphs.push(text);
        }
      }
    }
    return paragraphs.join('\n\n');
  } catch {
    return jsonString;
  }
}

// Advantage mapping from English codes to Russian labels
const ADVANTAGE_MAP: Record<string, string> = {
  'Advantage top up to 35%': 'Поднятие в поиске до 35%',
  Badge: 'Плашка на карточке товара',
  Banner: 'Баннер на сайте',
  'Red-Hot Deal': 'Красная цена',
  'Stock Countdown': 'Градусник',
  'Advantage top up to 25%': 'Поднятие в поиске до 25%',
  'Advantage top up to 30%': 'Поднятие в поиске до 30%',
  'Advantage top up to 20%': 'Поднятие в поиске до 20%',
  'Advantage top up to 15%': 'Поднятие в поиске до 15%',
  'Advantage top up to 10%': 'Поднятие в поиске до 10%',
};

const MONTHS_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

function formatDateTimeShort(date: Date | null): string {
  if (!date) return '-';
  const day = date.getDate();
  const month = MONTHS_GENITIVE[date.getMonth()];
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day} ${month} ${hours}:${minutes}`;
}

function formatDateOnly(date: Date | null): string {
  if (!date) return '-';
  const day = date.getDate();
  const month = MONTHS_GENITIVE[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Composable for promotion detail display logic
 */
export function usePromotionDetail(
  detail: MaybeRefOrGetter<PromotionDetail | null>,
): UsePromotionDetailReturn {
  const item = () => toValue(detail);

  // Basic info
  const promoId = computed(() => item()?.promoID ?? 0);
  const periodId = computed(() => item()?.periodID ?? 0);
  const groupId = computed(() => item()?.groupID ?? 0);
  const name = computed(() => item()?.name ?? '');
  const description = computed(() => item()?.description ?? '');
  const formattedDescription = computed(
    () => item()?.formattedDescription ?? '',
  );
  const parsedDescription = computed(() =>
    parseLexicalDescription(item()?.formattedDescription || ''),
  );

  // Flags
  const isAutoAction = computed(() => item()?.isAutoAction ?? false);
  const isImportant = computed(() => item()?.isImportant ?? false);
  const isAnnouncement = computed(() => item()?.isAnnouncement ?? false);
  const isHasRecovery = computed(() => item()?.isHasRecovery ?? false);
  const isMultiLevels = computed(() => item()?.isMultiLevels ?? false);

  // Status
  const statusLabel = computed(() => {
    const status = item()?.status;
    if (status === 1) return 'Акция идёт';
    if (status === 2) return 'Акция завершена';
    if (status === 0) return 'Акция скоро начнётся';
    return 'Акция идёт';
  });

  const statusSeverity = computed(() => {
    const status = item()?.status;
    if (status === 1) return 'success';
    if (status === 2) return 'secondary';
    if (status === 0) return 'info';
    return 'success';
  });

  // Dates
  const startDate = computed(() => {
    const dt = item()?.startDt;
    return dt ? new Date(dt) : null;
  });

  const endDate = computed(() => {
    const dt = item()?.endDt;
    return dt ? new Date(dt) : null;
  });

  const formatDateTime = (date: Date | null): string => {
    if (!date) return '-';
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formattedStartDate = computed(() => formatDateTime(startDate.value));
  const formattedEndDate = computed(() => formatDateTime(endDate.value));
  const formattedStartDateShort = computed(() =>
    formatDateTimeShort(startDate.value),
  );
  const formattedEndDateShort = computed(() =>
    formatDateTimeShort(endDate.value),
  );
  const formattedStartDateOnly = computed(() =>
    formatDateOnly(startDate.value),
  );

  // Stats
  const participationPercentage = computed(
    () => item()?.participationPercentage ?? 0,
  );

  const inPromoStock = computed(() => ({
    current: item()?.inPromoActionLeftovers ?? 0,
    total: item()?.inPromoActionTotal ?? 0,
  }));

  const notInPromoStock = computed(() => ({
    current: item()?.notInPromoActionLeftovers ?? 0,
    total: item()?.notInPromoActionTotal ?? 0,
  }));

  const actionInStock = computed(() => item()?.actionInStock ?? 0);

  // Product statistics
  const eligibleProducts = computed(
    () => item()?.calculateProductsCount || 0,
  );
  const participatingProducts = computed(
    () => item()?.inPromoActionTotal || 0,
  );
  const participatingWithStock = computed(
    () => item()?.inPromoActionLeftovers || 0,
  );
  const notParticipatingProducts = computed(
    () => item()?.notInPromoActionTotal || 0,
  );
  const notParticipatingWithStock = computed(
    () => item()?.notInPromoActionLeftovers || 0,
  );

  // Ranging
  const rangingLevels = computed(
    () =>
      item()?.ranging?.levels?.map((l) => ({
        nomenclatures: l.nomenclatures,
        coefficient: l.coefficient,
      })) ?? [],
  );

  const currentCoefficient = computed(
    () => item()?.ranging?.currentCoefficient ?? 0,
  );

  const maxCoefficient = computed(() => {
    const levels = item()?.ranging?.levels;
    if (!levels || levels.length === 0) return 0;
    return Math.max(...levels.map((l) => l.coefficient));
  });

  const isMaxLevel = computed(() => item()?.ranging?.isMaxLevel ?? false);
  const nmToNextLevel = computed(() => item()?.ranging?.nmToNextLevel ?? 0);

  const currentLevelIndex = computed(() => {
    const levels = item()?.ranging?.levels;
    const current = currentCoefficient.value;
    if (!levels || levels.length === 0) return -1;

    for (let i = 0; i < levels.length; i++) {
      if (levels[i].coefficient === current) {
        return i;
      }
    }
    return -1;
  });

  const rangingLevelsDisplay = computed(() => {
    const levels = item()?.ranging?.levels || [];
    const currentIdx = currentLevelIndex.value;
    return levels.map((level, index) => ({
      nomenclatures: level.nomenclatures,
      coefficient: level.coefficient,
      isActive: index === currentIdx,
      isCompleted: index < currentIdx || isMaxLevel.value,
    }));
  });

  const progressPercentage = computed(() => {
    const levels = item()?.ranging?.levels;
    if (!levels || levels.length === 0) return 0;
    const currentIdx = currentLevelIndex.value;
    if (currentIdx < 0) return 5;
    if (isMaxLevel.value) return 100;
    return ((currentIdx + 1) / levels.length) * 100;
  });

  // Advantages
  const advantages = computed(() => item()?.advantages ?? []);
  const advantagesTranslated = computed(() =>
    advantages.value.map((a) => ADVANTAGE_MAP[a] || a),
  );

  // Status helpers
  const participationPercentageClass = computed(() => {
    const pct = participationPercentage.value;
    if (pct >= 80) return 'text-green-600 dark:text-green-400';
    if (pct >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-orange-600 dark:text-orange-400';
  });

  return {
    // Basic
    promoId,
    periodId,
    groupId,
    name,
    description,
    formattedDescription,
    parsedDescription,

    // Flags
    isAutoAction,
    isImportant,
    isAnnouncement,
    isHasRecovery,
    isMultiLevels,

    // Status
    statusLabel,
    statusSeverity,

    // Dates
    startDate,
    endDate,
    formattedStartDate,
    formattedEndDate,
    formattedStartDateShort,
    formattedEndDateShort,
    formattedStartDateOnly,

    // Stats
    participationPercentage,
    inPromoStock,
    notInPromoStock,
    actionInStock,
    eligibleProducts,
    participatingProducts,
    participatingWithStock,
    notParticipatingProducts,
    notParticipatingWithStock,

    // Ranging
    currentCoefficient,
    maxCoefficient,
    rangingLevels,
    rangingLevelsDisplay,
    isMaxLevel,
    nmToNextLevel,
    currentLevelIndex,
    progressPercentage,

    // Advantages
    advantages,
    advantagesTranslated,

    // Helpers
    participationPercentageClass,

    // Raw
    raw: computed(() => item()),
  };
}

/**
 * Helper to check if a level is the current one
 */
export function isCurrentLevel(
  detail: PromotionDetail | null,
  levelIndex: number,
): boolean {
  if (!detail?.ranging) return false;
  const levels = detail.ranging.levels;
  const currentCoefficient = detail.ranging.currentCoefficient;

  for (let i = 0; i < levels.length; i++) {
    if (levels[i].coefficient === currentCoefficient) {
      return i === levelIndex;
    }
  }
  return false;
}

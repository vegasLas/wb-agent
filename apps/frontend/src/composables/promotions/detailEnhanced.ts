/**
 * usePromotionDetailEnhanced Composable
 *
 * Enhanced composable for promotion detail display logic with Wildberries-style UI.
 * Provides computed properties for the new promotion detail dialog design.
 *
 * Features:
 * - Short date formatting for header
 * - Status labels and severity
 * - Product statistics calculations
 * - Progress bar percentage for ranging levels
 * - Enhanced ranging levels display with active state
 * - Advantages mapping from English to Russian
 */

import {
  computed,
  type ComputedRef,
  type MaybeRefOrGetter,
  toValue,
} from 'vue';
import type { PromotionDetail } from '@/types';

// Advantage mapping from English codes to Russian labels
const ADVANTAGE_MAP: Record<string, string> = {
  'Advantage top up to 35%': 'Поднятие в поиске до 35%',
  'Badge': 'Плашка на карточке товара',
  'Banner': 'Баннер на сайте',
  'Red-Hot Deal': 'Красная цена',
  'Stock Countdown': 'Градусник',
  'Advantage top up to 25%': 'Поднятие в поиске до 25%',
  'Advantage top up to 30%': 'Поднятие в поиске до 30%',
  'Advantage top up to 20%': 'Поднятие в поиске до 20%',
  'Advantage top up to 15%': 'Поднятие в поиске до 15%',
  'Advantage top up to 10%': 'Поднятие в поиске до 10%',
};

export interface RangingLevelDisplay {
  nomenclatures: number;
  coefficient: number;
  isActive: boolean;
  isCompleted: boolean;
}

export interface UsePromotionDetailEnhancedReturn {
  // Basic info
  promoId: ComputedRef<number>;
  periodId: ComputedRef<number>;
  groupId: ComputedRef<number>;
  name: ComputedRef<string>;
  description: ComputedRef<string>;
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

  // Dates - Short format for header
  formattedStartDateShort: ComputedRef<string>;
  formattedEndDateShort: ComputedRef<string>;
  formattedStartDateOnly: ComputedRef<string>;

  // Product Statistics
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

  // Raw access
  raw: ComputedRef<PromotionDetail | null>;
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
  } catch (e) {
    // If parsing fails, return the raw string
    return jsonString;
  }
}

/**
 * Composable for enhanced promotion detail display logic
 */
export function usePromotionDetailEnhanced(
  detail: MaybeRefOrGetter<PromotionDetail | null>,
): UsePromotionDetailEnhancedReturn {
  const item = () => toValue(detail);

  // Basic info
  const promoId = computed(() => item()?.promoID ?? 0);
  const periodId = computed(() => item()?.periodID ?? 0);
  const groupId = computed(() => item()?.groupID ?? 0);
  const name = computed(() => item()?.name ?? '');
  const description = computed(() => item()?.description ?? '');
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
    if (status === 1) return 'success'; // Active
    if (status === 2) return 'secondary'; // Completed
    if (status === 0) return 'info'; // Upcoming
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

  // Short date format for header (e.g., "11 марта 00:00")
  const formatDateTimeShort = (date: Date | null): string => {
    if (!date) return '-';
    const months = [
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
    const day = date.getDate();
    const month = months[date.getMonth()];
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day} ${month} ${hours}:${minutes}`;
  };

  // Date only format (e.g., "11 марта 2026")
  const formatDateOnly = (date: Date | null): string => {
    if (!date) return '-';
    const months = [
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
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const formattedStartDateShort = computed(() =>
    formatDateTimeShort(startDate.value),
  );
  const formattedEndDateShort = computed(() =>
    formatDateTimeShort(endDate.value),
  );
  const formattedStartDateOnly = computed(() =>
    formatDateOnly(startDate.value),
  );

  // Product Statistics based on the actual API fields
  // calculateProductsCount = total eligible products
  // inPromoActionTotal = products participating in promo
  // inPromoActionLeftovers = participating products with stock
  // notInPromoActionTotal = products not participating
  // notInPromoActionLeftovers = not participating with stock

  const eligibleProducts = computed(() => item()?.calculateProductsCount || 0);

  const participatingProducts = computed(() => item()?.inPromoActionTotal || 0);

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

    // Find the index of the level with current coefficient
    for (let i = 0; i < levels.length; i++) {
      if (levels[i].coefficient === current) {
        return i;
      }
    }
    return -1;
  });

  // Enhanced ranging levels display with active/completed state
  // The levels show the TARGET values, not current
  // For display: level is "completed" if we have products >= threshold
  // level is "active" if it's the current target
  const rangingLevelsDisplay = computed((): RangingLevelDisplay[] => {
    const levels = item()?.ranging?.levels || [];
    const currentIdx = currentLevelIndex.value;

    return levels.map((level, index) => ({
      nomenclatures: level.nomenclatures,
      coefficient: level.coefficient,
      isActive: index === currentIdx,
      isCompleted: index < currentIdx || isMaxLevel.value,
    }));
  });

  // Progress percentage based on current level position
  const progressPercentage = computed(() => {
    const levels = item()?.ranging?.levels;
    if (!levels || levels.length === 0) return 0;

    const currentIdx = currentLevelIndex.value;
    if (currentIdx < 0) {
      // No level achieved yet, show minimal progress
      return 5;
    }
    if (isMaxLevel.value) return 100;

    // Calculate percentage based on current level position
    return ((currentIdx + 1) / levels.length) * 100;
  });

  // Advantages - translate English codes to Russian
  const advantages = computed(() => item()?.advantages ?? []);

  const advantagesTranslated = computed(() => {
    const adv = advantages.value;
    return adv.map((a) => ADVANTAGE_MAP[a] || a);
  });

  return {
    // Basic
    promoId,
    periodId,
    groupId,
    name,
    description,
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

    // Short dates
    formattedStartDateShort,
    formattedEndDateShort,
    formattedStartDateOnly,

    // Product Statistics
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

    // Raw
    raw: computed(() => item()),
  };
}

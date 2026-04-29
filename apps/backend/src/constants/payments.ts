/**
 * Payment constants - Tiered subscription model (Lite / Pro / Max)
 */

export type SubscriptionTier = 'LITE' | 'PRO' | 'MAX';
export type UserTier = 'FREE' | SubscriptionTier;

export interface SubscriptionTariff {
  id: string;
  tier: SubscriptionTier;
  name: string;
  price: number;
  days: number;
  description: string;
  discount?: number;
}

// ─── Lite: базовый доступ ───
export const LITE_TARIFFS: SubscriptionTariff[] = [
  { id: 'lite-30',  tier: 'LITE', name: 'Lite 1 мес',   price: 790,  days: 30,  description: 'Базовый доступ' },
  { id: 'lite-90',  tier: 'LITE', name: 'Lite 3 мес',   price: 1990, days: 90,  description: 'Экономия 16%', discount: 16 },
  { id: 'lite-180', tier: 'LITE', name: 'Lite 6 мес',   price: 3490, days: 180, description: 'Экономия 26%', discount: 26 },
  { id: 'lite-365', tier: 'LITE', name: 'Lite 1 год',   price: 6990, days: 365, description: 'Экономия 36%', discount: 36 },
];

// ─── Pro: полный доступ ───
export const PRO_TARIFFS: SubscriptionTariff[] = [
  { id: 'pro-30',   tier: 'PRO', name: 'Pro 1 мес',    price: 2490, days: 30,  description: 'Полный доступ' },
  { id: 'pro-90',   tier: 'PRO', name: 'Pro 3 мес',    price: 5990, days: 90,  description: 'Экономия 20%', discount: 20 },
  { id: 'pro-180',  tier: 'PRO', name: 'Pro 6 мес',    price: 10990, days: 180, description: 'Экономия 26%', discount: 26 },
  { id: 'pro-365',  tier: 'PRO', name: 'Pro 1 год',    price: 19900, days: 365, description: 'Экономия 37%', discount: 37 },
];

// ─── Max: агентский доступ ───
export const MAX_TARIFFS: SubscriptionTariff[] = [
  { id: 'max-30',   tier: 'MAX', name: 'Max 1 мес',    price: 6990, days: 30,  description: 'Агентский доступ' },
  { id: 'max-90',   tier: 'MAX', name: 'Max 3 мес',    price: 17990, days: 90,  description: 'Экономия 14%', discount: 14 },
  { id: 'max-180',  tier: 'MAX', name: 'Max 6 мес',    price: 32990, days: 180, description: 'Экономия 21%', discount: 21 },
  { id: 'max-365',  tier: 'MAX', name: 'Max 1 год',    price: 59900, days: 365, description: 'Экономия 33%', discount: 33 },
];

export const ALL_SUBSCRIPTION_TARIFFS = [
  ...LITE_TARIFFS,
  ...PRO_TARIFFS,
  ...MAX_TARIFFS,
];

// ─── Slot limits per tier ───
export const AUTOBOOKING_SLOTS: Record<UserTier, number> = {
  FREE: 1,
  LITE: 6,
  PRO: 30,
  MAX: 90,
};

export const RESCHEDULE_SLOTS: Record<UserTier, number> = {
  FREE: 1,
  LITE: 6,
  PRO: 30,
  MAX: 90,
};

// ─── Account limits per tier ───
export const MAX_ACCOUNTS: Record<UserTier, number> = {
  FREE: 1,
  LITE: 1,
  PRO: 3,
  MAX: Infinity,
};

// ─── Feedback reply quotas per tier ───
export const FEEDBACK_QUOTA: Record<UserTier, number> = {
  FREE: 10,
  LITE: 200,
  PRO: 2000,
  MAX: Infinity,
};

// ─── AI chat token budget per tier (in USD) ───
export const AI_CHAT_BUDGET_USD: Record<UserTier, number> = {
  FREE: 0.197,
  LITE: 1.18,
  PRO: 3.52,
  MAX: 11.76,
};

// ─── Trial duration ───
export const TRIAL_DAYS = 14;

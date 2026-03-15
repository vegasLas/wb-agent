/**
 * Valid trigger check intervals (in minutes)
 * These values define how frequently triggers check for available slots
 */
export const TRIGGER_INTERVALS = [
  { label: '1 час', value: 60 },
  { label: '3 часа', value: 180 },
  { label: '6 часов', value: 360 },
  { label: '12 часов', value: 720 },
  { label: '24 часа', value: 1440 },
] as const;

/**
 * Valid trigger search modes
 * Defines how triggers search for available slots
 */
export type SearchMode =
  | 'TODAY'
  | 'TOMORROW'
  | 'WEEK'
  | 'UNTIL_FOUND'
  | 'CUSTOM_DATES'
  | 'RANGE';

/**
 * Trigger search mode options for UI
 */
export const TRIGGER_SEARCH_MODES: { value: SearchMode; label: string }[] = [
  { value: 'TODAY', label: 'Сегодня' },
  { value: 'TOMORROW', label: 'Завтра' },
  { value: 'WEEK', label: 'Неделя' },
  { value: 'UNTIL_FOUND', label: 'Пока не найдено' },
  { value: 'CUSTOM_DATES', label: 'Выбранные даты' },
  { value: 'RANGE', label: 'Период' },
];

/**
 * Maximum number of warehouses per trigger
 */
export const MAX_WAREHOUSES_PER_TRIGGER = 3;

/**
 * Maximum number of active triggers per user
 */
export const MAX_ACTIVE_TRIGGERS_PER_USER = 30;

/**
 * Default check interval in minutes
 */
export const DEFAULT_CHECK_INTERVAL = 180;

/**
 * Default search mode
 */
export const DEFAULT_SEARCH_MODE: SearchMode = 'TODAY';

/**
 * Supply types enum
 */
export enum SUPPLY_TYPES {
  BOX = 'BOX',
  MONOPALLETE = 'MONOPALLETE',
  SUPERSAFE = 'SUPERSAFE',
}

/**
 * Box type IDs from WB API
 */
export const BOX_TYPE_IDS = {
  BOX: 2,
  MONOPALLETE: 5,
  SUPERSAFE: 6,
} as const;

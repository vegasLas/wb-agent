// =============================================================================
// Application Constants
// =============================================================================

// Supply Types
export enum SUPPLY_TYPES {
  BOX = 'BOX',
  MONOPALLETE = 'MONOPALLETE',
  SUPERSAFE = 'SUPERSAFE',
}

// Autobooking Statuses
export enum AUTOBOOKING_STATUSES {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
  ERROR = 'ERROR',
}

// Trigger Intervals (in minutes)
export const TRIGGER_INTERVALS = [
  { label: '1 час', value: 60 },
  { label: '3 часа', value: 180 },
  { label: '6 часов', value: 360 },
  { label: '12 часов', value: 720 },
  { label: '24 часа', value: 1440 },
];

// Subscription Tariffs
export interface SubscriptionTariff {
  id: string;
  name: string;
  price: number;
  days: number;
  description: string;
  discount?: number;
}

export const SUBSCRIPTION_TARIFFS: SubscriptionTariff[] = [
  {
    id: 'subscription-30',
    name: '1 месяц',
    price: 190,
    days: 30,
    description: 'Базовая подписка на 30 дней',
  },
  {
    id: 'subscription-90',
    name: '3 месяца',
    price: 490,
    days: 90,
    description: 'Проверка складов на 90 дней',
    discount: 15,
  },
  {
    id: 'subscription-180',
    name: '6 месяцев',
    price: 890,
    days: 180,
    description: 'Проверка складов на 180 дней',
    discount: 25,
  },
  {
    id: 'subscription-365',
    name: '1 год',
    price: 1590,
    days: 365,
    description: 'Проверка складов на 365 дней',
    discount: 40,
  },
];

// Booking Tariffs
export interface BookingTariff {
  id: string;
  name: string;
  price: number;
  bookingCount: number;
  description: string;
  discount?: number;
}

export const BOOKING_TARIFFS: BookingTariff[] = [
  {
    id: 'booking-1',
    name: '1 кредит',
    price: 210,
    bookingCount: 1,
    description: 'Одна автоматическая бронь',
  },
  {
    id: 'booking-5',
    name: '5 кредитов',
    price: 950,
    bookingCount: 5,
    description: 'Пакет из 5 автоматических броней',
    discount: 10,
  },
  {
    id: 'booking-10',
    name: '10 кредитов',
    price: 1790,
    bookingCount: 10,
    description: 'Пакет из 10 автоматических броней',
    discount: 15,
  },
  {
    id: 'booking-30',
    name: '30 кредитов',
    price: 5150,
    bookingCount: 30,
    description: 'Пакет из 30 автоматических броней',
    discount: 20,
  },
  {
    id: 'booking-100',
    name: '100 кредитов',
    price: 17400,
    bookingCount: 100,
    description: 'Пакет из 100 автоматических броней',
    discount: 25,
  },
];

export const PAYMENT_TARIFFS = [...SUBSCRIPTION_TARIFFS, ...BOOKING_TARIFFS];

/**
 * Test Helpers for Autobooking Tests
 * Migrated from: tests/helpers/autobookingMonitoring.helpers.ts
 */

import type { Autobooking } from '@prisma/client';
import type {
  SchedulableItem,
  WarehouseAvailability,
} from '@/services/monitoring/shared/interfaces/sharedInterfaces';

// Supply type constants matching the app
export const SUPPLY_TYPES = {
  BOX: 'BOX',
  MONOPALLETE: 'MONOPALLETE',
  SUPERSAFE: 'SUPERSAFE',
} as const;

export type SupplyType = (typeof SUPPLY_TYPES)[keyof typeof SUPPLY_TYPES];

// Helper function to create a complete Autobooking object
export const createAutobooking = (
  overrides: Partial<Autobooking> = {},
): Autobooking => {
  // Use a future date that won't be filtered out by today's date check
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7); // 7 days from now

  const isCustomDates =
    (overrides.dateType || 'CUSTOM_DATES') === 'CUSTOM_DATES';
  const defaultCustomDates = isCustomDates ? [futureDate] : [];

  return {
    id: 'booking-101',
    userId: 1,
    supplierId: 'supplier-1',
    draftId: 'draft1',
    warehouseId: 123,
    transitWarehouseId: null,
    transitWarehouseName: null,
    supplyType: SUPPLY_TYPES.BOX,
    dateType: 'CUSTOM_DATES',
    startDate: futureDate,
    endDate: null,
    customDates: defaultCustomDates,
    completedDates: [],
    maxCoefficient: 1000,
    status: 'ACTIVE',
    bookedAt: null,
    bookedDate: null,
    supplyId: null,
    supplyIdUpdatedAt: null,
    monopalletCount: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

// Helper function to create a monitoring user with accounts
export interface MonitoringUser {
  userId: number;
  chatId: string | null;
  proxy: {
    ip: string;
    port: string;
    username: string;
    password: string;
  };
  userAgent: string;
  autobookings: Autobooking[];
  supplyTriggers: unknown[];
  reschedules: unknown[];
  accounts: Record<string, { supplierIds: string[]; wbCookies?: string | null }>;
}

export const createMonitoringUser = (
  overrides: Partial<MonitoringUser> = {},
): MonitoringUser => {
  const userId = overrides.userId || 1;
  const supplierId = overrides.supplierId || 'supplier-1';
  const accountId = `account-${userId}`;

  return {
    userId,
    chatId: `user${userId}`,
    proxy: {
      ip: `${userId}.${userId}.${userId}.${userId}`,
      port: '8080',
      username: `user${userId}`,
      password: `pass${userId}`,
    },
    userAgent: 'test-agent',
    autobookings: [],
    supplyTriggers: [],
    reschedules: [],
    accounts: {
      [accountId]: { supplierIds: [supplierId], wbCookies: 'test-cookies' },
    },
    ...overrides,
  };
};

// Helper function to create test availability data
export const createAvailability = (
  overrides: Partial<WarehouseAvailability> = {},
): WarehouseAvailability => {
  // Use a future date that matches the autobooking helper
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7); // 7 days from now
  const futureDateString = futureDate.toISOString().split('T')[0]; // YYYY-MM-DD format

  return {
    warehouseId: 123,
    warehouseName: 'Test Warehouse',
    boxTypeID: 2,
    availableDates: [{ date: futureDateString, coefficient: 100 }],
    ...overrides,
  };
};

// Helper function to create a SchedulableItem for testing
export const createSchedulableItem = (
  overrides: Partial<SchedulableItem> = {},
): SchedulableItem => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);

  return {
    id: 'booking-1',
    userId: 1,
    supplierId: 'supplier-1',
    draftId: 'draft-1',
    warehouseId: 1,
    transitWarehouseId: null,
    supplyType: 'BOX',
    transitWarehouseName: null,
    monopalletCount: null,
    dateType: 'CUSTOM_DATES',
    startDate: null,
    endDate: null,
    customDates: [futureDate],
    completedDates: [],
    maxCoefficient: 2.0,
    status: 'ACTIVE',
    supplyId: null,
    supplyIdUpdatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

// Common date helpers
export const getFutureDate = (daysFromNow = 7): Date => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysFromNow);
  return futureDate;
};

export const getFutureDateString = (daysFromNow = 7): string => {
  return getFutureDate(daysFromNow).toISOString().split('T')[0];
};

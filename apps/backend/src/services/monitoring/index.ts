/**
 * Monitoring Services - Index
 * Phase 1: Foundation - Core monitoring infrastructure
 */

// Core orchestrator
export {
  WarehouseMonitoringV2Service,
  warehouseMonitoringV2Service,
} from '@/services/monitoring/warehouse-monitoring-v2.service';

// Existing services
export {
  FakeDataDetectionService,
  fakeDataDetectionService,
} from '@/services/monitoring/fake-data-detection.service';

export {
  WarehouseDataCacheService,
  warehouseDataCacheService,
} from '@/services/monitoring/warehouse-data-cache.service';

export {
  SupplyTriggerMonitoringService,
  supplyTriggerMonitoringService,
} from '@/services/monitoring/supply-trigger-monitoring.service';

export {
  TriggerDateManagerService,
  triggerDateManagerService,
} from '@/services/monitoring/trigger-date-manager.service';

// Phase 8: Date Management
export {
  AutobookingDateManagerService,
  autobookingDateManagerService,
} from '@/services/monitoring/autobooking-date-manager.service';

// Shared services
export * from '@/services/monitoring/shared';

// Autobooking services (Phase 5)
export {
  autobookingMonitoringService,
  AutobookingMonitoringService,
} from '@/services/monitoring/autobooking/autobooking-monitoring.service';

export {
  autobookingExecutorService,
  AutobookingExecutorService,
} from '@/services/monitoring/autobooking/autobooking-executor.service';

export {
  autobookingSupplyIdCacheService,
  AutobookingSupplyIdCacheService,
} from '@/services/monitoring/autobooking/autobooking-supply-id-cache.service';

export {
  autobookingNotificationService,
  AutobookingNotificationService,
} from '@/services/monitoring/autobooking/autobooking-notification.service';

// Autobooking types
export type {
  BookingTask,
  SuccessfulBooking,
  IAutobookingMonitoringService,
  IAutobookingExecutorService,
  IAutobookingSupplyIdCacheService,
  IAutobookingNotificationService,
} from '@/services/monitoring/autobooking/autobooking.interfaces';

// Autobooking Reschedule services (Phase 7)
export {
  autobookingRescheduleMonitoringService,
  AutobookingRescheduleMonitoringService,
} from '@/services/monitoring/autobooking-reschedule/autobooking-reschedule-monitoring.service';

export {
  autobookingRescheduleExecutorService,
  AutobookingRescheduleExecutorService,
} from '@/services/monitoring/autobooking-reschedule/autobooking-reschedule-executor.service';

export {
  autobookingRescheduleNotificationService,
  AutobookingRescheduleNotificationService,
} from '@/services/monitoring/autobooking-reschedule/autobooking-reschedule-notification.service';

// Reschedule types
export type {
  RescheduleBookingTask,
  SuccessfulReschedule,
  IRescheduleMonitoringService,
  IRescheduleExecutorService,
  IRescheduleNotificationService,
} from '@/services/monitoring/interfaces/reschedule.interfaces';

// Phase 6: Browser Automation
export {
  BrowserFingerprintService,
  browserFingerprintService,
  type Fingerprint,
  type FingerprintOptions,
  type FingerprintInjectionConfig,
} from '@/services/monitoring/browser-fingerprint.service';

export {
  PlaywrightBrowserService,
  playwrightBrowserService,
  BrowserErrorCode,
  type SelectDateOptions,
  type BrowserServiceOptions,
  type ErrorNotification,
} from '@/services/monitoring/playwright-browser.service';

// Interfaces
export type {
  WarehouseAvailability,
  MonitoringUser,
} from '@/services/monitoring/interfaces/trigger-monitoring.interfaces';

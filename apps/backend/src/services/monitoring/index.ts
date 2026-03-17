/**
 * Monitoring Services - Index
 * Phase 1: Foundation - Core monitoring infrastructure
 */

// Core orchestrator
export {
  WarehouseMonitoringV2Service,
  warehouseMonitoringV2Service,
} from './warehouse-monitoring-v2.service';

// Existing services
export {
  FakeDataDetectionService,
  fakeDataDetectionService,
} from './fake-data-detection.service';

export {
  WarehouseDataCacheService,
  warehouseDataCacheService,
} from './warehouse-data-cache.service';

export {
  SupplyTriggerMonitoringService,
  supplyTriggerMonitoringService,
} from './supply-trigger-monitoring.service';

export {
  TriggerDateManagerService,
  triggerDateManagerService,
} from './trigger-date-manager.service';

// Shared services
export * from './shared';

// Autobooking services (Phase 5)
export {
  autobookingMonitoringService,
  AutobookingMonitoringService,
} from './autobooking/autobooking-monitoring.service';

export {
  autobookingExecutorService,
  AutobookingExecutorService,
} from './autobooking/autobooking-executor.service';

export {
  autobookingSupplyIdCacheService,
  AutobookingSupplyIdCacheService,
} from './autobooking/autobooking-supply-id-cache.service';

export {
  autobookingNotificationService,
  AutobookingNotificationService,
} from './autobooking/autobooking-notification.service';

// Autobooking types
export type {
  BookingTask,
  SuccessfulBooking,
  IAutobookingMonitoringService,
  IAutobookingExecutorService,
  IAutobookingSupplyIdCacheService,
  IAutobookingNotificationService,
} from './autobooking/autobooking.interfaces';

// Interfaces
export type {
  WarehouseAvailability,
  MonitoringUser,
} from './interfaces/trigger-monitoring.interfaces';

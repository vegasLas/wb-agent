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

// Interfaces
export type {
  WarehouseAvailability,
  MonitoringUser,
} from './interfaces/trigger-monitoring.interfaces';

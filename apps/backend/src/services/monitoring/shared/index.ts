/**
 * Shared Monitoring Services - Index
 * Phase 1: Foundation - Core shared infrastructure
 * Phase 2: Ban & Error Handling
 * Phase 3: Availability Filter
 */

// Export interfaces
export * from '@/services/monitoring/shared/interfaces/sharedInterfaces';

// Export services - Phase 1: Foundation
export { SharedLatencyService, sharedLatencyService } from '@/services/monitoring/shared/latency.service';
export {
  SharedProcessingStateService,
  sharedProcessingStateService,
} from '@/services/monitoring/shared/processing-state.service';
export {
  SharedTelegramNotificationService,
  sharedTelegramNotificationService,
} from '@/services/monitoring/shared/telegram-notification.service';
export {
  SharedStatusUpdateService,
  sharedStatusUpdateService,
} from '@/services/monitoring/shared/status-update.service';

// Phase 2: Ban & Error Handling
export { SharedBanService, sharedBanService } from '@/services/monitoring/shared/ban.service';
export {
  SharedErrorHandlingService,
  sharedErrorHandlingService,
} from '@/services/monitoring/shared/error-handling.service';
export {
  SharedUserTrackingService,
  sharedUserTrackingService,
} from '@/services/monitoring/shared/user-tracking.service';
export {
  SharedTaskOrganizerService,
  sharedTaskOrganizerService,
} from '@/services/monitoring/shared/task-organizer.service';

// Phase 3: Availability Filter
export {
  SharedAvailabilityFilterService,
  sharedAvailabilityFilterService,
} from '@/services/monitoring/shared/availability-filter.service';

/**
 * Shared Monitoring Services - Index
 * Phase 1: Foundation - Core shared infrastructure
 * Phase 2: Ban & Error Handling
 * Phase 3: Availability Filter
 */

// Export interfaces
export * from './interfaces/sharedInterfaces';

// Export services - Phase 1: Foundation
export { SharedLatencyService, sharedLatencyService } from './latency.service';
export {
  SharedProcessingStateService,
  sharedProcessingStateService,
} from './processing-state.service';
export {
  SharedTelegramNotificationService,
  sharedTelegramNotificationService,
} from './telegram-notification.service';
export {
  SharedStatusUpdateService,
  sharedStatusUpdateService,
} from './status-update.service';

// Phase 2: Ban & Error Handling
export { SharedBanService, sharedBanService } from './ban.service';
export {
  SharedErrorHandlingService,
  sharedErrorHandlingService,
} from './error-handling.service';
export {
  SharedUserTrackingService,
  sharedUserTrackingService,
} from './user-tracking.service';
export {
  SharedTaskOrganizerService,
  sharedTaskOrganizerService,
} from './task-organizer.service';

// Phase 3: Availability Filter
export {
  SharedAvailabilityFilterService,
  sharedAvailabilityFilterService,
} from './availability-filter.service';

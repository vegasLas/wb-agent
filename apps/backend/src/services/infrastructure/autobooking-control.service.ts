/**
 * Service for controlling autobooking processing state
 * Provides admin commands to enable/disable autobooking globally
 */

// Global flag to enable/disable autobooking processing
let isAutobookingProcessingEnabled = true;

/**
 * Enable autobooking processing
 */
export function enableAutobookingProcessing(): void {
  isAutobookingProcessingEnabled = true;
  console.log('[AutobookingControl] Autobooking processing ENABLED');
}

/**
 * Disable autobooking processing
 */
export function disableAutobookingProcessing(): void {
  isAutobookingProcessingEnabled = false;
  console.log('[AutobookingControl] Autobooking processing DISABLED');
}

/**
 * Check if autobooking processing is enabled
 */
export function isAutobookingProcessingActive(): boolean {
  return isAutobookingProcessingEnabled;
}

/**
 * Autobooking control service
 * Provides global control over autobooking processing
 */
export const autobookingControlService = {
  enable: enableAutobookingProcessing,
  disable: disableAutobookingProcessing,
  isActive: isAutobookingProcessingActive,
};

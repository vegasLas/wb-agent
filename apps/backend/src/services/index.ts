/**
 * Services
 * Organized by external/internal concerns
 */

// External API services
export * from './external';

// Internal business logic services
export * from './internal';

// Monitoring services
export * from './monitoring';

// Legacy services that haven't been migrated yet
export { accountService } from './account.service';
export { authService } from './auth.service';
export { autobookingService, AutobookingUpdateError } from './autobooking.service';

// Aliases for backward compatibility
export { yookassaPaymentService as yookassaService } from './external/yookassa/payment.service';

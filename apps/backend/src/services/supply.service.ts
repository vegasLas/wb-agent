/**
 * Supply Service
 * Migrated from deprecated project server/services/supplyService.ts
 * 
 * NOTE: This service is kept minimal for now. The actual supply creation
 * and reschedule operations will be implemented in Plan 12 (Monitoring)
 * using Playwright browser automation instead of the captcha-based API approach.
 * 
 * For now, only supply listing and details are supported via wbSupplierService.
 */

import { prisma } from '../config/database';

export class SupplyService {
  // Placeholder for future browser-based implementation
  // Plan 12 will implement:
  // - createSupply() via Playwright browser automation
  // - updateSupplyPlan() via Playwright browser automation
  // - deletePreorder() via API

  /**
   * Check if an account has valid WB cookies
   * Used by monitoring services before attempting operations
   */
  async validateAccountCookies(accountId: string): Promise<boolean> {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { wbCookies: true },
    });
    return !!account?.wbCookies;
  }
}

// Export singleton instance
export const supplyService = new SupplyService();

/**
 * Supply Service
 * Migrated from deprecated project server/services/supplyService.ts
 *
 * Handles supply creation, plan management, and preorder operations.
 * Uses account-based authentication with WB cookies.
 */

import { prisma } from '../config/database';
import { wbAccountRequest, ProxyConfig } from '../utils/wb-request';
import { logger } from '../utils/logger';

// ============== Types ==============

export interface CreateSupplyParams {
  boxTypeID: number;
  isBoxOnPallet: boolean;
  draftID: string;
  warehouseId: number;
  transitWarehouseId?: number | null;
}

export interface CreateSupplyResponse {
  id: string;
  jsonrpc: string;
  result: {
    ids: Array<{ Id: number }>;
  };
}

export interface DeletePreorderResponse {
  id: string;
  jsonrpc: string;
  result?: {
    success?: boolean;
  };
  error?: {
    message: string;
    code: number;
  };
}

export interface CreateSupplyOptions {
  accountId: string;
  supplierId: string;
  userId: number;
  params: CreateSupplyParams;
  userAgent: string;
  latency: number;
  deliveryDate: string;
  rpc_order: number;
  proxy: ProxyConfig;
}

export interface DeletePreorderOptions {
  accountId: string;
  supplierId: string;
  preorderId: number;
  userAgent: string;
  proxy: ProxyConfig;
}

// ============== Constants ==============

const BOX_TYPE_MASK_MAPPINGS: Record<string, number> = {
  BOX: 2,
  MONOPALLETE: 32,
  SUPERSAFE: 6,
};

// ============== Service Class ==============

export class SupplyService {
  /**
   * Create a new supply using account-based authentication
   */
  async createSupply(options: CreateSupplyOptions): Promise<CreateSupplyResponse> {
    const {
      accountId,
      supplierId,
      params,
      userAgent,
      proxy,
    } = options;

    logger.info(`[SupplyService] Creating supply for account ${accountId}, warehouse ${params.warehouseId}`);

    const response = await wbAccountRequest<CreateSupplyResponse>({
      url: 'https://seller-supply.wildberries.ru/ns/sm-supply/supply-manager/api/v1/supply/create',
      accountId,
      supplierId,
      userAgent,
      proxy,
      isJsonRpc: true,
      body: {
        params: {
          boxTypeID: params.boxTypeID,
          isBoxOnPallet: params.isBoxOnPallet,
          draftID: params.draftID,
          transitWarehouseId: params.transitWarehouseId || null,
          warehouseId: params.warehouseId,
        },
      },
    });

    logger.info(`[SupplyService] Supply created successfully, preorder ID: ${response.result?.ids?.[0]?.Id}`);

    // TODO: Phase 5.5 - Add sendShipment call for full parity with deprecated project
    // The deprecated project calls sendShipment after createSupply (lines 72-103 in supplyService.ts)
    // This requires migrating initializeBrowser and proxyRequestFetch utilities
    // For now, this is acceptable as Phase 5 focuses on core autobooking without full shipment tracking

    return response;
  }

  /**
   * Delete a preorder using account-based authentication
   */
  async deletePreorder(options: DeletePreorderOptions): Promise<DeletePreorderResponse> {
    const {
      accountId,
      supplierId,
      preorderId,
      userAgent,
      proxy,
    } = options;

    logger.info(`[SupplyService] Deleting preorder ${preorderId} for account ${accountId}`);

    const response = await wbAccountRequest<DeletePreorderResponse>({
      url: 'https://seller-supply.wildberries.ru/ns/sm-preorder/supply-manager/api/v1/preorder/delete',
      accountId,
      supplierId,
      userAgent,
      proxy,
      isJsonRpc: true,
      body: {
        params: { preorderId },
      },
    });

    if (response.error) {
      logger.warn(`[SupplyService] Preorder deletion returned error: ${response.error.message}`);
    } else {
      logger.info(`[SupplyService] Preorder ${preorderId} deleted successfully`);
    }

    return response;
  }

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

  /**
   * Get the box type mask for a supply type
   */
  getBoxTypeMask(supplyType: string): number {
    return BOX_TYPE_MASK_MAPPINGS[supplyType] || 2; // Default to BOX (2)
  }
}

// Export singleton instance
export const supplyService = new SupplyService();

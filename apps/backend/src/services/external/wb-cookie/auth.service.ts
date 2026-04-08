/**
 * WB Cookie Auth Service
 * Handles WB authentication-related API calls using browser cookies
 * Domain: seller.wildberries.ru
 */

import { wbAccountRequest } from "@/utils/wb-request";
import type { ProxyConfig } from "@/utils/wb-request";
import { SupplierResponse } from "@/types/wb";

export class WBCookieAuthService {
  /**
   * Validate authentication for an account
   */
  async validateAuth({
    accountId,
    supplierId,
    userAgent,
    proxy,
  }: {
    accountId: string;
    supplierId: string;
    userAgent: string;
    proxy?: ProxyConfig;
  }) {
    return wbAccountRequest({
      url: 'https://seller.wildberries.ru/ns/passport-portal/suppliers-portal-ru/validate',
      accountId,
      userAgent,
      proxy,
      supplierId,
      parseResponse: false,
    });
  }

  /**
   * Get user suppliers from WB API
   */
  async getUserSuppliers({
    accountId,
    supplierId,
    userAgent,
    proxy,
  }: {
    accountId: string;
    supplierId: string;
    userAgent: string;
    proxy?: ProxyConfig;
  }): Promise<Array<{ name: string; id: string }>> {
    const response = await wbAccountRequest<[SupplierResponse]>({
      url: 'https://seller.wildberries.ru/ns/suppliers/suppliers-portal-core/suppliers',
      accountId,
      userAgent,
      proxy,
      supplierId,
      isJsonRpc: true,
      body: [
        { method: 'getUserSuppliers', params: {} },
        { method: 'listCountries', params: {} },
      ],
    });

    const suppliers =
      response.find((item) => 'suppliers' in (item.result || {}))?.result
        ?.suppliers || [];

    return suppliers.map((supplier: { name: string; id: string }) => ({
      name: supplier.name,
      id: supplier.id,
    }));
  }
}

export const wbCookieAuthService = new WBCookieAuthService();

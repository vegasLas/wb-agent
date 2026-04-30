import { prisma } from '@/config/database';
import { wbAccountRequest } from '@/utils/wb-request';
import type { ProxyConfig } from '@/utils/wb-request';
import { createLogger } from '@/utils/logger';
import type { Permission } from '@prisma/client';

const logger = createLogger('WBPermission');

export class WBPermissionService {
  /**
   * Probe WB service permissions once using the first supplier,
   * then assign the same permissions to every supplier in the account.
   * (All suppliers in an account share the same cookies.)
   */
  async probeAndAssignPermissions(
    accountId: string,
    userAgent: string,
    proxy?: ProxyConfig,
  ): Promise<void> {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: { suppliers: true },
    });

    if (!account || account.suppliers.length === 0) {
      logger.warn(`No suppliers found for account ${accountId}, skipping permission probe`);
      return;
    }

    // Probe once using the first supplier (all suppliers share the same cookies)
    const supplierId = account.suppliers[0].supplierId;
    const permissions = await this.probePermissions(accountId, userAgent, proxy, supplierId);

    // Assign the same permissions to every supplier in the account
    for (const supplier of account.suppliers) {
      await prisma.supplier.update({
        where: { id: supplier.id },
        data: { permissions },
      });
    }

    logger.info(
      `Permissions for account ${accountId} suppliers: ${permissions.join(', ') || 'none'}`,
    );
  }

  private async probePermissions(
    accountId: string,
    userAgent: string,
    proxy: ProxyConfig | undefined,
    supplierId: string | undefined,
  ): Promise<Permission[]> {
    const probes = await Promise.allSettled([
      this.probePromotions(accountId, userAgent, proxy, supplierId),
      this.probeFeedbacks(accountId, userAgent, proxy, supplierId),
      this.probeAdverts(accountId, userAgent, proxy, supplierId),
      this.probeReports(accountId, userAgent, proxy, supplierId),
      this.probeSupplies(accountId, userAgent, proxy, supplierId),
    ]);

    const permissions: Permission[] = [];
    if (probes[0].status === 'fulfilled' && probes[0].value)
      permissions.push('PROMOTIONS');
    if (probes[1].status === 'fulfilled' && probes[1].value)
      permissions.push('FEEDBACKS');
    if (probes[2].status === 'fulfilled' && probes[2].value)
      permissions.push('ADVERTS');
    if (probes[3].status === 'fulfilled' && probes[3].value)
      permissions.push('REPORTS');
    if (probes[4].status === 'fulfilled' && probes[4].value)
      permissions.push('SUPPLIES');

    return permissions;
  }

  private async probePromotions(
    accountId: string,
    userAgent: string,
    proxy: ProxyConfig | undefined,
    supplierId: string | undefined,
  ): Promise<boolean> {
    try {
      await wbAccountRequest({
        url:
          'https://discounts-prices.wildberries.ru/ns/calendar-api/dp-calendar/web/api/v3/promotions/timeline' +
          '?endDate=2099-12-31T00%3A00%3A00.000Z' +
          '&filter=PARTICIPATING' +
          '&startDate=2000-01-01T00%3A00%3A00.000Z',
        accountId,
        userAgent,
        proxy,
        supplierId,
        method: 'GET',
        parseResponse: false,
      });
      return true;
    } catch (err: any) {
      return !this.isForbidden(err);
    }
  }

  private async probeFeedbacks(
    accountId: string,
    userAgent: string,
    proxy: ProxyConfig | undefined,
    supplierId: string | undefined,
  ): Promise<boolean> {
    try {
      await wbAccountRequest({
        url:
          'https://seller-reviews.wildberries.ru/ns/fa-seller-api/reviews-ext-seller-portal/api/v2/feedbacks' +
          '?cursor=&isAnswered=false&limit=1&searchText=&sortOrder=dateDesc',
        accountId,
        userAgent,
        proxy,
        supplierId,
        method: 'GET',
        parseResponse: false,
      });
      return true;
    } catch (err: any) {
      return !this.isForbidden(err);
    }
  }

  private async probeAdverts(
    accountId: string,
    userAgent: string,
    proxy: ProxyConfig | undefined,
    supplierId: string | undefined,
  ): Promise<boolean> {
    try {
      await wbAccountRequest({
        url:
          'https://cmp.wildberries.ru/api/v1/adverts' +
          '?page_number=1&page_size=1' +
          '&status=%5B4%2C9%2C11%5D' +
          '&order=createDate&direction=desc' +
          '&autofill=all&bid_type=%5B1%2C2%5D&type=%5B8%2C9%5D',
        accountId,
        userAgent,
        proxy,
        supplierId,
        method: 'GET',
        parseResponse: false,
      });
      return true;
    } catch (err: any) {
      return !this.isForbidden(err);
    }
  }

  private async probeReports(
    accountId: string,
    userAgent: string,
    proxy: ProxyConfig | undefined,
    supplierId: string | undefined,
  ): Promise<boolean> {
    try {
      await wbAccountRequest({
        url:
          'https://seller-weekly-report.wildberries.ru/ns/regionsviewer/analytics-back/api/v1/region-sale-fedokr' +
          '?dateFrom=01.01.24&dateTo=01.01.24',
        accountId,
        userAgent,
        proxy,
        supplierId,
        method: 'POST',
        body: {
          cursor: { offset: 0, limit: 1 },
          filters: ['country'],
        },
        parseResponse: false,
      });
      return true;
    } catch (err: any) {
      return !this.isForbidden(err);
    }
  }

  private async probeSupplies(
    accountId: string,
    userAgent: string,
    proxy: ProxyConfig | undefined,
    supplierId: string | undefined,
  ): Promise<boolean> {
    try {
      await wbAccountRequest({
        url:
          'https://seller-supply.wildberries.ru/ns/sm-supply/supply-manager/api/v1/supply/acceptanceCoefficientsReport',
        accountId,
        userAgent,
        proxy,
        supplierId,
        isJsonRpc: true,
        body: {
          params: {
            dateFrom: new Date().toISOString(),
            dateTo: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          },
        },
        parseResponse: false,
      });
      return true;
    } catch (err: any) {
      return !this.isForbidden(err);
    }
  }

  private isForbidden(err: any): boolean {
    const status = err?.status;
    const message = err?.message || '';
    return (
      status === 403 ||
      status === 401 ||
      message.includes('403') ||
      message.includes('401')
    );
  }
}

export const wbPermissionService = new WBPermissionService();

/**
 * WB Content Service
 * Handles Wildberries content-card and category endpoints including:
 * - Content cards table list (seller-content.wildberries.ru)
 * - Content card IMT details (seller-content.wildberries.ru)
 * - Tariffs by dimensions (seller-weekly-report.wildberries.ru)
 * - Categories/commissions search (seller-weekly-report.wildberries.ru)
 */

import { prisma } from '@/config/database';
import { wbAccountRequest } from '@/utils/wb-request';
import type { ProxyConfig } from '@/utils/wb-request';
import { createLogger } from '@/utils/logger';

const logger = createLogger('WBContent');

import type {
  ContentCardTableListResponse,
  ContentCardImtResponse,
  ContentCardTariffsResponse,
  ContentCardCategoriesResponse,
} from '@/types/wb';

interface AccountContext {
  accountId: string;
  supplierId: string;
  userAgent: string;
  proxy: ProxyConfig | undefined;
}

async function resolveAccountContext(userId: number): Promise<AccountContext> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      accounts: {
        include: {
          suppliers: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const account = user.accounts.find((a) => a.id === user.selectedAccountId);
  if (!account) {
    throw new Error('No account selected for user');
  }

  const supplierId =
    account.selectedSupplierId || account.suppliers[0]?.supplierId;
  if (!supplierId) {
    throw new Error('No supplier found for account');
  }

  const envInfo = user.envInfo as unknown as {
    userAgent?: string;
    proxy?: ProxyConfig;
  } | null;

  const userAgent =
    envInfo?.userAgent ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  const proxy = envInfo?.proxy;

  return {
    accountId: account.id,
    supplierId,
    userAgent,
    proxy,
  };
}

export class WBContentService {
  /**
   * Get content cards table list from seller-content.wildberries.ru
   * Returns simplified data: title, nmID, currentPrice, stocks, subject, feedbackRating, vendorCode
   */
  async getContentCardsTableList({
    userId,
    n = 20,
  }: {
    userId: number;
    n?: number;
  }): Promise<{
    cards: Array<{
      title: string;
      nmID: number;
      currentPrice: number | null;
      stocks: number;
      subject: string;
      feedbackRating: number;
      vendorCode: string;
      thumbnail: string | null;
    }>;
    cursor: {
      next: boolean;
      n: number;
      nmID: number;
    };
  }> {
    const { accountId, supplierId, userAgent, proxy } =
      await resolveAccountContext(userId);

    const url =
      'https://seller-content.wildberries.ru/ns/viewer/content-card/viewer/tableListv6';

    logger.info(`Fetching content cards table list for user ${userId}`);

    const response = await wbAccountRequest<ContentCardTableListResponse>({
      url,
      accountId,
      userAgent,
      proxy,
      supplierId,
      method: 'POST',
      body: {
        sort: [{ columnID: 11, order: 'desc' }],
        filter: { search: '', paidOptions: {} },
        cursor: { n },
      },
    });

    const cards = (response.data?.cards || []).map((card) => {
      const mediaKeys = Object.keys(card.mediaFiles || {});
      const firstMedia =
        mediaKeys.length > 0 ? card.mediaFiles[mediaKeys[0]] : null;
      return {
        title: card.title,
        nmID: card.nmID,
        currentPrice: card.sizes?.[0]?.currentPrice ?? null,
        stocks: card.stocks,
        subject: card.subject,
        feedbackRating: card.feedbackRating,
        vendorCode: card.vendorCode,
        thumbnail: firstMedia?.thumbnail || firstMedia?.value || null,
      };
    });

    return {
      cards,
      cursor: {
        next: response.data?.cursor?.next ?? false,
        n: response.data?.cursor?.n ?? n,
        nmID: response.data?.cursor?.nmID ?? 0,
      },
    };
  }

  /**
   * Get IMT details for a content card from seller-content.wildberries.ru
   * Returns simplified data: nmID, vendorCode, title, description, imtID, subject, brandTitle, sizes, mediaFile, dimensions, characteristics
   */
  async getContentCardImt({
    userId,
    nmID,
  }: {
    userId: number;
    nmID: number;
  }): Promise<{
    imtID: number;
    subjectInfo: {
      parent: string;
      subject: string;
      supplierSubject: string;
    };
    variants: Array<{
      nmID: number;
      vendorCode: string;
      title: string;
      description: string;
      brandTitle: string;
      sizes: Array<{
        chrtID: number;
        techSize: string;
        wbSize: string;
        skus: string[];
        price: number;
        currency: string;
      }>;
      mediaFile: {
        value: string;
        mimeType: string;
        thumbnail?: string;
        preview?: string;
      } | null;
      dimensions: {
        width: number;
        height: number;
        length: number;
        weightBrutto: number;
      };
      characteristics: Array<{ type: string; value: unknown }>;
    }>;
  }> {
    const { accountId, supplierId, userAgent, proxy } =
      await resolveAccountContext(userId);

    const url =
      'https://seller-content.wildberries.ru/ns/viewer/content-card/viewer/getImt';

    logger.info(`Fetching content card IMT for user ${userId}, nmID: ${nmID}`);

    const response = await wbAccountRequest<ContentCardImtResponse>({
      url,
      accountId,
      userAgent,
      proxy,
      supplierId,
      method: 'POST',
      body: { nmID },
    });

    const data = response.data;
    const variants = (data?.variants || []).map((variant) => {
      const mediaKeys = Object.keys(variant.mediaFiles || {});
      const firstMedia =
        mediaKeys.length > 0 ? variant.mediaFiles[mediaKeys[0]] : null;
      return {
        nmID: variant.nmID,
        vendorCode: variant.vendorCode,
        title: variant.title,
        description: variant.description,
        brandTitle: variant.brand?.title || '',
        sizes: variant.sizes.map((s) => ({
          chrtID: s.chrtID,
          techSize: s.techSize,
          wbSize: s.wbSize,
          skus: s.skus,
          price: s.price,
          currency: s.currency,
        })),
        mediaFile: firstMedia
          ? {
              value: firstMedia.value,
              mimeType: firstMedia.mimeType,
              thumbnail: firstMedia.thumbnail,
              preview: firstMedia.preview,
            }
          : null,
        dimensions: {
          width: variant.dimensions?.width ?? 0,
          height: variant.dimensions?.height ?? 0,
          length: variant.dimensions?.length ?? 0,
          weightBrutto: variant.dimensions?.weightBrutto ?? 0,
        },
        characteristics: (variant.characteristics || []).map((c) => ({
          type: c.type,
          value: c.value,
        })),
      };
    });

    return {
      imtID: data?.imtID ?? 0,
      subjectInfo: {
        parent: data?.subjectInfo?.parent || '',
        subject: data?.subjectInfo?.subject || '',
        supplierSubject: data?.subjectInfo?.supplierSubject || '',
      },
      variants,
    };
  }

  /**
   * Get tariffs by dimensions and subject from seller-weekly-report.wildberries.ru
   */
  async getContentCardTariffs({
    userId,
    height,
    length,
    weight,
    width,
    subjectId,
  }: {
    userId: number;
    height: number;
    length: number;
    weight: number;
    width: number;
    subjectId: number;
  }): Promise<{
    warehouselist: Array<{
      office_id: number;
      warehouseName: string;
      delivery: string;
      deliveryMonoAndMix: string;
      deliveryMonopallet: string;
      deliveryReturn: string;
      storageMonoAndMix: string;
      storageMonopallet: string;
      acceptanceMonoAndMix: string;
      acceptanceMonopallet: string;
      acceptanceSuperSafe: string;
      deliverySubjectSettingByVolume: string;
    }>;
  }> {
    const { accountId, supplierId, userAgent, proxy } =
      await resolveAccountContext(userId);

    const url =
      'https://seller-weekly-report.wildberries.ru/ns/categories-info/suppliers-portal-analytics/api/v1/tariffs';

    logger.info(`Fetching tariffs for user ${userId}, subjectId: ${subjectId}`);

    const response = await wbAccountRequest<ContentCardTariffsResponse>({
      url,
      accountId,
      userAgent,
      proxy,
      supplierId,
      method: 'POST',
      body: { height, length, weight, width, subjectId },
    });

    return {
      warehouselist: (response.data?.warehouselist || []).map((w) => ({
        office_id: w.office_id,
        warehouseName: w.warehouseName,
        delivery: w.delivery,
        deliveryMonoAndMix: w.deliveryMonoAndMix,
        deliveryMonopallet: w.deliveryMonopallet,
        deliveryReturn: w.deliveryReturn,
        storageMonoAndMix: w.storageMonoAndMix,
        storageMonopallet: w.storageMonopallet,
        acceptanceMonoAndMix: w.acceptanceMonoAndMix,
        acceptanceMonopallet: w.acceptanceMonopallet,
        acceptanceSuperSafe: w.acceptanceSuperSafe,
        deliverySubjectSettingByVolume: w.deliverySubjectSettingByVolume,
      })),
    };
  }

  /**
   * Get categories/commissions from seller-weekly-report.wildberries.ru
   * searchText should be the subject, category should be the parent category array
   */
  async getContentCardCategories({
    userId,
    searchText,
    category,
    take = 100,
    skip = 0,
    sort = 'name',
    order = 'asc',
  }: {
    userId: number;
    searchText: string;
    category: string[];
    take?: number;
    skip?: number;
    sort?: string;
    order?: string;
  }): Promise<{
    categories: Array<{
      id: number;
      name: string;
      subject: string;
      percent: number;
      percentFBS: number;
      kgvpSupplier: number;
      kgvpSupplierExpress: number;
      kgvpPickup: number;
    }>;
    length: number;
    countryCode: string;
  }> {
    const { accountId, supplierId, userAgent, proxy } =
      await resolveAccountContext(userId);

    const url =
      'https://seller-weekly-report.wildberries.ru/ns/categories-info/suppliers-portal-analytics/api/v1/categories';

    logger.info(
      `Fetching categories for user ${userId}, searchText: ${searchText}`,
    );
    console.log('body', {
      take,
      skip,
      sort,
      order,
      search: { searchText, category },
    });
    const response = await wbAccountRequest<ContentCardCategoriesResponse>({
      url,
      accountId,
      userAgent,
      proxy,
      supplierId,
      method: 'POST',
      body: {
        take,
        skip,
        sort,
        order,
        search: { searchText, category },
      },
    });

    return {
      categories: (response.data?.categories || []).map((c) => ({
        id: c.id,
        name: c.name,
        subject: c.subject,
        percent: c.percent,
        percentFBS: c.percentFBS,
        kgvpSupplier: c.kgvpSupplier,
        kgvpSupplierExpress: c.kgvpSupplierExpress,
        kgvpPickup: c.kgvpPickup,
      })),
      length: response.data?.length ?? 0,
      countryCode: response.data?.countryCode || '',
    };
  }

  /**
   * Get commissions for a content card by nmID.
   * Internally calls getImt to get parent/subject, then calls categories.
   */
  async getContentCardCommissions({
    userId,
    nmID,
  }: {
    userId: number;
    nmID: number;
  }): Promise<{
    categories: Array<{
      id: number;
      name: string;
      subject: string;
      percent: number;
      percentFBS: number;
      kgvpSupplier: number;
      kgvpSupplierExpress: number;
      kgvpPickup: number;
    }>;
    length: number;
    countryCode: string;
  }> {
    logger.info(
      `[getContentCardCommissions] START userId=${userId}, nmID=${nmID}`,
    );

    const imtData = await this.getContentCardImt({ userId, nmID });
    const subject = imtData.subjectInfo.subject;
    const parent = imtData.subjectInfo.parent;

    logger.info(
      `[getContentCardCommissions] Resolved from getImt: subject="${subject}", parent="${parent}"`,
    );

    if (!subject || !parent) {
      logger.error(
        `[getContentCardCommissions] Missing subject or parent for nmID=${nmID}`,
      );
      throw new Error(
        'Unable to determine subject or parent category for this card',
      );
    }

    const result = await this.getContentCardCategories({
      userId,
      searchText: subject,
      category: [parent],
    });

    logger.info(
      `[getContentCardCommissions] END userId=${userId}, nmID=${nmID}, categoriesCount=${result.categories.length}`,
    );
    return result;
  }

  /**
   * Get tariffs for a content card by nmID.
   * Internally calls getImt to get dimensions, then resolves subjectId via categories lookup
   * with fallback to default subjectId=336, then calls tariffs.
   */
  async getContentCardTariffsByNmID({
    userId,
    nmID,
  }: {
    userId: number;
    nmID: number;
  }): Promise<{
    warehouselist: Array<{
      office_id: number;
      warehouseName: string;
      delivery: string;
      deliveryMonoAndMix: string;
      deliveryMonopallet: string;
      deliveryReturn: string;
      storageMonoAndMix: string;
      storageMonopallet: string;
      acceptanceMonoAndMix: string;
      acceptanceMonopallet: string;
      acceptanceSuperSafe: string;
      deliverySubjectSettingByVolume: string;
    }>;
  }> {
    const DEFAULT_SUBJECT_ID = 336;
    logger.info(
      `[getContentCardTariffsByNmID] START userId=${userId}, nmID=${nmID}`,
    );

    const imtData = await this.getContentCardImt({ userId, nmID });
    const firstVariant = imtData.variants[0];

    if (!firstVariant) {
      logger.error(
        `[getContentCardTariffsByNmID] No variant data found for nmID=${nmID}`,
      );
      throw new Error('No variant data found for this card');
    }

    const { width, height, length, weightBrutto } = firstVariant.dimensions;
    const subject = imtData.subjectInfo.subject;
    const parent = imtData.subjectInfo.parent;

    logger.info(
      `[getContentCardTariffsByNmID] Resolved from getImt: subject="${subject}", parent="${parent}", dimensions=${width}x${height}x${length}, weight=${weightBrutto}`,
    );

    if (!subject || !parent) {
      logger.error(
        `[getContentCardTariffsByNmID] Missing subject or parent for nmID=${nmID}`,
      );
      throw new Error(
        'Unable to determine subject or parent category for this card',
      );
    }

    const subjectId = DEFAULT_SUBJECT_ID;
    logger.info(
      `[getContentCardTariffsByNmID] Using default subjectId=${subjectId} for subject="${subject}"`,
    );

    logger.info(
      `[getContentCardTariffsByNmID] Calling tariffs with subjectId=${subjectId}, dimensions=${width}x${height}x${length}, weight=${weightBrutto}`,
    );

    const result = await this.getContentCardTariffs({
      userId,
      height,
      length,
      weight: weightBrutto,
      width,
      subjectId,
    });

    logger.info(
      `[getContentCardTariffsByNmID] END userId=${userId}, nmID=${nmID}, warehousesCount=${result.warehouselist.length}`,
    );
    return result;
  }
}

export const wbContentService = new WBContentService();

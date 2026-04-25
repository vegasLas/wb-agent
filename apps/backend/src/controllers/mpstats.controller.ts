/**
 * MPStats Controller
 * HTTP request handlers for MPStats endpoints
 */

import { Request, Response } from 'express';
import { mpstatsService } from '@/services/external/analytics/mpstats.service';
import { userService } from '@/services/user';
import { prisma } from '@/config/database';
import { successResponse } from '@/utils/response';
import { ApiError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { getDefaultDateRange } from '@/utils/date.utils';

function getUserId(req: Request): number {
  const userId = req.user?.id;
  if (!userId) {
    throw ApiError.unauthorized('User not authenticated');
  }
  return userId;
}

/**
 * GET /api/v1/mpstats/token
 * Check whether the authenticated user has an MPStats token stored
 */
export const checkMpstatsToken = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  logger.info(`Checking MPStats token status for user ${userId}`);

  const user = await userService.findById(userId);

  successResponse(res, {
    hasToken: !!user?.mpstatsToken,
  });
};

/**
 * POST /api/v1/mpstats/token
 * Save or update the user's MPStats API token
 */
export const saveMpstatsToken = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const { token } = req.body as { token: string };

  logger.info(`Saving MPStats token for user ${userId}`);

  await userService.updateMpstatsToken(userId, token);

  res.json({
    success: true,
    message: 'MPStats token saved successfully',
  });
};

/**
 * DELETE /api/v1/mpstats/token
 * Remove the user's MPStats API token
 */
export const removeMpstatsToken = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);

  logger.info(`Removing MPStats token for user ${userId}`);

  await userService.updateMpstatsToken(userId, null);

  res.json({
    success: true,
    message: 'MPStats token removed successfully',
  });
};

/**
 * GET /api/v1/mpstats/items/:nmId/full
 * Fetch full MPStats item info and sync it to the local SKU card cache
 */
export const getItemFull = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const nmId = Number(req.params.nmId);

  const d1 = (req.query.d1 as string) || getDefaultDateRange().d1;
  const d2 = (req.query.d2 as string) || getDefaultDateRange().d2;

  logger.info(`Fetching MPStats item full for user ${userId}, nmId: ${nmId}`);

  const itemFull = await mpstatsService.getItemFullForUser({
    userId,
    nmId,
    d1,
    d2,
  });

  const image = itemFull.photo?.list?.[0]?.t || itemFull.photo?.list?.[0]?.f || '';

  const existingCard = await prisma.wbSkuCard.findUnique({
    where: {
      nmID_userId: {
        nmID: nmId,
        userId,
      },
    },
  });

  await prisma.wbSkuCard.upsert({
    where: {
      nmID_userId: {
        nmID: nmId,
        userId,
      },
    },
    update: {
      brand: itemFull.brand || null,
      title: itemFull.name || null,
      subjectName: itemFull.subject?.name || null,
      image,
    },
    create: {
      nmID: nmId,
      userId,
      brand: itemFull.brand || null,
      title: itemFull.name || null,
      subjectName: itemFull.subject?.name || null,
      image,
      favourite: false,
    },
  });

  successResponse(res, {
    nmID: nmId,
    name: itemFull.name,
    brand: itemFull.brand,
    subjectName: itemFull.subject?.name || '',
    image,
    favourite: existingCard?.favourite ?? false,
    full: itemFull,
  });
};

/**
 * POST /api/v1/mpstats/cards/save
 * Manually save or update a SKU card in the local cache
 */
export const saveSkuCard = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const card = req.body as {
    nmID: number;
    image?: string;
    photo?: { list?: Array<{ t?: string; f?: string }> };
    subjectID?: number;
    subjectName?: string;
    brand?: string;
    name?: string;
  };

  logger.info(`Saving SKU card for user ${userId}, nmID: ${card.nmID}`);

  const image =
    card.image || card.photo?.list?.[0]?.t || card.photo?.list?.[0]?.f || null;

  const saved = await prisma.wbSkuCard.upsert({
    where: {
      nmID_userId: {
        nmID: card.nmID,
        userId,
      },
    },
    update: {
      subjectID: card.subjectID || null,
      subjectName: card.subjectName || null,
      brand: card.brand || null,
      title: card.name || null,
      image,
    },
    create: {
      nmID: card.nmID,
      userId,
      subjectID: card.subjectID || null,
      subjectName: card.subjectName || null,
      brand: card.brand || null,
      title: card.name || null,
      image,
    },
  });

  successResponse(res, saved);
};

/**
 * GET /api/v1/mpstats/favorites
 * Get the user's favourited SKU cards
 */
export const getFavorites = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);

  logger.info(`Fetching favorite SKU cards for user ${userId}`);

  const favorites = await prisma.wbSkuCard.findMany({
    where: { userId, favourite: true },
    orderBy: { createdAt: 'desc' },
  });

  const mapped = favorites.map((f) => ({
    nmID: f.nmID,
    name: f.title || '',
    brand: f.brand || '',
    subjectName: f.subjectName || '',
    image: f.image || '',
    favourite: f.favourite,
  }));

  successResponse(res, mapped);
};

/**
 * POST /api/v1/mpstats/favorites
 * Mark a SKU card as favourite
 */
export const addFavorite = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const card = req.body as { nmID: number };

  logger.info(`Adding SKU card to favorites for user ${userId}, nmID: ${card.nmID}`);

  await prisma.wbSkuCard.upsert({
    where: {
      nmID_userId: {
        nmID: card.nmID,
        userId,
      },
    },
    update: {
      favourite: true,
    },
    create: {
      nmID: card.nmID,
      userId,
      favourite: true,
    },
  });

  res.json({
    success: true,
    message: 'Added to favorites',
  });
};

/**
 * DELETE /api/v1/mpstats/favorites/:nmId
 * Remove a SKU card from favourites
 */
export const removeFavorite = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const nmId = Number(req.params.nmId);

  logger.info(`Removing SKU card from favorites for user ${userId}, nmId: ${nmId}`);

  await prisma.wbSkuCard.updateMany({
    where: {
      userId,
      nmID: nmId,
    },
    data: {
      favourite: false,
    },
  });

  res.json({
    success: true,
    message: 'Removed from favorites',
  });
};

/**
 * GET /api/v1/mpstats/history
 * Get the user's recently viewed SKU cards (up to 50)
 */
export const getHistory = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);

  logger.info(`Fetching SKU card history for user ${userId}`);

  const history = await prisma.wbSkuCard.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });

  const mapped = history.map((h) => ({
    nmID: h.nmID,
    name: h.title || '',
    brand: h.brand || '',
    subjectName: h.subjectName || '',
    image: h.image || '',
    favourite: h.favourite,
  }));

  successResponse(res, mapped);
};

/**
 * GET /api/v1/mpstats/sku/:nmId/summary
 * Get combined MPStats data (sales, regions, balance, item full)
 */
export const getSkuSummary = async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(req);
  const nmId = Number(req.params.nmId);

  const d1 = (req.query.d1 as string) || getDefaultDateRange().d1;
  const d2 = (req.query.d2 as string) || getDefaultDateRange().d2;

  logger.info(`Fetching MPStats SKU summary for user ${userId}, nmId: ${nmId}`);

  const summary = await mpstatsService.getSkuSummary({
    userId,
    nmId,
    d1,
    d2,
  });

  successResponse(res, summary);
};

export default {
  checkMpstatsToken,
  saveMpstatsToken,
  removeMpstatsToken,
  getItemFull,
  saveSkuCard,
  getFavorites,
  addFavorite,
  removeFavorite,
  getHistory,
  getSkuSummary,
};

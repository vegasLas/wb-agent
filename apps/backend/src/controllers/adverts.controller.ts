/**
 * Adverts Controller
 * HTTP request handlers for adverts endpoints
 */

import { Request, Response } from 'express';
import { wbExtendedService } from '@/services/external/wb';
import { logger } from '@/utils/logger';

/**
 * GET /api/v1/adverts
 * Get adverts list for the authenticated user
 */
export const fetchAdverts = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const {
      pageNumber,
      pageSize,
      status,
      order,
      direction,
      autofill,
      bidType,
      type,
      filterState,
    } = req.query as {
      pageNumber?: string;
      pageSize?: string;
      status?: string;
      order?: string;
      direction?: string;
      autofill?: string;
      bidType?: string;
      type?: string;
      filterState?: string;
    };

    logger.info(`Fetching adverts list for user ${userId}`);

    const data = await wbExtendedService.getAdverts({
      userId,
      pageNumber: pageNumber ? Number(pageNumber) : 1,
      pageSize: pageSize ? Number(pageSize) : 10,
      status: status ? JSON.parse(status) : [4, 9, 11],
      order: order || 'createDate',
      direction: direction || 'desc',
      autofill: autofill || 'all',
      bidType: bidType ? JSON.parse(bidType) : [1, 2],
      type: type ? JSON.parse(type) : [8, 9],
      filterState: filterState ? Number(filterState) : undefined,
    });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error in fetchAdverts controller:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Internal server error',
    });
  }
};

/**
 * GET /api/v1/adverts/:advertId/preset-info
 * Get advert preset info for the authenticated user
 */
export const fetchAdvertPresetInfo = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
      return;
    }

    const { advertId } = req.params;

    if (!advertId) {
      res.status(400).json({
        success: false,
        error: 'advertId is required',
      });
      return;
    }

    const {
      pageSize,
      pageNumber,
      filterQuery,
      from,
      to,
      sortDirection,
      nmId,
      calcPages,
      calcTotal,
      filterState,
    } = req.query as {
      pageSize?: string;
      pageNumber?: string;
      filterQuery?: string;
      from?: string;
      to?: string;
      sortDirection?: string;
      nmId?: string;
      calcPages?: string;
      calcTotal?: string;
      filterState?: string;
    };

    if (!nmId) {
      res.status(400).json({
        success: false,
        error: 'nmId is required',
      });
      return;
    }

    logger.info(
      `Fetching advert preset info for user ${userId}, advertId: ${advertId}, nmId: ${nmId}`,
    );

    const data = await wbExtendedService.getAdvertPresetInfo({
      userId,
      advertId: Number(advertId),
      pageSize: pageSize ? Number(pageSize) : 20,
      pageNumber: pageNumber ? Number(pageNumber) : 1,
      filterQuery: filterQuery || '',
      from,
      to,
      sortDirection: sortDirection || 'descend',
      nmId: Number(nmId),
      calcPages: calcPages !== 'false',
      calcTotal: calcTotal !== 'false',
      filterState: filterState ? Number(filterState) : undefined,
    });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error in fetchAdvertPresetInfo controller:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Internal server error',
    });
  }
};

export default {
  fetchAdverts,
  fetchAdvertPresetInfo,
};

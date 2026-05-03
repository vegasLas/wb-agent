/**
 * Content Cards Controller
 * HTTP request handlers for WB content-card endpoints
 */

import { Request, Response } from 'express';
import {
  wbContentOfficialService,
  wbTariffsOfficialService,
  resolveOfficialSupplierId,
} from '@/services/external/wb/official';
import {
  toContentCardListResponseDTO,
  toContentCardDetailDTO,
} from '@/services/external/wb/official/wb-content-official.mapper';
import { logger } from '@/utils/logger';

/**
 * GET /api/v1/content-cards
 * Get content cards table list for the authenticated user
 */
export const fetchContentCardsTableList = async (
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

    const supplierId = await resolveOfficialSupplierId(userId, 'CONTENT');
    if (!supplierId) {
      res.status(403).json({
        success: false,
        error:
          'No suitable official API key found for Content. Please add a Content API key in your profile.',
      });
      return;
    }

    const { n, cursor } = req.query as { n?: string; cursor?: string };

    let parsedCursor: { updatedAt?: string; nmID?: number } | undefined;
    if (cursor) {
      try {
        parsedCursor = JSON.parse(cursor) as {
          updatedAt?: string;
          nmID?: number;
        };
      } catch {
        res.status(400).json({
          success: false,
          error: 'Invalid cursor format',
        });
        return;
      }
    }

    const limit = n ? Number(n) : 20;
    const data = await wbContentOfficialService.getContentCardsTableList({
      supplierId,
      limit,
      cursor: parsedCursor,
    });

    res.status(200).json({
      success: true,
      data: toContentCardListResponseDTO(data, limit),
    });
  } catch (error) {
    logger.error('Error in fetchContentCardsTableList controller:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Internal server error',
    });
  }
};

/**
 * POST /api/v1/content-cards/imt
 * Get IMT details for a specific content card
 */
export const fetchContentCardImt = async (
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

    const supplierId = await resolveOfficialSupplierId(userId, 'CONTENT');
    if (!supplierId) {
      res.status(403).json({
        success: false,
        error:
          'No suitable official API key found for Content. Please add a Content API key in your profile.',
      });
      return;
    }

    const { nmID } = req.body as { nmID?: number };

    if (!nmID) {
      res.status(400).json({
        success: false,
        error: 'nmID is required',
      });
      return;
    }

    logger.info(`Fetching content card IMT for user ${userId}, nmID: ${nmID}`);

    const card = await wbContentOfficialService.getContentCardByNmID({
      supplierId,
      nmID: Number(nmID),
    });

    if (!card) {
      res.status(404).json({
        success: false,
        error: 'Content card not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: toContentCardDetailDTO(card),
    });
  } catch (error) {
    logger.error('Error in fetchContentCardImt controller:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Internal server error',
    });
  }
};

/**
 * POST /api/v1/content-cards/tariffs
 * Get tariffs by dimensions and subject
 */
export const fetchContentCardTariffs = async (
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

    const supplierId = await resolveOfficialSupplierId(userId, 'CONTENT');
    if (!supplierId) {
      res.status(403).json({
        success: false,
        error:
          'No suitable official API key found for Content. Please add a Content API key in your profile.',
      });
      return;
    }

    const { height, length, weight, width } = req.body as {
      height?: number;
      length?: number;
      weight?: number;
      width?: number;
    };

    if (
      height === undefined ||
      length === undefined ||
      weight === undefined ||
      width === undefined
    ) {
      res.status(400).json({
        success: false,
        error: 'height, length, weight, and width are required',
      });
      return;
    }

    logger.info(`Fetching tariffs for user ${userId}`);

    const data = await wbTariffsOfficialService.getAggregatedTariffs({
      supplierId,
      height: Number(height),
      length: Number(length),
      weight: Number(weight),
      width: Number(width),
    });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error in fetchContentCardTariffs controller:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Internal server error',
    });
  }
};

/**
 * POST /api/v1/content-cards/categories
 * Get categories/commissions by search text and category
 * @deprecated Use /api/v1/content-cards/:nmID/commissions instead.
 */
export const fetchContentCardCategories = async (
  _req: Request,
  res: Response,
): Promise<void> => {
  res.status(410).json({
    success: false,
    error:
      'This endpoint is deprecated. Use POST /api/v1/content-cards/:nmID/commissions instead.',
  });
};

/**
 * POST /api/v1/content-cards/:nmID/commissions
 * Get commissions for a specific content card
 */
export const fetchContentCardCommissions = async (
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

    const supplierId = await resolveOfficialSupplierId(userId, 'CONTENT');
    if (!supplierId) {
      res.status(403).json({
        success: false,
        error:
          'No suitable official API key found for Content. Please add a Content API key in your profile.',
      });
      return;
    }

    const { nmID } = req.params;

    if (!nmID) {
      res.status(400).json({
        success: false,
        error: 'nmID is required',
      });
      return;
    }

    logger.info(`Fetching commissions for user ${userId}, nmID: ${nmID}`);

    const card = await wbContentOfficialService.getContentCardByNmID({
      supplierId,
      nmID: Number(nmID),
    });

    if (!card) {
      res.status(404).json({
        success: false,
        error: 'Content card not found',
      });
      return;
    }

    const subjectID = card.subjectID;
    const subjectName = card.subjectName;

    if (!subjectID) {
      res.status(404).json({
        success: false,
        error: 'Unable to determine subject ID for this card',
      });
      return;
    }

    const commission = await wbTariffsOfficialService.getCommissionBySubject({
      supplierId,
      subjectID,
    });

    if (!commission) {
      res.status(404).json({
        success: false,
        error: 'Commission data not found for this subject',
      });
      return;
    }

    const mappedCategory = {
      id: commission.subjectID,
      name: commission.subjectName,
      subject: commission.subjectName,
      percent: commission.kgvpMarketplace,
      percentFBS: commission.kgvpMarketplace,
      kgvpSupplier: commission.kgvpSupplier,
      kgvpSupplierExpress: commission.kgvpSupplierExpress,
      kgvpPickup: commission.kgvpPickup,
    };

    res.status(200).json({
      success: true,
      data: {
        categories: [mappedCategory],
        length: 1,
        countryCode: '',
      },
    });
  } catch (error) {
    logger.error('Error in fetchContentCardCommissions controller:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Internal server error',
    });
  }
};

/**
 * POST /api/v1/content-cards/:nmID/tariffs
 * Get tariffs for a specific content card
 */
export const fetchContentCardTariffsByNmID = async (
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

    const supplierId = await resolveOfficialSupplierId(userId, 'CONTENT');
    if (!supplierId) {
      res.status(403).json({
        success: false,
        error:
          'No suitable official API key found for Content. Please add a Content API key in your profile.',
      });
      return;
    }

    const { nmID } = req.params;

    if (!nmID) {
      res.status(400).json({
        success: false,
        error: 'nmID is required',
      });
      return;
    }

    logger.info(`Fetching tariffs by nmID for user ${userId}, nmID: ${nmID}`);

    const card = await wbContentOfficialService.getContentCardByNmID({
      supplierId,
      nmID: Number(nmID),
    });

    if (!card) {
      res.status(404).json({
        success: false,
        error: 'Content card not found',
      });
      return;
    }

    const dims = card.dimensions;
    if (!dims) {
      res.status(404).json({
        success: false,
        error: 'No dimensions found for this card',
      });
      return;
    }

    const data = await wbTariffsOfficialService.getAggregatedTariffs({
      supplierId,
      width: dims.width,
      height: dims.height,
      length: dims.length,
      weight: dims.weightBrutto,
    });

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    logger.error('Error in fetchContentCardTariffsByNmID controller:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Internal server error',
    });
  }
};

export default {
  fetchContentCardsTableList,
  fetchContentCardImt,
  fetchContentCardTariffs,
  fetchContentCardCategories,
  fetchContentCardCommissions,
  fetchContentCardTariffsByNmID,
};

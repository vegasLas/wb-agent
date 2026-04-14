import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticate } from '@/middleware/auth.middleware';
import { mpstatsService } from '@/services/external/analytics/mpstats.service';

import { userService } from '@/services/user/';
import { prisma } from '@/config/database';
import { ApiError } from '@/utils/errors';

const router = Router();

// GET /api/v1/mpstats/token - Check MPStats token status
router.get('/token', authenticate, async (req, res, next) => {
  try {
    const user = await userService.findById(req.user!.id);
    res.json({
      success: true,
      hasToken: !!user?.mpstatsToken,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/mpstats/token - Save/update MPStats token
router.post(
  '/token',
  authenticate,
  body('token')
    .notEmpty()
    .withMessage('MPStats token is required')
    .isString()
    .withMessage('MPStats token must be a string'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Validation error', {
          errors: errors.array(),
        });
      }

      const { token } = req.body;
      await userService.updateMpstatsToken(req.user!.id, token);

      res.json({
        success: true,
        message: 'MPStats token saved successfully',
      });
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /api/v1/mpstats/token - Remove MPStats token
router.delete('/token', authenticate, async (req, res, next) => {
  try {
    await userService.updateMpstatsToken(req.user!.id, null);
    res.json({
      success: true,
      message: 'MPStats token removed successfully',
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/mpstats/items/:nmId/full - Get MPStats full item info
router.get(
  '/items/:nmId/full',
  authenticate,
  param('nmId').isInt().withMessage('nmId must be a number'),
  query('d1').optional().isString(),
  query('d2').optional().isString(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Validation error', {
          errors: errors.array(),
        });
      }

      const nmId = parseInt(req.params.nmId, 10);

      const now = new Date();
      const formatDate = (d: Date) => d.toISOString().split('T')[0];
      const d1 = (req.query.d1 as string) || formatDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
      const d2 = (req.query.d2 as string) || formatDate(new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000));

      const itemFull = await mpstatsService.getItemFullForUser({
        userId: req.user!.id,
        nmId,
        d1,
        d2,
      });

      const image = itemFull.photo?.list?.[0]?.t || itemFull.photo?.list?.[0]?.f || '';

      const existingCard = await prisma.wbSkuCard.findUnique({
        where: {
          nmID_userId: {
            nmID: nmId,
            userId: req.user!.id,
          },
        },
      });

      await prisma.wbSkuCard.upsert({
        where: {
          nmID_userId: {
            nmID: nmId,
            userId: req.user!.id,
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
          userId: req.user!.id,
          brand: itemFull.brand || null,
          title: itemFull.name || null,
          subjectName: itemFull.subject?.name || null,
          image,
          favourite: false,
        },
      });

      res.json({
        success: true,
        data: {
          nmID: nmId,
          name: itemFull.name,
          brand: itemFull.brand,
          subjectName: itemFull.subject?.name || '',
          image,
          favourite: existingCard?.favourite ?? false,
          full: itemFull,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/v1/mpstats/cards/save - Save a SKU card to database
router.post(
  '/cards/save',
  authenticate,
  body('nmID').isInt().withMessage('nmID is required and must be a number'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Validation error', {
          errors: errors.array(),
        });
      }

      const card = req.body;
      const image = card.image || card.photo?.list?.[0]?.t || card.photo?.list?.[0]?.f || null;

      const saved = await prisma.wbSkuCard.upsert({
        where: {
          nmID_userId: {
            nmID: card.nmID,
            userId: req.user!.id,
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
          userId: req.user!.id,
          subjectID: card.subjectID || null,
          subjectName: card.subjectName || null,
          brand: card.brand || null,
          title: card.name || null,
          image,
        },
      });

      res.json({
        success: true,
        data: saved,
      });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/v1/mpstats/favorites - Get user's saved SKUs
router.get('/favorites', authenticate, async (req, res, next) => {
  try {
    const favorites = await prisma.wbSkuCard.findMany({
      where: { userId: req.user!.id, favourite: true },
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

    res.json({
      success: true,
      data: mapped,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/mpstats/favorites - Save SKU (same as cards/save)
router.post(
  '/favorites',
  authenticate,
  body('nmID').isInt().withMessage('nmID is required and must be a number'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Validation error', {
          errors: errors.array(),
        });
      }

      const card = req.body;

      await prisma.wbSkuCard.upsert({
        where: {
          nmID_userId: {
            nmID: card.nmID,
            userId: req.user!.id,
          },
        },
        update: {
          favourite: true,
        },
        create: {
          nmID: card.nmID,
          userId: req.user!.id,
          favourite: true,
        },
      });

      res.json({
        success: true,
        message: 'Added to favorites',
      });
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /api/v1/mpstats/favorites/:nmId - Remove saved SKU
router.delete(
  '/favorites/:nmId',
  authenticate,
  param('nmId').isInt().withMessage('nmId must be a number'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Validation error', {
          errors: errors.array(),
        });
      }

      const nmId = parseInt(req.params.nmId, 10);

      await prisma.wbSkuCard.updateMany({
        where: {
          userId: req.user!.id,
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
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/v1/mpstats/history - Get user's recently viewed SKUs
router.get('/history', authenticate, async (req, res, next) => {
  try {
    const history = await prisma.wbSkuCard.findMany({
      where: { userId: req.user!.id },
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

    res.json({
      success: true,
      data: mapped,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/mpstats/sku/:nmId/summary - Get combined MPStats data
router.get(
  '/sku/:nmId/summary',
  authenticate,
  param('nmId').isInt().withMessage('nmId must be a number'),
  query('d1').optional().isString(),
  query('d2').optional().isString(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Validation error', {
          errors: errors.array(),
        });
      }

      const nmId = parseInt(req.params.nmId, 10);

      const now = new Date();
      const formatDate = (d: Date) => d.toISOString().split('T')[0];
      const d1 = (req.query.d1 as string) || formatDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
      const d2 = (req.query.d2 as string) || formatDate(new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000));

      const summary = await mpstatsService.getSkuSummary({
        userId: req.user!.id,
        nmId,
        d1,
        d2,
      });

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;

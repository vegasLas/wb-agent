import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import axios from 'axios';
import { authenticate } from '@/middleware/auth.middleware';
import { supplierApiKeyService } from '@/services/supplier-api-key.service';
import { ApiError } from '@/utils/errors';

const router = Router();

// GET /api/v1/supplier-api-keys - Get user's API key info
router.get('/', authenticate, async (req, res, next) => {
  try {
    const apiKey = await supplierApiKeyService.findByUserId(req.user!.id);

    if (!apiKey) {
      res.json({
        success: true,
        hasApiKey: false,
      });
      return;
    }

    res.json({
      success: true,
      hasApiKey: true,
      isActive: apiKey.isActive,
      createdAt: apiKey.createdAt.toISOString(),
      updatedAt: apiKey.updatedAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/supplier-api-keys - Create or update API key
router.post(
  '/',
  authenticate,
  body('apiKey')
    .notEmpty()
    .withMessage('API key is required and must be a string')
    .isLength({ min: 10 })
    .withMessage('API key must be at least 10 characters long'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw ApiError.validation('Validation error', {
          errors: errors.array(),
        });
      }

      const { apiKey } = req.body;

      // Validate API key by making a test request to WB API
      try {
        await axios.get(
          'https://common-api.wildberries.ru/api/tariffs/v1/acceptance/coefficients',
          {
            headers: {
              Authorization: apiKey,
            },
            timeout: 10000,
          },
        );
      } catch (error) {
        if (axios.isAxiosError(error)) {
          if (
            error.response?.status === 401 ||
            error.response?.status === 403
          ) {
            throw ApiError.badRequest(
              'Invalid API key. Please check your API key and try again.',
            );
          }
        }
        throw ApiError.badRequest(
          'Failed to validate API key. Please check your API key and try again.',
        );
      }

      const result = await supplierApiKeyService.upsert(req.user!.id, {
        apiKey,
      });

      res.json({
        success: true,
        data: {
          isExistAPIKey: true,
          createdAt: result.createdAt.toISOString(),
          updatedAt: result.updatedAt.toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /api/v1/supplier-api-keys - Delete API key
router.delete('/', authenticate, async (req, res, next) => {
  try {
    await supplierApiKeyService.delete(req.user!.id);

    res.json({
      success: true,
      message: 'API key deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;

import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { requireAdmin } from '@/middleware/admin.middleware';
import { aiUsageTrackingService } from '@/services/ai/ai-usage-tracking.service';
import { z } from 'zod';

const router = Router();

const isoDateSchema = z.string().datetime().or(z.string().date());

// GET /api/v1/admin/ai-usage/summary?from=...&to=...&groupBy=...
router.get(
  '/ai-usage/summary',
  authenticate,
  requireAdmin,
  async (req, res, next) => {
    try {
      const querySchema = z.object({
        from: isoDateSchema,
        to: isoDateSchema,
        groupBy: z
          .enum(['feature', 'model', 'user', 'day'])
          .optional()
          .default('feature'),
      });

      const parsed = querySchema.parse(req.query);

      const summary = await aiUsageTrackingService.getSummary({
        from: new Date(parsed.from),
        to: new Date(parsed.to),
        groupBy: parsed.groupBy,
      });

      return res.json({ success: true, data: summary });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: err.errors,
        });
      }
      next(err);
    }
  },
);

// GET /api/v1/admin/ai-usage/details?from=...&to=...&userId=...&feature=...&limit=...&offset=...
router.get(
  '/ai-usage/details',
  authenticate,
  requireAdmin,
  async (req, res, next) => {
    try {
      const querySchema = z.object({
        from: isoDateSchema,
        to: isoDateSchema,
        userId: z
          .string()
          .optional()
          .transform((val) => (val ? parseInt(val, 10) : undefined)),
        feature: z.enum(['ai_chat', 'feedback_auto_answer']).optional(),
        limit: z
          .string()
          .optional()
          .transform((val) => (val ? parseInt(val, 10) : 50)),
        offset: z
          .string()
          .optional()
          .transform((val) => (val ? parseInt(val, 10) : 0)),
      });

      const parsed = querySchema.parse(req.query);

      const details = await aiUsageTrackingService.getDetails({
        from: new Date(parsed.from),
        to: new Date(parsed.to),
        userId: parsed.userId,
        feature: parsed.feature,
        limit: parsed.limit,
        offset: parsed.offset,
      });

      return res.json({ success: true, data: details });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: err.errors,
        });
      }
      next(err);
    }
  },
);

export default router;

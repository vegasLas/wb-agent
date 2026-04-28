import { Router } from 'express';
import { param, query, validationResult } from 'express-validator';
import { authenticate } from '@/middleware/auth.middleware';
import { inAppNotificationService } from '@/services/notification/in-app-notification.service';
import { ApiError } from '@/utils/errors';

const router = Router();

/**
 * GET /v1/notifications
 * List notifications for the authenticated user
 */
router.get(
  '/',
  authenticate,
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
    query('unreadOnly').optional().isBoolean().toBoolean(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'Invalid query parameters');
      }

      const userId = req.user!.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
      const unreadOnly = req.query.unreadOnly === 'true';

      const result = await inAppNotificationService.list(userId, {
        limit,
        offset,
        unreadOnly,
      });

      res.json({
        success: true,
        data: result.notifications,
        meta: {
          total: result.total,
          limit,
          offset,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /v1/notifications/unread-count
 * Get unread notification count
 */
router.get('/unread-count', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const count = await inAppNotificationService.getUnreadCount(userId);

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /v1/notifications/:id/read
 * Mark a single notification as read
 */
router.patch(
  '/:id/read',
  authenticate,
  [param('id').isUUID()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'Invalid notification ID');
      }

      const userId = req.user!.id;
      const { id } = req.params;

      const notification = await inAppNotificationService.markRead(userId, id);

      if (!notification) {
        throw new ApiError(404, 'Notification not found');
      }

      res.json({
        success: true,
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * PATCH /v1/notifications/read-all
 * Mark all notifications as read
 */
router.patch('/read-all', authenticate, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const count = await inAppNotificationService.markAllRead(userId);

    res.json({
      success: true,
      data: { markedRead: count },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /v1/notifications/:id
 * Delete a notification
 */
router.delete(
  '/:id',
  authenticate,
  [param('id').isUUID()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new ApiError(400, 'Invalid notification ID');
      }

      const userId = req.user!.id;
      const { id } = req.params;

      const deleted = await inAppNotificationService.delete(userId, id);

      if (!deleted) {
        throw new ApiError(404, 'Notification not found');
      }

      res.json({
        success: true,
        message: 'Notification deleted',
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;

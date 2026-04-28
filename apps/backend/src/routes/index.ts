import { Router } from 'express';
import authRoutes from '@/routes/auth.routes';
import userRoutes from '@/routes/user.routes';
import accountRoutes from '@/routes/accounts.routes';
import supplierApiKeyRoutes from '@/routes/supplier-api-keys.routes';
import supplierRoutes from '@/routes/suppliers.routes';
import autobookingRoutes from '@/routes/autobooking.routes';
import rescheduleRoutes from '@/routes/reschedule.routes';
import triggerRoutes from '@/routes/triggers.routes';
import warehouseRoutes from '@/routes/warehouses.routes';
import suppliesRoutes from '@/routes/supplies.routes';
import paymentRoutes from '@/routes/payments.routes';
import webhookRoutes from '@/routes/webhooks.routes';
import coefficientsRoutes from '@/routes/coefficients.routes';
import reportsRoutes from '@/routes/reports.routes';
import promotionsRoutes from '@/routes/promotions.routes';
import advertsRoutes from '@/routes/adverts.routes';
import mpstatsRoutes from '@/routes/mpstats.routes';
import contentCardsRoutes from '@/routes/content-cards.routes';
import feedbacksRoutes from '@/routes/feedbacks.routes';
import aiRoutes from '@/routes/ai.routes';
import adminRoutes from '@/routes/admin.routes';
import notificationRoutes from '@/routes/notifications.routes';
import { authenticate } from '@/middleware/auth.middleware';

const router = Router();

// Health check and API info
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'WB API v1',
    endpoints: {
      auth: '/api/v1/auth',
      accounts: '/api/v1/accounts',
      supplierApiKeys: '/api/v1/supplier-api-keys',
      suppliers: '/api/v1/suppliers',
      autobooking: '/api/v1/autobooking',
      reschedule: '/api/v1/reschedule',
      triggers: '/api/v1/triggers',
      warehouses: '/api/v1/warehouses',
      supplies: '/api/v1/supplies',
      payments: '/api/v1/payments',
      user: '/api/v1/user',
      webhooks: '/api/v1/webhooks',
      coefficients: '/api/v1/coefficients',
      reports: '/api/v1/reports',
      promotions: '/api/v1/promotions',
      adverts: '/api/v1/adverts',
      mpstats: '/api/v1/mpstats',
      contentCards: '/api/v1/content-cards',
      feedbacks: '/api/v1/feedbacks',
      ai: '/api/v1/ai',
      notifications: '/api/v1/notifications',
    },
  });
});

// Auth routes (public with validation)
router.use('/auth', authRoutes);

// User routes (protected)
router.use('/user', userRoutes);

// Account routes (protected)
router.use('/accounts', authenticate, accountRoutes);

// Supplier API Key routes (protected)
router.use('/supplier-api-keys', authenticate, supplierApiKeyRoutes);

// Supplier routes (protected)
router.use('/suppliers', authenticate, supplierRoutes);

// Autobooking routes (protected)
router.use('/autobooking', authenticate, autobookingRoutes);

// Reschedule routes (protected)
router.use('/reschedule', authenticate, rescheduleRoutes);

// Trigger routes (protected)
router.use('/triggers', authenticate, triggerRoutes);

// Warehouse routes (protected)
router.use('/warehouses', authenticate, warehouseRoutes);

// Supplies routes (protected)
router.use('/supplies', authenticate, suppliesRoutes);

// Payment routes (protected)
router.use('/payments', authenticate, paymentRoutes);

// Coefficients routes (protected)
router.use('/coefficients', authenticate, coefficientsRoutes);

// Reports routes (protected)
router.use('/reports', authenticate, reportsRoutes);

// Promotions routes (protected)
router.use('/promotions', authenticate, promotionsRoutes);

// Adverts routes (protected)
router.use('/adverts', authenticate, advertsRoutes);

// MPStats routes (protected)
router.use('/mpstats', authenticate, mpstatsRoutes);

// Content Cards routes (protected)
router.use('/content-cards', authenticate, contentCardsRoutes);

// Feedbacks routes (protected)
router.use('/feedbacks', authenticate, feedbacksRoutes);

// AI routes (protected)
router.use('/ai', authenticate, aiRoutes);

// Admin routes (protected + admin only)
router.use('/admin', authenticate, adminRoutes);

// Notification routes (protected)
router.use('/notifications', authenticate, notificationRoutes);

// Webhook routes (public - called by YooKassa)
router.use('/webhooks', webhookRoutes);

export default router;

import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import accountRoutes from './accounts.routes';
import supplierApiKeyRoutes from './supplier-api-keys.routes';
import supplierRoutes from './suppliers.routes';
import autobookingRoutes from './autobooking.routes';
import rescheduleRoutes from './reschedule.routes';
import triggerRoutes from './triggers.routes';
import warehouseRoutes from './warehouses.routes';
import suppliesRoutes from './supplies.routes';
import paymentRoutes from './payments.routes';
import webhookRoutes from './webhooks.routes';
import coefficientsRoutes from './coefficients.routes';
import reportsRoutes from './reports.routes';
import promotionsRoutes from './promotions.routes';
import { authenticate } from '../middleware/auth.middleware';

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

// Webhook routes (public - called by YooKassa)
router.use('/webhooks', webhookRoutes);

export default router;

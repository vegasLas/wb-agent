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

// Future routes (will be implemented in subsequent plans):
// router.use('/supplies', authenticate, supplyRoutes);
// router.use('/payments', authenticate, paymentRoutes);
// router.use('/webhooks', webhookRoutes);

export default router;

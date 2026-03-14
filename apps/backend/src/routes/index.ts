import { Router } from 'express';

const router = Router();

// Placeholder routes - will be implemented in subsequent plans
// router.use('/auth', authRoutes);
// router.use('/accounts', authenticate, accountRoutes);
// router.use('/suppliers', authenticate, supplierRoutes);
// router.use('/autobooking', authenticate, autobookingRoutes);
// router.use('/reschedule', authenticate, rescheduleRoutes);
// router.use('/triggers', authenticate, triggerRoutes);
// router.use('/warehouses', authenticate, warehouseRoutes);
// router.use('/supplies', authenticate, supplyRoutes);
// router.use('/payments', authenticate, paymentRoutes);
// router.use('/user', authenticate, userRoutes);
// router.use('/webhooks', webhookRoutes);

// Test route
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'WB API v1',
    endpoints: {
      auth: '/api/v1/auth',
      accounts: '/api/v1/accounts',
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

export default router;

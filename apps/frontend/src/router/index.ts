import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';

// Define all routes
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Account',
    component: () => import('../components/account/AccountComponent.vue'),
    meta: {
      title: 'Account',
      requiresAuth: true,
    },
  },
  {
    path: '/autobooking',
    name: 'Autobooking',
    component: () => import('../components/autobooking/Main.vue'),
    meta: {
      title: 'Autobooking',
      requiresAuth: true,
    },
    children: [
      {
        path: '',
        name: 'AutobookingList',
        component: () => import('../components/autobooking/List.vue'),
      },
      {
        path: 'create',
        name: 'AutobookingCreate',
        component: () => import('../components/autobooking/Form.vue'),
      },
      {
        path: 'update/:id',
        name: 'AutobookingUpdate',
        component: () => import('../components/autobooking/UpdateForm.vue'),
      },
    ],
  },
  {
    path: '/reschedules',
    name: 'Reschedules',
    component: () => import('../components/reschedules/Main.vue'),
    meta: {
      title: 'Reschedules',
      requiresAuth: true,
    },
    children: [
      {
        path: '',
        name: 'ReschedulesList',
        component: () => import('../components/reschedules/List.vue'),
      },
      {
        path: 'create',
        name: 'ReschedulesCreate',
        component: () => import('../components/reschedules/Form.vue'),
      },
      {
        path: 'update/:id',
        name: 'ReschedulesUpdate',
        component: () => import('../components/reschedules/UpdateForm.vue'),
      },
    ],
  },
  {
    path: '/triggers',
    name: 'Triggers',
    component: () => import('../components/triggers/TriggersMain.vue'),
    meta: {
      title: 'Triggers',
      requiresAuth: true,
    },
    children: [
      {
        path: '',
        name: 'TriggersList',
        component: () => import('../components/triggers/TriggersList.vue'),
      },
      {
        path: 'create',
        name: 'TriggerCreate',
        component: () => import('../components/triggers/TriggerForm.vue'),
      },
    ],
  },
  {
    path: '/reports',
    name: 'Reports',
    component: () => import('../components/report/ReportMain.vue'),
    meta: {
      title: 'Reports',
      requiresAuth: true,
    },
  },
  {
    path: '/store',
    name: 'Store',
    component: () => import('../components/store/StoreComponent.vue'),
    meta: {
      title: 'Store',
      requiresAuth: true,
    },
  },
  {
    path: '/store/subscription',
    name: 'StoreSubscription',
    component: () => import('../components/store/StoreComponent.vue'),
    meta: {
      title: 'Store - Subscription',
      requiresAuth: true,
      initialTab: 'subscription',
    },
  },
  {
    path: '/store/bookings',
    name: 'StoreBookings',
    component: () => import('../components/store/StoreComponent.vue'),
    meta: {
      title: 'Store - Bookings',
      requiresAuth: true,
      initialTab: 'bookings',
    },
  },
  {
    path: '/payments',
    name: 'Payments',
    component: () => import('../components/payment/PaymentView.vue'),
    meta: {
      title: 'Payments',
      requiresAuth: true,
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../components/NotFound.vue'),
    meta: {
      title: 'Page Not Found',
    },
  },
];

// Create router instance
const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    // Always scroll to top on navigation
    return { top: 0 };
  },
});

// Navigation guard for auth
router.beforeEach((to, from, next) => {
  // Update page title
  const title = to.meta.title as string;
  if (title) {
    document.title = `${title} | WB Agent`;
  }

  // Check if route requires auth
  if (to.meta.requiresAuth) {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      // Redirect to home/account page for auth
      next({ name: 'Account' });
      return;
    }
  }

  next();
});

export default router;

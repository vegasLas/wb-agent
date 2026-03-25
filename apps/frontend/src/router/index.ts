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
  },
  {
    path: '/reschedules',
    name: 'Reschedules',
    component: () => import('../components/reschedules/Main.vue'),
    meta: {
      title: 'Reschedules',
      requiresAuth: true,
    },
  },
  {
    path: '/triggers',
    name: 'Triggers',
    component: () => import('../components/triggers/TriggersMain.vue'),
    meta: {
      title: 'Triggers',
      requiresAuth: true,
    },
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

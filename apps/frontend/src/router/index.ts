import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAppState } from './app-state';
import MainLayout from '../components/layout/MainLayout.vue';

// Define all routes
const routes: RouteRecordRaw[] = [
  // Error Routes (public, no layout)
  {
    path: '/error/session-expired',
    name: 'SessionExpired',
    component: () => import('../components/layout/ErrorLayout.vue'),
    meta: {
      title: 'Сессия истекла',
      errorType: 'session_expired',
      public: true,
    },
  },
  {
    path: '/error/maintenance',
    name: 'Maintenance',
    component: () => import('../components/layout/ErrorLayout.vue'),
    meta: {
      title: 'Технические работы',
      errorType: 'maintenance',
      public: true,
    },
  },
  {
    path: '/error/not-found',
    name: 'UserNotFound',
    component: () => import('../components/layout/ErrorLayout.vue'),
    meta: {
      title: 'Пользователь не найден',
      errorType: 'not_found',
      public: true,
    },
  },
  
  // Main Application Routes (wrapped in MainLayout)
  {
    path: '/',
    component: MainLayout,
    children: [
      {
        path: '',
        name: 'Account',
        component: () => import('../views/AccountView.vue'),
        meta: {
          title: 'Account',
          requiresAuth: true,
        },
      },
      {
        path: 'autobooking',
        name: 'Autobooking',
        component: () => import('../views/AutobookingView.vue'),
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
        path: 'reschedules',
        name: 'Reschedules',
        component: () => import('../views/ReschedulesView.vue'),
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
        path: 'triggers',
        name: 'Triggers',
        component: () => import('../views/TriggersView.vue'),
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
        path: 'reports',
        name: 'Reports',
        component: () => import('../views/ReportsView.vue'),
        meta: {
          title: 'Reports',
          requiresAuth: true,
        },
      },
      {
        path: 'store',
        name: 'Store',
        component: () => import('../views/StoreView.vue'),
        meta: {
          title: 'Store',
          requiresAuth: true,
        },
      },
      {
        path: 'store/subscription',
        name: 'StoreSubscription',
        component: () => import('../views/StoreView.vue'),
        meta: {
          title: 'Store - Subscription',
          requiresAuth: true,
          initialTab: 'subscription',
        },
      },
      {
        path: 'store/bookings',
        name: 'StoreBookings',
        component: () => import('../views/StoreView.vue'),
        meta: {
          title: 'Store - Bookings',
          requiresAuth: true,
          initialTab: 'bookings',
        },
      },
      {
        path: 'payments',
        name: 'Payments',
        component: () => import('../views/PaymentsView.vue'),
        meta: {
          title: 'Payments',
          requiresAuth: true,
        },
      },
    ],
  },
  
  // 404 Catch-all
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../components/NotFound.vue'),
    meta: {
      title: 'Page Not Found',
      public: true,
    },
  },
];

// Create router instance
const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

// Global app state
let isAppInitialized = false;
let initError: 'session_expired' | 'maintenance' | 'not_found' | null = null;

// Navigation guard for app initialization
router.beforeEach(async (to, from, next) => {
  // Update page title
  const title = to.meta.title as string;
  if (title) {
    document.title = `${title} | WB Agent`;
  }

  // Skip initialization check for error pages and public routes
  if (to.meta.public) {
    next();
    return;
  }

  // If we already have an init error, redirect to error page
  if (initError) {
    next({ name: errorToRouteName(initError), replace: true });
    return;
  }

  // If not initialized yet, initialize the app
  if (!isAppInitialized) {
    try {
      await initializeApp();
      isAppInitialized = true;
      next();
    } catch (error: any) {
      initError = classifyError(error);
      next({ name: errorToRouteName(initError), replace: true });
    }
    return;
  }

  // Check auth for protected routes
  if (to.meta.requiresAuth) {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      next({ name: 'Account', replace: true });
      return;
    }
  }

  next();
});

// Initialize app (Telegram + user data)
async function initializeApp(): Promise<void> {
  const { initTelegram, initUserData } = useAppState();
  
  // Initialize Telegram first
  const { isTgClient } = await initTelegram();
  
  if (!isTgClient) {
    throw new Error('NOT_TG_CLIENT');
  }
  
  // Initialize user data
  await initUserData();
}

// Classify error type
function classifyError(error: any): 'session_expired' | 'maintenance' | 'not_found' {
  if (error?.data?.data?.expired === true) {
    return 'session_expired';
  }
  
  if (error?.status === 503 || error?.statusCode === 503) {
    return 'maintenance';
  }
  
  return 'not_found';
}

// Map error type to route name
function errorToRouteName(error: string): string {
  const map: Record<string, string> = {
    'session_expired': 'SessionExpired',
    'maintenance': 'Maintenance',
    'not_found': 'UserNotFound',
  };
  return map[error] || 'UserNotFound';
}

// Reset initialization (for testing/logout)
export function resetAppState() {
  isAppInitialized = false;
  initError = null;
}

// Check if app is initialized
export function getAppState() {
  return { isAppInitialized, initError };
}

export default router;

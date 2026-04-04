import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAppState } from './app-state';
import MainLayout from '../components/layout/MainLayout.vue';
import {
  AutobookingListView,
  AutobookingCreateView,
  AutobookingUpdateView,
} from '../views/autobooking';
import {
  ReschedulesListView,
  ReschedulesCreateView,
  ReschedulesUpdateView,
} from '../views/reschedules';
import { TriggersListView, TriggersCreateView } from '../views/triggers';
import { PromotionsView } from '../views/promotions';

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
        },
      },
      // Autobooking Routes (flat structure - each view is standalone)
      {
        path: 'autobooking',
        name: 'AutobookingList',
        component: AutobookingListView,
        meta: {
          title: 'Автобронирования',
        },
      },
      {
        path: 'autobooking/create',
        name: 'AutobookingCreate',
        component: AutobookingCreateView,
        meta: {
          title: 'Создание автобронирования',
        },
      },
      {
        path: 'autobooking/update/:id',
        name: 'AutobookingUpdate',
        component: AutobookingUpdateView,
        meta: {
          title: 'Редактирование',
        },
      },
      // Reschedules Routes (flat structure - each view is standalone)
      {
        path: 'reschedules',
        name: 'ReschedulesList',
        component: ReschedulesListView,
        meta: {
          title: 'Перепланирования',
        },
      },
      {
        path: 'reschedules/create',
        name: 'ReschedulesCreate',
        component: ReschedulesCreateView,
        meta: {
          title: 'Создание перепланирования',
        },
      },
      {
        path: 'reschedules/update/:id',
        name: 'ReschedulesUpdate',
        component: ReschedulesUpdateView,
        meta: {
          title: 'Редактирование перепланирования',
        },
      },
      // Triggers Routes (flat structure - each view is standalone)
      {
        path: 'triggers',
        name: 'TriggersList',
        component: TriggersListView,
        meta: {
          title: 'Таймслоты',
        },
      },
      {
        path: 'triggers/create',
        name: 'TriggerCreate',
        component: TriggersCreateView,
        meta: {
          title: 'Создание таймслота',
        },
      },
      {
        path: 'promotions',
        name: 'Promotions',
        component: PromotionsView,
        meta: {
          title: 'Акции',
        },
      },
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('../views/ReportsView.vue'),
        meta: {
          title: 'Reports',
        },
      },
      {
        path: 'store',
        name: 'Store',
        component: () => import('../views/StoreView.vue'),
        meta: {
          title: 'Store',
        },
      },
      {
        path: 'store/subscription',
        name: 'StoreSubscription',
        component: () => import('../views/StoreView.vue'),
        meta: {
          title: 'Store - Subscription',
          initialTab: 'subscription',
        },
      },
      {
        path: 'store/bookings',
        name: 'StoreBookings',
        component: () => import('../views/StoreView.vue'),
        meta: {
          title: 'Store - Bookings',
          initialTab: 'bookings',
        },
      },
      {
        path: 'payments',
        name: 'Payments',
        component: () => import('../views/PaymentsView.vue'),
        meta: {
          title: 'Payments',
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
  console.log('[Router] Navigation started:', {
    from: from.name,
    to: to.name,
    path: to.path,
  });

  // Update page title
  const title = to.meta.title as string;
  if (title) {
    document.title = `${title} | WB Agent`;
  }

  // Skip initialization check for error pages and public routes
  if (to.meta.public) {
    console.log('[Router] Public route, skipping init check');
    next();
    return;
  }

  // If we already have an init error, redirect to error page
  if (initError) {
    console.log('[Router] Init error exists:', initError);
    next({ name: errorToRouteName(initError), replace: true });
    return;
  }

  // If not initialized yet, initialize the app
  if (!isAppInitialized) {
    console.log('[Router] App not initialized, starting initialization...');
    try {
      await initializeApp();
      isAppInitialized = true;
      console.log('[Router] App initialized, proceeding to:', to.name);
      next();
    } catch (error: any) {
      console.error('[Router] Initialization failed:', error);
      initError = classifyError(error);
      next({ name: errorToRouteName(initError), replace: true });
    }
    return;
  }

  // Note: Authentication is handled via Telegram initData sent with each API request.
  // The backend validates initData and returns appropriate errors (401/403).
  // We don't use localStorage tokens in Telegram Mini Apps.
  console.log('[Router] Navigation allowed to:', to.name);
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
function classifyError(
  error: any,
): 'session_expired' | 'maintenance' | 'not_found' {
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
    session_expired: 'SessionExpired',
    maintenance: 'Maintenance',
    not_found: 'UserNotFound',
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

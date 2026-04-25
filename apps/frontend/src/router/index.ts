import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAppState } from './app-state';
import { isTelegramWebApp, getInitData } from '../utils/telegram';
import { usePermissions } from '@/composables/usePermissions';
import MainLayout from '../components/layout/MainLayout.vue';
import { AutobookingListView } from '../views/autobooking';
import {
  ReschedulesListView,
  ReschedulesCreateView,
  ReschedulesUpdateView,
} from '../views/reschedules';
import { TriggersListView } from '../views/triggers';
import { PromotionsView } from '../views/promotions';
import { FeedbacksView } from '../views/feedbacks';
import WBView from '../views/WBView.vue';
import TasksView from '../views/TasksView.vue';
import AdvertsView from '../views/adverts/AdvertsView.vue';
import { RegionSalesView } from '@/components/report';

// Define all routes
const routes: RouteRecordRaw[] = [
  // Public Routes (no layout)
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: {
      title: 'Вход',
      public: true,
    },
  },

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
        redirect: { name: 'Chat' },
      },
      {
        path: 'account',
        name: 'Account',
        component: () => import('../views/AccountView.vue'),
        meta: {
          title: 'Профиль',
        },
      },
      {
        path: 'tasks',
        name: 'Tasks',
        component: TasksView,
        meta: {
          title: 'Задачи',
        },
      },
      {
        path: 'chat',
        name: 'Chat',
        component: () => import('../views/ai/ChatView.vue'),
        meta: {
          title: 'AI Чат',
        },
      },
      {
        path: 'wb',
        redirect: { name: 'Promotions' },
      },
      {
        path: 'adverts',
        name: 'Adverts',
        component: AdvertsView,
        meta: {
          title: 'Реклама',
        },
      },
      {
        path: 'region-sales',
        name: 'RegionSales',
        component: RegionSalesView,
        meta: {
          title: 'Продажи по регионам',
        },
      },
      {
        path: 'mpstats',
        name: 'MPStats',
        component: () => import('../views/MPStatsView.vue'),
        meta: {
          title: 'MPStats',
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
        path: 'promotions',
        name: 'Promotions',
        component: PromotionsView,
        meta: {
          title: 'Акции',
        },
      },
      {
        path: 'feedbacks',
        name: 'Feedbacks',
        component: FeedbacksView,
        meta: {
          title: 'Отзывы',
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
        path: 'tariffs',
        name: 'Tariffs',
        component: () => import('../views/content-cards/TariffsView.vue'),
        meta: {
          title: 'Тарифы',
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
let isBrowserAuthInitialized = false;

/**
 * Check if current auth mode is browser
 * Re-verifies using utility function to handle cases where
 * early detection script might have missed Telegram params on sub-route reload
 */
function isBrowserMode(): boolean {
  if (typeof window === 'undefined') return false;
  
  // If flag says Telegram, trust it
  if (window.__AUTH_MODE__ === 'telegram' || window.__IS_TELEGRAM_WEBAPP__ === true) {
    return false;
  }
  
  // If flag says browser, double-check with utility (handles sub-route reload edge case)
  if (isTelegramWebApp()) {
    // We ARE in Telegram mode but flag wasn't set correctly
    // Update flags for consistency
    window.__AUTH_MODE__ = 'telegram';
    window.__IS_TELEGRAM_WEBAPP__ = true;
    console.log('[Router] Corrected auth mode to Telegram after re-check');
    return false;
  }
  
  // Also check if we have initData in localStorage (for sub-route reloads)
  if (getInitData()) {
    window.__AUTH_MODE__ = 'telegram';
    window.__IS_TELEGRAM_WEBAPP__ = true;
    console.log('[Router] Corrected auth mode to Telegram from localStorage initData');
    return false;
  }
  
  return true;
}

// Navigation guard for app initialization
router.beforeEach(async (to, from, next) => {
  console.log('[Router] Navigation started:', {
    from: from.name,
    to: to.name,
    path: to.path,
    authMode: typeof window !== 'undefined' ? window.__AUTH_MODE__ : 'unknown',
  });

  // Update page title
  const title = to.meta.title as string;
  if (title) {
    document.title = `${title} | WB Agent`;
  }

  // Skip initialization check for public routes
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

  // Browser mode authentication check
  if (isBrowserMode()) {
    const { useBrowserAuthStore } = await import('@/stores/auth');
    const browserAuth = useBrowserAuthStore();
    
    // Only init auth once per session - skip if already initialized and we have a valid auth
    // This prevents repeated API calls when switching between screens
    if (!isBrowserAuthInitialized || !browserAuth.isAuthenticated) {
      console.log('[Router] Initializing browser auth...');
      await browserAuth.initAuth();
      isBrowserAuthInitialized = true;
    } else {
      console.log('[Router] Browser auth already initialized, skipping re-fetch');
    }
    
    // After initAuth, check if authenticated
    if (!browserAuth.isAuthenticated) {
      console.log('[Router] Browser auth required, redirecting to login');
      next({ 
        name: 'Login', 
        query: { redirect: to.fullPath },
        replace: true 
      });
      return;
    }
    
    // Permission check
    const { canAccessRoute } = usePermissions();
    if (!canAccessRoute(to.name as string)) {
      console.log('[Router] Permission denied for route:', to.name);
      next({ name: 'Chat', replace: true });
      return;
    }
    
    // Browser user is authenticated, proceed
    console.log('[Router] Browser auth validated, proceeding to:', to.name);
    next();
    return;
  }

  // Telegram mode - original initialization logic
  if (!isAppInitialized) {
    console.log('[Router] App not initialized, starting initialization...');
    try {
      await initializeApp();
      isAppInitialized = true;
      console.log('[Router] App initialized, proceeding to:', to.name);
    } catch (error: any) {
      console.error('[Router] Initialization failed:', error);
      initError = classifyError(error);
      next({ name: errorToRouteName(initError), replace: true });
      return;
    }
  }

  // Permission check (applies to both Telegram and Browser modes)
  const { canAccessRoute } = usePermissions();
  if (!canAccessRoute(to.name as string)) {
    console.log('[Router] Permission denied for route:', to.name);
    next({ name: 'Chat', replace: true });
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
  isBrowserAuthInitialized = false;
}

// Check if app is initialized
export function getAppState() {
  return { isAppInitialized, initError };
}

export default router;

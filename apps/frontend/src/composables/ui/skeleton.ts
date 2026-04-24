import { ref, computed, readonly } from 'vue';

// Global state - shared across all components
const routerInitializing = ref(true);
const viewIsLoading = ref(true);
const isNavigating = ref(false);
const pendingRouteName = ref<string | null>(null);

// Computed state
const showSkeletonState = computed(
  () => routerInitializing.value || viewIsLoading.value || isNavigating.value,
);

// Map paths to route names (used when router is not ready yet)
const pathToRouteNameMap = [
  { pattern: /^\/$/, routeName: 'Home' },
  { pattern: /^\/account(\/|$)/, routeName: 'Account' },
  { pattern: /^\/tasks(\/|$)/, routeName: 'Tasks' },
  { pattern: /^\/wb(\/|$)/, routeName: 'WB' },
  { pattern: /^\/autobooking(\/|$)/, routeName: 'Autobooking' },
  { pattern: /^\/reschedules(\/|$)/, routeName: 'Reschedules' },
  { pattern: /^\/triggers(\/|$)/, routeName: 'Triggers' },
  { pattern: /^\/promotions(\/|$)/, routeName: 'Promotions' },
  { pattern: /^\/reports(\/|$)/, routeName: 'Reports' },
  { pattern: /^\/store(\/|$)/, routeName: 'Store' },
  { pattern: /^\/payments(\/|$)/, routeName: 'Payments' },
  { pattern: /^\/tariffs(\/|$)/, routeName: 'Tariffs' },
  { pattern: /^\/mpstats(\/|$)/, routeName: 'MPStats' },
  { pattern: /^\/chat(\/|$)/, routeName: 'Chat' },
];

/**
 * Get route name by current URL path (works immediately without router)
 * Used to detect the correct skeleton before Vue Router is ready
 */
function getRouteNameByPath(path: string): string {
  for (const { pattern, routeName } of pathToRouteNameMap) {
    if (pattern.test(path)) {
      return routeName;
    }
  }
  return 'Home';
}

/**
 * Get the effective route name for skeleton selection.
 * Uses the provided route name if available, otherwise falls back to path-based detection.
 */
function getEffectiveRouteName(routeName: string | undefined | null): string {
  if (routeName) {
    return routeName;
  }
  // Fallback to path-based detection when route name is not available
  return getRouteNameByPath(window.location.pathname);
}

/**
 * Composable for managing skeleton loading state
 *
 * Used in App.vue to control when skeleton is shown/hidden
 * Used in view components to signal when they're ready
 */
export function useSkeleton() {
  /**
   * Mark router initialization as complete - called by App.vue
   */
  function markRouterReady() {
    routerInitializing.value = false;
  }

  /**
   * Reset router initialization state - useful for testing
   */
  function resetRouterState() {
    routerInitializing.value = true;
    viewIsLoading.value = true;
    isNavigating.value = false;
  }

  /**
   * Called when navigation starts - shows skeleton during route change
   * @param targetRouteName The route being navigated to (for correct skeleton selection)
   */
  function onNavigationStart(targetRouteName?: string) {
    // Only show skeleton for navigation after initial load
    if (!routerInitializing.value) {
      isNavigating.value = true;
      viewIsLoading.value = true;
      if (targetRouteName) {
        pendingRouteName.value = targetRouteName;
      }
    }
  }

  /**
   * Called when navigation completes
   */
  function onNavigationEnd() {
    isNavigating.value = false;
    pendingRouteName.value = null;
  }

  return {
    // State (readonly)
    showSkeleton: readonly(showSkeletonState),
    isRouterInitializing: readonly(routerInitializing),
    isViewLoading: readonly(viewIsLoading),
    isNavigating: readonly(isNavigating),
    pendingRouteName: readonly(pendingRouteName),

    // Actions
    markRouterReady,
    resetRouterState,
    onNavigationStart,
    onNavigationEnd,
    getEffectiveRouteName,
  };
}

/**
 * Actions for view components to control skeleton visibility
 * These directly modify the shared state
 */
const viewReady = () => {
  viewIsLoading.value = false;
};

const showViewLoading = () => {
  viewIsLoading.value = true;
};

/**
 * Composable for view components to signal loading state
 * Simple API that just provides hide/show functions
 */
export function useViewReady() {
  return {
    /**
     * Call when view is fully loaded and ready to be shown
     */
    viewReady,
    /**
     * Call to show skeleton again (e.g., during refresh)
     */
    viewLoading: showViewLoading,
  };
}

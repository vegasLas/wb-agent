import { ref, computed, readonly } from 'vue';

// Global state - shared across all components
const routerInitializing = ref(true);
const viewIsLoading = ref(true);
const isNavigating = ref(false);

// Computed state
const showSkeletonState = computed(
  () => routerInitializing.value || viewIsLoading.value || isNavigating.value,
);

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
   */
  function onNavigationStart() {
    // Only show skeleton for navigation after initial load
    if (!routerInitializing.value) {
      isNavigating.value = true;
      viewIsLoading.value = true;
    }
  }

  /**
   * Called when navigation completes
   */
  function onNavigationEnd() {
    isNavigating.value = false;
  }

  return {
    // State (readonly)
    showSkeleton: readonly(showSkeletonState),
    isRouterInitializing: readonly(routerInitializing),
    isViewLoading: readonly(viewIsLoading),
    isNavigating: readonly(isNavigating),

    // Actions
    markRouterReady,
    resetRouterState,
    onNavigationStart,
    onNavigationEnd,
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

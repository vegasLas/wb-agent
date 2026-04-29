import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { useRouter, useRoute } from 'vue-router';
import type { ViewType } from '@/types';

/**
 * @deprecated This store is deprecated and will be removed in a future version.
 * Please use Vue Router directly instead:
 *
 * import { useRouter, useRoute } from 'vue-router';
 * const router = useRouter();
 * const route = useRoute();
 *
 * Navigation:
 * - router.push({ name: 'Autobooking' }) - for autobooking list
 * - router.push({ name: 'Triggers' }) - for triggers list
 * - router.push({ name: 'Reschedules' }) - for reschedules list
 * - router.push({ name: 'ReschedulesCreate' }) - for creating reschedule
 * - router.push({ name: 'ReschedulesUpdate', params: { id } }) - for updating reschedule
 * - router.push({ name: 'Account' }) - for account
 *
 * Going back:
 * - router.back()
 */
export const useViewStore = defineStore('view', () => {
  // Get router and route instances
  // Note: This will only work properly when called within component setup
  let router: ReturnType<typeof useRouter> | undefined;
  let route: ReturnType<typeof useRoute> | undefined;

  try {
    router = useRouter();
    route = useRoute();
  } catch (e) {
    // Router not available (e.g., during SSR or outside component context)
  }

  // Map current route to view type for backwards compatibility
  const currentView = computed<ViewType>(() => {
    if (!route?.name) return 'autobookings-main';

    const routeName = route.name as string;

    // Map route names to view types
    if (routeName === 'Autobooking' || routeName === 'AutobookingList')
      return 'autobookings-main';
    if (routeName === 'Triggers' || routeName === 'TriggersList')
      return 'triggers-main';
    // if (routeName === 'Reschedules' || routeName === 'ReschedulesList')
    //   return 'reschedules-main';
    // if (routeName === 'ReschedulesCreate') return 'reschedules-form';
    // if (routeName === 'ReschedulesUpdate') return 'reschedules-update';
    if (routeName === 'Account') return 'account';
    if (routeName === 'Reports') return 'report';
    if (routeName === 'Promotions') return 'promotions';

    return 'autobookings-main';
  });

  // Previous view is no longer tracked with router-based navigation
  const prevView = ref<ViewType | null>(null);
  const isPrevView = computed(() => false);

  /**
   * @deprecated Use router.push() instead
   */
  function setView(view: ViewType) {
    console.warn(
      'useViewStore.setView() is deprecated. Use router.push() instead.',
    );

    if (!router) {
      console.error('Router not available');
      return;
    }

    // Map view type to route
    const routeMap: Record<string, string> = {
      'autobookings-main': 'Autobooking',
      'triggers-main': 'Triggers',
      // 'reschedules-main': 'Reschedules',
      // 'reschedules-form': 'ReschedulesCreate',
      // 'reschedules-update': 'ReschedulesUpdate',
      account: 'Account',
      report: 'Reports',
      promotions: 'Promotions',
    };

    const targetRoute = routeMap[view];
    if (targetRoute) {
      router.push({ name: targetRoute });
    }
  }

  /**
   * @deprecated Use router.back() instead
   */
  function goBack() {
    console.warn(
      'useViewStore.goBack() is deprecated. Use router.back() instead.',
    );
    router?.back();
  }

  /**
   * @deprecated No longer needed with router-based navigation
   */
  function clearPrevView() {
    console.warn(
      'useViewStore.clearPrevView() is deprecated and no longer needed.',
    );
    prevView.value = null;
  }

  /**
   * Check if current view is a form (based on route name)
   */
  const isForm = computed(() => {
    const formRoutes = [
      // 'ReschedulesCreate',
      // 'ReschedulesUpdate',
    ];
    return route ? formRoutes.includes(route.name as string) : false;
  });

  /**
   * Get main view based on current route
   */
  const mainView = computed(() => {
    const routeName = route?.name as string;
    if (routeName?.startsWith('Autobooking')) return 'autobookings';
    if (routeName?.startsWith('Trigger')) return 'triggers';
    // if (routeName?.startsWith('Reschedule')) return 'reschedules';
    if (routeName === 'Account') return 'account';
    if (routeName === 'Reports') return 'report';
    if (routeName === 'Promotions') return 'promotions';
    return 'autobookings';
  });

  return {
    setView,
    goBack,
    clearPrevView,
    currentView,
    isForm,
    mainView,
    isPrevView,
  };
});

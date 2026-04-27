import { computed } from 'vue';
import { useUserStore } from '@/stores/user/store';
import type { Permission } from '@/types';

const PERMISSION_ROUTE_MAP: Record<string, Permission[]> = {
  Promotions: ['PROMOTIONS'],
  Feedbacks: ['FEEDBACKS'],
  Reports: ['REPORTS'],
  Adverts: ['ADVERTS'],
  RegionSales: ['REPORTS'],
  Tariffs: ['SUPPLIES'],
  AutobookingList: ['SUPPLIES'],
  ReschedulesList: ['SUPPLIES'],
  TriggersList: [],
  Chat: [],
  MPStats: [],
  Payments: [],
  Store: [],
  Account: [],
};

export function usePermissions() {
  const userStore = useUserStore();

  const selectedSupplierPermissions = computed((): Permission[] => {
    return userStore.activeSupplier?.permissions || [];
  });

  function hasPermission(permission: Permission): boolean {
    return selectedSupplierPermissions.value.includes(permission);
  }

  function hasAnyPermission(permissions: Permission[]): boolean {
    if (permissions.length === 0) return true;
    return permissions.some((p) =>
      selectedSupplierPermissions.value.includes(p),
    );
  }

  function canAccessRoute(routeName: string): boolean {
    const required = PERMISSION_ROUTE_MAP[routeName];
    if (!required) return true;
    return hasAnyPermission(required);
  }

  return {
    selectedSupplierPermissions,
    hasPermission,
    hasAnyPermission,
    canAccessRoute,
  };
}

import { computed, type Ref } from 'vue';
import { useRoute } from 'vue-router';
import type { Permission } from '@/types';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  permissions?: Permission[];
}

export const primaryNav: NavItem[] = [
  { id: 'chat', label: 'AI Ассистент', icon: 'pi pi-comments', route: 'Chat' },
  {
    id: 'autobooking',
    label: 'Автоброни',
    icon: 'pi pi-calendar',
    route: 'AutobookingList',
    permissions: ['SUPPLIES'],
  },
  {
    id: 'triggers',
    label: 'Таймслоты',
    icon: 'pi pi-clock',
    route: 'TriggersList',
  },
  {
    id: 'promotions',
    label: 'Акции',
    icon: 'pi pi-tags',
    route: 'Promotions',
    permissions: ['PROMOTIONS'],
  },
  {
    id: 'feedbacks',
    label: 'Отзывы',
    icon: 'pi pi-star',
    route: 'Feedbacks',
    permissions: ['FEEDBACKS'],
  },
  {
    id: 'reports',
    label: 'Отчеты',
    icon: 'pi pi-chart-pie',
    route: 'Reports',
    permissions: ['REPORTS'],
  },
  {
    id: 'adverts',
    label: 'Реклама',
    icon: 'pi pi-megaphone',
    route: 'Adverts',
    permissions: ['ADVERTS'],
  },
  {
    id: 'regionSales',
    label: 'Продажи по регионам',
    icon: 'pi pi-map',
    route: 'RegionSales',
    permissions: ['REPORTS'],
  },
  // {
  //   id: 'reschedules',
  //   label: 'Перепланирования',
  //   icon: 'pi pi-calendar-clock',
  //   route: 'ReschedulesList',
  //   permissions: ['SUPPLIES'],
  // },
  {
    id: 'tariffs',
    label: 'Тарифы',
    icon: 'pi pi-percentage',
    route: 'Tariffs',
    permissions: ['SUPPLIES'],
  },
  {
    id: 'mpstats',
    label: 'MPStats',
    icon: 'pi pi-chart-bar',
    route: 'MPStats',
  },
];

export const secondaryNav: NavItem[] = [
  {
    id: 'payments',
    label: 'Магазин',
    icon: 'pi pi-shopping-cart',
    route: 'Payments',
  },
];

export function useNavigation(pendingRouteName?: Ref<string | null>) {
  const route = useRoute();

  function isActive(item: { id: string; route: string }): boolean {
    // During navigation, check pending route first for immediate feedback
    const pending = pendingRouteName?.value;
    if (pending) {
      if (pending === item.route) return true;
      if (pending.startsWith(item.id)) return true;
    }

    const routeName = route.name?.toString() ?? '';
    const routePath = route.path;

    if (routeName.startsWith(item.id)) {
      return true;
    }

    if (routePath.startsWith(`/${item.id.toLowerCase()}`)) {
      return true;
    }

    return false;
  }

  return {
    primaryNav,
    secondaryNav,
    isActive,
    route,
  };
}

import { computed } from 'vue';
import { useRoute } from 'vue-router';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  route: string;
}

export const primaryNav: NavItem[] = [
  { id: 'chat', label: 'AI Чат', icon: 'pi pi-comments', route: 'Chat' },
  {
    id: 'autobooking',
    label: 'Автоброни',
    icon: 'pi pi-calendar',
    route: 'AutobookingList',
  },
  {
    id: 'triggers',
    label: 'Таймслоты',
    icon: 'pi pi-clock',
    route: 'TriggersList',
  },
  { id: 'promotions', label: 'Акции', icon: 'pi pi-tags', route: 'Promotions' },
  { id: 'feedbacks', label: 'Отзывы', icon: 'pi pi-star', route: 'Feedbacks' },
  { id: 'reports', label: 'Отчеты', icon: 'pi pi-chart-pie', route: 'Reports' },
  {
    id: 'adverts',
    label: 'Реклама',
    icon: 'pi pi-megaphone',
    route: 'Adverts',
  },
  {
    id: 'regionSales',
    label: 'Продажи по регионам',
    icon: 'pi pi-map',
    route: 'RegionSales',
  },
  {
    id: 'reschedules',
    label: 'Перепланирования',
    icon: 'pi pi-calendar-clock',
    route: 'ReschedulesList',
  },
  {
    id: 'tariffs',
    label: 'Тарифы',
    icon: 'pi pi-percentage',
    route: 'Tariffs',
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

export function useNavigation() {
  const route = useRoute();

  function isActive(item: { id: string; route: string }): boolean {
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

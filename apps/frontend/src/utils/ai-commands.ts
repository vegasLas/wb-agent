import { computed } from 'vue';
import { useLocalStorage } from '@vueuse/core';
import type { Permission } from '@/types';

export interface AICommand {
  id: string;
  label: string;
  icon: string;
  prompt: string;
  permissions?: Permission[];
}

export const AI_COMMANDS: AICommand[] = [
  // SUPPLIES
  {
    id: 'balances',
    label: 'Остатки на складах',
    icon: 'pi pi-warehouse',
    prompt: 'Покажи остатки товаров на складах',
    permissions: ['SUPPLIES'],
  },
  {
    id: 'supplies',
    label: 'Поставки',
    icon: 'pi pi-truck',
    prompt: 'Покажи мои поставки',
    permissions: ['SUPPLIES'],
  },
  {
    id: 'supply-details',
    label: 'Детали поставки',
    icon: 'pi pi-file-o',
    prompt: 'Покажи детали поставки',
    permissions: ['SUPPLIES'],
  },
  {
    id: 'draft-goods',
    label: 'Товары черновика',
    icon: 'pi pi-box',
    prompt: 'Покажи товары в черновике',
    permissions: ['SUPPLIES'],
  },
  {
    id: 'validate-warehouse',
    label: 'Проверить совместимость',
    icon: 'pi pi-check-square',
    prompt: 'Проверь, можно ли отправить товары черновика на склад',
    permissions: ['SUPPLIES'],
  },
  {
    id: 'warehouses-list',
    label: 'Список складов',
    icon: 'pi pi-warehouse',
    prompt: 'Покажи все доступные склады',
  },
  {
    id: 'search-warehouse',
    label: 'Найти склад',
    icon: 'pi pi-search',
    prompt: 'Найди склад по запросу: [город/название]',
  },
  {
    id: 'coefficients',
    label: 'Коэффициенты приёмки',
    icon: 'pi pi-percentage',
    prompt: 'Покажи текущие коэффициенты приёмки',
    permissions: ['SUPPLIES'],
  },
  {
    id: 'planned-coefficients',
    label: 'Плановые коэффициенты',
    icon: 'pi pi-percentage',
    prompt: 'Покажи плановые коэффициенты на ближайшие дни',
    permissions: ['SUPPLIES'],
  },
  {
    id: 'transit-tariffs',
    label: 'Тарифы транзитных складов',
    icon: 'pi pi-arrow-right-arrow-left',
    prompt: 'Покажи транзитные склады и тарифы для склада',
    permissions: ['SUPPLIES'],
  },
  {
    id: 'autobookings-list',
    label: 'Мои автобронирования',
    icon: 'pi pi-list',
    prompt: 'Покажи мои автобронирования',
    permissions: ['SUPPLIES'],
  },
  {
    id: 'autobooking-create',
    label: 'Создать автобронь',
    icon: 'pi pi-calendar-plus',
    prompt: 'Создай автобронирование на склад',
    permissions: ['SUPPLIES'],
  },
  {
    id: 'autobooking-update',
    label: 'Обновить автобронь',
    icon: 'pi pi-pencil',
    prompt: 'Обнови автобронирование',
    permissions: ['SUPPLIES'],
  },
  {
    id: 'autobooking-delete',
    label: 'Удалить автобронь',
    icon: 'pi pi-trash',
    prompt: 'Удали автобронирование',
    permissions: ['SUPPLIES'],
  },
  {
    id: 'triggers-list',
    label: 'Мои таймслоты',
    icon: 'pi pi-clock',
    prompt: 'Покажи мои таймслоты',
    permissions: ['SUPPLIES'],
  },
  {
    id: 'trigger-create',
    label: 'Создать таймслот',
    icon: 'pi pi-plus-circle',
    prompt: 'Создай таймслот на склад',
    permissions: ['SUPPLIES'],
  },
  {
    id: 'trigger-update',
    label: 'Обновить таймслот',
    icon: 'pi pi-pencil',
    prompt: 'Обнови таймслот',
    permissions: ['SUPPLIES'],
  },
  {
    id: 'trigger-delete',
    label: 'Удалить таймслот',
    icon: 'pi pi-trash',
    prompt: 'Удали таймслот',
    permissions: ['SUPPLIES'],
  },

  // REPORTS
  {
    id: 'sales-report',
    label: 'Отчёт по продажам',
    icon: 'pi pi-chart-line',
    prompt: 'Покажи отчёт по продажам',
    permissions: ['REPORTS'],
  },
  {
    id: 'region-sales',
    label: 'Продажи по регионам',
    icon: 'pi pi-map',
    prompt: 'Покажи продажи по регионам',
    permissions: ['REPORTS'],
  },
  {
    id: 'sales-analysis',
    label: 'Анализ продаж',
    icon: 'pi pi-chart-line',
    prompt: 'Проанализируй мои продажи за последнюю неделю',
    permissions: ['REPORTS'],
  },

  // ADVERTS
  {
    id: 'adverts-list',
    label: 'Рекламные кампании',
    icon: 'pi pi-bullseye',
    prompt: 'Покажи мои рекламные кампании',
    permissions: ['ADVERTS'],
  },
  {
    id: 'advert-keywords',
    label: 'Ключевые слова рекламы',
    icon: 'pi pi-info-circle',
    prompt: 'Покажи статистику по ключевым словам кампании',
    permissions: ['ADVERTS'],
  },
  {
    id: 'advert-efficiency',
    label: 'Эффективность рекламы',
    icon: 'pi pi-bullseye',
    prompt: 'Какая реклама приносит больше всего продаж?',
    permissions: ['ADVERTS'],
  },
  {
    id: 'advert-fullstat',
    label: 'Полная статистика рекламы',
    icon: 'pi pi-chart-bar',
    prompt: 'Покажи полную статистику по рекламной кампании',
    permissions: ['ADVERTS'],
  },

  // MPStats (no permission required, gated by token)
  {
    id: 'mpstats-sku',
    label: 'Аналитика артикула (MPStats)',
    icon: 'pi pi-chart-bar',
    prompt: 'Покажи MPStats аналитику артикула [nmId]',
  },
  {
    id: 'mpstats-saved',
    label: 'Сохранённые артикулы (MPStats)',
    icon: 'pi pi-bookmark',
    prompt: 'Покажи мои сохранённые артикулы в MPStats',
  },
  {
    id: 'mpstats-add',
    label: 'Добавить артикул (MPStats)',
    icon: 'pi pi-plus',
    prompt: 'Добавь артикул [nmId] в MPStats аналитику',
  },
  {
    id: 'mpstats-compare',
    label: 'Сравнить артикулы (MPStats)',
    icon: 'pi pi-chart-bar',
    prompt: 'Сравни артикулы в MPStats: [nmId1], [nmId2]',
  },
  {
    id: 'mpstats-favorites-list',
    label: 'Мои избранные артикулы',
    icon: 'pi pi-heart',
    prompt: 'Покажи мои избранные артикулы MPStats',
  },
  {
    id: 'mpstats-favorites-analytics',
    label: 'Аналитика избранного',
    icon: 'pi pi-chart-bar',
    prompt: 'Покажи балансы и продажи моих избранных артикулов MPStats',
  },
  {
    id: 'mpstats-compare-with-favorites',
    label: 'Сравнить с избранным',
    icon: 'pi pi-chart-bar',
    prompt: 'Сравни мой товар с избранными артикулами MPStats',
  },
  {
    id: 'mpstats-by-url',
    label: 'Аналитика по ссылке WB',
    icon: 'pi pi-link',
    prompt: 'Покажи MPStats аналитику по ссылке [URL WB]',
  },

  // PROMOTIONS
  {
    id: 'promotions-list',
    label: 'Список акций',
    icon: 'pi pi-calendar',
    prompt: 'Покажи акции и промо',
    permissions: ['PROMOTIONS'],
  },
  {
    id: 'promotion-detail',
    label: 'Детали акции',
    icon: 'pi pi-info-circle',
    prompt: 'Покажи детали акции',
    permissions: ['PROMOTIONS'],
  },
  {
    id: 'promotion-goods',
    label: 'Товары акции',
    icon: 'pi pi-box',
    prompt: 'Покажи товары акции',
    permissions: ['PROMOTIONS'],
  },
  {
    id: 'promotion-manage',
    label: 'Управлять участием в акции',
    icon: 'pi pi-pencil',
    prompt: 'Добавь/убери товары из акции',
    permissions: ['PROMOTIONS'],
  },

  // Content cards (SUPPLIES — includes tariffs)
  {
    id: 'content-cards',
    label: 'Карточки товаров',
    icon: 'pi pi-shopping-bag',
    prompt: 'Покажи мои карточки товаров',
    permissions: ['SUPPLIES'],
  },
  {
    id: 'content-card-detail',
    label: 'Детали карточки',
    icon: 'pi pi-info-circle',
    prompt: 'Покажи детали карточки [nmID]',
    permissions: ['SUPPLIES'],
  },
  {
    id: 'content-card-tariffs',
    label: 'Тарифы по размерам',
    icon: 'pi pi-percentage',
    prompt:
      'Покажи тарифы складов для товара с параметрами [высота/длина/вес/ширина]',
    permissions: ['SUPPLIES'],
  },
  {
    id: 'content-card-categories',
    label: 'Категории и комиссии',
    icon: 'pi pi-tag',
    prompt: 'Покажи комиссии категории [название]',
    permissions: ['SUPPLIES'],
  },
];

const FAVORITES_STORAGE_KEY = 'ai-chat-command-favorites';

export function useCommandFavorites() {
  const favorites = useLocalStorage<string[]>(FAVORITES_STORAGE_KEY, []);

  function toggleFavorite(commandId: string) {
    const set = new Set(favorites.value);
    if (set.has(commandId)) {
      set.delete(commandId);
    } else {
      set.add(commandId);
    }
    favorites.value = Array.from(set);
  }

  function isFavorite(commandId: string): boolean {
    return favorites.value.includes(commandId);
  }

  const sortedCommands = computed(() => {
    const favSet = new Set(favorites.value);
    const favs: AICommand[] = [];
    const others: AICommand[] = [];

    for (const cmd of AI_COMMANDS) {
      if (favSet.has(cmd.id)) {
        favs.push(cmd);
      } else {
        others.push(cmd);
      }
    }

    return [...favs, ...others];
  });

  return {
    favorites,
    toggleFavorite,
    isFavorite,
    sortedCommands,
  };
}

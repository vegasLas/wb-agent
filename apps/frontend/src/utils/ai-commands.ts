import { computed } from 'vue';
import { useLocalStorage } from '@vueuse/core';

export interface AICommand {
  id: string;
  label: string;
  icon: string;
  prompt: string;
}

export const AI_COMMANDS: AICommand[] = [
  { id: 'balances', label: 'Остатки на складах', icon: 'pi pi-warehouse', prompt: 'Покажи остатки товаров на складах' },
  { id: 'supplies', label: 'Поставки', icon: 'pi pi-truck', prompt: 'Покажи мои поставки' },
  { id: 'supply-details', label: 'Детали поставки', icon: 'pi pi-file-o', prompt: 'Покажи детали поставки [ID]' },
  { id: 'draft-goods', label: 'Товары черновика', icon: 'pi pi-box', prompt: 'Покажи товары в черновике' },
  { id: 'validate-warehouse', label: 'Проверить совместимость', icon: 'pi pi-check-square', prompt: 'Проверь, можно ли отправить товары черновика на склад [ID]' },
  { id: 'warehouses-list', label: 'Список складов', icon: 'pi pi-warehouse', prompt: 'Покажи все доступные склады' },
  { id: 'search-warehouse', label: 'Найти склад', icon: 'pi pi-search', prompt: 'Найди склад по запросу: [город/название]' },
  { id: 'coefficients', label: 'Коэффициенты приёмки', icon: 'pi pi-percentage', prompt: 'Покажи текущие коэффициенты приёмки' },
  { id: 'planned-coefficients', label: 'Плановые коэффициенты', icon: 'pi pi-percentage', prompt: 'Покажи плановые коэффициенты на ближайшие дни' },
  { id: 'transit-tariffs', label: 'Тарифы транзитных складов', icon: 'pi pi-arrow-right-arrow-left', prompt: 'Покажи транзитные склады и тарифы для склада [ID]' },
  { id: 'autobookings-list', label: 'Мои автобронирования', icon: 'pi pi-list', prompt: 'Покажи мои автобронирования' },
  { id: 'autobooking-create', label: 'Создать автобронь', icon: 'pi pi-calendar-plus', prompt: 'Создай автобронирование на склад [ID]' },
  { id: 'autobooking-update', label: 'Обновить автобронь', icon: 'pi pi-pencil', prompt: 'Обнови автобронирование [ID]' },
  { id: 'autobooking-delete', label: 'Удалить автобронь', icon: 'pi pi-trash', prompt: 'Удали автобронирование [ID]' },
  { id: 'triggers-list', label: 'Мои таймслоты', icon: 'pi pi-clock', prompt: 'Покажи мои таймслоты' },
  { id: 'trigger-create', label: 'Создать таймслот', icon: 'pi pi-plus-circle', prompt: 'Создай таймслот на склад [ID]' },
  { id: 'trigger-update', label: 'Обновить таймслот', icon: 'pi pi-pencil', prompt: 'Обнови таймслот [ID]' },
  { id: 'trigger-delete', label: 'Удалить таймслот', icon: 'pi pi-trash', prompt: 'Удали таймслот [ID]' },
  { id: 'sales-report', label: 'Отчёт по продажам', icon: 'pi pi-chart-line', prompt: 'Покажи отчёт по продажам' },
  { id: 'region-sales', label: 'Продажи по регионам', icon: 'pi pi-map', prompt: 'Покажи продажи по регионам' },
  { id: 'sales-analysis', label: 'Анализ продаж', icon: 'pi pi-chart-line', prompt: 'Проанализируй мои продажи за последнюю неделю' },
  { id: 'adverts-list', label: 'Рекламные кампании', icon: 'pi pi-bullseye', prompt: 'Покажи мои рекламные кампании' },
  { id: 'advert-keywords', label: 'Ключевые слова рекламы', icon: 'pi pi-info-circle', prompt: 'Покажи статистику по ключевым словам кампании [ID]' },
  { id: 'advert-efficiency', label: 'Эффективность рекламы', icon: 'pi pi-bullseye', prompt: 'Какая реклама приносит больше всего продаж?' },
  { id: 'mpstats-sku', label: 'Аналитика артикула (MPStats)', icon: 'pi pi-chart-bar', prompt: 'Покажи MPStats аналитику артикула [nmId]' },
  { id: 'mpstats-saved', label: 'Сохранённые артикулы (MPStats)', icon: 'pi pi-bookmark', prompt: 'Покажи мои сохранённые артикулы в MPStats' },
  { id: 'mpstats-add', label: 'Добавить артикул (MPStats)', icon: 'pi pi-plus', prompt: 'Добавь артикул [nmId] в MPStats аналитику' },
  { id: 'mpstats-compare', label: 'Сравнить артикулы (MPStats)', icon: 'pi pi-chart-bar', prompt: 'Сравни артикулы в MPStats: [nmId1], [nmId2]' },
  { id: 'promotions-list', label: 'Список акций', icon: 'pi pi-calendar', prompt: 'Покажи акции и промо' },
  { id: 'promotion-detail', label: 'Детали акции', icon: 'pi pi-info-circle', prompt: 'Покажи детали акции [ID]' },
  { id: 'promotion-goods', label: 'Товары акции', icon: 'pi pi-box', prompt: 'Покажи товары акции [ID]' },
  { id: 'promotion-manage', label: 'Управлять участием в акции', icon: 'pi pi-pencil', prompt: 'Добавь/убери товары из акции [ID]' },
  { id: 'content-cards', label: 'Карточки товаров', icon: 'pi pi-shopping-bag', prompt: 'Покажи мои карточки товаров' },
  { id: 'content-card-detail', label: 'Детали карточки', icon: 'pi pi-info-circle', prompt: 'Покажи детали карточки [nmID]' },
  { id: 'content-card-tariffs', label: 'Тарифы по размерам', icon: 'pi pi-percentage', prompt: 'Покажи тарифы складов для товара с параметрами [высота/длина/вес/ширина]' },
  { id: 'content-card-categories', label: 'Категории и комиссии', icon: 'pi pi-tag', prompt: 'Покажи комиссии категории [название]' },
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

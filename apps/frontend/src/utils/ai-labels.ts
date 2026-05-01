export const TOOL_LABELS: Record<string, { label: string; icon: string }> = {
  // Reports
  getSalesReport: {
    label: 'Получаем отчёт по продажам',
    icon: 'pi pi-chart-line',
  },
  getRegionSales: { label: 'Получаем продажи по регионам', icon: 'pi pi-map' },

  // Adverts
  getAdverts: { label: 'Получаем рекламные кампании', icon: 'pi pi-bullseye' },
  getAdvertPresetInfo: {
    label: 'Получаем ключевые слова рекламы',
    icon: 'pi pi-info-circle',
  },
  getAdvertFullStat: {
    label: 'Получаем полную статистику рекламы',
    icon: 'pi pi-chart-bar',
  },

  // Autobooking
  listAutobookings: {
    label: 'Получаем список автобронирований',
    icon: 'pi pi-list',
  },
  createAutobooking: {
    label: 'Создаём автобронирование',
    icon: 'pi pi-calendar-plus',
  },
  prepareAutobooking: {
    label: 'Готовим автобронирование',
    icon: 'pi pi-check-circle',
  },
  updateAutobooking: {
    label: 'Обновляем автобронирование',
    icon: 'pi pi-pencil',
  },
  deleteAutobooking: { label: 'Удаляем автобронирование', icon: 'pi pi-trash' },

  // Triggers (Time slots)
  listTriggers: { label: 'Получаем таймслоты', icon: 'pi pi-clock' },
  getTrigger: { label: 'Получаем информацию о таймслоте', icon: 'pi pi-eye' },
  createTrigger: { label: 'Создаём таймслот', icon: 'pi pi-plus-circle' },
  updateTrigger: { label: 'Обновляем таймслот', icon: 'pi pi-pencil' },
  deleteTrigger: { label: 'Удаляем таймслот', icon: 'pi pi-trash' },

  // Supplier
  listSupplierGoods: { label: 'Получаем товары черновика', icon: 'pi pi-box' },
  validateWarehouseGoods: {
    label: 'Проверяем совместимость товаров',
    icon: 'pi pi-check-square',
  },
  listSupplies: { label: 'Получаем список поставок', icon: 'pi pi-truck' },
  getSupplyDetails: { label: 'Получаем детали поставки', icon: 'pi pi-file-o' },
  getBalances: {
    label: 'Получаем остатки на складах',
    icon: 'pi pi-warehouse',
  },

  // Warehouses / External
  getAllWarehouses: {
    label: 'Получаем список складов',
    icon: 'pi pi-warehouse',
  },
  searchWarehouses: { label: 'Ищем склад', icon: 'pi pi-search' },
  getCoefficients: {
    label: 'Получаем коэффициенты приёмки',
    icon: 'pi pi-percentage',
  },
  getWarehouseTransitions: {
    label: 'Получаем тарифы транзитных складов',
    icon: 'pi pi-arrow-right-arrow-left',
  },
  getAcceptanceCoefficients: {
    label: 'Получаем плановые коэффициенты приёмки',
    icon: 'pi pi-percentage',
  },
  getWarehouseCacheStatus: {
    label: 'Проверяем диагностику складов',
    icon: 'pi pi-server',
  },

  // MPStats
  getSkuSummary: {
    label: 'Получаем аналитику артикула',
    icon: 'pi pi-chart-bar',
  },
  listSavedSkus: {
    label: 'Получаем сохранённые артикулы',
    icon: 'pi pi-bookmark',
  },
  addSku: {
    label: 'Добавляем артикул в аналитику',
    icon: 'pi pi-plus',
  },
  compareSkus: {
    label: 'Сравниваем артикулы',
    icon: 'pi pi-chart-bar',
  },

  // User Context
  getUserContext: {
    label: 'Получаем данные пользователя',
    icon: 'pi pi-user',
  },

  // Promotions
  listPromotions: {
    label: 'Получаем список акций',
    icon: 'pi pi-calendar',
  },
  getPromotionDetail: {
    label: 'Получаем детали акции',
    icon: 'pi pi-info-circle',
  },
  getPromotionGoods: {
    label: 'Получаем товары акции',
    icon: 'pi pi-box',
  },
  managePromotionGoods: {
    label: 'Изменяем участие товаров в акции',
    icon: 'pi pi-pencil',
  },

  // Content Cards
  getContentCardsTableList: {
    label: 'Получаем карточки товаров',
    icon: 'pi pi-shopping-bag',
  },
  getContentCardImt: {
    label: 'Получаем детали карточки',
    icon: 'pi pi-info-circle',
  },
  getContentCardTariffs: {
    label: 'Получаем тарифы складов',
    icon: 'pi pi-percentage',
  },
  getContentCardCategories: {
    label: 'Получаем комиссии категорий',
    icon: 'pi pi-tag',
  },
};

export function getToolLabel(toolName: string): {
  label: string;
  icon: string;
} {
  return TOOL_LABELS[toolName] || { label: toolName, icon: 'pi pi-cog' };
}

export function normalizeToolName(toolName?: string): string {
  if (!toolName) return '';
  if (toolName.startsWith('tool-')) return toolName.slice(5);
  return toolName;
}

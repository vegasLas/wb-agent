export const TOOL_LABELS: Record<string, { label: string; icon: string }> = {
  // Reports
  getSalesReport: { label: 'Анализ продаж', icon: 'pi pi-chart-line' },
  getRegionSales: { label: 'Продажи по регионам', icon: 'pi pi-map' },

  // Adverts
  getAdverts: { label: 'Рекламные кампании', icon: 'pi pi-bullseye' },
  getAdvertPresetInfo: { label: 'Ключевые слова рекламы', icon: 'pi pi-info-circle' },

  // Autobooking
  listAutobookings: { label: 'Автобронирования', icon: 'pi pi-list' },
  createAutobooking: { label: 'Создание автоброни', icon: 'pi pi-calendar-plus' },
  updateAutobooking: { label: 'Обновление автоброни', icon: 'pi pi-pencil' },
  deleteAutobooking: { label: 'Удаление автоброни', icon: 'pi pi-trash' },

  // Triggers (Time slots)
  listTriggers: { label: 'Таймслоты', icon: 'pi pi-clock' },
  getTrigger: { label: 'Информация о таймслоте', icon: 'pi pi-eye' },
  createTrigger: { label: 'Создание таймслота', icon: 'pi pi-plus-circle' },
  updateTrigger: { label: 'Обновление таймслота', icon: 'pi pi-pencil' },
  deleteTrigger: { label: 'Удаление таймслота', icon: 'pi pi-trash' },

  // Supplier
  listSupplierGoods: { label: 'Товары поставщика', icon: 'pi pi-box' },
  validateWarehouseGoods: { label: 'Проверка совместимости товаров', icon: 'pi pi-check-square' },
  listSupplies: { label: 'Поставки', icon: 'pi pi-truck' },
  getSupplyDetails: { label: 'Детали поставки', icon: 'pi pi-file-o' },
  getBalances: { label: 'Остатки на складах', icon: 'pi pi-warehouse' },

  // Warehouses / External
  getAllWarehouses: { label: 'Список складов', icon: 'pi pi-warehouse' },
  getCoefficients: { label: 'Коэффициенты приемки', icon: 'pi pi-percentage' },
  getWarehouseTransitions: { label: 'Тарифы транзитных складов', icon: 'pi pi-arrow-right-arrow-left' },
  getAcceptanceCoefficients: { label: 'Плановые коэффициенты приемки', icon: 'pi pi-percentage' },
  getWarehouseCacheStatus: { label: 'Диагностика складов', icon: 'pi pi-server' },

  // MPStats
  getSkuSummary: { label: 'Аналитика артикула', icon: 'pi pi-chart-bar' },
};

export function getToolLabel(toolName: string): { label: string; icon: string } {
  return TOOL_LABELS[toolName] || { label: toolName, icon: 'pi pi-cog' };
}

export function normalizeToolName(toolName?: string): string {
  if (!toolName) return '';
  if (toolName.startsWith('tool-')) return toolName.slice(5);
  return toolName;
}

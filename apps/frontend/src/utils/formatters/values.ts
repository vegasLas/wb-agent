// =============================================================================
// Value and Text Formatters
// =============================================================================

/**
 * Get supply type text in Russian
 */
export function getSupplyTypeText(supplyType: string): string {
  const typeMap: Record<string, string> = {
    BOX: 'Короба',
    MONOPALLETE: 'Монопаллета',
    SUPERSAFE: 'Суперсейф',
  };
  return typeMap[supplyType] || supplyType;
}

/**
 * Get date type text in Russian
 */
export function getDateTypeText(dateType: string): string {
  const typeMap: Record<string, string> = {
    WEEK: 'Неделя',
    MONTH: 'Месяц',
    CUSTOM_PERIOD: 'Свой период',
    CUSTOM_DATES: 'Выбранные даты',
    CUSTOM_DATES_SINGLE: 'Выбранные даты (одна)',
  };
  return typeMap[dateType] || dateType;
}

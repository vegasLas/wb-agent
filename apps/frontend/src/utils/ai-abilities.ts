export interface AIAbility {
  label: string;
  icon: string;
  prompt: string;
  description: string;
}

export const AI_ABILITIES: AIAbility[] = [
  {
    label: 'Куда отправить товары',
    icon: 'pi pi-warehouse',
    prompt: 'В какой склад лучше отправить товары?',
    description: 'Анализирует коэффициенты и подскажет оптимальный склад',
  },
  {
    label: 'Анализ продаж',
    icon: 'pi pi-chart-line',
    prompt: 'Проанализируй мои продажи за последнюю неделю',
    description: 'Строит отчёт по продажам и трендам',
  },
  {
    label: 'Рекламные кампании',
    icon: 'pi pi-bullseye',
    prompt: 'Какая реклама приносит больше всего продаж?',
    description: 'Анализирует эффективность кампаний',
  },
  {
    label: 'Остатки на складах',
    icon: 'pi pi-box',
    prompt: 'Где заканчиваются остатки?',
    description: 'Покажет балансы и критические запасы',
  },
  {
    label: 'Акции и промо',
    icon: 'pi pi-calendar',
    prompt: 'На какие акции стоит добавить товары?',
    description: 'Подскажет выгодные промо-акции',
  },
  {
    label: 'Поставки',
    icon: 'pi pi-truck',
    prompt: 'Покажи мои текущие поставки',
    description: 'Статус и детали всех поставок',
  },
  {
    label: 'Карточки товаров',
    icon: 'pi pi-shopping-bag',
    prompt: 'Какие карточки товаров нужно доработать?',
    description: 'Анализирует контент и выдаёт рекомендации',
  },
  {
    label: 'MPStats аналитика',
    icon: 'pi pi-chart-bar',
    prompt: 'Проанализируй артикул по MPStats',
    description: 'Быстрая аналитика по номенклатуре',
  },
];

export const ABILITY_PROMPTS = AI_ABILITIES.map((a) => a.prompt);

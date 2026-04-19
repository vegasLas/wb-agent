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
];

export const ABILITY_PROMPTS = AI_ABILITIES.map((a) => a.prompt);

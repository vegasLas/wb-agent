<template>
  <Dialog
    v-model:visible="visible"
    header="Инструкция по автобронированию"
    @hide="$emit('update:show', false)"
  >
    <div
      class="max-h-[70vh] overflow-auto space-y-4 text-gray-700 dark:text-gray-300"
    >
      <!-- Шаблоны -->
      <div class="space-y-2">
        <h4 class="font-medium text-gray-900 dark:text-white">
          Черновик поставки
        </h4>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Создайте черновик в личном кабинете ВБ:
        </p>
        <ul
          class="list-disc pl-4 mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-1"
        >
          <li>Нажмите «создать поставку»</li>
          <li>
            Выберите артикулы и укажите количество (вручную или через Excel)
          </li>
          <li>Завершите создание, нажав на меню слева</li>
          <li>Черновик сохранится без склада и даты</li>
        </ul>
        <div class="mt-2 text-sm">
          <span class="text-yellow-600">⚠️ Важно:</span> Указывайте точное
          количество товара, чтобы избежать штрафов. Черновик нельзя изменить -
          создайте новый при необходимости корректировки.
        </div>
      </div>

      <!-- Склад -->
      <div class="space-y-2">
        <h4 class="font-medium text-gray-900 dark:text-white">Выбор склада</h4>
        <ul
          class="list-disc pl-4 text-sm text-gray-600 dark:text-gray-400 space-y-1"
        >
          <li>
            <strong>Прямые поставки:</strong> Товар доставляется напрямую на
            склад ВБ
          </li>
          <li>
            <strong>Транзитные поставки:</strong> Сначала выберите основной
            склад, затем транзитный
          </li>
          <li>
            <strong>Поставки на СЦ:</strong> Убедитесь, что ВБ разрешает вашему
            магазину такие поставки
          </li>
          <li>
            <strong>Валидация:</strong> После выбора склада и черновика система
            проверит доступные типы поставок
          </li>
        </ul>
      </div>

      <!-- Тип поставки -->
      <div class="space-y-2">
        <h4 class="font-medium text-gray-900 dark:text-white">Тип поставки</h4>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Доступные типы зависят от вашего черновика и выбранного склада:
        </p>
        <ul
          class="list-disc pl-4 mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-1"
        >
          <li><strong>Короба:</strong> Стандартная упаковка в коробки</li>
          <li><strong>Монопаллета:</strong> Поставка на паллетах</li>
          <li>
            <strong>Суперсейф:</strong> Специальная упаковка для хрупких товаров
          </li>
        </ul>
        <div class="mt-2 text-sm">
          <span class="text-blue-600">💡 Система автоматически:</span>
          Показывает только доступные типы поставок для вашего товара и склада.
        </div>
      </div>

      <!-- Даты -->
      <div class="space-y-2">
        <h4 class="font-medium text-gray-900 dark:text-white">Выбор дат</h4>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Доступные варианты:
        </p>
        <ul
          class="list-disc pl-4 mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-1"
        >
          <li>
            <strong>Неделя:</strong> Период 7 дней от выбранной даты, использует
            1 кредит
          </li>
          <li>
            <strong>Месяц:</strong> Период 30 дней от выбранной даты, использует
            1 кредит
          </li>
          <li>
            <strong>Свой период:</strong> Выберите начальную и конечную дату,
            использует 1 кредит
          </li>
          <li>
            <strong>Выбрать даты:</strong> Каждая дата = отдельный кредит,
            система бронирует ВСЕ выбранные даты
          </li>
          <li>
            <strong>Выбрать даты (одна):</strong> Использует только 1 кредит,
            система бронирует ПЕРВУЮ доступную дату из выбранных
          </li>
        </ul>
        <div class="mt-2 text-sm">
          <span class="text-green-600">💰 Экономия:</span> "Выбрать даты (одна)"
          - идеальный выбор, когда вам подходит любая из нескольких дат.
        </div>
      </div>

      <!-- Коэффициент -->
      <div class="space-y-2">
        <h4 class="font-medium text-gray-900 dark:text-white">Коэффициент</h4>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Настройка максимального коэффициента:
        </p>
        <ul
          class="list-disc pl-4 mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-1"
        >
          <li>
            <strong>Диапазон:</strong> От 0 до 20, бот бронирует слоты с
            коэффициентом от 0 до указанного максимума
          </li>
          <li>
            <strong>Рекомендации:</strong> Система может предложить оптимальный
            коэффициент на основе анализа
          </li>
          <li>
            <strong>История:</strong> Просматривайте статистику коэффициентов
            для выбранного склада и типа поставки
          </li>
          <li>
            <strong>Гибкость:</strong> Если ВБ предоставит более низкий
            коэффициент, бот все равно забронирует слот
          </li>
        </ul>
      </div>

      <div class="space-y-2">
        <h4 class="font-medium text-gray-900 dark:text-white">
          Полезные советы
        </h4>
        <ul
          class="list-disc pl-4 text-sm text-gray-600 dark:text-gray-400 space-y-1"
        >
          <li>
            <strong>Планирование:</strong> Создавайте автобронирования заранее
            для лучших результатов
          </li>
          <li>
            <strong>Мониторинг:</strong> Следите за статусом ваших
            автобронирований в соответствующем разделе
          </li>
          <li>
            <strong>Баланс:</strong> Проверяйте количество доступных кредитов
            перед созданием
          </li>
          <li>
            <strong>Оптимизация:</strong> Используйте рекомендуемые коэффициенты
            для повышения шансов на успех
          </li>
        </ul>
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Dialog from 'primevue/dialog';

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  'update:show': [value: boolean];
}>();

const visible = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value),
});
</script>

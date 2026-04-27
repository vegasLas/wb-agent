<template>
  <Dialog
    v-model:visible="isOpen"
    position="bottom"
    header="Руководство по навигации"
    :style="{ maxWidth: '800px' }"
    :modal="true"
    :closable="true"
    @hide="close"
  >
    <div class="max-h-[70vh] overflow-y-auto space-y-6 pr-2">
      <!-- Autobookings Section -->
      <div class="space-y-3">
        <div class="flex items-center gap-2">
          <i class="pi pi-calendar text-blue-600 dark:text-blue-400 text-lg" />
          <h4 class="font-medium text-lg text-gray-900 dark:text-white">
            Автоброни
          </h4>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Автоматическое бронирование конкретных дат поставок с использованием
          заранее подготовленных черновиков.
        </p>
        <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
          <p class="text-sm text-gray-700 dark:text-gray-300">
            <strong>Что это:</strong> Система автоматически бронирует выбранные
            даты, используя подготовленный черновик поставки.
          </p>
          <ul
            class="list-disc ml-4 mt-2 text-sm space-y-1 text-gray-600 dark:text-gray-400"
          >
            <li>
              Создайте черновик поставки в личном кабинете ВБ с точным
              количеством товара
            </li>
            <li>Выберите склад и тип поставки</li>
            <li>
              Укажите даты: неделя, месяц, свой период или конкретные даты
            </li>
            <li>Настройте максимальный коэффициент (0-20)</li>
            <li>
              Используйте шаблоны из активных таймслотов для экономии времени
            </li>
          </ul>
        </div>
      </div>

      <!-- Reschedules Section -->
      <div class="space-y-3">
        <div class="flex items-center gap-2">
          <i class="pi pi-refresh text-blue-600 dark:text-blue-400 text-lg" />
          <h4 class="font-medium text-lg text-gray-900 dark:text-white">
            Перепланирование
          </h4>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Автоматическое перепланирование существующих поставок при изменении
          коэффициентов на складах.
        </p>
        <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
          <p class="text-sm text-gray-700 dark:text-gray-300">
            <strong>Что это:</strong> Система автоматически перепланирует ваши
            созданные поставки на более выгодные даты когда коэффициенты на
            складах становятся ниже.
          </p>
          <ul
            class="list-disc ml-4 mt-2 text-sm space-y-1 text-gray-600 dark:text-gray-400"
          >
            <li>Выберите существующую поставку из списка доступных</li>
            <li>Укажите максимальный коэффициент для перепланирования</li>
            <li>Выберите период или конкретные даты для поиска</li>
            <li>
              Система автоматически перенесет поставку когда найдет лучшие
              условия
            </li>
            <li>Отслеживайте статус и историю перепланирований</li>
          </ul>
        </div>
      </div>

      <!-- Triggers Section -->
      <div class="space-y-3">
        <div class="flex items-center gap-2">
          <i class="pi pi-clock text-blue-600 dark:text-blue-400 text-lg" />
          <h4 class="font-medium text-lg text-gray-900 dark:text-white">
            Слоты
          </h4>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Автоматический поиск и мониторинг временных слотов для поставок на
          склады Wildberries.
        </p>
        <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
          <p class="text-sm text-gray-700 dark:text-gray-300">
            <strong>Что это:</strong> Таймслоты автоматически ищут свободные
            слоты на выбранных складах и уведомляют вас, когда находят
            подходящие условия. Они "НЕ" создают поставки автоматически.
          </p>
          <ul
            class="list-disc ml-4 mt-2 text-sm space-y-1 text-gray-600 dark:text-gray-400"
          >
            <li>Выберите склады (максимум 3) для мониторинга</li>
            <li>Укажите типы коробов (Короба, Суперсейф, Монопаллеты)</li>
            <li>
              Настройте интервал проверки и максимальный коэффициент выгрузки
            </li>
            <li>
              Выберите режим поиска: сегодня, завтра, неделя, диапазон или до
              нахождения
            </li>
            <li>Получите уведомление, когда найден подходящий слот</li>
          </ul>
        </div>
      </div>

      <!-- Report Section -->
      <div class="space-y-3">
        <div class="flex items-center gap-2">
          <i class="pi pi-chart-pie text-blue-600 dark:text-blue-400 text-lg" />
          <h4 class="font-medium text-lg text-gray-900 dark:text-white">
            Отчеты
          </h4>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Анализ продаж и остатков товаров по складам с рекомендациями по
          оптимизации.
        </p>
        <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
          <p class="text-sm text-gray-700 dark:text-gray-300">
            <strong>Что это:</strong> Детальная аналитика ваших продаж и
            остатков с умными рекомендациями.
          </p>
          <ul
            class="list-disc ml-4 mt-2 text-sm space-y-1 text-gray-600 dark:text-gray-400"
          >
            <li>Выберите период для анализа данных</li>
            <li>Просматривайте графики продаж по складам</li>
            <li>Получайте рекомендации по оптимизации остатков</li>
            <li>Анализируйте эффективность поставок</li>
          </ul>
        </div>
      </div>

      <!-- Store Section -->
      <div class="space-y-3">
        <div class="flex items-center gap-2">
          <i
            class="pi pi-shopping-bag text-blue-600 dark:text-blue-400 text-lg"
          />
          <h4 class="font-medium text-lg text-gray-900 dark:text-white">
            Магазин
          </h4>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Покупка дополнительных услуг и управление подпиской.
        </p>
        <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
          <p class="text-sm text-gray-700 dark:text-gray-300">
            <strong>Что это:</strong> Раздел для управления вашей подпиской и
            покупки дополнительных возможностей.
          </p>
        </div>
      </div>

      <!-- Account Management Section -->
      <div class="space-y-3">
        <div class="flex items-center gap-2">
          <i class="pi pi-users text-blue-600 dark:text-blue-400 text-lg" />
          <h4 class="font-medium text-lg text-gray-900 dark:text-white">
            Управление аккаунтами
          </h4>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Добавление и переключение между несколькими аккаунтами WB с выбором
          поставщиков.
        </p>
        <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
          <p class="text-sm text-gray-700 dark:text-gray-300">
            <strong>Что это:</strong> Централизованное управление всеми вашими
            аккаунтами Wildberries.
          </p>
          <ul
            class="list-disc ml-4 mt-2 text-sm space-y-1 text-gray-600 dark:text-gray-400"
          >
            <li>Добавляйте несколько аккаунтов WB через авторизацию</li>
            <li>Переключайтесь между аккаунтами одним кликом</li>
            <li>Выбирайте активного поставщика для каждого аккаунта</li>
            <li>Обновляйте список поставщиков при необходимости</li>
            <li>Удаляйте неиспользуемые аккаунты</li>
          </ul>
        </div>
      </div>

      <!-- Account Section -->
      <div class="space-y-3">
        <div class="flex items-center gap-2">
          <i class="pi pi-user text-blue-600 dark:text-blue-400 text-lg" />
          <h4 class="font-medium text-lg text-gray-900 dark:text-white">
            Профиль
          </h4>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Управление настройками профиля, API ключами и информацией об аккаунте.
        </p>
        <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
          <p class="text-sm text-gray-700 dark:text-gray-300">
            <strong>Что это:</strong> Настройки вашего профиля и интеграции с
            Wildberries.
          </p>
          <ul
            class="list-disc ml-4 mt-2 text-sm space-y-1 text-gray-600 dark:text-gray-400"
          >
            <li>Просматривайте информацию о подписке</li>
            <li>Управляйте API ключами поставщиков</li>
            <li>Настраивайте уведомления</li>
            <li>Просматривайте статистику использования</li>
          </ul>
        </div>
      </div>

      <!-- Tips Section -->
      <div class="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
        <h4 class="font-medium text-lg text-green-600 dark:text-green-400">
          <i class="pi pi-lightbulb mr-1" /> Полезные советы
        </h4>
        <div class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <p>
            <strong>Планирование:</strong> Создавайте таймслоты и
            автобронирования заранее для лучших результатов
          </p>
          <p>
            <strong>Мониторинг:</strong> Регулярно проверяйте статус ваших задач
            в соответствующих разделах
          </p>
          <p>
            <strong>Баланс:</strong> Следите за количеством доступных слотов
            автобронирования
          </p>
          <p>
            <strong>Оптимизация:</strong> Используйте рекомендации из отчетов
            для повышения эффективности
          </p>
        </div>
      </div>
    </div>

    <template #footer>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Для получения подробной инструкции по каждому разделу используйте кнопки
        помощи внутри соответствующих страниц.
      </p>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Dialog from 'primevue/dialog';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

function close() {
  isOpen.value = false;
}
</script>

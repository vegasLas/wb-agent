<template>
  <Dialog
    v-model:visible="visible"
    header="Инструкция по перепланированию"
    :style="{ width: '90vw', maxWidth: '600px' }"
    :modal="true"
    @hide="$emit('update:show', false)"
  >
    <div class="max-h-[70vh] overflow-auto space-y-4">
      <!-- Что такое перепланирование -->
      <div class="space-y-2">
        <h4 class="font-medium text-gray-900 dark:text-white">
          Что такое перепланирование
        </h4>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Перепланирование позволяет автоматически перенести существующую
          поставку на новые даты:
        </p>
        <ul
          class="list-disc pl-4 mt-2 text-sm text-gray-600 dark:text-gray-400"
        >
          <li>Система мониторит коэффициенты на выбранном складе</li>
          <li>
            Когда коэффициент становится приемлемым, поставка автоматически
            переносится
          </li>
          <li>
            Перепланирование работает только с поставками в статусе "Ожидание" и
            "Отклонена"
          </li>
        </ul>
        <div class="mt-2 text-sm">
          <span class="text-blue-500 dark:text-blue-400">💡 Совет:</span>
          <span class="text-gray-600 dark:text-gray-400">Используйте перепланирование для поставок с высокими
            коэффициентами.</span>
        </div>
      </div>

      <!-- Выбор поставки -->
      <div class="space-y-2">
        <h4 class="font-medium text-gray-900 dark:text-white">
          Выбор поставки
        </h4>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          В списке отображаются только подходящие поставки:
        </p>
        <ul
          class="list-disc pl-4 mt-2 text-sm text-gray-600 dark:text-gray-400"
        >
          <li>
            <strong>Статус "Ожидание":</strong> Поставки, ожидающие слот на
            складе
          </li>
          <li>
            <strong>Статус "Отклонена":</strong> Поставки, которые были
            отклонены из-за высокого коэффициента
          </li>
          <li>
            <strong>Фильтрация:</strong> Система автоматически показывает только
            те поставки, которые можно перепланировать
          </li>
        </ul>
        <div class="mt-2 text-sm">
          <span class="text-yellow-500 dark:text-yellow-400">⚠️ Важно:</span>
          <span class="text-gray-600 dark:text-gray-400">
            Если поставка не отображается в списке, значит её нельзя
            перепланировать (возможно, уже забронирована или завершена).</span>
        </div>
      </div>

      <!-- Склад -->
      <div class="space-y-2">
        <h4 class="font-medium text-gray-900 dark:text-white">
          Выбор склада
        </h4>
        <ul class="list-disc pl-4 text-sm text-gray-600 dark:text-gray-400">
          <li>
            <strong>Гибкость:</strong> Можете выбрать любой доступный склад, не
            обязательно тот же, что в исходной поставке
          </li>
          <li>
            <strong>Рекомендации:</strong> Учитывайте логистику и коэффициенты
            разных складов
          </li>
          <li>
            <strong>Типы складов:</strong> Прямые, транзитные и сортировочные
            центры доступны согласно настройкам вашего магазина
          </li>
        </ul>
      </div>

      <!-- Тип поставки -->
      <div class="space-y-2">
        <h4 class="font-medium text-gray-900 dark:text-white">
          Тип поставки
        </h4>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Выберите подходящий тип упаковки:
        </p>
        <ul
          class="list-disc pl-4 mt-2 text-sm text-gray-600 dark:text-gray-400"
        >
          <li>
            <strong>Короба:</strong> Стандартная упаковка для большинства
            товаров
          </li>
          <li><strong>Монопаллеты:</strong> Для крупных или тяжёлых товаров</li>
          <li>
            <strong>Суперсейф:</strong> Специальная упаковка для хрупких товаров
          </li>
        </ul>
        <div class="mt-2 text-sm">
          <span class="text-blue-500 dark:text-blue-400">💡 Выбор типа:</span>
          <span class="text-gray-600 dark:text-gray-400">
            Может отличаться от исходной поставки, выберите наиболее подходящий
            для ваших товаров.</span>
        </div>
      </div>

      <!-- Выбор новых дат -->
      <div class="space-y-2">
        <h4 class="font-medium text-gray-900 dark:text-white">
          Выбор новых дат
        </h4>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Доступные варианты периодов:
        </p>
        <ul
          class="list-disc pl-4 mt-2 text-sm text-gray-600 dark:text-gray-400"
        >
          <li>
            <strong>Неделя:</strong> Система будет искать подходящий слот в
            течение 7 дней от выбранной даты
          </li>
          <li>
            <strong>Месяц:</strong> Поиск слота в течение 30 дней от выбранной
            даты
          </li>
          <li>
            <strong>Свой период:</strong> Задайте точный диапазон дат для поиска
          </li>
          <li>
            <strong>Выбранные даты:</strong> Укажите конкретные даты, система
            перенесёт на первую подходящую
          </li>
        </ul>
        <div class="mt-2 text-sm">
          <span class="text-green-500 dark:text-green-400">🎯 Стратегия:</span>
          <span class="text-gray-600 dark:text-gray-400">
            Более широкие периоды увеличивают шансы на успешное
            перепланирование.</span>
        </div>
      </div>

      <!-- Максимальный коэффициент -->
      <div class="space-y-2">
        <h4 class="font-medium text-gray-900 dark:text-white">
          Максимальный коэффициент
        </h4>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Настройка условий для перепланирования:
        </p>
        <ul
          class="list-disc pl-4 mt-2 text-sm text-gray-600 dark:text-gray-400"
        >
          <li>
            <strong>Диапазон:</strong> От 0 до 100, но рекомендуется не более 20
          </li>
          <li>
            <strong>Логика:</strong> Поставка будет перенесена только если
            коэффициент склада не превышает указанное значение
          </li>
          <li>
            <strong>Мониторинг:</strong> Система постоянно отслеживает
            коэффициенты и действует автоматически
          </li>
          <li>
            <strong>Экономия:</strong> Установите разумный лимит, чтобы избежать
            переплат
          </li>
        </ul>
        <div class="mt-2 text-sm">
          <span class="text-orange-500 dark:text-orange-400">💰 Совет:</span>
          <span class="text-gray-600 dark:text-gray-400">
            Начните с коэффициента 5-10, можете повысить при
            необходимости.</span>
        </div>
      </div>

      <!-- Как работает система -->
      <div class="space-y-2">
        <h4 class="font-medium text-gray-900 dark:text-white">
          Как работает система
        </h4>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Процесс автоматического перепланирования:
        </p>
        <ul
          class="list-disc pl-4 mt-2 text-sm text-gray-600 dark:text-gray-400"
        >
          <li>
            <strong>Мониторинг:</strong> Система каждые несколько минут
            проверяет коэффициенты на выбранном складе
          </li>
          <li>
            <strong>Анализ:</strong> Когда коэффициент становится приемлемым,
            система анализирует доступные слоты
          </li>
          <li>
            <strong>Перенос:</strong> Автоматически переносит поставку на
            подходящую дату и время
          </li>
          <li>
            <strong>Уведомления:</strong> Вы получите уведомление о успешном
            перепланировании
          </li>
        </ul>
      </div>

      <!-- Полезные советы -->
      <div class="space-y-2">
        <h4 class="font-medium text-gray-900 dark:text-white">
          Полезные советы
        </h4>
        <ul class="list-disc pl-4 text-sm text-gray-600 dark:text-gray-400">
          <li>
            <strong>Планирование:</strong> Создавайте перепланирование заранее
            для лучших результатов
          </li>
          <li>
            <strong>Мониторинг:</strong> Следите за статусом ваших
            перепланирований в соответствующем разделе
          </li>
          <li>
            <strong>Коэффициенты:</strong> Изучайте статистику коэффициентов для
            оптимальных настроек
          </li>
          <li>
            <strong>Резерв времени:</strong> Учитывайте время на обработку при
            выборе дат
          </li>
          <li>
            <strong>Альтернативы:</strong> Рассматривайте несколько складов для
            повышения шансов
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

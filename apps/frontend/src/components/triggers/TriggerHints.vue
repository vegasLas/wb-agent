<template>
  <Dialog
    :visible="show"
    header="Инструкция по созданию таймслота"
    modal
    :style="{ width: '90vw', maxWidth: '600px' }"
    @update:visible="$emit('close')"
  >
    <div class="space-y-4 text-sm">
      <div>
        <h4 class="font-medium text-gray-900 dark:text-gray-100 mb-2">
          Склады
        </h4>
        <p class="text-gray-600 dark:text-gray-400">
          Выберите один или несколько складов (максимум 3), для которых будет
          создан таймслот. Таймслот будет проверять наличие свободных слотов на
          выбранных складах.
        </p>
      </div>

      <div>
        <h4 class="font-medium text-gray-900 dark:text-gray-100 mb-2">
          Типы коробов
        </h4>
        <p class="text-gray-600 dark:text-gray-400">
          Выберите типы коробов (Короба, Суперсейф, Монопаллеты), для которых
          будет работать таймслот. Система будет искать слоты только для
          выбранных типов поставок.
        </p>
      </div>

      <div>
        <h4 class="font-medium text-gray-900 dark:text-gray-100 mb-2">
          Интервал проверки
        </h4>
        <p class="text-gray-600 dark:text-gray-400">
          Укажите интервал, через который система будет повторно проверять
          наличие слотов после успешного срабатывания таймслота. Это позволяет
          автоматизировать процесс поиска новых слотов.
        </p>
      </div>

      <div>
        <h4 class="font-medium text-gray-900 dark:text-gray-100 mb-2">
          Режим поиска
        </h4>
        <div class="text-gray-600 dark:text-gray-400">
          Доступны следующие режимы:
          <ul class="list-disc ml-4 mt-2 space-y-1">
            <li>
              <span class="font-medium">Сегодня</span> - поиск слотов на текущий
              день
            </li>
            <li>
              <span class="font-medium">Завтра</span> - поиск слотов на
              следующий день
            </li>
            <li>
              <span class="font-medium">Неделя</span> - поиск слотов на
              ближайшие 7 дней, включая текущий день
            </li>
            <li>
              <span class="font-medium">Диапазон дат</span> - поиск в указанном
              периоде
            </li>
            <li>
              <span class="font-medium">Выбранные даты</span> - поиск в
              конкретные даты
            </li>
            <li>
              <span class="font-medium">До нахождения</span> - поиск начиная с
              сегодня, пока не будет найден слот
            </li>
          </ul>
        </div>
      </div>

      <div>
        <h4 class="font-medium text-gray-900 dark:text-gray-100 mb-2">
          Период поиска
        </h4>
        <p class="text-gray-600 dark:text-gray-400">
          При выборе режима "Диапазон дат" укажите начальную и конечную дату
          периода, в котором система будет искать свободные слоты. Для режима
          "Выбранные даты" выберите конкретные даты из календаря.
        </p>
      </div>

      <div>
        <h4 class="font-medium text-gray-900 dark:text-gray-100 mb-2">
          Максимальный коэффициент выгрузки
        </h4>
        <p class="text-gray-600 dark:text-gray-400">
          Определяет верхний предел коэффициента выгрузки для поставок. Значение
          0 означает поиск только бесплатных слотов.
        </p>
      </div>
    </div>

    <template #footer>
      <div class="space-y-4">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          После создания таймслот начнет автоматически искать слоты согласно
          заданным параметрам. Вы получите уведомление, когда подходящий слот
          будет найден.
        </p>
        <Button
          severity="primary"
          class="w-full"
          @click="$emit('close')"
        >
          Понятно
        </Button>
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';

defineProps<{
  show: boolean;
}>();

defineEmits<{
  close: [];
}>();
</script>

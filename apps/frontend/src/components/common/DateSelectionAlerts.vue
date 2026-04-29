<template>
  <div class="space-y-3">
    <!-- Alert for CUSTOM_DATES_SINGLE -->
    <Message
      v-if="dateType === 'CUSTOM_DATES_SINGLE'"
      :severity="isOverLimit ? 'error' : 'info'"
      icon="pi pi-info-circle"
    >
      <div class="font-semibold mb-2">
        📋 Режим "Выбрать даты (одна)":
      </div>
      <ul class="ml-4 space-y-1 text-sm">
        <li>
          • <strong>Стоимость:</strong> Использует 1 слот автобронирования
          независимо от количества выбранных дат
        </li>
        <li>
          • <strong>Логика работы:</strong> Система попытается забронировать
          первую доступную дату из выбранных
        </li>
        <li>
          • <strong>Завершение:</strong> Автобронирование завершается после
          успешного бронирования одной даты
        </li>
        <li>
          • <strong>Экономия:</strong> Идеально для случаев, когда вам подходит
          любая из нескольких дат
        </li>
        <li v-if="maxSlots > 0">
          • <strong>Осталось слотов:</strong> {{ remainingSlots }} / {{ maxSlots }}
        </li>
      </ul>
      <p v-if="isOverLimit" class="mt-2 font-medium text-red-700 dark:text-red-300">
        Превышен лимит слотов. Удалите даты или обновите подписку.
      </p>
    </Message>

    <!-- Alert for CUSTOM_DATES -->
    <Message
      v-if="dateType === 'CUSTOM_DATES'"
      :severity="isOverLimit ? 'error' : 'warn'"
      icon="pi pi-exclamation-triangle"
    >
      <div class="space-y-2">
        <div class="font-semibold mb-2">
          📋 Режим "Выбрать даты":
        </div>
        <ul class="ml-4 space-y-1 text-sm">
          <li>
            • <strong>Стоимость:</strong> Будет использовано
            <strong>{{ slotsUsed }}</strong>
            {{ slotsUsed === 1 ? 'слот' : 'слота' }}
            (по 1 на каждую выбранную дату)
          </li>
          <li>
            • <strong>Логика работы:</strong> Система попытается забронировать
            ВСЕ выбранные даты
          </li>
          <li>
            • <strong>Завершение:</strong> Автобронирование завершается после
            бронирования всех дат
          </li>
          <li v-if="maxSlots > 0">
            • <strong>Останется слотов:</strong> {{ remainingSlots }} / {{ maxSlots }}
          </li>
        </ul>
        <p v-if="isOverLimit" class="font-medium text-red-700 dark:text-red-300">
          Превышен лимит слотов. Удалите даты или обновите подписку.
        </p>
      </div>
    </Message>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Message from 'primevue/message';

interface Props {
  dateType?: string;
  customDates?: (string | Date)[];
  usedSlots?: number;
  maxSlots?: number;
}

const props = withDefaults(defineProps<Props>(), {
  dateType: undefined,
  customDates: undefined,
  usedSlots: 0,
  maxSlots: 0,
});

const slotsUsed = computed(() => {
  if (props.dateType === 'CUSTOM_DATES') {
    return props.customDates?.length || 0;
  }
  return 1;
});

const remainingSlots = computed(() => {
  const remaining = props.maxSlots - props.usedSlots - slotsUsed.value;
  return Math.max(0, remaining);
});

const isOverLimit = computed(() => {
  return props.usedSlots + slotsUsed.value > props.maxSlots;
});
</script>

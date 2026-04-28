<template>
  <div class="space-y-3">
    <!-- Alert for CUSTOM_DATES_SINGLE -->
    <Message
      v-if="dateType === 'CUSTOM_DATES_SINGLE'"
      severity="info"
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
      </ul>
    </Message>

    <!-- Alert for CUSTOM_DATES -->
    <Message
      v-if="dateType === 'CUSTOM_DATES'"
      severity="warn"
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
        </ul>
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
}

const props = withDefaults(defineProps<Props>(), {
  dateType: undefined,
  customDates: undefined,
});

const slotsUsed = computed(() => {
  if (props.dateType === 'CUSTOM_DATES') {
    return props.customDates?.length || 0;
  }
  return 1;
});
</script>

<template>
  <div class="space-y-3">
    <!-- Alert for CUSTOM_DATES_SINGLE -->
    <Message
      v-if="dateType === 'CUSTOM_DATES_SINGLE'"
      severity="info"
      icon="pi pi-info-circle"
    >
      <div class="font-semibold mb-2">📋 Режим "Выбрать даты (одна)":</div>
      <ul class="ml-4 space-y-1 text-sm">
        <li>
          • <strong>Стоимость:</strong> Использует только 1 кредит независимо
          от количества выбранных дат
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
          • <strong>Экономия:</strong> Идеально для случаев, когда вам
          подходит любая из нескольких дат
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
        <div class="font-semibold mb-2">📋 Режим "Выбрать даты":</div>
        <ul class="ml-4 space-y-1 text-sm">
          <li>
            • <strong>Стоимость:</strong> Каждая выбранная дата использует 1
            кредит
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
        <p class="mt-2 text-sm">
          У вас останется
          <span
            class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
            :class="remainingCount <= 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'"
          >
            {{ remainingCount }} кредитов.
          </span>
        </p>
        <div v-if="availableCount < (customDates?.length || 0)" class="mt-3">
          <Button
            severity="primary"
            size="small"
            @click="navigateToStore"
          >
            Купить
          </Button>
        </div>
      </div>
    </Message>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import Message from 'primevue/message';
import Button from 'primevue/button';
import { useAutobookingUpdateStore } from '../../stores/autobookingUpdate';

interface Props {
  dateType?: string;
  customDates?: (string | Date)[];
  availableCount: number;
  isUpdateMode?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isUpdateMode: false,
});

const router = useRouter();
const updateStore = useAutobookingUpdateStore();

// Calculate available autobooking count considering update mode
const availableCount = computed(() => {
  if (props.isUpdateMode) {
    return updateStore.remainingAutobookingCount;
  }
  return props.availableCount;
});

// Calculate remaining count after selecting dates
const remainingCount = computed(() => {
  if (props.isUpdateMode) {
    // In update mode, use the store's calculation which accounts for the adjustment
    return updateStore.remainingAutobookingCount;
  } else {
    // In create mode, subtract the required count from available count
    const requiredCount = props.customDates?.length || 0;
    return props.availableCount - requiredCount;
  }
});

function navigateToStore() {
  router.push({ name: 'StoreSubscription' });
}
</script>

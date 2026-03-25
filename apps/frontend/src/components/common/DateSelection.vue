<template>
  <div class="space-y-4">
    <!-- Date Type Selection -->
    <div class="form-group">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Тип периода <span class="text-red-500">*</span>
      </label>
      <BaseSelect
        :model-value="dateType"
        :options="availableDateTypeOptions"
        placeholder="Выберите тип периода"
        @update:model-value="(value) => $emit('update:dateType', value)"
      />
    </div>

    <template v-if="dateType">
      <!-- For WEEK and MONTH types -->
      <div
        v-if="['WEEK', 'MONTH'].includes(dateType)"
        class="form-group"
      >
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Дата начала <span class="text-red-500">*</span>
        </label>
        <VueDatePicker
          :model-value="startDate"
          auto-apply
          :dark="colorScheme === 'dark'"
          :min-date="new Date()"
          :disabled-dates="
            props.mode === 'reschedule' && props.supplyDate
              ? getDisabledDates()
              : []
          "
          :enable-time-picker="false"
          format="dd.MM.yyyy"
          placeholder="Выберите дату начала"
          locale="ru-RU"
          class="w-full"
          @update:model-value="
            (value: Date) =>
              $emit('update:startDate', value?.toISOString().split('T')[0] || '')
          "
        />
      </div>

      <!-- For CUSTOM_PERIOD type -->
      <div
        v-if="dateType === 'CUSTOM_PERIOD'"
        class="form-group"
      >
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Выберите период <span class="text-red-500">*</span>
        </label>
        <VueDatePicker
          :model-value="dateRange"
          :dark="colorScheme === 'dark'"
          auto-apply
          :enable-time-picker="false"
          :min-date="new Date()"
          :disabled-dates="
            props.mode === 'reschedule' && props.supplyDate
              ? getDisabledDates()
              : []
          "
          format="dd.MM.yyyy"
          :range="{ minRange: 0, maxRange: 30 }"
          placeholder="Выберите период"
          class="w-full"
          @update:model-value="onDateRangeChange"
        />
      </div>

      <!-- For CUSTOM_DATES and CUSTOM_DATES_SINGLE types -->
      <div
        v-if="dateType === 'CUSTOM_DATES' || dateType === 'CUSTOM_DATES_SINGLE'"
        class="form-group"
      >
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Выберите даты <span class="text-red-500">*</span>
        </label>
        <MultiSelect
          :model-value="customDates as string[]"
          :searchable="false"
          :options="availableDatesOptions()"
          placeholder="Выберите даты"
          @update:model-value="$emit('update:customDates', $event)"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { VueDatePicker } from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import { useWebAppTheme } from 'vue-tg';
import { BaseSelect } from '../ui';
import MultiSelect from '../ui/MultiSelect.vue';

const { colorScheme } = useWebAppTheme();

interface Props {
  dateType?: string;
  startDate?: string | Date;
  endDate?: string | Date | null;
  customDates?: (string | Date)[];
  mode?: 'autobooking' | 'reschedule';
  supplyDate?: string | Date | null;
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'autobooking',
});

const emit = defineEmits<{
  'update:dateType': [value: string];
  'update:startDate': [value: string];
  'update:endDate': [value: string];
  'update:customDates': [value: (string | Date)[]];
}>();

// Base date type options
const allDateTypeOptions = [
  { label: 'Неделя', value: 'WEEK' },
  { label: 'Месяц', value: 'MONTH' },
  { label: 'Свой период', value: 'CUSTOM_PERIOD' },
  { label: 'Выбрать даты', value: 'CUSTOM_DATES' },
  {
    label: `Выбрать даты ${!(props.mode === 'reschedule') ? '(из всех забронирует лишь одну)' : ''}`,
    value: 'CUSTOM_DATES_SINGLE',
  },
];

// Filter date type options based on mode
const availableDateTypeOptions = computed(() => {
  if (props.mode === 'reschedule') {
    // Reschedules only support CUSTOM_DATES_SINGLE
    return allDateTypeOptions.filter(
      (option) => option.value !== 'CUSTOM_DATES',
    );
  }
  return allDateTypeOptions;
});

// Create computed properties for template access
const dateType = computed(() => props.dateType);
const startDate = computed(() => props.startDate);
const customDates = computed(() => props.customDates);
const dateRange = computed({
  get: () => {
    if (!props.startDate || !props.endDate) return null;
    return [new Date(props.startDate), new Date(props.endDate)];
  },
  set: (value: [Date, Date]) => {
    emit('update:startDate', value[0].toISOString().split('T')[0]);
    emit('update:endDate', value[1].toISOString().split('T')[0]);
  },
});

function onDateRangeChange(dates: [Date, Date]) {
  if (!dates?.length) return null;
  dateRange.value = dates;
  emit('update:startDate', dates[0].toISOString().split('T')[0]);
  emit('update:endDate', dates[1].toISOString().split('T')[0]);
}

function getDisabledDates(): Date[] {
  if (!props.supplyDate) return [];

  let date: Date;
  if (typeof props.supplyDate === 'string') {
    // Parse date string properly to avoid timezone shifts
    if (props.supplyDate.includes('T')) {
      // Full datetime string - create date and set to local midnight
      const parsedDate = new Date(props.supplyDate);
      date = new Date(
        parsedDate.getFullYear(),
        parsedDate.getMonth(),
        parsedDate.getDate(),
      );
    } else {
      // Date-only string (YYYY-MM-DD) - parse as local date
      const [year, month, day] = props.supplyDate.split('-').map(Number);
      date = new Date(year, month - 1, day); // month is 0-indexed
    }
  } else {
    // Date object - create new date at local midnight
    date = new Date(
      props.supplyDate.getFullYear(),
      props.supplyDate.getMonth(),
      props.supplyDate.getDate(),
    );
  }

  // Return the exact supply date (currentDate) as disabled
  return [date];
}

function availableDatesOptions() {
  const options = [];

  // Get the currentDate to exclude (if in reschedule mode)
  let currentDateStr = '';
  if (props.mode === 'reschedule' && props.supplyDate) {
    let date: Date;
    if (typeof props.supplyDate === 'string') {
      // Parse date string properly to avoid timezone shifts
      if (props.supplyDate.includes('T')) {
        // Full datetime string - create date and set to local midnight
        const parsedDate = new Date(props.supplyDate);
        date = new Date(
          parsedDate.getFullYear(),
          parsedDate.getMonth(),
          parsedDate.getDate(),
        );
      } else {
        // Date-only string (YYYY-MM-DD) - parse as local date
        const [year, month, day] = props.supplyDate.split('-').map(Number);
        date = new Date(year, month - 1, day); // month is 0-indexed
      }
    } else {
      // Date object - create new date at local midnight
      date = new Date(
        props.supplyDate.getFullYear(),
        props.supplyDate.getMonth(),
        props.supplyDate.getDate(),
      );
    }

    // Format as YYYY-MM-DD for comparison
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    currentDateStr = `${year}-${month}-${day}`;
  }

  if (props.mode === 'reschedule') {
    // For reschedules: generate dates from today forwards (remove minDate restriction)
    const today = new Date();

    // Generate 60 days from today
    for (let i = 0; i < 60; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      // Format as YYYY-MM-DD using local date (avoid timezone issues)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      // Skip the currentDate (supply date)
      if (dateStr === currentDateStr) {
        continue;
      }

      const label = date.toLocaleDateString('ru-RU', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
      });

      options.push({
        label,
        value: dateStr,
      });
    }
  } else {
    // For autobooking: generate next 60 days from today
    const today = new Date();

    for (let i = 0; i < 60; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      // Format as YYYY-MM-DD using local date (avoid timezone issues)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const label = date.toLocaleDateString('ru-RU', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
      });

      options.push({
        label,
        value: dateStr,
      });
    }
  }

  // Sort dates chronologically (oldest first for both)
  options.sort((a, b) => a.value.localeCompare(b.value));

  return options;
}
</script>

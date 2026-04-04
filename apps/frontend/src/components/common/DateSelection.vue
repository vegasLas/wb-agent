<template>
  <div class="space-y-4">
    <!-- Date Type Selection -->
    <div class="form-group">
      <label
        class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        Тип периода <span class="text-red-500 dark:text-red-400">*</span>
      </label>
      <Select
        :key="`datetype-${dateType}-${availableDateTypeOptions.length}`"
        :model-value="dateType"
        :options="availableDateTypeOptions"
        option-label="label"
        option-value="value"
        placeholder="Выберите тип периода"
        class="w-full"
        @update:model-value="(value) => $emit('update:dateType', value)"
      />
    </div>

    <template v-if="dateType">
      <!-- For WEEK and MONTH types -->
      <div v-if="['WEEK', 'MONTH'].includes(dateType)" class="form-group">
        <label
          class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Дата начала <span class="text-red-500 dark:text-red-400">*</span>
        </label>
        <DatePicker
          :model-value="startDateValue"
          selection-mode="single"
          :min-date="new Date()"
          :disabled-dates="
            props.mode === 'reschedule' && props.supplyDate
              ? getDisabledDates()
              : []
          "
          :show-time="false"
          date-format="dd.mm.yy"
          placeholder="Выберите дату начала"
          locale="ru"
          class="w-full"
          @update:model-value="onSingleDateChange"
        />
      </div>

      <!-- For CUSTOM_PERIOD type -->
      <div v-if="dateType === 'CUSTOM_PERIOD'" class="form-group">
        <label
          class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Выберите период <span class="text-red-500 dark:text-red-400">*</span>
        </label>
        <DatePicker
          :model-value="dateRangeValue"
          selection-mode="range"
          :min-date="new Date()"
          :disabled-dates="
            props.mode === 'reschedule' && props.supplyDate
              ? getDisabledDates()
              : []
          "
          :show-time="false"
          date-format="dd.mm.yy"
          placeholder="Выберите период"
          class="w-full"
          @update:model-value="onPrimeDateRangeChange"
        />
      </div>

      <!-- For CUSTOM_DATES and CUSTOM_DATES_SINGLE types -->
      <div
        v-if="dateType === 'CUSTOM_DATES' || dateType === 'CUSTOM_DATES_SINGLE'"
        class="form-group"
      >
        <label
          class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Выберите даты <span class="text-red-500 dark:text-red-400">*</span>
        </label>
        <MultiSelect
          :key="`dates-${customDates?.length || 0}`"
          :model-value="customDates as string[]"
          :options="availableDatesOptions()"
          option-label="label"
          option-value="value"
          placeholder="Выберите даты"
          display="chip"
          class="w-full"
          @update:model-value="onCustomDatesChange"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import MultiSelect from 'primevue/multiselect';

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
const customDates = computed(() => props.customDates);

// Convert string date to Date object for DatePicker
const startDateValue = computed(() => {
  if (!props.startDate) return null;
  if (typeof props.startDate === 'string') {
    const [year, month, day] = props.startDate.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return props.startDate;
});

// Convert date range to array format for PrimeVue DatePicker
const dateRangeValue = computed(() => {
  if (!props.startDate || !props.endDate) return null;
  const start =
    typeof props.startDate === 'string'
      ? parseDateString(props.startDate)
      : props.startDate;
  const end =
    typeof props.endDate === 'string'
      ? parseDateString(props.endDate)
      : props.endDate;
  return [start, end];
});

function parseDateString(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function onPrimeDateRangeChange(
  dates: Date | Date[] | (Date | null)[] | null | undefined,
) {
  if (!Array.isArray(dates) || dates.length !== 2 || !dates[0] || !dates[1]) {
    emit('update:startDate', '');
    emit('update:endDate', '');
    return;
  }
  const [start, end] = dates;
  emit('update:startDate', formatDateToYYYYMMDD(start));
  emit('update:endDate', formatDateToYYYYMMDD(end));
}

function onSingleDateChange(
  value: Date | Date[] | (Date | null)[] | null | undefined,
) {
  if (value instanceof Date) {
    emit('update:startDate', formatDateToYYYYMMDD(value));
  } else {
    emit('update:startDate', '');
  }
}

function onCustomDatesChange(value: (string | Date)[]) {
  emit('update:customDates', value);
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

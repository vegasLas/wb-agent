<template>
  <div class="space-y-3">
    <!-- Warning/Alert Slot -->
    <slot name="warning" />

    <!-- View Switcher Buttons -->
    <div class="flex gap-1">
      <Button
        :variant="localActiveTab === 'autobooking' ? 'filled' : 'outlined'"
        severity="primary"
        size="small"
        class="flex-1 text-xs py-1 px-2"
        @click="handleTabChange('autobooking')"
      >
        <i class="pi pi-calendar mr-1 text-xs" />
        <span class="truncate">автобронирования</span>
      </Button>
      <Button
        :variant="localActiveTab === 'triggers' ? 'filled' : 'outlined'"
        severity="primary"
        size="small"
        class="flex-1 text-xs py-1 px-2"
        @click="handleTabChange('triggers')"
      >
        <i class="pi pi-clock mr-1 text-xs" />
        <span class="truncate">таймслоты</span>
      </Button>
    </div>

    <!-- Search Input with Status Selector -->
    <div class="flex gap-2 items-center">
      <InputText
        :model-value="searchQuery"
        type="text"
        :placeholder="searchPlaceholder"
        class="flex-1 min-w-0"
        @update:model-value="$emit('update:searchQuery', $event)"
      />
      <Select
        :model-value="selectedStatus as string"
        :options="statusOptions"
        option-label="label"
        option-value="value"
        size="small"
        class="w-32 shrink-0"
        @update:model-value="$emit('update:selectedStatus', $event)"
      />
    </div>

    <!-- Header with title and create button -->
    <div class="flex items-center justify-between gap-4">
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ title }}
      </span>

      <Button
        severity="primary"
        size="small"
        :disabled="addButtonDisabled"
        @click="$emit('add')"
      >
        <i class="pi pi-plus mr-1 text-xs" />
        {{ addButtonText }}
      </Button>
    </div>

    <!-- Extra header content slot -->
    <slot name="header-extra" />

    <!-- List Content -->
    <div
      ref="scrollContainer"
      class="space-y-3"
    >
      <slot />
    </div>

    <!-- Empty State -->
    <div
      v-if="showEmpty"
      class="text-center py-8 text-gray-500 dark:text-gray-400"
    >
      {{ emptyMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import Button from 'primevue/button';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';

type TabType = 'autobooking' | 'triggers';

interface StatusOption {
  label: string;
  value: string;
}

// Generic type helper for v-model binding
type ModelValue<T> = T | undefined;

const props = defineProps<{
  activeTab: TabType;
  statusOptions: StatusOption[];
  selectedStatus: string;
  searchQuery: string;
  searchPlaceholder: string;
  title: string;
  addButtonDisabled?: boolean;
  addButtonText?: string;
  emptyMessage: string;
  showEmpty: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:activeTab', value: TabType): void;
  (e: 'update:selectedStatus', value: string): void;
  (e: 'update:searchQuery', value: string | undefined): void;
  (e: 'add'): void;
}>();

// Local state for tab to handle internal updates
const localActiveTab = ref<TabType>(props.activeTab);

// Watch for external tab changes
watch(
  () => props.activeTab,
  (newValue) => {
    localActiveTab.value = newValue;
  },
);

function handleTabChange(value: TabType) {
  localActiveTab.value = value;
  emit('update:activeTab', value);
}

// Expose scrollContainer for infinite scroll usage
const scrollContainer = ref<HTMLElement | null>(null);

defineExpose({
  scrollContainer,
});
</script>

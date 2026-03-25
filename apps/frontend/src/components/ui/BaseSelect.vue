<template>
  <div class="relative">
    <Listbox v-model="selected" :disabled="disabled || loading">
      <div class="relative">
        <ListboxButton
          :class="buttonClasses"
          class="relative w-full cursor-default rounded-lg py-2 pl-3 pr-10 text-left border focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span class="block truncate">{{ selectedLabel }}</span>
          <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon v-if="!loading" class="h-5 w-5 text-gray-400" aria-hidden="true" />
            <svg v-else class="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </span>
        </ListboxButton>
        <transition
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <ListboxOptions
            class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
          >
            <div v-if="normalizedOptions.length === 0" class="px-4 py-2 text-sm text-gray-500">
              <slot name="empty">
                Нет доступных опций
              </slot>
            </div>
            <ListboxOption
              v-for="option in normalizedOptions"
              :key="option.value"
              v-slot="{ active, selected }"
              :value="option.value"
              as="template"
            >
              <li
                :class="[
                  active ? 'bg-blue-100 dark:bg-blue-900/30' : 'text-gray-900 dark:text-white',
                  'relative cursor-default select-none py-2 pl-10 pr-4',
                ]"
              >
                <span :class="[selected ? 'font-medium' : 'font-normal', 'block truncate']">
                  {{ option.label }}
                </span>
                <span
                  v-if="selected"
                  class="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600"
                >
                  <CheckIcon class="h-5 w-5" aria-hidden="true" />
                </span>
              </li>
            </ListboxOption>
          </ListboxOptions>
        </transition>
      </div>
    </Listbox>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/vue';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/vue/20/solid';

interface Option {
  label: string;
  value: string | number;
  [key: string]: any;
}

const props = withDefaults(defineProps<{
  modelValue: string | number | null | undefined;
  options: Array<Option | string | any>;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  valueAttribute?: string;
  optionAttribute?: string;
}>(), {
  placeholder: 'Выберите...',
  disabled: false,
  loading: false,
  valueAttribute: 'value',
  optionAttribute: 'label',
});

const emit = defineEmits<{
  'update:modelValue': [value: string | number | undefined];
}>();

const normalizedOptions = computed((): Option[] => {
  if (!props.options || props.options.length === 0) return [];
  
  return props.options.map(opt => {
    if (typeof opt === 'string') {
      return { label: opt, value: opt };
    }
    // Support custom attribute names
    return {
      label: opt[props.optionAttribute] || opt.label || String(opt),
      value: opt[props.valueAttribute] !== undefined ? opt[props.valueAttribute] : opt.value,
      ...opt, // Keep original properties
    };
  });
});

const selected = computed({
  get: () => props.modelValue ?? undefined,
  set: (value) => emit('update:modelValue', value),
});

const selectedLabel = computed(() => {
  const option = normalizedOptions.value.find(o => o.value === selected.value);
  return option?.label || props.placeholder;
});

const buttonClasses = computed(() => {
  return 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600';
});
</script>

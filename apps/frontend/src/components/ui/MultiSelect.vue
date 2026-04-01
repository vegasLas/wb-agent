<template>
  <div class="w-full">
    <Listbox
      :model-value="selectedValue"
      @update:model-value="handleSelect"
    >
      <div class="relative">
        <ListboxButton
          class="relative w-full cursor-default rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-2 pl-3 pr-10 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <span class="block truncate text-gray-500">{{ placeholder }}</span>
          <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon
              class="h-5 w-5 text-gray-400"
              aria-hidden="true"
            />
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
            <ListboxOption
              v-for="option in options"
              :key="String(option.value)"
              v-slot="{ active, selected }"
              :value="option"
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
                  <CheckIcon
                    class="h-5 w-5"
                    aria-hidden="true"
                  />
                </span>
              </li>
            </ListboxOption>
          </ListboxOptions>
        </transition>
      </div>
    </Listbox>

    <div
      v-if="modelValue && modelValue.length"
      class="flex flex-wrap gap-2 mt-2"
    >
      <span
        v-for="value in modelValue"
        :key="String(value)"
        class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
        @click="removeItem(value)"
      >
        {{ getLabel(value) }}
        <XMarkIcon class="w-4 h-4" />
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/vue';
import { CheckIcon, ChevronUpDownIcon, XMarkIcon } from '@heroicons/vue/20/solid';

interface Option {
  value: string | number | Date;
  label: string;
}

const props = withDefaults(
  defineProps<{
    searchable?: boolean;
    modelValue?: (string | number | Date)[];
    placeholder?: string;
    maxSelectable?: number;
    options: Option[];
  }>(),
  {
    searchable: true,
    modelValue: () => [],
    placeholder: 'Select options',
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: (string | number | Date)[]];
}>();

const selectedValue = ref<Option | null>(null);

const handleSelect = (payload: Option) => {
  if (!payload?.value) return;
  if (
    props.maxSelectable !== undefined &&
    props.modelValue &&
    props.modelValue.length >= props.maxSelectable
  ) {
    selectedValue.value = null;
    return;
  }
  const selectedItem = props.options.find(
    (option) => String(option.value) === String(payload.value),
  );

  if (
    props.modelValue &&
    selectedItem &&
    !props.modelValue.some(v => String(v) === String(selectedItem.value))
  ) {
    emit('update:modelValue', [...props.modelValue, selectedItem.value]);
  }

  // Reset the select after selection
  selectedValue.value = null;
};

const removeItem = (valueToRemove: string | number | Date) => {
  const updatedSelection = props.modelValue?.filter(
    (value) => String(value) !== String(valueToRemove),
  );
  emit('update:modelValue', updatedSelection);
};

// Helper function to get label from value
const getLabel = (value: string | number | Date) => {
  if (!value) return String(value);

  const option = props.options.find((opt) => String(opt.value) === String(value));
  return option ? option.label : String(value);
};
</script>

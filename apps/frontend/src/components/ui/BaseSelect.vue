<template>
  <Listbox v-model="selected" :disabled="disabled">
    <div class="relative">
      <ListboxButton
        :class="buttonClasses"
        class="relative w-full cursor-default rounded-lg py-2 pl-3 pr-10 text-left border focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span class="block truncate">{{ selectedLabel }}</span>
        <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronUpDownIcon class="h-5 w-5 text-gray-400" aria-hidden="true" />
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
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/vue';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/vue/20/solid';

interface Option {
  label: string;
  value: string | number;
}

const props = defineProps<{
  modelValue: string | number | null;
  options: Array<Option | string>;
  placeholder?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string | number];
}>();

const normalizedOptions = computed(() => {
  return props.options.map(opt => 
    typeof opt === 'string' ? { label: opt, value: opt } : opt
  );
});

const selected = computed({
  get: () => props.modelValue ?? '',
  set: (value) => emit('update:modelValue', value),
});

const selectedLabel = computed(() => {
  const option = normalizedOptions.value.find(o => o.value === selected.value);
  return option?.label || props.placeholder || 'Выберите...';
});

const buttonClasses = computed(() => {
  return 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600';
});
</script>

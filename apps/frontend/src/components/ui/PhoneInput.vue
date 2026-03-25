<template>
  <div class="flex items-center">
    <!-- Country Code Select -->
    <Listbox v-model="selectedCountryCode" :disabled="disabled">
      <div class="relative">
        <ListboxButton
          :disabled="disabled"
          class="relative flex items-center gap-1 rounded-l-lg border border-r-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-2 pl-3 pr-8 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span class="text-lg">{{ selectedCountry.flag }}</span>
          <span class="text-gray-900 dark:text-white text-sm font-medium">{{ selectedCountry.dialCode }}</span>
          <ChevronUpDownIcon class="h-4 w-4 text-gray-400 absolute right-2" aria-hidden="true" />
        </ListboxButton>
        <transition
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <ListboxOptions
            class="absolute z-10 mt-1 max-h-60 w-48 overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
          >
            <ListboxOption
              v-for="country in countries"
              :key="country.code"
              v-slot="{ active, selected }"
              :value="country.code"
              as="template"
            >
              <li
                :class="[
                  active ? 'bg-blue-100 dark:bg-blue-900/30' : 'text-gray-900 dark:text-white',
                  'relative cursor-default select-none py-2 pl-3 pr-9',
                ]"
              >
                <div class="flex items-center gap-2">
                  <span class="text-lg">{{ country.flag }}</span>
                  <span :class="[selected ? 'font-medium' : 'font-normal']">{{ country.name }}</span>
                  <span class="text-gray-500 text-sm ml-auto">{{ country.dialCode }}</span>
                </div>
                <span
                  v-if="selected"
                  class="absolute inset-y-0 right-0 flex items-center pr-3 text-blue-600"
                >
                  <CheckIcon class="h-5 w-5" aria-hidden="true" />
                </span>
              </li>
            </ListboxOption>
          </ListboxOptions>
        </transition>
      </div>
    </Listbox>

    <!-- Phone Input -->
    <input
      ref="phoneInput"
      v-model="phoneNumber"
      v-maska="phoneMask"
      :placeholder="phoneMask"
      :disabled="disabled"
      type="tel"
      class="flex-1 block w-full rounded-r-lg border-l-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed py-2 px-3 border"
      @input="handlePhoneInput"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/vue';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/vue/20/solid';

interface Country {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
  mask: string;
  prefix?: string;
  expectedDigits: number;
  regex: RegExp;
}

interface Props {
  modelValue: string;
  disabled?: boolean;
  autoSubmit?: boolean;
}

interface Emits {
  (e: 'update:modelValue', value: string): void;
  (e: 'submit', fullPhoneNumber: string): void;
  (e: 'countryChange', countryCode: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  autoSubmit: false,
});

const emit = defineEmits<Emits>();

// Local phone number state
const phoneNumber = ref('');
const selectedCountryCode = ref('RU');
const phoneInput = ref<HTMLInputElement | null>(null);

// Country data with hybrid prefix approach
const countries: Country[] = [
  // Static single prefix countries (keep prefix field)
  {
    code: 'RU',
    name: 'Россия',
    flag: '🇷🇺',
    dialCode: '+7',
    mask: '(9##) ###-##-##',
    prefix: '9',
    expectedDigits: 10,
    regex: /^79\d{9}$/,
  },
  {
    code: 'CN',
    name: 'Китай',
    flag: '🇨🇳',
    dialCode: '+86',
    mask: '(1##) #### ####',
    prefix: '1',
    expectedDigits: 11,
    regex: /^861\d{10}$/,
  },
  {
    code: 'MO',
    name: 'Макао',
    flag: '🇲🇴',
    dialCode: '+853',
    mask: '(6###) ####',
    prefix: '6',
    expectedDigits: 8,
    regex: /^8536\d{7}$/,
  },
  {
    code: 'TR',
    name: 'Турция',
    flag: '🇹🇷',
    dialCode: '+90',
    mask: '(5##) ### ## ##',
    prefix: '5',
    expectedDigits: 10,
    regex: /^905\d{9}$/,
  },

  // Dynamic prefix countries (no prefix field)
  {
    code: 'KZ',
    name: 'Казахстан',
    flag: '🇰🇿',
    dialCode: '+7',
    mask: '(###) ###-##-##',
    expectedDigits: 10,
    regex: /^(70[0-8]|77[1-8])\d{7}$/,
  },
  {
    code: 'AM',
    name: 'Армения',
    flag: '🇦🇲',
    dialCode: '+374',
    mask: '(##) ###-###',
    expectedDigits: 8,
    regex: /^(9[1347]|77|55)\d{6}$/,
  },
  {
    code: 'BY',
    name: 'Беларусь',
    flag: '🇧🇾',
    dialCode: '+375',
    mask: '(##) ###-##-##',
    expectedDigits: 9,
    regex: /^(25|29|33|44)\d{7}$/,
  },
  {
    code: 'HK',
    name: 'Гонконг',
    flag: '🇭🇰',
    dialCode: '+852',
    mask: '(####) ####',
    expectedDigits: 8,
    regex: /^[4-9]\d{7}$/,
  },
  {
    code: 'KG',
    name: 'Кыргызстан',
    flag: '🇰🇬',
    dialCode: '+996',
    mask: '(###) ###-###',
    expectedDigits: 9,
    regex: /^[57]\d{8}$/,
  },
  {
    code: 'UZ',
    name: 'Узбекистан',
    flag: '🇺🇿',
    dialCode: '+998',
    mask: '(##) ###-##-##',
    expectedDigits: 9,
    regex: /^(9[0-9])\d{7}$/,
  },
];

// Computed for selected country object
const selectedCountry = computed(
  () =>
    countries.find((c) => c.code === selectedCountryCode.value) ||
    countries[0],
);

// Get phone mask for input
const phoneMask = computed(() => selectedCountry.value.mask);

// Get full phone number including country code
const fullPhoneNumber = computed(() => {
  const cleanNumber = phoneNumber.value.replace(/\D/g, '');
  return selectedCountry.value.dialCode + cleanNumber;
});

// Computed property to validate phone number
const isValid = computed(() => {
  const cleanNumber = phoneNumber.value.replace(/\D/g, '');

  // Use explicit expectedDigits field from country configuration
  const expectedDigits = selectedCountry.value.expectedDigits;
  // Check if we have the exact number of digits required
  if (cleanNumber.length !== expectedDigits) {
    return false;
  }

  let fullNumber;
  if (selectedCountry.value.prefix) {
    // Static prefix countries: dialCode + user input
    // For Russia: "7" + "9123456789" = "79123456789"
    fullNumber = selectedCountry.value.dialCode.substring(1) + cleanNumber;
  } else {
    // Dynamic prefix countries: user input already contains full mobile number
    // For Kazakhstan: user inputs "77123456789", we test "77123456789" directly
    fullNumber = cleanNumber;
  }

  return selectedCountry.value.regex.test(fullNumber);
});

// Handle phone input changes
function handlePhoneInput() {
  // Only apply prefix protection for countries that have a static prefix
  if (selectedCountry.value.prefix) {
    const prefix = selectedCountry.value.prefix;
    const cleanInput = phoneNumber.value.replace(/\D/g, '');

    // If user tries to delete the prefix, restore it
    if (!cleanInput.startsWith(prefix)) {
      // Simply prepend the prefix to whatever the user typed
      phoneNumber.value = prefix + cleanInput;
    }
  }

  // Emit the full phone number
  emit('update:modelValue', fullPhoneNumber.value);

  // Auto-submit if phone is complete and valid
  if (props.autoSubmit && isValid.value) {
    emit('submit', fullPhoneNumber.value);
  }
}

// Watch for country changes
watch(
  () => selectedCountryCode.value,
  (newCountryCode) => {
    phoneNumber.value = '';
    emit('countryChange', newCountryCode);
    emit('update:modelValue', '');
  },
);

// Expose validation state
defineExpose({
  isValid,
  fullPhoneNumber,
  selectedCountry,
});
</script>

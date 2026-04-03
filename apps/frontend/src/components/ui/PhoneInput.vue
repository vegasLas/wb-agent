<template>
  <div class="flex items-center">
    <!-- Country Code Select -->
    <Select
      v-model="selectedCountryCode"
      :options="countries"
      option-value="code"
      :disabled="disabled"
      class="w-auto min-w-fit"
      :pt="{
        root: { class: 'rounded-l-lg rounded-r-none border-r-0' },
        trigger: { class: 'w-6' },
        list: { class: 'w-56' },
      }"
    >
      <template #value>
        <div class="flex items-center gap-1">
          <span class="text-lg">{{ selectedCountry.flag }}</span>
          <span class="text-gray-900 dark:text-white text-sm font-medium">{{
            selectedCountry.dialCode
          }}</span>
        </div>
      </template>
      <template #option="{ option }">
        <div class="flex items-center gap-2 w-full">
          <span class="text-lg">{{ option.flag }}</span>
          <span class="text-gray-900 dark:text-white">{{ option.name }}</span>
          <span class="text-gray-500 dark:text-gray-400 text-sm ml-auto">{{
            option.dialCode
          }}</span>
        </div>
      </template>
    </Select>

    <!-- Phone Input -->
    <InputText
      v-model="phoneNumber"
      v-maska="phoneMaskOptions"
      :placeholder="phoneMaskDisplay"
      :disabled="disabled"
      :pt="{
        root: { class: 'flex-1' },
        input: {
          class:
            'w-full rounded-r-lg rounded-l-none border-l-0 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed py-2 px-3 border',
        },
      }"
      @input="handlePhoneInput"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
// v-maska directive is registered globally in main.ts

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
    countries.find((c) => c.code === selectedCountryCode.value) || countries[0],
);

// Get phone mask for input - convert maska format to maska pattern
const phoneMaskOptions = computed(() => ({
  mask: selectedCountry.value.mask,
  eager: true,
}));

// Display mask as placeholder (keep # as is)
const phoneMaskDisplay = computed(() => selectedCountry.value.mask);

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

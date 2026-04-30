<template>
  <div class="space-y-8">
    <!-- Theme -->
    <div class="space-y-3">
      <h3 class="text-base font-medium text-theme">Тема</h3>
      <div class="grid grid-cols-3 gap-3">
        <button
          v-for="option in themeOptions"
          :key="option.value"
          class="flex flex-col items-center gap-2 rounded-xl border border-deep-border p-4 transition-all duration-200 hover:border-purple-500/50"
          :class="[
            colorMode === option.value
              ? 'bg-purple-500/10 border-purple-500 text-purple-700 dark:text-white'
              : 'bg-elevated text-secondary hover:text-theme',
          ]"
          @click="setTheme(option.value)"
        >
          <i :class="[option.icon, 'text-xl']" />
          <span class="text-sm font-medium">{{ option.label }}</span>
        </button>
      </div>
    </div>

    <!-- Language -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-medium text-theme">Язык</h3>
        <Select
          v-model="selectedLanguage"
          :options="languageOptions"
          option-label="label"
          option-value="value"
          class="w-40"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useColorMode } from '@vueuse/core';
import Select from 'primevue/select';

const colorMode = useColorMode({
  attribute: 'class',
  selector: 'html',
});

const themeOptions = [
  { value: 'light', label: 'Светлая', icon: 'pi pi-sun' },
  { value: 'dark', label: 'Темная', icon: 'pi pi-moon' },
  { value: 'auto', label: 'Системная', icon: 'pi pi-desktop' },
];

const selectedLanguage = ref('ru');
const languageOptions = [
  { value: 'ru', label: 'Русский' },
];

function setTheme(mode: string) {
  colorMode.value = mode as 'light' | 'dark' | 'auto';
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-4">
    <!-- Logo / Brand -->
    <div class="mb-8 flex items-center gap-3">
      <AppLogo :size="48" />
      <span class="text-xl font-bold text-theme">WBOI</span>
    </div>

    <!-- Loading Indicator -->
    <div class="flex flex-col items-center gap-4">
      <ProgressSpinner
        style="width: 40px; height: 40px"
        stroke-width="4"
        animation-duration="1s"
      />
      <p class="text-gray-600 dark:text-gray-400 text-sm">
        Загрузка...
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppLogo from './AppLogo.vue';
import ProgressSpinner from 'primevue/progressspinner';
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center p-4">
    <!-- Logo / Brand -->
    <div class="mb-8">
      <div class="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
        <i class="pi pi-box text-white text-3xl"></i>
      </div>
    </div>
    
    <!-- Loading Indicator -->
    <div class="flex flex-col items-center gap-4">
      <ProgressSpinner 
        style="width: 40px; height: 40px" 
        strokeWidth="4"
        animationDuration="1s"
      />
      <p class="text-gray-600 dark:text-gray-400 text-sm">
        Загрузка...
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import ProgressSpinner from 'primevue/progressspinner';
</script>

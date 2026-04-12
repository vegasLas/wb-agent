<template>
  <div class="space-y-4">
    <UserAlerts />

    <div class="flex flex-col items-center justify-center h-96 text-gray-400">
      <div class="w-16 h-16 rounded-lg bg-blue-600 flex items-center justify-center mb-4">
        <i class="pi pi-chart-bar text-theme text-2xl" />
      </div>
      <p class="text-lg font-medium">
        MPStats
      </p>
      <p class="text-sm">
        Скоро...
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useViewReady } from '../composables/ui';
import UserAlerts from '../components/global/UserAlerts.vue';


const { viewReady } = useViewReady();

onMounted(() => {
  viewReady();
});
</script>

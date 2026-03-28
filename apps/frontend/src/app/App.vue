<template>
  <div class="min-h-screen bg-white dark:bg-[#171819]">
    <!-- Initial Loading Screen (shown only during first router guard execution) -->
    <InitialLoading v-if="isInitializing" />
    
    <!-- Main Router View -->
    <RouterView v-else />
    
    <!-- Global Components -->
    <Toast position="top-right" />
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Toast from 'primevue/toast';
import ConfirmDialog from 'primevue/confirmdialog';
import InitialLoading from '../components/layout/InitialLoading.vue';

const router = useRouter();
const isInitializing = ref(true);

// Wait for router to resolve initial navigation
onMounted(async () => {
  // The router navigation guard will handle initialization
  // We just need to wait for it to complete
  await router.isReady();
  isInitializing.value = false;
});
</script>

<style>
body {
  @apply bg-white dark:bg-[#171819];
}
</style>

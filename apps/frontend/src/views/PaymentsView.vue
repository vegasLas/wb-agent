<template>
  <div class="payment-view">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Магазин
      </h1>
      <p class="text-gray-600 dark:text-gray-400">
        Управление подпиской и выбор тарифа
      </p>
    </div>

    <div class="space-y-6">
      <Card>
        <template #content>
          <SubscriptionTariffs />
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useViewReady } from '../composables/ui';
import { useUserStore } from '@/stores/user';
import Card from 'primevue/card';
import SubscriptionTariffs from '../components/payment/SubscriptionTariffs.vue';

const { viewReady } = useViewReady();
const userStore = useUserStore();

onMounted(() => {
  viewReady();
});
</script>

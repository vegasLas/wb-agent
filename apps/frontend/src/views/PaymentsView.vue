<template>
  <div class="payment-view">
    <!-- Subscription Summary -->
    <div class="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Card>
        <template #content>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Подписка</p>
              <p
                :class="[
                  'text-lg font-semibold',
                  userStore.subscriptionActive ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
                ]"
              >
                {{ userStore.subscriptionActive ? `Активна, ${userStore.subscriptionRemainingDays} дн.` : 'Не активна' }}
              </p>
            </div>
            <i
              :class="[
                'pi text-2xl',
                userStore.subscriptionActive ? 'pi-check-circle text-green-600 dark:text-green-400' : 'pi-times-circle text-red-500 dark:text-red-400'
              ]"
            />
          </div>
        </template>
      </Card>
      <Card>
        <template #content>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Текущий план</p>
              <p class="text-lg font-semibold text-purple-600 dark:text-purple-400">
                {{ userStore.subscriptionTier }}
              </p>
            </div>
            <i class="pi pi-star text-2xl text-purple-600 dark:text-purple-400" />
          </div>
        </template>
      </Card>
    </div>

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
        <template #title>
          <h2 class="text-lg font-medium">
            Продление подписки
          </h2>
        </template>
        <template #content>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Выберите период подписки. При длительной подписке предусмотрены скидки.
          </p>
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

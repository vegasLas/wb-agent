<template>
  <div class="payment-view">
    <!-- Subscription & Credits Summary -->
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
              <p class="text-sm text-gray-500 dark:text-gray-400">Кредиты</p>
              <p class="text-lg font-semibold text-purple-600 dark:text-purple-400">
                {{ userStore.user.autobookingCount || 0 }}
              </p>
            </div>
            <i class="pi pi-wallet text-2xl text-purple-600 dark:text-purple-400" />
          </div>
        </template>
      </Card>
    </div>

    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Магазин
      </h1>
      <p class="text-gray-600 dark:text-gray-400">
        Управление подпиской и покупка кредитов для автобронирования
      </p>
    </div>

    <!-- Tabs -->
    <div class="mb-6">
      <div class="border-b border-gray-200 dark:border-gray-700">
        <nav class="flex gap-4">
          <button
            :class="[
              'leading-none py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'subscription'
                ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
            ]"
            @click="activeTab = 'subscription'"
          >
            Подписка
          </button>
          <button
            :class="[
              'leading-none py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'credits'
                ? 'border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
            ]"
            @click="activeTab = 'credits'"
          >
            Кредиты
          </button>
        </nav>
      </div>
    </div>

    <!-- Subscription Tab -->
    <div
      v-if="activeTab === 'subscription'"
      class="space-y-6"
    >
      <Card>
        <template #title>
          <h2 class="text-lg font-medium">
            Продление подписки
          </h2>
        </template>
        <template #content>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Выберите период подписки. При длительной подписке предусмотрены
            скидки.
          </p>
          <SubscriptionTariffs />
        </template>
      </Card>
    </div>

    <!-- Credits Tab -->
    <div
      v-if="activeTab === 'credits'"
      class="space-y-6"
    >
      <Card>
        <template #title>
          <h2 class="text-lg font-medium">
            Покупка кредитов
          </h2>
        </template>
        <template #content>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Кредиты используются для автоматического бронирования поставок. Один
            кредит = одна успешная бронь.
          </p>
          <PaymentTariffs />
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useViewReady } from '../composables/ui';
import { useUserStore } from '@/stores/user';
import Card from 'primevue/card';
import PaymentTariffs from '../components/payment/PaymentTariffs.vue';
import SubscriptionTariffs from '../components/payment/SubscriptionTariffs.vue';

// Skeleton control
const { viewReady } = useViewReady();
const userStore = useUserStore();

const activeTab = ref<'subscription' | 'credits'>('subscription');

onMounted(() => {
  viewReady();
});
</script>

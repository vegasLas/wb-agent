<template>
  <div class="payment-view">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Магазин</h1>
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
              'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'subscription'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            ]"
            @click="activeTab = 'subscription'"
          >
            Подписка
          </button>
          <button
            :class="[
              'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === 'credits'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            ]"
            @click="activeTab = 'credits'"
          >
            Кредиты
          </button>
        </nav>
      </div>
    </div>

    <!-- Subscription Tab -->
    <div v-if="activeTab === 'subscription'" class="space-y-6">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Продление подписки</h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Выберите период подписки. При длительной подписке предусмотрены скидки.
        </p>
        <SubscriptionTariffs />
      </div>
    </div>

    <!-- Credits Tab -->
    <div v-if="activeTab === 'credits'" class="space-y-6">
      <div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h2 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Покупка кредитов</h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Кредиты используются для автоматического бронирования поставок.
          Один кредит = одна успешная бронь.
        </p>
        <PaymentTariffs />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import PaymentTariffs from './PaymentTariffs.vue';
import SubscriptionTariffs from './SubscriptionTariffs.vue';

const activeTab = ref<'subscription' | 'credits'>('subscription');
</script>

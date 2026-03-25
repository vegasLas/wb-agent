<template>
  <div class="store-component space-y-6">
    <!-- Header with Subscription Status Badge and Toggle Buttons -->
    <div class="flex justify-between mb-6 items-center">
      <!-- Subscription Status Badge -->
      <div class="flex items-center">
        <span
          v-if="userStore.subscriptionActive"
          class="px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded-full"
        >
          осталось дней: {{ userStore.subscriptionRemainingDays }}
        </span>
        <span
          v-else
          class="px-3 py-1 text-sm font-medium bg-red-100 text-red-800 rounded-full flex items-center gap-1"
        >
          <ExclamationTriangleIcon class="w-4 h-4" />
          нет подписки
        </span>
      </div>

      <!-- Toggle Buttons Group -->
      <div class="flex gap-2">
        <BaseButton
          :color="activeTab === 'subscription' ? 'primary' : 'gray'"
          size="sm"
          @click="activeTab = 'subscription'"
        >
          подписка
        </BaseButton>
        <BaseButton
          :color="activeTab === 'bookings' ? 'primary' : 'gray'"
          size="sm"
          @click="activeTab = 'bookings'"
        >
          кредиты
        </BaseButton>
        <BaseButton
          :color="activeTab === 'api' ? 'primary' : 'gray'"
          size="sm"
          @click="activeTab = 'api'"
        >
          API
        </BaseButton>
      </div>
    </div>

    <!-- Content -->
    <div class="tab-content">
      <!-- Subscription Tab -->
      <div v-if="activeTab === 'subscription'">
        <div class="bg-white dark:bg-gray-800 rounded-lg p-4 border mb-4">
          <h3 class="font-medium mb-2">Статус подписки</h3>
          <div v-if="userStore.subscriptionActive" class="text-green-600">
            <CheckCircleIcon class="w-5 h-5 inline mr-1" />
            Активна до {{ formatDate(userStore.user.subscriptionExpiresAt) }}
          </div>
          <div v-else class="text-red-500">
            <XCircleIcon class="w-5 h-5 inline mr-1" />
            Не активна
          </div>
        </div>
        <SubscriptionTariffs @select="onSelectTariff" />
      </div>

      <!-- Bookings/Credits Tab -->
      <div v-else-if="activeTab === 'bookings'">
        <PaymentTariffs @select="onSelectBookingTariff" />
      </div>

      <!-- API Key Tab -->
      <div v-else-if="activeTab === 'api'">
        <SupplierApiKeyComponent />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useUserStore } from '../../stores/user';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/vue/24/solid';
import { BaseButton } from '../ui';
import SubscriptionTariffs from '../payment/SubscriptionTariffs.vue';
import PaymentTariffs from '../payment/PaymentTariffs.vue';
import SupplierApiKeyComponent from './SupplierApiKeyComponent.vue';
import type { SubscriptionTariff, BookingTariff } from '../../constants';

const userStore = useUserStore();

const activeTab = ref<'subscription' | 'bookings' | 'api'>('subscription');

function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function onSelectTariff(tariff: SubscriptionTariff) {
  // Handle tariff selection - will be implemented in Plan 12
  console.log('Selected subscription tariff:', tariff);
}

function onSelectBookingTariff(tariff: BookingTariff) {
  // Handle booking tariff selection - will be implemented in Plan 12
  console.log('Selected booking tariff:', tariff);
}

// Listen for custom event to switch to subscription tab
function handleSwitchToSubscription() {
  activeTab.value = 'subscription';
}

onMounted(() => {
  window.addEventListener('switch-to-subscription-tab', handleSwitchToSubscription);
});

onUnmounted(() => {
  window.removeEventListener('switch-to-subscription-tab', handleSwitchToSubscription);
});
</script>

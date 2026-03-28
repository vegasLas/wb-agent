<template>
  <div class="store-component space-y-6">
    <!-- Header with Subscription Status Badge and Toggle Buttons -->
    <div class="flex justify-between mb-6 items-center">
      <!-- Subscription Status Badge -->
      <div class="flex items-center">
        <Tag
          v-if="userStore.subscriptionActive"
          severity="success"
          :value="`осталось дней: ${userStore.subscriptionRemainingDays}`"
        />
        <Tag
          v-else
          severity="danger"
          icon="pi pi-exclamation-triangle"
          value="нет подписки"
        />
      </div>

      <!-- Toggle Buttons Group -->
      <div class="flex gap-2">
        <Button
          :severity="activeTab === 'subscription' ? 'primary' : 'secondary'"
          size="small"
          @click="activeTab = 'subscription'"
        >
          подписка
        </Button>
        <Button
          :severity="activeTab === 'bookings' ? 'primary' : 'secondary'"
          size="small"
          @click="activeTab = 'bookings'"
        >
          кредиты
        </Button>
        <Button
          :severity="activeTab === 'api' ? 'primary' : 'secondary'"
          size="small"
          @click="activeTab = 'api'"
        >
          API
        </Button>
      </div>
    </div>

    <!-- Content -->
    <div class="tab-content">
      <!-- Subscription Tab -->
      <div v-if="activeTab === 'subscription'">
        <Card class="mb-4">
          <template #title>
            <h3 class="font-medium">Статус подписки</h3>
          </template>
          <template #content>
            <div v-if="userStore.subscriptionActive" class="text-green-600">
              <i class="pi pi-check-circle mr-1"></i>
              Активна до {{ formatDate(userStore.user.subscriptionExpiresAt) }}
            </div>
            <div v-else class="text-red-500">
              <i class="pi pi-times-circle mr-1"></i>
              Не активна
            </div>
          </template>
        </Card>
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
import { useUserStore } from '../stores/user';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Tag from 'primevue/tag';
import SubscriptionTariffs from '../components/payment/SubscriptionTariffs.vue';
import PaymentTariffs from '../components/payment/PaymentTariffs.vue';
import SupplierApiKeyComponent from '../components/store/SupplierApiKeyComponent.vue';
import type { SubscriptionTariff, BookingTariff } from '../constants';

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

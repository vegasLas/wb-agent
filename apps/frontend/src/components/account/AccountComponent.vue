<template>
  <div class="space-y-4">
    <!-- Current Account & Supplier Info -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">Текущий аккаунт</h3>
          <BaseButton
            size="sm"
            variant="outline"
            @click="accountModalStore.showModal = true"
          >
            Изменить
          </BaseButton>
        </div>

        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <DevicePhoneMobileIcon class="w-4 h-4 text-blue-500" />
            <span class="text-sm"
              >Аккаунт:
              {{
                userStore.selectedAccount
                  ? !userStore.selectedAccount.phoneWb
                    ? 'Номер не указан'
                    : userStore.selectedAccount.phoneWb
                  : 'Не выбран'
              }}</span
            >
          </div>
          <div class="flex items-center gap-2">
            <BuildingStorefrontIcon class="w-4 h-4 text-green-500" />
            <span class="text-sm">{{
              userStore.activeSupplier?.supplierName || 'Поставщик не выбран'
            }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Subscription Status -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div class="flex flex-col space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">подписка:</h3>
          <span
            :class="[
              'px-2 py-1 text-xs font-medium rounded-full',
              subscriptionActive
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
            ]"
          >
            {{
              subscriptionActive
                ? `осталось дней: ${subscriptionRemainingDays}`
                : 'неактивна'
            }}
          </span>
        </div>
      </div>
    </div>

    <!-- Autobooking Count -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold">кредитов:</h3>
        <span class="text-lg font-medium">{{ user.autobookingCount }}</span>
      </div>
    </div>

    <!-- Supplier API Key -->
    <SupplierApiKeyComponent />

    <!-- Payment History -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold">история платежей</h3>
      </div>

      <div v-if="user.payments && user.payments.length > 0" class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th
                scope="col"
                class="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                Дата
              </th>
              <th
                scope="col"
                class="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                Тариф
              </th>
              <th
                scope="col"
                class="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                Статус
              </th>
              <th
                scope="col"
                class="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                Сумма
              </th>
            </tr>
          </thead>
          <tbody
            class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 max-h-[300px] overflow-y-auto"
          >
            <tr v-for="payment in user.payments" :key="payment.id">
              <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                {{ formatDate(payment.createdAt) }}
              </td>
              <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                {{ getTariffTitle(payment.tariffId) }}
              </td>
              <td class="px-3 py-3 whitespace-nowrap text-sm">
                <span
                  :class="[
                    'px-2 py-1 text-xs font-medium rounded-full',
                    payment.status === 'succeeded'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
                  ]"
                >
                  {{ payment.status === 'succeeded' ? 'Оплачено' : 'Не оплачено' }}
                </span>
              </td>
              <td class="px-3 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                {{ payment.amount }} {{ payment.currency || 'RUB' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="text-center py-8 text-gray-500 dark:text-gray-400">
        <CircleStackIcon class="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Нет платежей</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import {
  DevicePhoneMobileIcon,
  BuildingStorefrontIcon,
  CircleStackIcon,
} from '@heroicons/vue/24/outline';
import { BaseButton } from '../ui';
import SupplierApiKeyComponent from '../store/SupplierApiKeyComponent.vue';
import { useUserStore } from '../../stores/user';
import { useAccountSupplierModalStore } from '../../stores/accountSupplierModal';

// Stores
const userStore = useUserStore();
const accountModalStore = useAccountSupplierModalStore();

// Route handling for action query
const route = useRoute();
const action = route.query.action as string;

// Handle action query
if (action && ['change_supplier'].includes(action)) {
  accountModalStore.showModal = true;
}

// Computed refs from store
const { user, subscriptionActive, subscriptionRemainingDays } = storeToRefs(userStore);

// Helper function to format date
function formatDate(dateString: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Helper function to get tariff title
function getTariffTitle(tariffId?: string): string {
  if (!tariffId) return '-';
  const tariffMap: Record<string, string> = {
    basic: 'Базовый',
    pro: 'Про',
    enterprise: 'Enterprise',
    premium: 'Премиум',
  };
  return tariffMap[tariffId] || tariffId;
}
</script>

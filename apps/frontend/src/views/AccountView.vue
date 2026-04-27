<template>
  <div class="space-y-4">
    <!-- Current Account & Supplier Info -->
    <Card>
      <template #content>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">
              Текущий аккаунт
            </h3>
            <Button
              size="small"
              variant="outlined"
              @click="accountModalStore.showModal = true"
            >
              Изменить
            </Button>
          </div>

          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <i class="pi pi-mobile text-blue-500 dark:text-blue-400" />
              <span class="text-sm">Аккаунт:
                {{
                  userStore.selectedAccount
                    ? !userStore.selectedAccount.phoneWb
                      ? 'Номер не указан'
                      : userStore.selectedAccount.phoneWb
                    : 'Не выбран'
                }}</span>
            </div>
            <div class="flex items-center gap-2">
              <i class="pi pi-building text-green-500 dark:text-green-400" />
              <span class="text-sm">{{
                userStore.activeSupplier?.supplierName || 'Поставщик не выбран'
              }}</span>
            </div>
          </div>
        </div>
      </template>
    </Card>

    <!-- Subscription Status -->
    <Card>
      <template #content>
        <div class="flex flex-col space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">
              подписка:
            </h3>
            <div class="flex items-center gap-2">
              <Tag
                :value="subscriptionTier"
                :severity="
                  subscriptionTier === 'MAX' ? 'warn' :
                  subscriptionTier === 'PRO' ? 'info' : 'secondary'
                "
              />
              <Tag
                :value="
                  subscriptionActive
                    ? `осталось дней: ${subscriptionRemainingDays}`
                    : 'неактивна'
                "
                :severity="subscriptionActive ? 'success' : 'danger'"
              />
            </div>
          </div>
        </div>
      </template>
    </Card>

    <!-- Usage Limits -->
    <Card>
      <template #title>
        <h3 class="text-lg font-semibold">Лимиты</h3>
      </template>
      <template #content>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm">Аккаунты WB</span>
            <span class="text-sm font-medium">{{ user.accounts?.length ?? 0 }} / {{ maxAccountsLabel }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm">Автобронирования</span>
            <span class="text-sm font-medium">{{ limits?.autobookingSlots?.used ?? 0 }} / {{ limits?.autobookingSlots?.max ?? '-' }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm">Перепланирования</span>
            <span class="text-sm font-medium">{{ limits?.rescheduleSlots?.used ?? 0 }} / {{ limits?.rescheduleSlots?.max ?? '-' }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm">Отзывы (AI/мес)</span>
            <span class="text-sm font-medium">{{ limits?.feedbackQuota?.used ?? 0 }} / {{ limits?.feedbackQuota?.max ?? '∞' }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm">AI чат</span>
            <div class="flex items-center gap-2">
              <ProgressBar
                :value="aiChatPercentage"
                class="w-24 h-2"
                :class="aiChatPercentage >= 90 ? 'p-progressbar-danger' : aiChatPercentage >= 70 ? 'p-progressbar-warn' : 'p-progressbar-success'"
              />
              <span class="text-sm font-medium">{{ aiChatPercentage }}%</span>
            </div>
          </div>
        </div>
      </template>
    </Card>

    <!-- Supplier API Key -->
    <SupplierApiKeyComponent />

    <!-- MPStats Token -->
    <MpstatsTokenComponent />

    <!-- Payment History -->
    <Card>
      <template #title>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">
            история платежей
          </h3>
        </div>
      </template>
      <template #content>
        <div
          v-if="user.payments && user.payments.length > 0"
          class="overflow-x-auto"
        >
          <DataTable
            :value="user.payments"
            scrollable
            scroll-height="300px"
            class="p-datatable-sm"
          >
            <Column
              field="createdAt"
              header="Дата"
            >
              <template #body="{ data }">
                {{ formatDate(data.createdAt) }}
              </template>
            </Column>
            <Column
              field="tariffId"
              header="Тариф"
            >
              <template #body="{ data }">
                {{ getTariffTitle(data.tariffId) }}
              </template>
            </Column>
            <Column
              field="status"
              header="Статус"
            >
              <template #body="{ data }">
                <Tag
                  :value="
                    data.status === 'succeeded' ? 'Оплачено' : 'Не оплачено'
                  "
                  :severity="data.status === 'succeeded' ? 'success' : 'warn'"
                />
              </template>
            </Column>
            <Column
              field="amount"
              header="Сумма"
            >
              <template #body="{ data }">
                {{ data.amount }} {{ data.currency || 'RUB' }}
              </template>
            </Column>
          </DataTable>
        </div>

        <div
          v-else
          class="text-center py-8 text-gray-500 dark:text-gray-400"
        >
          <i class="pi pi-database text-5xl mx-auto mb-2 opacity-50 block" />
          <p>Нет платежей</p>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { onMounted, ref, computed } from 'vue';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Tag from 'primevue/tag';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import ProgressBar from 'primevue/progressbar';
import SupplierApiKeyComponent from '../components/store/SupplierApiKeyComponent.vue';
import MpstatsTokenComponent from '../components/mpstats/MpstatsTokenComponent.vue';

import { useUserStore } from '@/stores/user';
import { useAccountSupplierModalStore } from '@/stores/ui';
import { useViewReady } from '../composables/ui';
import apiClient from '@/api/client';

const { viewReady } = useViewReady();

const userStore = useUserStore();
const accountModalStore = useAccountSupplierModalStore();

const route = useRoute();
const action = route.query.action as string;

if (action && ['change_supplier'].includes(action)) {
  accountModalStore.showModal = true;
}

const { user, subscriptionActive, subscriptionRemainingDays, subscriptionTier, maxAccounts } =
  storeToRefs(userStore);

const limits = ref<any>(null);

const maxAccountsLabel = computed(() => {
  if (maxAccounts.value === Infinity) return '∞';
  return String(maxAccounts.value);
});

const aiChatPercentage = computed(() => {
  const spent = limits.value?.aiChatBudget?.spent ?? 0;
  const max = limits.value?.aiChatBudget?.max ?? 0;
  if (max <= 0) return 0;
  return Math.min(100, Math.round((spent / max) * 100));
});

async function fetchLimits() {
  try {
    const response = await apiClient.get('/user/limits');
    limits.value = response.data;
  } catch (error) {
    console.error('Failed to fetch limits:', error);
  }
}

onMounted(() => {
  requestAnimationFrame(() => {
    viewReady();
  });
  fetchLimits();
});

function formatDate(dateString: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getTariffTitle(tariffId?: string): string {
  if (!tariffId) return '-';
  const map: Record<string, string> = {
    'lite-30': 'Lite 1 мес',
    'lite-90': 'Lite 3 мес',
    'lite-365': 'Lite 1 год',
    'pro-30': 'Pro 1 мес',
    'pro-90': 'Pro 3 мес',
    'pro-365': 'Pro 1 год',
    'max-30': 'Max 1 мес',
    'max-90': 'Max 3 мес',
    'max-365': 'Max 1 год',
  };
  return map[tariffId] || tariffId;
}
</script>

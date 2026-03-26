<template>
  <div class="space-y-4">
    <!-- Current Account & Supplier Info -->
    <Card>
      <template #content>
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">Текущий аккаунт</h3>
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
              <i class="pi pi-mobile text-blue-500" />
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
              <i class="pi pi-building text-green-500" />
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
            <h3 class="text-lg font-semibold">подписка:</h3>
            <Tag
              :value="subscriptionActive ? `осталось дней: ${subscriptionRemainingDays}` : 'неактивна'"
              :severity="subscriptionActive ? 'success' : 'danger'"
            />
          </div>
        </div>
      </template>
    </Card>

    <!-- Autobooking Count -->
    <Card>
      <template #content>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">кредитов:</h3>
          <span class="text-lg font-medium">{{ user.autobookingCount }}</span>
        </div>
      </template>
    </Card>

    <!-- Supplier API Key -->
    <SupplierApiKeyComponent />

    <!-- Payment History -->
    <Card>
      <template #title>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">история платежей</h3>
        </div>
      </template>
      <template #content>
        <div v-if="user.payments && user.payments.length > 0" class="overflow-x-auto">
          <DataTable :value="user.payments" scrollable scrollHeight="300px" class="p-datatable-sm">
            <Column field="createdAt" header="Дата">
              <template #body="{ data }">
                {{ formatDate(data.createdAt) }}
              </template>
            </Column>
            <Column field="tariffId" header="Тариф">
              <template #body="{ data }">
                {{ getTariffTitle(data.tariffId) }}
              </template>
            </Column>
            <Column field="status" header="Статус">
              <template #body="{ data }">
                <Tag
                  :value="data.status === 'succeeded' ? 'Оплачено' : 'Не оплачено'"
                  :severity="data.status === 'succeeded' ? 'success' : 'warn'"
                />
              </template>
            </Column>
            <Column field="amount" header="Сумма">
              <template #body="{ data }">
                {{ data.amount }} {{ data.currency || 'RUB' }}
              </template>
            </Column>
          </DataTable>
        </div>

        <div v-else class="text-center py-8 text-gray-500 dark:text-gray-400">
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
import Button from 'primevue/button';
import Card from 'primevue/card';
import Tag from 'primevue/tag';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
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

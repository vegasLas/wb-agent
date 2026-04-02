<template>
  <div @click.stop>
    <h4 class="text-lg font-medium mb-3">
      Выберите аккаунт WB
    </h4>
    <div
      v-if="hasAccounts"
      class="space-y-2 max-h-60 overflow-y-auto"
    >
      <AccountCard
        v-for="account in accounts"
        :key="account.id"
        :account="account"
        :is-selected="tempSelectedAccountId === account.id"
        @select="$emit('select-account', $event)"
        @remove="$emit('remove-account', $event)"
      />
    </div>

    <!-- Subscription Required -->
    <div
      v-if="!userStore.subscriptionActive"
      class="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg"
    >
      <div class="flex items-start gap-3">
        <i class="pi pi-exclamation-triangle text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
        <div class="flex-1">
          <h5 class="font-medium text-orange-900 dark:text-orange-100 mb-1">
            Требуется подписка
          </h5>
          <Button
            label="Купить подписку"
            size="small"
            severity="warn"
            @click="openShop"
          />
        </div>
      </div>
    </div>
    <AddAccountCard
      v-else
      @add-account="$emit('add-account')"
    />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import AccountCard from './AccountCard.vue';
import AddAccountCard from './AddAccountCard.vue';
import { useUserStore } from '../../stores/user';
import type { Account } from '../../stores/user';

interface Props {
  accounts: Account[];
  hasAccounts: boolean;
  tempSelectedAccountId: string | null;
}

defineProps<Props>();
defineEmits<{
  'select-account': [accountId: string];
  'add-account': [];
  'remove-account': [accountId: string];
}>();

const router = useRouter();
const userStore = useUserStore();

function openShop() {
  router.push({ name: 'StoreSubscription' });
}
</script>

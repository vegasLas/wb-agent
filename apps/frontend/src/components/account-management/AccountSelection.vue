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
        :removing-account-id="removingAccountId"
        @select="$emit('select-account', $event)"
        @remove="$emit('remove-account', $event)"
      />
    </div>

    <!-- Account Limit Reached -->
    <div
      v-if="!userStore.canAddAccount"
      class="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
    >
      <div class="flex items-start gap-3">
        <i
          class="pi pi-ban text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0"
        />
        <div class="flex-1">
          <h5 class="font-medium text-red-900 dark:text-red-100 mb-1">
            Достигнут лимит аккаунтов
          </h5>
          <p class="text-sm text-red-800 dark:text-red-200 mb-2">
            Вы не можете добавить больше аккаунтов. Обновите подписку для увеличения лимита.
          </p>
          <Button
            label="Купить подписку"
            size="small"
            severity="danger"
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
import { useUserStore } from '@/stores/user';
import type { Account } from '@/stores/user';

interface Props {
  accounts: Account[];
  hasAccounts: boolean;
  tempSelectedAccountId: string | null;
  removingAccountId: string | null;
}

defineProps<Props>();
const emit = defineEmits<{
  'select-account': [accountId: string];
  'add-account': [];
  'remove-account': [accountId: string];
  'open-shop': [];
}>();

const router = useRouter();
const userStore = useUserStore();

function openShop() {
  emit('open-shop');
  router.push({ name: 'Payments' });
}
</script>

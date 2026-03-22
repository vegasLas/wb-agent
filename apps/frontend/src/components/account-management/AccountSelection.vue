<template>
  <div @click.stop>
    <h4 class="text-lg font-medium mb-3">Выберите аккаунт WB</h4>
    <div v-if="hasAccounts" class="space-y-2 max-h-60 overflow-y-auto">
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
        <ExclamationTriangleIcon class="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
        <div class="flex-1">
          <h5 class="font-medium text-orange-900 dark:text-orange-100 mb-1">
            Требуется подписка
          </h5>
          <BaseButton size="sm" color="yellow" @click="openShop">
            Купить подписку
          </BaseButton>
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
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline';
import { BaseButton } from '../ui';
import AccountCard from './AccountCard.vue';
import AddAccountCard from './AddAccountCard.vue';
import { useUserStore } from '../../stores/user';
import { useViewStore } from '../../stores/view';
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

const userStore = useUserStore();
const viewStore = useViewStore();

function openShop() {
  viewStore.setView('store-subscription');
}
</script>

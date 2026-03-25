<template>
  <div class="space-y-3">
    <!-- Subscription Alert - First Priority -->
    <template v-if="!userStore.subscriptionActive">
      <BaseAlert
        title="Подписка не активна"
        description="Для использования сервиса требуется активная подписка. Пожалуйста, оформите подписку для продолжения работы."
        color="red"
        icon="error"
      >
        <template #actions>
          <BaseButton
            variant="soft"
            color="primary"
            size="sm"
            @click="navigateToSubscription"
          >
            Купить подписку
          </BaseButton>
        </template>
      </BaseAlert>
    </template>

    <!-- Account Selection Alert - Second Priority -->
    <template v-else-if="!userStore.user.selectedAccountId">
      <BaseAlert
        color="orange"
        icon="warning"
        title="Необходимо выбрать аккаунт"
        description="Для использования сервиса необходимо выбрать активный аккаунт WB."
      >
        <template #actions>
          <BaseButton
            variant="soft"
            color="primary"
            size="sm"
            @click="openAccountModal"
          >
            Выбрать аккаунт
          </BaseButton>
        </template>
      </BaseAlert>
    </template>

    <!-- Supplier Selection Alert - Third Priority -->
    <template v-else-if="!userStore.hasValidSupplier">
      <BaseAlert
        color="red"
        icon="error"
        title="Необходимо выбрать поставщика"
        description="Выбранный аккаунт не имеет активного поставщика. Выберите поставщика для продолжения работы."
      >
        <template #actions>
          <BaseButton
            variant="soft"
            color="primary"
            size="sm"
            @click="openAccountModal"
          >
            Выбрать поставщика
          </BaseButton>
        </template>
      </BaseAlert>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { BaseAlert, BaseButton } from '../ui';
import { useUserStore } from '../../stores/user';
import { useViewStore } from '../../stores/view';
import { useAccountSupplierModalStore } from '../../stores/accountSupplierModal';

const router = useRouter();
const userStore = useUserStore();
const viewStore = useViewStore();
const accountModalStore = useAccountSupplierModalStore();

function navigateToSubscription() {
  viewStore.setView('store-subscription');
  router.push('/store');
}

function openAccountModal() {
  accountModalStore.showModal = true;
}
</script>

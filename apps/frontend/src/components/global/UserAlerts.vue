<template>
  <div class="space-y-3">
    <!-- Subscription Alert - First Priority -->
    <template v-if="!userStore.subscriptionActive">
      <Message
        severity="error"
        :closable="false"
        class="w-full"
      >
        <div class="flex flex-col gap-2">
          <div class="font-medium">
            Подписка не активна
          </div>
          <div class="text-sm opacity-90">
            Для использования сервиса требуется активная подписка. Пожалуйста,
            оформите подписку для продолжения работы.
          </div>
          <div class="mt-2">
            <Button
              severity="primary"
              variant="outlined"
              size="small"
              label="Купить подписку"
              @click="navigateToSubscription"
            />
          </div>
        </div>
      </Message>
    </template>

    <!-- Account Selection Alert - Second Priority -->
    <template v-else-if="!userStore.user.selectedAccountId">
      <Message
        severity="warn"
        :closable="false"
        class="w-full"
      >
        <div class="flex flex-col gap-2">
          <div class="font-medium">
            Необходимо выбрать аккаунт
          </div>
          <div class="text-sm opacity-90">
            Для использования сервиса необходимо выбрать активный аккаунт WB.
          </div>
          <div class="mt-2">
            <Button
              severity="primary"
              variant="outlined"
              size="small"
              label="Выбрать аккаунт"
              @click="openAccountModal"
            />
          </div>
        </div>
      </Message>
    </template>

    <!-- Supplier Selection Alert - Third Priority -->
    <template v-else-if="!userStore.hasValidSupplier">
      <Message
        severity="error"
        :closable="false"
        class="w-full"
      >
        <div class="flex flex-col gap-2">
          <div class="font-medium">
            Необходимо выбрать поставщика
          </div>
          <div class="text-sm opacity-90">
            Выбранный аккаунт не имеет активного поставщика. Выберите поставщика
            для продолжения работы.
          </div>
          <div class="mt-2">
            <Button
              severity="primary"
              variant="outlined"
              size="small"
              label="Выбрать поставщика"
              @click="openAccountModal"
            />
          </div>
        </div>
      </Message>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import Message from 'primevue/message';
import Button from 'primevue/button';
import { useUserStore } from '@/stores/user';
import { useAccountSupplierModalStore } from '@/stores/ui';

const router = useRouter();
const userStore = useUserStore();
const accountModalStore = useAccountSupplierModalStore();

function navigateToSubscription() {
  router.push({ name: 'StoreSubscription' });
}

function openAccountModal() {
  accountModalStore.showModal = true;
}
</script>

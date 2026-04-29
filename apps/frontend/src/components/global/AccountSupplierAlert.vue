<template>
  <div class="space-y-3">
    <!-- Account Selection Alert -->
    <Message
      v-if="route.meta.requiresAccount && !userStore.user.selectedAccountId"
      severity="info"
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

    <!-- Supplier Selection Alert -->
    <Message
      v-else-if="route.meta.requiresSupplier && !userStore.hasValidSupplier"
      severity="warn"
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

    <!-- Permission Alert -->
    <Message
      v-else-if="route.name && !canAccessRoute(route.name as string)"
      severity="warn"
      :closable="false"
      class="w-full"
    >
      <div class="flex flex-col gap-2">
        <div class="font-medium">
          Нет доступа к функции
        </div>
        <div class="text-sm opacity-90">
          Ваш аккаунт WB не имеет доступа к этой функции.
        </div>
      </div>
    </Message>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import Message from 'primevue/message';
import Button from 'primevue/button';
import { useUserStore } from '@/stores/user';
import { useAccountSupplierModalStore } from '@/stores/ui';
import { usePermissions } from '@/composables/usePermissions';

const route = useRoute();
const userStore = useUserStore();
const accountModalStore = useAccountSupplierModalStore();
const { canAccessRoute } = usePermissions();

function openAccountModal() {
  accountModalStore.showModal = true;
}
</script>

<template>
  <Message
    v-if="!userStore.subscriptionActive && !userStore.isFree"
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

<script setup lang="ts">
import { useRouter } from 'vue-router';
import Message from 'primevue/message';
import Button from 'primevue/button';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const userStore = useUserStore();

function navigateToSubscription() {
  router.push({ name: 'StoreSubscription' });
}
</script>

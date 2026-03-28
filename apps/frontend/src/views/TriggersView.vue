<template>
  <div>
    <!-- Subscription Alert -->
    <div v-if="!userStore.subscriptionActive">
      <Message severity="error" :closable="false" class="mb-4">
        <div class="flex flex-col gap-2">
          <div class="font-medium">Подписка не активна</div>
          <div class="text-sm">Для использования сервиса требуется активная подписка. Пожалуйста, оформите подписку для продолжения работы.</div>
          <div class="mt-2">
            <Button 
              severity="primary" 
              variant="outlined"
              @click="navigateToStoreSubscription"
            >
              Купить подписку
            </Button>
          </div>
        </div>
      </Message>
    </div>

    <!-- Router View for child routes -->
    <RouterView v-else />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTriggerStore } from '../stores/triggers';
import { useUserStore } from '../stores/user';
import Message from 'primevue/message';
import Button from 'primevue/button';

const router = useRouter();
const triggerStore = useTriggerStore();
const userStore = useUserStore();

function navigateToStoreSubscription() {
  router.push({ name: 'StoreSubscription' });
}

onMounted(async () => {
  if (triggerStore.triggers.length === 0) {
    await triggerStore.fetchTriggers();
  }
});
</script>

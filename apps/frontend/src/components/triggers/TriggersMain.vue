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
              @click="viewStore.setView('store-subscription')"
            >
              Купить подписку
            </Button>
          </div>
        </div>
      </Message>
    </div>

    <!-- Main View -->
    <div v-else-if="viewStore.currentView === 'triggers-main'">
      <Message
        v-if="triggerStore.activeTriggersCount >= 30"
        severity="warn"
        :closable="false"
        class="mb-4"
      >
        <div class="font-medium">Достигнут лимит активных таймслотов</div>
        <div class="text-sm">У вас уже активировано максимальное количество таймслотов (30). Отключите некоторые таймслоты, чтобы активировать новые.</div>
      </Message>
      <TriggersList />
    </div>

    <!-- Form View -->
    <TriggerForm
      v-else-if="viewStore.currentView === 'triggers-form'"
      @back="viewStore.setView('triggers-main')"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useTriggerStore } from '../../stores/triggers';
import { useViewStore } from '../../stores/view';
import { useUserStore } from '../../stores/user';
import TriggersList from './TriggersList.vue';
import TriggerForm from './TriggerForm.vue';
import Message from 'primevue/message';
import Button from 'primevue/button';

const triggerStore = useTriggerStore();
const viewStore = useViewStore();
const userStore = useUserStore();

onMounted(async () => {
  if (triggerStore.triggers.length === 0) {
    await triggerStore.fetchTriggers();
  }
});
</script>

<template>
  <div>
    <!-- Subscription Alert -->
    <div v-if="!userStore.subscriptionActive">
      <BaseAlert
        title="Подписка не активна"
        description="Для использования сервиса требуется активная подписка. Пожалуйста, оформите подписку для продолжения работы."
        color="red"
        variant="soft"
      >
        <template #actions>
          <BaseButton 
            color="primary" 
            variant="soft"
            @click="viewStore.setView('store-subscription')"
          >
            Купить подписку
          </BaseButton>
        </template>
      </BaseAlert>
    </div>

    <!-- Main View -->
    <div v-else-if="viewStore.currentView === 'triggers-main'">
      <BaseAlert
        v-if="triggerStore.activeTriggersCount >= 30"
        title="Достигнут лимит активных таймслотов"
        description="У вас уже активировано максимальное количество таймслотов (30). Отключите некоторые таймслоты, чтобы активировать новые."
        color="yellow"
        variant="soft"
        class="mb-4"
      />
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
import BaseAlert from '../ui/BaseAlert.vue';
import BaseButton from '../ui/BaseButton.vue';

const triggerStore = useTriggerStore();
const viewStore = useViewStore();
const userStore = useUserStore();

onMounted(async () => {
  if (triggerStore.triggers.length === 0) {
    await triggerStore.fetchTriggers();
  }
});
</script>

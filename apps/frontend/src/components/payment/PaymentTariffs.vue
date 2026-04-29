<template>
  <div class="space-y-4">
    <Message severity="info">
      <div class="space-y-2">
        <p class="font-medium">Автобронирования теперь по слотам</p>
        <p>
          Вместо покупки кредитов вы получаете активные слоты в зависимости от подписки:
          <strong>Lite — 2 слота, Pro — 10 слотов, Max — 30 слотов</strong>.
        </p>
        <Button
          size="small"
          variant="outlined"
          @click="goToStore"
        >
          Выбрать подписку
        </Button>
      </div>
    </Message>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import Message from 'primevue/message';

const router = useRouter();

function goToStore() {
  router.push({ name: 'Payments' });
}
</script>

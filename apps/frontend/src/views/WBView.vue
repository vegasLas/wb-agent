<template>
  <div class="space-y-4">
    <UserAlerts />

    <!-- Top Navigation Buttons -->
    <div class="flex gap-3">
      <Button severity="primary" class="flex-1" @click="showPromotions = true">
        <i class="pi pi-tag mr-2" />
        акции
      </Button>
      <Button severity="secondary" class="flex-1" @click="showBalances = true">
        <i class="pi pi-wallet mr-2" />
        остаток
      </Button>
    </div>

    <!-- Main WB Content -->
    <div
      v-if="!showPromotions && !showBalances"
      class="flex flex-col items-center justify-center h-96 text-gray-400"
    >
      <div
        class="w-16 h-16 rounded-lg bg-purple-600 flex items-center justify-center mb-4"
      >
        <span class="text-theme font-bold text-2xl">WB</span>
      </div>
      <p class="text-lg font-medium">Wildberries</p>
      <p class="text-sm">Центр управления WB</p>

      <!-- Quick Stats -->
      <div class="grid grid-cols-2 gap-4 mt-8 w-full max-w-sm">
        <Card class="text-center">
          <template #content>
            <div class="text-2xl font-bold text-purple-600">
              {{ promotionsCount }}
            </div>
            <div class="text-xs text-gray-500">Акций доступно</div>
          </template>
        </Card>
        <Card class="text-center">
          <template #content>
            <div class="text-2xl font-bold text-blue-600">
              {{ reportsAvailable ? 'Да' : 'Нет' }}
            </div>
            <div class="text-xs text-gray-500">Отчеты</div>
          </template>
        </Card>
      </div>
    </div>

    <!-- Promotions View -->
    <div v-if="showPromotions" class="space-y-4">
      <PromotionsView />
    </div>

    <!-- Balances/Reports View -->
    <div v-if="showBalances" class="space-y-4">
      <div class="flex items-center gap-2">
        <Button
          icon="pi pi-arrow-left"
          text
          severity="secondary"
          @click="showBalances = false"
        />
        <span class="font-medium">Отчеты и остаток</span>
      </div>
      <ReportsView />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useViewReady } from '../composables/useSkeleton';
import { useUserStore } from '@/stores/user';
import Button from 'primevue/button';
import Card from 'primevue/card';
import UserAlerts from '../components/global/UserAlerts.vue';
import PromotionsView from './promotions/PromotionsView.vue';
import ReportsView from './ReportsView.vue';

const { viewReady } = useViewReady();
const userStore = useUserStore();

// Navigation state
const showPromotions = ref(true);
const showBalances = ref(false);

// Mock data - replace with actual API calls
const promotionsCount = ref(0);
const reportsAvailable = ref(false);

onMounted(() => {
  // TODO: Fetch WB data
  viewReady();
});
</script>

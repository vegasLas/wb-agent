<template>
  <div class="space-y-4">
    <UserAlerts />

    <!-- Top Navigation Buttons -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Button
        severity="primary"
        @click="showSection('promotions')"
      >
        <i class="pi pi-tag mr-2" />
        акции
      </Button>
      <Button
        severity="secondary"
        @click="showSection('balances')"
      >
        <i class="pi pi-wallet mr-2" />
        остаток
      </Button>
      <Button
        severity="help"
        @click="showSection('adverts')"
      >
        <i class="pi pi-megaphone mr-2" />
        реклама
      </Button>
      <Button
        severity="info"
        @click="showSection('sales')"
      >
        <i class="pi pi-map mr-2" />
        продажи по регионам
      </Button>
    </div>

    <!-- Main WB Content -->
    <div
      v-if="activeSection === 'main'"
      class="flex flex-col items-center justify-center h-96 text-gray-400"
    >
      <div
        class="w-16 h-16 rounded-lg bg-purple-600 flex items-center justify-center mb-4"
      >
        <span class="text-white font-bold text-2xl">WB</span>
      </div>
      <p class="text-lg font-medium">
        Wildberries
      </p>
      <p class="text-sm">
        Центр управления WB
      </p>

      <!-- Quick Stats -->
      <div class="grid grid-cols-3 gap-4 mt-8 w-full max-w-md">
        <Card class="text-center">
          <template #content>
            <div class="text-2xl font-bold text-purple-600">
              {{ promotionsCount }}
            </div>
            <div class="text-xs text-gray-500">
              Акций доступно
            </div>
          </template>
        </Card>
        <Card class="text-center">
          <template #content>
            <div class="text-2xl font-bold text-blue-600">
              {{ reportsAvailable ? 'Да' : 'Нет' }}
            </div>
            <div class="text-xs text-gray-500">
              Отчеты
            </div>
          </template>
        </Card>
        <Card class="text-center">
          <template #content>
            <div class="text-2xl font-bold text-pink-600">
              {{ advertsCount }}
            </div>
            <div class="text-xs text-gray-500">
              Рекламных кампаний
            </div>
          </template>
        </Card>
      </div>
    </div>

    <!-- Promotions View -->
    <div
      v-if="activeSection === 'promotions'"
      class="space-y-4"
    >
      <div class="flex items-center gap-2">
        <Button
          icon="pi pi-arrow-left"
          text
          severity="secondary"
          @click="showSection('main')"
        />
        <span class="font-medium">Акции</span>
      </div>
      <PromotionsView />
    </div>

    <!-- Balances/Reports View -->
    <div
      v-if="activeSection === 'balances'"
      class="space-y-4"
    >
      <div class="flex items-center gap-2">
        <Button
          icon="pi pi-arrow-left"
          text
          severity="secondary"
          @click="showSection('main')"
        />
        <span class="font-medium">Отчеты и остаток</span>
      </div>
      <ReportsView />
    </div>

    <!-- Adverts View -->
    <div
      v-if="activeSection === 'adverts'"
      class="space-y-4"
    >
      <div class="flex items-center gap-2">
        <Button
          icon="pi pi-arrow-left"
          text
          severity="secondary"
          @click="showSection('main')"
        />
        <span class="font-medium">Рекламные кампании</span>
      </div>
      <AdvertsView />
    </div>

    <!-- Region Sales View -->
    <div
      v-if="activeSection === 'sales'"
      class="space-y-4"
    >
      <div class="flex items-center gap-2">
        <Button
          icon="pi pi-arrow-left"
          text
          severity="secondary"
          @click="showSection('main')"
        />
        <span class="font-medium">Продажи по регионам</span>
      </div>
      <RegionSalesView />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useViewReady } from '../composables/ui';
import { useUserStore } from '@/stores/user';
import { useAdvertsStore } from '@/stores/adverts';
import Button from 'primevue/button';
import Card from 'primevue/card';
import UserAlerts from '../components/global/UserAlerts.vue';
import PromotionsView from './promotions/PromotionsView.vue';
import ReportsView from './ReportsView.vue';
import AdvertsView from './adverts/AdvertsView.vue';
import { RegionSalesView } from '@/components/report';

const { viewReady } = useViewReady();
const userStore = useUserStore();
const advertsStore = useAdvertsStore();

type SectionType = 'main' | 'promotions' | 'balances' | 'adverts' | 'sales';

// Navigation state
const activeSection = ref<SectionType>('main');

// Mock data - replace with actual API calls
const promotionsCount = ref(0);
const reportsAvailable = ref(false);
const advertsCount = ref(0);

function showSection(section: SectionType) {
  activeSection.value = section;
}

onMounted(() => {
  // TODO: Fetch WB data
  viewReady();
});
</script>

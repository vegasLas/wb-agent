<template>
  <Dialog
    :visible="visible"
    modal
    :header="headerTitle"
    :style="{ width: '95vw', maxWidth: '1400px' }"
    @update:visible="$emit('update:visible', $event)"
  >
    <div v-if="loading" class="flex flex-col items-center justify-center py-12">
      <i class="pi pi-spin pi-spinner text-4xl text-blue-500 mb-4" />
      <p class="text-gray-600 dark:text-gray-400">Загрузка аналитики...</p>
    </div>

    <div v-else-if="error" class="flex flex-col items-center justify-center py-12 text-center">
      <i class="pi pi-exclamation-triangle text-4xl text-red-500 mb-4" />
      <p class="text-red-600 dark:text-red-400 font-medium">Ошибка загрузки</p>
      <p class="text-gray-600 dark:text-gray-400 mt-2">{{ error }}</p>
    </div>

    <div v-else-if="summary" class="space-y-4">
      <!-- Item Header -->
      <Card v-if="card">
        <template #content>
          <div class="flex flex-col sm:flex-row gap-4">
            <div class="w-full sm:w-32 aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
              <img
                v-if="card.image"
                :src="card.image"
                :alt="card.name"
                class="w-full h-full object-cover"
              >
              <div v-else class="w-full h-full flex items-center justify-center text-gray-400">
                <i class="pi pi-image text-4xl" />
              </div>
            </div>
            <div class="flex-1 space-y-2 min-w-0">
              <h2 class="text-lg font-semibold leading-tight">{{ card.name }}</h2>
              <div class="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p class="text-gray-500 dark:text-gray-400">Артикул</p>
                  <p class="font-medium">{{ card.nmID }}</p>
                </div>
                <div>
                  <p class="text-gray-500 dark:text-gray-400">Бренд</p>
                  <p class="font-medium">{{ card.brand || '—' }}</p>
                </div>
                <div>
                  <p class="text-gray-500 dark:text-gray-400">Предмет</p>
                  <p class="font-medium truncate">{{ card.subjectName || '—' }}</p>
                </div>
              </div>
            </div>
          </div>
        </template>
      </Card>

      <!-- Summary Stats -->
      <MpstatsSkuSummaryStats
        v-if="summary.itemFull"
        :item-full="summary.itemFull"
      />

      <!-- Tabs for mobile-friendly layout -->
      <Tabs value="charts">
        <TabList>
          <Tab value="charts">
            <i class="pi pi-chart-line mr-2" />
            Графики
          </Tab>
          <Tab value="info">
            <i class="pi pi-info-circle mr-2" />
            Информация
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel value="charts">
            <div class="space-y-4 pt-2">
              <!-- Sales Chart -->
              <SkuSalesChart :sales="summary.sales" />

              <!-- Region Charts -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <RegionPieChart
                  title="Продажи по складам"
                  :items="summary.salesByRegion"
                  type="sales"
                />
                <RegionPieChart
                  title="Остатки по складам"
                  :items="summary.balanceByRegion"
                  type="balance"
                />
              </div>
            </div>
          </TabPanel>

          <TabPanel value="info">
            <div class="pt-2">
              <MpstatsSkuInfoSidebar
                v-if="summary.itemFull"
                :item-full="summary.itemFull"
              />
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Dialog from 'primevue/dialog';
import Card from 'primevue/card';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import SkuSalesChart from './SkuSalesChart.vue';
import RegionPieChart from './RegionPieChart.vue';
import MpstatsSkuSummaryStats from './MpstatsSkuSummaryStats.vue';
import MpstatsSkuInfoSidebar from './MpstatsSkuInfoSidebar.vue';
import type { MpstatsSkuSummary, MpstatsCard } from '@/api/mpstats/types';

interface Props {
  visible: boolean;
  nmId: number;
  card: MpstatsCard | null;
  summary: MpstatsSkuSummary | null;
  loading: boolean;
  error: string | null;
}

const props = defineProps<Props>();

const headerTitle = computed(() => {
  if (props.summary?.itemFull?.name) {
    return `Аналитика: ${props.summary.itemFull.name}`;
  }
  return `Аналитика артикула ${props.nmId}`;
});

defineEmits<{
  'update:visible': [value: boolean];
}>();
</script>

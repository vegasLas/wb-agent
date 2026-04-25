<template>
  <div class="space-y-4">
    <!-- Token Setup State -->
    <div
      v-if="!tokensReady"
      class="space-y-4"
    >
      <Card class="text-center py-8">
        <template #content>
          <div class="flex flex-col items-center">
            <div
              class="w-16 h-16 rounded-lg bg-blue-600 flex items-center justify-center mb-4"
            >
              <i class="pi pi-chart-bar text-white text-2xl" />
            </div>
            <p class="text-lg font-medium mb-2">
              MPStats
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-6">
              Для работы с MPStats необходимо настроить токен MPStats
            </p>

            <div class="flex flex-col gap-3 w-full max-w-md text-left">
              <!-- MPStats Token Status -->
              <div
                class="flex items-center gap-3 p-4 rounded-lg border"
                :class="
                  hasMpstatsToken
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-300 dark:border-gray-600'
                "
              >
                <i
                  class="text-xl"
                  :class="
                    hasMpstatsToken
                      ? 'pi pi-check-circle text-green-500'
                      : 'pi pi-lock text-gray-400'
                  "
                />
                <div class="flex-1">
                  <p class="font-medium">
                    Токен MPStats
                  </p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ hasMpstatsToken ? 'Настроен' : 'Не настроен' }}
                  </p>
                </div>
                <Button
                  v-if="!hasMpstatsToken"
                  size="small"
                  @click="goToAccount"
                >
                  Настроить
                </Button>
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Main MPStats View -->
    <div
      v-else
      class="space-y-4"
    >
      <Tabs value="search">
        <TabList>
          <Tab value="search">
            <i class="pi pi-search mr-2" />
            Поиск
          </Tab>
          <Tab value="favorites">
            <i class="pi pi-heart mr-2" />
            Избранное
            <span
              v-if="mpstatsStore.favorites.length > 0"
              class="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full"
            >
              {{ mpstatsStore.favorites.length }}
            </span>
          </Tab>
          <Tab value="history">
            <i class="pi pi-clock mr-2" />
            История
            <span
              v-if="mpstatsStore.history.length > 0"
              class="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full"
            >
              {{ mpstatsStore.history.length }}
            </span>
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel value="search">
            <MpstatsSearchPanel
              :query="mpstatsStore.searchQuery"
              :results="mpstatsStore.searchResults"
              :loading="mpstatsStore.loadingSearch"
              :error="mpstatsStore.searchError"
              :adding-favorite="mpstatsStore.addingFavorite"
              :removing-favorite="mpstatsStore.removingFavorite"
              :is-favorite="mpstatsStore.isFavorite"
              @search="onSearch"
              @toggle-favorite="mpstatsStore.toggleFavorite"
              @open-detail="openDetail"
            />
          </TabPanel>

          <TabPanel value="history">
            <MpstatsHistoryPanel
              :history="mpstatsStore.history"
              :loading="mpstatsStore.loadingHistory"
              :error="mpstatsStore.historyError"
              :adding-favorite="mpstatsStore.addingFavorite"
              :removing-favorite="mpstatsStore.removingFavorite"
              :is-favorite="mpstatsStore.isFavorite"
              @toggle-favorite="mpstatsStore.toggleFavorite"
              @open-detail="openDetail"
            />
          </TabPanel>

          <TabPanel value="favorites">
            <MpstatsFavoritesPanel
              :favorites="mpstatsStore.favorites"
              :loading="mpstatsStore.loadingFavorites"
              :error="mpstatsStore.favoritesError"
              :removing-favorite="mpstatsStore.removingFavorite"
              @toggle-favorite="mpstatsStore.toggleFavorite"
              @open-detail="openDetail"
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>

    <!-- SKU Detail Dialog -->
    <MpstatsSkuDetail
      v-model:visible="detailVisible"
      :nm-id="selectedNmId"
      :card="selectedCard"
      :summary="mpstatsStore.selectedSkuSummary"
      :loading="mpstatsStore.loadingSummary"
      :error="mpstatsStore.summaryError"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import type { MpstatsCard } from '@/api/mpstats/types';
import { useRouter } from 'vue-router';
import { useViewReady } from '../composables/ui';
import { useUserStore } from '@/stores/user';
import { useMpstatsStore } from '@/stores/mpstats';
import MpstatsSearchPanel from '../components/mpstats/MpstatsSearchPanel.vue';
import MpstatsFavoritesPanel from '../components/mpstats/MpstatsFavoritesPanel.vue';
import MpstatsHistoryPanel from '../components/mpstats/MpstatsHistoryPanel.vue';
import MpstatsSkuDetail from '../components/mpstats/MpstatsSkuDetail.vue';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import Button from 'primevue/button';
import Card from 'primevue/card';

const { viewReady } = useViewReady();
const router = useRouter();
const userStore = useUserStore();
const mpstatsStore = useMpstatsStore();

const detailVisible = ref(false);
const selectedNmId = ref(0);
const selectedCard = ref<MpstatsCard | null>(null);

const hasMpstatsToken = computed(() => !!userStore.user?.hasMpstatsToken);
const tokensReady = computed(() => hasMpstatsToken.value);

function goToAccount() {
  router.push('/account');
}

function extractNmId(input: string): number | null {
  const trimmed = input.trim();
  // Try direct number first
  const direct = parseInt(trimmed, 10);
  if (!Number.isNaN(direct)) {
    return direct;
  }
  // Try to extract from common WB URLs like:
  // https://www.wildberries.ru/catalog/733263200/detail.aspx
  // https://wildberries.ru/catalog/733263200/detail.aspx
  const match = trimmed.match(/\/catalog\/(\d+)\//);
  if (match) {
    const fromUrl = parseInt(match[1], 10);
    if (!Number.isNaN(fromUrl)) {
      return fromUrl;
    }
  }
  return null;
}

async function onSearch(query: string) {
  mpstatsStore.searchQuery = query;
  const nmId = extractNmId(query);
  if (nmId === null) {
    mpstatsStore.searchError = 'Введите артикул WB или ссылку на товар';
    return;
  }
  await mpstatsStore.searchItem(nmId);
}

async function openDetail(card: MpstatsCard) {
  selectedNmId.value = card.nmID;
  selectedCard.value = card;
  detailVisible.value = true;
  await mpstatsStore.fetchSkuSummary(card.nmID);
}

onMounted(() => {
  viewReady();
  if (tokensReady.value) {
    mpstatsStore.fetchFavorites();
    mpstatsStore.fetchHistory();
  }
});
</script>

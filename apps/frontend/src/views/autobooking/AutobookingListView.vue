<template>
  <div class="space-y-3">
    <!-- User Alerts -->
    <UserAlerts />

    <!-- Create Dialog -->
    <AutobookingCreateDialog
      v-model:show="showCreateDialog"
      @created="handleCreated"
    />

    <!-- Update Dialog -->
    <AutobookingUpdateDialog
      v-model:show="showUpdateDialog"
      :autobooking="selectedAutobooking"
      @updated="handleUpdated"
    />

    <!-- Display content only if user has selected account, valid supplier and subscription is active -->
    <template
      v-if="
        userStore.selectedAccount &&
          userStore.hasValidSupplier &&
          userStore.subscriptionActive
      "
    >
      <!-- Status Filter Buttons -->
      <div class="flex gap-2">
        <Button
          v-for="stat in statsData"
          :key="stat.status"
          :variant="
            listStore.selectedStatus === stat.status ? 'filled' : 'outlined'
          "
          severity="primary"
          size="small"
          class="flex-1 justify-between"
          @click="handleStatusClick(stat.status)"
        >
          <span class="truncate">{{ stat.label }}</span>
          <span
            :class="[
              'ml-2 px-2 py-0.5 rounded text-xs font-medium',
              listStore.selectedStatus === stat.status
                ? 'bg-theme text-blue-600 dark:text-blue-400'
                : 'bg-elevated text-secondary',
            ]"
          >
            {{ stat.count }}
          </span>
        </Button>
      </div>

      <!-- Search and Filters -->
      <div class="space-y-3">
        <InputText
          v-model="listStore.searchQuery"
          placeholder="Поиск по складу..."
          class="w-full"
        />
        <Message
          v-if="userStore.user.autobookingCount === 0"
          severity="error"
          class="w-full"
        >
          <div class="flex items-center justify-between w-full">
            <span>Приобретите пакет кредитов, чтобы создать новые, или удалите
              архивные.</span>
            <Button
              variant="outlined"
              severity="primary"
              size="small"
              @click="navigateToStoreBookings"
            >
              купить
            </Button>
          </div>
        </Message>
        <div
          v-else
          class="flex justify-between items-center"
        >
          <Tag
            :severity="
              userStore.user.autobookingCount === 0 ? 'danger' : 'info'
            "
          >
            доступно кредитов: {{ userStore.user.autobookingCount }}
          </Tag>
          <Button
            severity="primary leading-none"
            @click="openCreateDialog"
          >
            добавить
          </Button>
        </div>
      </div>

      <!-- List Content -->
      <div
        ref="scrollContainer"
        class="space-y-3"
      >
        <AutobookingBookingCard
          v-for="booking in listStore.filteredBookings"
          :key="booking.id"
          :booking="booking"
          @view-goods="handleViewGoods"
          @edit="openUpdateDialog"
        />

        <div
          v-if="!listStore.filteredBookings.length"
          class="text-center py-8 text-gray-500"
        >
          {{ noBookingsMessage }}
        </div>
      </div>
    </template>

    <!-- Goods Modal -->
    <AutobookingDraftGoodsModal
      v-model:show="showGoodsModal"
      :goods="draftGoods"
      :loading="loadingGoods"
      @update:show="handleModalClose"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useInfiniteScroll } from '@vueuse/core';
import { AUTOBOOKING_STATUSES } from '../../constants';
import { useUserStore } from '@/stores/user';
import { useAutobookingListStore } from '@/stores/autobooking';
import { useSupplierStore } from '@/stores/suppliers';
import { draftsAPI } from '../../api';
import { useViewReady } from '../../composables/useSkeleton';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Message from 'primevue/message';
import UserAlerts from '../../components/global/UserAlerts.vue';
import AutobookingBookingCard from '../../components/autobooking/BookingCard.vue';
import AutobookingDraftGoodsModal from '../../components/autobooking/DraftGoodsModal.vue';
import AutobookingCreateDialog from '../../components/autobooking/CreateDialog.vue';
import AutobookingUpdateDialog from '../../components/autobooking/UpdateDialog.vue';
import type { Autobooking } from '../../types';

const router = useRouter();
const userStore = useUserStore();
const listStore = useAutobookingListStore();
const { viewReady } = useViewReady();

// Dialog state
const showCreateDialog = ref(false);
const showUpdateDialog = ref(false);
const selectedAutobooking = ref<Autobooking | null>(null);

// Goods modal state
const showGoodsModal = ref(false);
const draftGoods = ref<
  Array<{ article: string; image?: string; name: string; quantity: number }>
>([]);
const loadingGoods = ref(false);

const noBookingsMessage = computed(() => {
  return `Нет ${listStore.selectedStatus === AUTOBOOKING_STATUSES.ACTIVE ? 'активных' : listStore.selectedStatus === AUTOBOOKING_STATUSES.COMPLETED ? 'завершенных' : 'архивных'} автобронирований`;
});

// Stats data for StatsCards component
const statsData = computed(() => [
  {
    status: AUTOBOOKING_STATUSES.ACTIVE,
    count: listStore.statusCounts[AUTOBOOKING_STATUSES.ACTIVE] || 0,
    label: 'активные',
  },
  {
    status: AUTOBOOKING_STATUSES.COMPLETED,
    count: listStore.statusCounts[AUTOBOOKING_STATUSES.COMPLETED] || 0,
    label: 'завершенные',
  },
  {
    status: AUTOBOOKING_STATUSES.ARCHIVED,
    count:
      (listStore.statusCounts[AUTOBOOKING_STATUSES.ARCHIVED] || 0) +
      (listStore.statusCounts[AUTOBOOKING_STATUSES.ERROR] || 0),
    label: 'архивные',
  },
]);

// Handle status click from StatsCards
async function handleStatusClick(status: string) {
  const previousStatus = listStore.selectedStatus;
  listStore.selectedStatus = status;
  
  // Check if we need to fetch data for this status
  if (previousStatus !== status) {
    // Use cached data if available, otherwise fetch
    const didFetch = await listStore.fetchDataIfNeeded();
    // If we used cached data, we may want to refresh in background
    if (!didFetch) {
      // Optionally: silently refresh in background
      // listStore.fetchData();
    }
  }
}

// Dialog functions
function openCreateDialog() {
  showCreateDialog.value = true;
}

function openUpdateDialog(autobooking: Autobooking) {
  selectedAutobooking.value = autobooking;
  showUpdateDialog.value = true;
}

function handleCreated() {
  // Clear cache and refresh the list after creation
  listStore.clearStatusCache();
  listStore.fetchData();
}

function handleUpdated() {
  // Clear cache and refresh the list after update
  listStore.clearStatusCache();
  listStore.fetchData();
}

function navigateToStoreBookings() {
  router.push({ name: 'StoreBookings' });
}

// Handle view goods event from BookingCard
const handleViewGoods = async (draftId: string, supplierId: string) => {
  try {
    loadingGoods.value = true;
    showGoodsModal.value = true;

    // Use the current user's selected accountId and the supplierId from the booking
    const accountId = userStore.selectedAccount?.id;

    if (!accountId || !supplierId) {
      console.error('Missing accountId or supplierId for fetching draft goods');
      draftGoods.value = [];
      return;
    }

    // Fetch actual draft goods from the API
    const goods = await draftsAPI.fetchDraftGoods(
      draftId,
      accountId,
      supplierId,
    );

    // Map the goods to the expected format
    draftGoods.value = goods.map((good) => ({
      article: good.sa || good.article || '',
      image: good.imgSrc || good.image,
      name: good.subjectName || good.name || '',
      quantity: good.quantity,
    }));
  } catch (error) {
    console.error('Failed to fetch draft goods:', error);
    draftGoods.value = [];
    alert('Не удалось загрузить товары из черновика');
  } finally {
    loadingGoods.value = false;
  }
};

// Handle modal close event - clear goods list
const handleModalClose = (isOpen: boolean) => {
  showGoodsModal.value = isOpen;

  // Clear goods list when modal is closed
  if (!isOpen) {
    draftGoods.value = [];
  }
};

const scrollContainer = ref<HTMLElement | null>(null);

function getTotalForSelectedStatus(): number {
  if (listStore.selectedStatus === AUTOBOOKING_STATUSES.ARCHIVED) {
    return (
      (listStore.statusCounts[AUTOBOOKING_STATUSES.ARCHIVED] || 0) +
      (listStore.statusCounts[AUTOBOOKING_STATUSES.ERROR] || 0)
    );
  }
  return listStore.statusCounts[listStore.selectedStatus] || 0;
}

// Initialize infinite scroll
useInfiniteScroll(
  scrollContainer,
  async () => {
    if (!listStore.nextPage) return;
    console.log('useInfiniteScroll');
    const totalForStatus = getTotalForSelectedStatus();
    if (listStore.filteredBookings.length >= totalForStatus) return;
    await listStore.loadNextPage();
  },
  {
    distance: 100,
    canLoadMore: () =>
      Boolean(listStore.nextPage) &&
      listStore.filteredBookings.length < getTotalForSelectedStatus(),
  },
);

// ============================================
// Lifecycle
// ============================================
onMounted(async () => {
  try {
    // Fetch data only if not already cached for the current status
    await listStore.fetchDataIfNeeded();
  } finally {
    // ALWAYS signal view ready, even if fetch failed
    viewReady();
  }
});
</script>

<style scoped></style>

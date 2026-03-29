<template>
  <div class="space-y-3">
    <!-- User Alerts -->
    <UserAlerts />

    <!-- Display content only if user has selected account, valid supplier and subscription is active -->
    <template
      v-if="
        userStore.selectedAccount &&
        userStore.hasValidSupplier &&
        userStore.subscriptionActive
      "
    >
      <!-- Stats -->
      <StatsCards
        :stats="statsData"
        :selected-status="listStore.selectedStatus"
        @status-click="handleStatusClick"
      />

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
            <span
              >Приобретите пакет кредитов, чтобы создать новые, или удалите
              архивные.</span
            >
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
        <div v-else class="flex justify-between items-center">
          <Tag
            :severity="
              userStore.user.autobookingCount === 0 ? 'danger' : 'info'
            "
          >
            доступно кредитов: {{ userStore.user.autobookingCount }}
          </Tag>
          <Button severity="primary leading-none" @click="navigateToCreate">
            добавить
          </Button>
        </div>
      </div>

      <!-- List Content -->
      <div ref="scrollContainer" class="space-y-3">
        <AutobookingBookingCard
          v-for="booking in listStore.filteredBookings"
          :key="booking.id"
          :booking="booking"
          @view-goods="handleViewGoods"
        />

        <div
          v-if="!listStore.filteredBookings.length"
          class="text-center py-8 text-gray-500"
        >
          {{ noBookingsMessage }}
        </div>

        <!-- Loading indicator for infinite scroll -->
        <div
          v-if="listStore.loading && listStore.nextPage"
          class="text-center py-4"
        >
          <div
            class="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"
          ></div>
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
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useInfiniteScroll } from '@vueuse/core';
import { AUTOBOOKING_STATUSES } from '../../constants';
import { useUserStore } from '../../stores/user';
import { useAutobookingListStore } from '../../stores/autobookingList';
import { useSupplierStore } from '../../stores/supplier';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Message from 'primevue/message';
import UserAlerts from '../global/UserAlerts.vue';
import StatsCards from '../common/StatsCards.vue';
import AutobookingBookingCard from './BookingCard.vue';
import AutobookingDraftGoodsModal from './DraftGoodsModal.vue';
const router = useRouter();
const userStore = useUserStore();
const listStore = useAutobookingListStore();
const supplierStore = useSupplierStore();

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
function handleStatusClick(status: string) {
  listStore.selectedStatus = status;
}

// Navigation functions
function navigateToCreate() {
  router.push({ name: 'AutobookingCreate' });
}

function navigateToStoreBookings() {
  router.push({ name: 'StoreBookings' });
}

// Handle view goods event from BookingCard
const handleViewGoods = async (draftId: string, _supplierId: string) => {
  try {
    loadingGoods.value = true;
    showGoodsModal.value = true;

    // Use the current user's selected accountId
    const accountId = userStore.selectedAccount?.id;
    const response = await supplierStore.fetchWarehouseBalances(accountId);

    // For now, show the warehouse balances as goods
    // In the real app, this should call a separate API to get draft goods
    draftGoods.value =
      response.map((good) => ({
        article: good.supplierArticle,
        image: undefined,
        name: good.goodName,
        quantity: good.quantity,
      })) || [];
  } catch (error) {
    console.error('Failed to fetch draft goods:', error);
    draftGoods.value = [];
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

// Initialize infinite scroll
useInfiniteScroll(
  scrollContainer,
  async () => {
    // Only load more if we're not already loading and there's a next page
    if (!listStore.loading && listStore.nextPage) {
      await listStore.loadNextPage();
    }
  },
  { distance: 50, canLoadMore: () => Boolean(listStore.nextPage) },
);
</script>

<style scoped></style>

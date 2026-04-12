<template>
  <div class="space-y-3">
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
      <TaskListLayout
        ref="layoutRef"
        :active-tab="localActiveTab"
        :status-options="statusOptions"
        :selected-status="listStore.selectedStatus"
        :search-query="listStore.searchQuery"
        search-placeholder="Поиск по складу..."
        :title="`доступно кредитов: ${userStore.user.autobookingCount}`"
        :add-button-disabled="userStore.user.autobookingCount === 0"
        add-button-text="добавить"
        :empty-message="noBookingsMessage"
        :show-empty="!listStore.filteredBookings.length"
        @update:active-tab="handleTabChange"
        @update:selected-status="listStore.selectedStatus = $event"
        @update:search-query="listStore.searchQuery = $event"
        @add="openCreateDialog"
      >
        <!-- Warning Slot -->
        <template #warning>
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
        </template>

        <!-- List Content -->
        <TaskBookingCard
          v-for="booking in listStore.filteredBookings"
          :key="booking.id"
          :booking="booking"
          @view-goods="handleViewGoods"
          @edit="openUpdateDialog"
        />
      </TaskListLayout>
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
import { useUserStore } from '@/stores/user';
import { useAutobookingListStore } from '@/stores/autobooking';
import { draftsAPI } from '../../api';
import Button from 'primevue/button';
import Message from 'primevue/message';
import TaskListLayout from './TaskListLayout.vue';
import TaskBookingCard from './TaskBookingCard.vue';
import AutobookingDraftGoodsModal from '../autobooking/DraftGoodsModal.vue';
import AutobookingCreateDialog from '../autobooking/CreateDialog.vue';
import AutobookingUpdateDialog from '../autobooking/UpdateDialog.vue';
import type { Autobooking } from '../../types';

type TabType = 'autobooking' | 'triggers';

interface StatusOption {
  label: string;
  value: string;
}

const props = defineProps<{
  activeTab: TabType;
}>();

const emit = defineEmits<{
  (e: 'update:activeTab', value: TabType): void;
}>();

const router = useRouter();
const userStore = useUserStore();
const listStore = useAutobookingListStore();

// Dialog state
const showCreateDialog = ref(false);
const showUpdateDialog = ref(false);
const selectedAutobooking = ref<Autobooking | null>(null);

// Local state for tab
const localActiveTab = ref<TabType>(props.activeTab);

// Ref to access TaskListLayout's scrollContainer
const layoutRef = ref<InstanceType<typeof TaskListLayout> | null>(null);

// Status options for the Select dropdown
const statusOptions = computed<StatusOption[]>(() => [
  { label: `активные (${listStore.statusCounts[AUTOBOOKING_STATUSES.ACTIVE] || 0})`, value: AUTOBOOKING_STATUSES.ACTIVE },
  { label: `завершенные (${listStore.statusCounts[AUTOBOOKING_STATUSES.COMPLETED] || 0})`, value: AUTOBOOKING_STATUSES.COMPLETED },
  { label: `архивные (${(listStore.statusCounts[AUTOBOOKING_STATUSES.ARCHIVED] || 0) + (listStore.statusCounts[AUTOBOOKING_STATUSES.ERROR] || 0)})`, value: AUTOBOOKING_STATUSES.ARCHIVED },
]);

function handleTabChange(value: TabType) {
  localActiveTab.value = value;
  emit('update:activeTab', value);
}

// Goods modal state
const showGoodsModal = ref(false);
const draftGoods = ref<
  Array<{ article: string; image?: string; name: string; quantity: number }>
>([]);
const loadingGoods = ref(false);

const noBookingsMessage = computed(() => {
  return `Нет ${listStore.selectedStatus === AUTOBOOKING_STATUSES.ACTIVE ? 'активных' : listStore.selectedStatus === AUTOBOOKING_STATUSES.COMPLETED ? 'завершенных' : 'архивных'} автобронирований`;
});

// Dialog functions
function openCreateDialog() {
  showCreateDialog.value = true;
}

function openUpdateDialog(autobooking: Autobooking) {
  selectedAutobooking.value = autobooking;
  showUpdateDialog.value = true;
}

function handleCreated() {
  // Refresh the list after creation
  listStore.fetchData();
}

function handleUpdated() {
  // Refresh the list after update
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

function getTotalForSelectedStatus(): number {
  if (listStore.selectedStatus === AUTOBOOKING_STATUSES.ARCHIVED) {
    return (
      (listStore.statusCounts[AUTOBOOKING_STATUSES.ARCHIVED] || 0) +
      (listStore.statusCounts[AUTOBOOKING_STATUSES.ERROR] || 0)
    );
  }
  return listStore.statusCounts[listStore.selectedStatus] || 0;
}

// Initialize infinite scroll on the TaskListLayout's scrollContainer
useInfiniteScroll(
  () => layoutRef.value?.scrollContainer ?? null,
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
</script>

<style scoped></style>

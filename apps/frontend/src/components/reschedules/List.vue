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
        @status-click="(value) => handleStatusClick(value as RescheduleStatus)"
      />

      <!-- Search and Filters -->
      <div class="space-y-3">
        <InputText
          v-model="listStore.searchQuery"
          placeholder="Поиск по ID поставки или поставщику..."
          class="w-full"
        />
        <Message
          v-if="userStore.user.autobookingCount === 0"
          severity="error"
          class="mb-2"
        >
          <div class="flex items-center justify-between gap-2">
            <span>Приобретите пакет кредитов, чтобы создать новые, или удалите архивные.</span>
            <Button
              variant="outlined"
              severity="primary"
              size="small"
              @click="viewStore.setView('store-bookings')"
            >
              купить
            </Button>
          </div>
        </Message>
        <div v-else class="flex justify-between items-center">
          <Tag
            :severity="userStore.user.autobookingCount === 0 ? 'danger' : 'info'"
          >
            доступно кредитов: {{ userStore.user.autobookingCount }}
          </Tag>
          <Button
            v-if="!viewStore.isForm"
            severity="primary"
            @click="viewStore.setView('reschedules-form')"
          >
            <i class="pi pi-plus mr-1" />
            добавить
          </Button>
        </div>
      </div>

      <!-- List Content -->
      <div ref="scrollContainer" class="space-y-3">
        <ReschedulesCard
          v-for="reschedule in listStore.filteredReschedules"
          :key="reschedule.id"
          :reschedule="reschedule"
          @update="handleUpdate"
          @delete="handleDelete"
          @open-details="handleOpenDetails(reschedule)"
        />

        <div
          v-if="!listStore.filteredReschedules.length"
          class="text-center py-8 text-gray-500"
        >
          {{ noReschedulesMessage }}
        </div>

        <!-- Preloader -->
        <div
          v-if="rescheduleStore.loading && rescheduleStore.currentPage > 1"
          class="flex justify-center items-center py-4"
        >
          <div class="h-12 w-full max-w-[300px] bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
      </div>
    </template>

    <!-- Supply Details Modal -->
    <ReschedulesSupplyDetailsModal
      :show="supplyDetailsStore.showModal"
      @update:show="supplyDetailsStore.closeModal"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Message from 'primevue/message';
import Tag from 'primevue/tag';
import { useUserStore } from '../../stores/user';
import { useViewStore } from '../../stores/view';
import { useRescheduleStore } from '../../stores/reschedules';
import { useRescheduleListStore } from '../../stores/reschedules/list';
import { useSupplyDetailsStore } from '../../stores/supplyDetails';
import StatsCards from '../common/StatsCards.vue';
import UserAlerts from '../global/UserAlerts.vue';
import ReschedulesCard from './Card.vue';
import ReschedulesSupplyDetailsModal from './SupplyDetailsModal.vue';
import type { AutobookingReschedule, RescheduleStatus } from '../../types';

const userStore = useUserStore();
const viewStore = useViewStore();
const rescheduleStore = useRescheduleStore();
const listStore = useRescheduleListStore();
const supplyDetailsStore = useSupplyDetailsStore();

const noReschedulesMessage = computed(() => {
  return `Нет ${listStore.selectedStatus === 'ACTIVE' ? 'активных' : listStore.selectedStatus === 'COMPLETED' ? 'завершенных' : 'архивных'} перепланирований`;
});

// Stats data for StatsCards component
const statsData = computed(() => [
  {
    status: 'ACTIVE',
    count: listStore.statusCounts['ACTIVE'] || 0,
    label: 'активные',
  },
  {
    status: 'COMPLETED',
    count: listStore.statusCounts['COMPLETED'] || 0,
    label: 'завершенные',
  },
  {
    status: 'ARCHIVED',
    count: listStore.statusCounts['ARCHIVED'] || 0,
    label: 'архивные',
  },
]);

// Handle status click from StatsCards
function handleStatusClick(status: RescheduleStatus) {
  listStore.selectedStatus = status;
  listStore.updateFilter('status', [status]);
}

// Event handlers
function handleUpdate(reschedule: AutobookingReschedule) {
  // Set the selected reschedule for updating
  rescheduleStore.setSelectedReschedule(reschedule);
  viewStore.setView('reschedules-update');
}

async function handleDelete(id: string) {
  try {
    await rescheduleStore.deleteReschedule(id);
  } catch (error) {
    console.error('Failed to delete reschedule:', error);
  }
}

function handleOpenDetails(reschedule: AutobookingReschedule) {
  supplyDetailsStore.openModal(reschedule.supplyId);
}

const scrollContainer = ref<HTMLElement | null>(null);

onMounted(() => {
  // Fetch supplies if not loaded
  if (
    rescheduleStore.supplies.length === 0 &&
    userStore.selectedAccount?.selectedSupplierId
  ) {
    rescheduleStore.fetchSupplies(userStore.selectedAccount.selectedSupplierId);
  }

  // Set initial filter to show active reschedules
  if (listStore.selectedStatus) {
    listStore.updateFilter('status', [listStore.selectedStatus]);
  }
});
</script>

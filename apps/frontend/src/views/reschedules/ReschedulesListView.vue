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
          @click="handleStatusClick(stat.status as RescheduleStatus)"
        >
          <span class="truncate">{{ stat.label }}</span>
          <span
            :class="[
              'ml-2 px-2 py-0.5 rounded text-xs font-medium',
              listStore.selectedStatus === stat.status
                ? 'bg-white text-blue-600 dark:text-blue-400'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
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
          placeholder="Поиск по ID поставки или поставщику..."
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
          <Button severity="primary" @click="navigateToCreate">
            добавить
          </Button>
        </div>
      </div>

      <!-- List Content -->
      <div class="space-y-3">
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
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Message from 'primevue/message';
import Tag from 'primevue/tag';
import { useUserStore } from '../../stores/user';
import { useRescheduleStore } from '../../stores/reschedules';
import { useRescheduleListStore } from '../../stores/reschedules/list';
import { useSupplyDetailsStore } from '../../stores/supplyDetails';
import { useViewReady } from '../../composables/useSkeleton';
import UserAlerts from '../../components/global/UserAlerts.vue';
import ReschedulesCard from '../../components/reschedules/Card.vue';
import ReschedulesSupplyDetailsModal from '../../components/reschedules/SupplyDetailsModal.vue';
import type { AutobookingReschedule, RescheduleStatus } from '../../types';

const router = useRouter();
const userStore = useUserStore();
const rescheduleStore = useRescheduleStore();
const listStore = useRescheduleListStore();
const supplyDetailsStore = useSupplyDetailsStore();
const { viewReady } = useViewReady();

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

// Navigation functions
function navigateToCreate() {
  router.push({ name: 'ReschedulesCreate' });
}

function navigateToStoreBookings() {
  router.push({ name: 'StoreBookings' });
}

// Event handlers
function handleUpdate(reschedule: AutobookingReschedule) {
  // Set the selected reschedule for updating
  rescheduleStore.setSelectedReschedule(reschedule);
  router.push({ name: 'ReschedulesUpdate', params: { id: reschedule.id } });
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

// ============================================
// Lifecycle
// ============================================
onMounted(async () => {
  try {
    // Fetch supplies when view mounts
    if (userStore.selectedAccount?.selectedSupplierId) {
      await rescheduleStore.fetchSupplies(
        userStore.selectedAccount.selectedSupplierId,
      );
    }

    // Set initial filter to show active reschedules
    if (listStore.selectedStatus) {
      listStore.updateFilter('status', [listStore.selectedStatus]);
    }
  } catch (err) {
    console.error('ReschedulesListView fetch error:', err);
  } finally {
    // ALWAYS signal view ready, even if fetch failed
    viewReady();
  }
});
</script>

<style scoped></style>

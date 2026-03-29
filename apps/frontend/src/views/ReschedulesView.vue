<template>
  <RouterView />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useUserStore } from '../stores/user';
import { useRescheduleStore } from '../stores/reschedules';
import { useRescheduleListStore } from '../stores/reschedules/list';
import { useViewReady } from '../composables/useSkeleton';

const userStore = useUserStore();
const rescheduleStore = useRescheduleStore();
const listStore = useRescheduleListStore();
const { viewReady } = useViewReady();

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
    console.log('ReschedulesView onMounted - data fetched');
  } catch (err) {
    console.error('ReschedulesView onMounted - fetch error:', err);
  } finally {
    // ALWAYS signal view ready, even if fetch failed
    console.log('ReschedulesView onMounted - calling viewReady');
    viewReady();
    console.log('ReschedulesView onMounted - END');
  }
});
</script>

<style scoped>
.reschedule-container {
  padding: 1rem;
}

.reschedule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.reschedule-stats {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.button-row {
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
}

.reschedule-count {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-primary);
}

.reschedule-label {
  font-size: 1rem;
  color: var(--color-gray-600);
}
</style>

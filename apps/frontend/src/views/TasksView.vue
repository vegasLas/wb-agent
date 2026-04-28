<template>
  <div class="space-y-3">
    <!-- Autobooking List -->
    <TaskBookingList
      v-if="activeTab === 'autobooking'"
      v-model:active-tab="activeTab"
    />

    <!-- Triggers List -->
    <TaskTriggerList
      v-if="activeTab === 'triggers'"
      v-model:active-tab="activeTab"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import TaskBookingList from '../components/tasks/TaskBookingList.vue';
import TaskTriggerList from '../components/tasks/TaskTriggerList.vue';
import { useViewReady } from '../composables/ui';
import { useAutobookingListStore } from '@/stores/autobooking';
import { useTriggerStore } from '@/stores/triggers';
import { useUserStore } from '@/stores/user';

type TabType = 'autobooking' | 'triggers';
const activeTab = ref<TabType>('autobooking');

const { viewReady } = useViewReady();
const listStore = useAutobookingListStore();
const triggerStore = useTriggerStore();
const userStore = useUserStore();

// Track if viewReady has been called to avoid multiple calls
const hasSignaledReady = ref(false);

// Function to check if current tab's data is ready
function isCurrentTabDataReady(): boolean {
  if (!userStore.selectedAccount || !userStore.hasValidSupplier || (!userStore.subscriptionActive && !userStore.isFree)) {
    // If user doesn't have valid account/supplier/subscription, we're "ready" (to show empty state)
    return true;
  }

  if (activeTab.value === 'autobooking') {
    return listStore.isFetched;
  } else {
    return triggerStore.isFetched;
  }
}

// Watch for data being fetched and signal ready
watch(
  () => [listStore.isFetched, triggerStore.isFetched, activeTab.value],
  () => {
    if (!hasSignaledReady.value && isCurrentTabDataReady()) {
      hasSignaledReady.value = true;
      viewReady();
    }
  },
  { immediate: true }
);

// Fetch data for the current tab
async function fetchDataForCurrentTab() {
  if (activeTab.value === 'autobooking' && !listStore.isFetched) {
    await listStore.fetchData();
  } else if (activeTab.value === 'triggers' && !triggerStore.isFetched) {
    await triggerStore.fetchTriggers();
  }
}

// Handle initial load - fetch data if needed
onMounted(async () => {
  try {
    // Ensure user data is loaded first (needed for conditional rendering)
    if (!userStore.isFetched) {
      await userStore.fetchUser();
    }

    await fetchDataForCurrentTab();
  } catch (error) {
    console.error('Failed to fetch initial data:', error);
  } finally {
    // Always signal ready, even if fetch failed
    if (!hasSignaledReady.value) {
      hasSignaledReady.value = true;
      viewReady();
    }
  }
});

// Watch for tab changes and fetch data when switching tabs
watch(activeTab, async (newTab) => {
  try {
    if (newTab === 'autobooking' && !listStore.isFetched) {
      await listStore.fetchData();
    } else if (newTab === 'triggers' && !triggerStore.isFetched) {
      await triggerStore.fetchTriggers();
    }
  } catch (error) {
    console.error('Failed to fetch data on tab switch:', error);
  }
});
</script>

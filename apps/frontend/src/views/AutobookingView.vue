<template>
  <div>
    <!-- Router View for child routes -->
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useAutobookingListStore } from '../stores/autobookingList';
import { useViewReady } from '../composables/useSkeleton';

const listStore = useAutobookingListStore();
const { viewReady } = useViewReady();

onMounted(async () => {
  console.log('AutobookingView onMounted - START');
  try {
    // Fetch data when view mounts
    await listStore.fetchData();
    console.log(
      'AutobookingView onMounted - data fetched, count:',
      listStore.autobookings.length,
    );
  } catch (err) {
    console.error('AutobookingView onMounted - fetch error:', err);
  } finally {
    // ALWAYS signal view ready, even if fetch failed
    console.log('AutobookingView onMounted - calling viewReady');
    viewReady();
    console.log('AutobookingView onMounted - END');
  }
});
</script>

<style scoped>
.autobooking-container {
  padding: 1rem;
}

.autobooking-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.autobooking-stats {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.button-row {
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
}

.autobooking-count {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-primary);
}

.autobooking-label {
  font-size: 1rem;
  color: var(--color-gray-600);
}
</style>

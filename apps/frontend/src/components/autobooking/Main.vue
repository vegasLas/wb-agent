<template>
  <AutobookingList v-if="viewStore.currentView === 'autobookings-main'" />
  <AutobookingForm
    v-else-if="viewStore.currentView === 'autobookings-form'"
    @back="viewStore.setView('autobookings-main')"
  />
  <AutobookingUpdateForm
    v-else-if="viewStore.currentView === 'autobookings-update'"
    @back="viewStore.setView('autobookings-main')"
  />
</template>

<script setup lang="ts">
import { useViewStore } from '../../stores/view';
import AutobookingList from './List.vue';
import AutobookingForm from './Form.vue';
import AutobookingUpdateForm from './UpdateForm.vue';

const viewStore = useViewStore();
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

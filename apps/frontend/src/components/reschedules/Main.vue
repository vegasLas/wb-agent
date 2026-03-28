<template>
  <RouterView />
</template>

<script setup lang="ts">
// This component serves as a layout wrapper for reschedules routes
// Child routes: List, Create (Form), Update (UpdateForm)
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

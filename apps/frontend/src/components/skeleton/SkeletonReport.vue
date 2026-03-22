<template>
  <div class="p-4 animate-pulse">
    <!-- Header Placeholder -->
    <div class="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>

    <!-- Date Range Placeholder -->
    <div
      class="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-md"
    >
      <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
      <div class="flex flex-col sm:flex-row gap-4 items-center">
        <div class="w-full sm:w-1/3">
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
          <div class="h-10 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>
        <div class="w-full sm:w-1/3">
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
          <div class="h-10 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>
        <div
          class="h-10 bg-primary-500/50 rounded w-full sm:w-auto px-6 mt-2 sm:mt-5"
        ></div>
      </div>
    </div>

    <!-- Chart and Table Placeholder (repeated once for example) -->
    <div class="space-y-8">
      <div
        v-for="n in 2"
        :key="n"
        class="p-4 border border-gray-200 dark:border-gray-700 rounded-md"
      >
        <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
        <!-- Warehouse Name Placeholder -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <!-- Chart Placeholder -->
          <div
            class="h-96 md:h-[500px] bg-gray-300 dark:bg-gray-600 rounded"
          ></div>
          <!-- Table Placeholder -->
          <div
            class="h-96 md:h-[500px] border border-gray-200 dark:border-gray-700 rounded-md p-2 space-y-2"
          >
            <div class="h-8 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <!-- Table Header Placeholder -->
            <div
              v-for="row in 5"
              :key="row"
              class="h-6 bg-gray-200 dark:bg-gray-700 rounded w-full"
            ></div>
            <!-- Table Row Placeholders -->
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Skeleton component for report view loading state
</script>

<style scoped>
/* Minimal styles, relies on Tailwind for pulsing and layout */
</style>

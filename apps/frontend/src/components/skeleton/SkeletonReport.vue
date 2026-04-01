<template>
  <div class="p-4">
    <!-- Header Placeholder -->
    <Skeleton
      class="mb-6"
      width="33.333%"
      height="2rem"
      border-radius="0.25rem"
    />

    <!-- Date Range Placeholder -->
    <div class="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-md">
      <Skeleton
        class="mb-4"
        width="25%"
        height="1.5rem"
        border-radius="0.25rem"
      />
      <div class="flex flex-col sm:flex-row gap-4 items-center">
        <div class="w-full sm:w-1/3">
          <Skeleton
            class="mb-1"
            width="100%"
            height="1rem"
            border-radius="0.25rem"
          />
          <Skeleton
            width="100%"
            height="2.5rem"
            border-radius="0.25rem"
          />
        </div>
        <div class="w-full sm:w-1/3">
          <Skeleton
            class="mb-1"
            width="100%"
            height="1rem"
            border-radius="0.25rem"
          />
          <Skeleton
            width="100%"
            height="2.5rem"
            border-radius="0.25rem"
          />
        </div>
        <Skeleton
          class="mt-2 sm:mt-5"
          width="100%"
          height="2.5rem"
          border-radius="0.25rem"
        />
      </div>
    </div>

    <!-- Chart and Table Placeholder (repeated once for example) -->
    <div class="space-y-8">
      <div
        v-for="n in 2"
        :key="n"
        class="p-4 border border-gray-200 dark:border-gray-700 rounded-md"
      >
        <Skeleton
          class="mb-4"
          width="50%"
          height="1.5rem"
          border-radius="0.25rem"
        />
        <!-- Warehouse Name Placeholder -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <!-- Chart Placeholder -->
          <Skeleton
            width="100%"
            height="500px"
            border-radius="0.25rem"
          />
          <!-- Table Placeholder -->
          <div class="border border-gray-200 dark:border-gray-700 rounded-md p-2 space-y-2">
            <Skeleton
              width="100%"
              height="2rem"
              border-radius="0.25rem"
            />
            <!-- Table Header Placeholder -->
            <Skeleton
              v-for="row in 5"
              :key="row"
              width="100%"
              height="1.5rem"
              border-radius="0.25rem"
            />
            <!-- Table Row Placeholders -->
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
</script>

<style scoped>
/* Minimal styles, relies on Tailwind for layout */
</style>

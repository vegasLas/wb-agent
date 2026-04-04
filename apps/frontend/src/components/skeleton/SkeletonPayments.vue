<template>
  <!-- Payments View Skeleton - Matches PaymentsView.vue structure -->
  <div class="space-y-6">
    <!-- Tabs Navigation -->
    <div class="border-b border-gray-200 dark:border-gray-700 pb-2">
      <div class="flex gap-4">
        <Skeleton width="6rem" height="2rem" border-radius="0.25rem" />
        <Skeleton width="6rem" height="2rem" border-radius="0.25rem" />
      </div>
    </div>

    <!-- Card Container -->
    <div class="p-4 bg-white dark:bg-[rgb(31,31,32)]">
      <div class="space-y-4">
        <!-- Card Title -->
        <Skeleton width="45%" height="1.5rem" border-radius="0.25rem" />
        <!-- Description -->
        <Skeleton width="100%" height="1rem" border-radius="0.25rem" />
        <Skeleton width="80%" height="1rem" border-radius="0.25rem" />
      </div>
    </div>

    <!-- Tariff Cards Grid (4 cards for subscription tab) -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Card 1 -->
      <div class="p-4 bg-white dark:bg-[rgb(31,31,32)]">
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <Skeleton width="40%" height="1.25rem" border-radius="0.25rem" />
            <Skeleton width="3rem" height="1.25rem" border-radius="0.25rem" />
          </div>
          <div class="flex items-center gap-2">
            <Skeleton width="4rem" height="2rem" border-radius="0.25rem" />
            <Skeleton width="3rem" height="1rem" border-radius="0.25rem" />
          </div>
          <Skeleton width="100%" height="2.5rem" border-radius="0.25rem" />
        </div>
      </div>

      <!-- Card 2 -->
      <div class="p-4 bg-white dark:bg-[rgb(31,31,32)]">
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <Skeleton width="35%" height="1.25rem" border-radius="0.25rem" />
            <Skeleton width="3rem" height="1.25rem" border-radius="0.25rem" />
          </div>
          <div class="flex items-center gap-2">
            <Skeleton width="4rem" height="2rem" border-radius="0.25rem" />
            <Skeleton width="3rem" height="1rem" border-radius="0.25rem" />
          </div>
          <Skeleton width="100%" height="2.5rem" border-radius="0.25rem" />
        </div>
      </div>

      <!-- Card 3 -->
      <div class="p-4 bg-white dark:bg-[rgb(31,31,32)]">
        <div class="space-y-4">
          <Skeleton width="50%" height="1.25rem" border-radius="0.25rem" />
          <Skeleton width="4rem" height="2rem" border-radius="0.25rem" />
          <Skeleton width="100%" height="2.5rem" border-radius="0.25rem" />
        </div>
      </div>

      <!-- Card 4 -->
      <div class="p-4 bg-white dark:bg-[rgb(31,31,32)]">
        <div class="space-y-4">
          <Skeleton width="45%" height="1.25rem" border-radius="0.25rem" />
          <div class="flex items-center gap-2">
            <Skeleton width="5rem" height="2rem" border-radius="0.25rem" />
            <Skeleton width="4rem" height="1rem" border-radius="0.25rem" />
          </div>
          <Skeleton width="100%" height="2.5rem" border-radius="0.25rem" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
</script>

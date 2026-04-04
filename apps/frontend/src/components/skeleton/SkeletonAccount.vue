<template>
  <!-- Account View Skeleton - Matches AccountView.vue structure -->
  <div class="space-y-4">
    <!-- Current Account & Supplier Info Card -->
    <div class="p-4 bg-white dark:bg-[rgb(31,31,32)]">
      <div class="space-y-3">
        <!-- Header with title and button -->
        <div class="flex items-center justify-between">
          <Skeleton width="40%" height="1.5rem" border-radius="0.25rem" />
          <Skeleton width="5rem" height="2rem" border-radius="0.25rem" />
        </div>
        <!-- Account info lines -->
        <div class="space-y-2 pt-2">
          <div class="flex items-center gap-2">
            <Skeleton width="1rem" height="1rem" border-radius="50%" />
            <Skeleton width="60%" height="1rem" border-radius="0.25rem" />
          </div>
          <div class="flex items-center gap-2">
            <Skeleton width="1rem" height="1rem" border-radius="50%" />
            <Skeleton width="50%" height="1rem" border-radius="0.25rem" />
          </div>
        </div>
      </div>
    </div>

    <!-- Subscription Status Card -->
    <div class="p-4 bg-white dark:bg-[rgb(31,31,32)]">
      <div class="flex items-center justify-between">
        <Skeleton width="35%" height="1.5rem" border-radius="0.25rem" />
        <Skeleton width="6rem" height="1.5rem" border-radius="0.25rem" />
      </div>
    </div>

    <!-- Autobooking Count Card -->
    <div class="p-4 bg-white dark:bg-[rgb(31,31,32)]">
      <div class="flex items-center justify-between">
        <Skeleton width="30%" height="1.5rem" border-radius="0.25rem" />
        <Skeleton width="3rem" height="1.5rem" border-radius="0.25rem" />
      </div>
    </div>

    <!-- Supplier API Key Card -->
    <div class="p-4 bg-white dark:bg-[rgb(31,31,32)]">
      <div class="space-y-3">
        <!-- Card Title -->
        <Skeleton width="45%" height="1.25rem" border-radius="0.25rem" />
        <!-- Status Tag -->
        <Skeleton width="8rem" height="1.5rem" border-radius="0.25rem" />
        <!-- Input row -->
        <div class="flex gap-2 pt-2">
          <Skeleton width="100%" height="2.5rem" border-radius="0.25rem" />
          <Skeleton width="6rem" height="2.5rem" border-radius="0.25rem" />
        </div>
      </div>
    </div>

    <!-- Payment History Card -->
    <div class="p-4 bg-white dark:bg-[rgb(31,31,32)]">
      <div class="space-y-4">
        <!-- Card Title -->
        <Skeleton width="40%" height="1.25rem" border-radius="0.25rem" />
        <!-- Table Header -->
        <div
          class="flex gap-2 pb-2 border-b border-gray-200 dark:border-gray-700"
        >
          <Skeleton width="25%" height="2rem" border-radius="0.25rem" />
          <Skeleton width="25%" height="2rem" border-radius="0.25rem" />
          <Skeleton width="25%" height="2rem" border-radius="0.25rem" />
          <Skeleton width="25%" height="2rem" border-radius="0.25rem" />
        </div>
        <!-- Table Rows -->
        <div class="space-y-2">
          <div class="flex gap-2">
            <Skeleton width="25%" height="1.5rem" border-radius="0.25rem" />
            <Skeleton width="25%" height="1.5rem" border-radius="0.25rem" />
            <Skeleton width="25%" height="1.5rem" border-radius="0.25rem" />
            <Skeleton width="25%" height="1.5rem" border-radius="0.25rem" />
          </div>
          <div class="flex gap-2">
            <Skeleton width="25%" height="1.5rem" border-radius="0.25rem" />
            <Skeleton width="25%" height="1.5rem" border-radius="0.25rem" />
            <Skeleton width="25%" height="1.5rem" border-radius="0.25rem" />
            <Skeleton width="25%" height="1.5rem" border-radius="0.25rem" />
          </div>
          <div class="flex gap-2">
            <Skeleton width="25%" height="1.5rem" border-radius="0.25rem" />
            <Skeleton width="25%" height="1.5rem" border-radius="0.25rem" />
            <Skeleton width="25%" height="1.5rem" border-radius="0.25rem" />
            <Skeleton width="25%" height="1.5rem" border-radius="0.25rem" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
</script>

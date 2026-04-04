<template>
  <!-- Reports View Skeleton - Matches ReportsView.vue structure -->
  <div class="space-y-6">
    <!-- Date Range Selection Card -->
    <div class="p-4 bg-white dark:bg-[rgb(31,31,32)]">
      <div class="space-y-4">
        <!-- Card Title -->
        <Skeleton width="50%" height="1.5rem" border-radius="0.25rem" />
        <!-- Date Picker Row -->
        <div
          class="flex flex-col sm:flex-row gap-4 items-start sm:items-center"
        >
          <Skeleton
            width="100%"
            height="2.5rem"
            border-radius="0.25rem"
            class="sm:w-64"
          />
          <Skeleton width="6rem" height="2.5rem" border-radius="0.25rem" />
        </div>
      </div>
    </div>

    <!-- Summary Statistics Cards (4 cards in grid) -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <!-- Stat Card 1 -->
      <div class="p-4 bg-white dark:bg-[rgb(31,31,32)] text-center">
        <Skeleton
          width="4rem"
          height="2rem"
          border-radius="0.25rem"
          class="mx-auto mb-2"
        />
        <Skeleton
          width="60%"
          height="0.75rem"
          border-radius="0.25rem"
          class="mx-auto"
        />
      </div>
      <!-- Stat Card 2 -->
      <div class="p-4 bg-white dark:bg-[rgb(31,31,32)] text-center">
        <Skeleton
          width="5rem"
          height="2rem"
          border-radius="0.25rem"
          class="mx-auto mb-2"
        />
        <Skeleton
          width="50%"
          height="0.75rem"
          border-radius="0.25rem"
          class="mx-auto"
        />
      </div>
      <!-- Stat Card 3 -->
      <div class="p-4 bg-white dark:bg-[rgb(31,31,32)] text-center">
        <Skeleton
          width="4rem"
          height="2rem"
          border-radius="0.25rem"
          class="mx-auto mb-2"
        />
        <Skeleton
          width="55%"
          height="0.75rem"
          border-radius="0.25rem"
          class="mx-auto"
        />
      </div>
      <!-- Stat Card 4 -->
      <div class="p-4 bg-white dark:bg-[rgb(31,31,32)] text-center">
        <Skeleton
          width="3rem"
          height="2rem"
          border-radius="0.25rem"
          class="mx-auto mb-2"
        />
        <Skeleton
          width="45%"
          height="0.75rem"
          border-radius="0.25rem"
          class="mx-auto"
        />
      </div>
    </div>

    <!-- Top Products Table Card -->
    <div class="p-4 bg-white dark:bg-[rgb(31,31,32)]">
      <div class="space-y-4">
        <!-- Header with title and column selector -->
        <div
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <Skeleton width="60%" height="1.5rem" border-radius="0.25rem" />
          <Skeleton width="10rem" height="2.25rem" border-radius="0.25rem" />
        </div>

        <!-- Table -->
        <div class="space-y-2">
          <!-- Table Header -->
          <div
            class="flex gap-2 pb-2 border-b border-gray-200 dark:border-gray-700"
          >
            <Skeleton width="20%" height="2rem" border-radius="0.25rem" />
            <Skeleton width="20%" height="2rem" border-radius="0.25rem" />
            <Skeleton width="20%" height="2rem" border-radius="0.25rem" />
            <Skeleton width="20%" height="2rem" border-radius="0.25rem" />
            <Skeleton width="20%" height="2rem" border-radius="0.25rem" />
          </div>
          <!-- Table Rows -->
          <div class="space-y-2">
            <div class="flex gap-2">
              <Skeleton width="20%" height="1.5rem" border-radius="0.25rem" />
              <Skeleton width="20%" height="1.5rem" border-radius="0.25rem" />
              <Skeleton width="20%" height="1.5rem" border-radius="0.25rem" />
              <Skeleton width="20%" height="1.5rem" border-radius="0.25rem" />
              <Skeleton width="20%" height="1.5rem" border-radius="0.25rem" />
            </div>
            <div class="flex gap-2">
              <Skeleton width="20%" height="1.5rem" border-radius="0.25rem" />
              <Skeleton width="20%" height="1.5rem" border-radius="0.25rem" />
              <Skeleton width="20%" height="1.5rem" border-radius="0.25rem" />
              <Skeleton width="20%" height="1.5rem" border-radius="0.25rem" />
              <Skeleton width="20%" height="1.5rem" border-radius="0.25rem" />
            </div>
            <div class="flex gap-2">
              <Skeleton width="20%" height="1.5rem" border-radius="0.25rem" />
              <Skeleton width="20%" height="1.5rem" border-radius="0.25rem" />
              <Skeleton width="20%" height="1.5rem" border-radius="0.25rem" />
              <Skeleton width="20%" height="1.5rem" border-radius="0.25rem" />
              <Skeleton width="20%" height="1.5rem" border-radius="0.25rem" />
            </div>
            <div class="flex gap-2">
              <Skeleton width="20%" height="1.5rem" border-radius="0.25rem" />
              <Skeleton width="20%" height="1.5rem" border-radius="0.25rem" />
              <Skeleton width="20%" height="1.5rem" border-radius="0.25rem" />
              <Skeleton width="20%" height="1.5rem" border-radius="0.25rem" />
              <Skeleton width="20%" height="1.5rem" border-radius="0.25rem" />
            </div>
            <div class="flex gap-2">
              <Skeleton width="20%" height="1.5rem" border-radius="0.25rem" />
              <Skeleton width="20%" height="1.5rem" border-radius="0.25rem" />
              <Skeleton width="20%" height="1.5rem" border-radius="0.25rem" />
              <Skeleton width="20%" height="1.5rem" border-radius="0.25rem" />
              <Skeleton width="20%" height="1.5rem" border-radius="0.25rem" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- View Toggle Buttons -->
    <div class="flex space-x-2">
      <Skeleton width="6rem" height="2rem" border-radius="0.25rem" />
      <Skeleton width="8rem" height="2rem" border-radius="0.25rem" />
    </div>

    <!-- Chart/Suggestions Section -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Chart Placeholder -->
      <div class="p-4 bg-white dark:bg-[rgb(31,31,32)]">
        <Skeleton width="100%" height="300px" border-radius="0.25rem" />
      </div>
      <!-- Suggestions/Table Placeholder -->
      <div class="p-4 bg-white dark:bg-[rgb(31,31,32)]">
        <Skeleton
          width="50%"
          height="1.5rem"
          border-radius="0.25rem"
          class="mb-4"
        />
        <div class="space-y-2">
          <Skeleton width="100%" height="2rem" border-radius="0.25rem" />
          <Skeleton width="100%" height="2rem" border-radius="0.25rem" />
          <Skeleton width="100%" height="2rem" border-radius="0.25rem" />
          <Skeleton width="100%" height="2rem" border-radius="0.25rem" />
          <Skeleton width="100%" height="2rem" border-radius="0.25rem" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
</script>

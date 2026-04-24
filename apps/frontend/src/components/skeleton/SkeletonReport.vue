<template>
  <div class="space-y-6">
    <!-- User Alerts placeholder -->
    <Skeleton
      height="3rem"
      border-radius="0.5rem"
    />

    <!-- Date Range Selection Card -->
    <div class="p-4 bg-deep-card rounded-lg">
      <div class="space-y-4">
        <Skeleton
          width="50%"
          height="1.125rem"
          border-radius="0.5rem"
        />
        <div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <Skeleton
            width="100%"
            height="2.5rem"
            border-radius="0.5rem"
            class="sm:w-64"
          />
          <Skeleton
            width="6rem"
            height="2.5rem"
            border-radius="0.5rem"
          />
        </div>
      </div>
    </div>

    <!-- Summary Statistics Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="p-4 bg-deep-card rounded-lg text-center">
        <Skeleton
          width="4rem"
          height="1.5rem"
          border-radius="0.5rem"
          class="mx-auto mb-2"
        />
        <Skeleton
          width="60%"
          height="0.75rem"
          border-radius="0.5rem"
          class="mx-auto"
        />
      </div>
      <div class="p-4 bg-deep-card rounded-lg text-center">
        <Skeleton
          width="5rem"
          height="1.5rem"
          border-radius="0.5rem"
          class="mx-auto mb-2"
        />
        <Skeleton
          width="50%"
          height="0.75rem"
          border-radius="0.5rem"
          class="mx-auto"
        />
      </div>
      <div class="p-4 bg-deep-card rounded-lg text-center">
        <Skeleton
          width="4rem"
          height="1.5rem"
          border-radius="0.5rem"
          class="mx-auto mb-2"
        />
        <Skeleton
          width="55%"
          height="0.75rem"
          border-radius="0.5rem"
          class="mx-auto"
        />
      </div>
      <div class="p-4 bg-deep-card rounded-lg text-center">
        <Skeleton
          width="3rem"
          height="1.5rem"
          border-radius="0.5rem"
          class="mx-auto mb-2"
        />
        <Skeleton
          width="45%"
          height="0.75rem"
          border-radius="0.5rem"
          class="mx-auto"
        />
      </div>
    </div>

    <!-- Top Products Table Card -->
    <div class="p-4 bg-deep-card rounded-lg">
      <div class="space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <Skeleton
            width="60%"
            height="1.125rem"
            border-radius="0.5rem"
          />
          <Skeleton
            width="10rem"
            height="2.25rem"
            border-radius="0.5rem"
          />
        </div>

        <!-- Table -->
        <SkeletonTable :columns="5" :rows="3" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
import { SkeletonTable } from './base';
</script>

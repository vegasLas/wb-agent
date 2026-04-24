<template>
  <div class="space-y-4">
    <!-- UserAlerts placeholder -->
    <Skeleton
      height="3rem"
      border-radius="0.5rem"
    />

    <!-- Welcome Section -->
    <div class="p-4 bg-deep-card rounded-lg">
      <div class="flex items-center gap-4">
        <Skeleton
          shape="circle"
          size="3rem"
        />
        <div class="space-y-2">
          <Skeleton
            width="8rem"
            height="1.125rem"
            border-radius="0.5rem"
          />
          <Skeleton
            width="12rem"
            height="0.875rem"
            border-radius="0.5rem"
          />
        </div>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-2 gap-3">
      <div class="p-4 bg-deep-card rounded-lg text-center">
        <Skeleton
          width="3rem"
          height="1.5rem"
          border-radius="0.5rem"
          class="mx-auto mb-2"
        />
        <Skeleton
          width="5rem"
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
          width="5rem"
          height="0.75rem"
          border-radius="0.5rem"
          class="mx-auto"
        />
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="p-4 bg-deep-card rounded-lg">
      <Skeleton
        width="8rem"
        height="1rem"
        border-radius="0.5rem"
        class="mb-4"
      />
      <div class="grid grid-cols-2 gap-3">
        <Skeleton
          height="2.5rem"
          border-radius="0.5rem"
        />
        <Skeleton
          height="2.5rem"
          border-radius="0.5rem"
        />
        <Skeleton
          height="2.5rem"
          border-radius="0.5rem"
        />
        <Skeleton
          height="2.5rem"
          border-radius="0.5rem"
        />
      </div>
    </div>

    <!-- Empty State (default for recentActivity) -->
    <div class="p-4 bg-deep-card rounded-lg">
      <Skeleton
        width="8rem"
        height="1rem"
        border-radius="0.5rem"
        class="mb-4"
      />
      <div class="text-center py-8">
        <Skeleton
          width="3rem"
          height="3rem"
          border-radius="50%"
          class="mx-auto mb-3"
        />
        <Skeleton
          width="10rem"
          height="0.875rem"
          border-radius="0.5rem"
          class="mx-auto mb-2"
        />
        <Skeleton
          width="16rem"
          height="0.75rem"
          border-radius="0.5rem"
          class="mx-auto"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
</script>

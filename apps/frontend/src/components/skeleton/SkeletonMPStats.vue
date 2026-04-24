<template>
  <div class="space-y-4">
    <!-- Token Setup State -->
    <div class="p-4 bg-deep-card rounded-lg">
      <div class="flex flex-col items-center py-8">
        <Skeleton
          shape="circle"
          size="4rem"
          class="mb-4"
        />
        <Skeleton
          width="8rem"
          height="1.125rem"
          border-radius="0.5rem"
          class="mb-2"
        />
        <Skeleton
          width="16rem"
          height="0.875rem"
          border-radius="0.5rem"
          class="mb-6"
        />
        <!-- Status row -->
        <div class="w-full max-w-md p-4 rounded-lg border border-deep-border space-y-3">
          <div class="flex items-center gap-3">
            <Skeleton width="1.25rem" height="1.25rem" border-radius="50%" />
            <div class="flex-1 space-y-1">
              <Skeleton width="40%" height="1rem" border-radius="0.5rem" />
              <Skeleton width="30%" height="0.75rem" border-radius="0.5rem" />
            </div>
          </div>
          <Skeleton width="6rem" height="2rem" border-radius="0.5rem" />
        </div>
      </div>
    </div>

    <!-- Main State (Tabs + Content) -->
    <div class="space-y-3">
      <!-- Tabs -->
      <div class="flex gap-1">
        <Skeleton width="100%" height="2.5rem" border-radius="0.5rem" />
        <Skeleton width="100%" height="2.5rem" border-radius="0.5rem" />
        <Skeleton width="100%" height="2.5rem" border-radius="0.5rem" />
      </div>

      <!-- Search -->
      <div class="flex gap-2">
        <Skeleton width="100%" height="2.5rem" border-radius="0.5rem" />
        <Skeleton width="6rem" height="2.5rem" border-radius="0.5rem" />
      </div>

      <!-- Result Cards Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div
          v-for="i in 8"
          :key="`card-${i}`"
          class="bg-deep-card rounded-lg overflow-hidden"
        >
          <!-- Image -->
          <Skeleton width="100%" height="12rem" border-radius="0" />

          <!-- Info -->
          <div class="p-3 space-y-2">
            <Skeleton width="90%" height="0.875rem" border-radius="0.5rem" />
            <Skeleton width="60%" height="0.75rem" border-radius="0.5rem" />
            <Skeleton width="50%" height="0.75rem" border-radius="0.5rem" />

            <!-- Actions -->
            <div class="flex justify-end items-center gap-2 pt-1">
              <Skeleton width="5rem" height="1.75rem" border-radius="0.5rem" />
              <Skeleton width="1.75rem" height="1.75rem" border-radius="50%" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
</script>

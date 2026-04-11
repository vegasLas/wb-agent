<template>
  <div class="space-y-3">
    <!-- Tab Switcher Buttons -->
    <div class="flex gap-1">
      <Skeleton width="100%" height="2rem" border-radius="0.25rem" />
      <Skeleton width="100%" height="2rem" border-radius="0.25rem" />
    </div>

    <!-- Search Input with Status Selector -->
    <div class="flex gap-2 items-center">
      <Skeleton width="100%" height="2.5rem" border-radius="0.25rem" class="flex-1" />
      <Skeleton width="8rem" height="2.5rem" border-radius="0.25rem" />
    </div>

    <!-- Header with title and create button -->
    <div class="flex items-center justify-between gap-4">
      <Skeleton width="10rem" height="1.25rem" border-radius="0.25rem" />
      <Skeleton width="6rem" height="2rem" border-radius="0.25rem" />
    </div>

    <!-- List Content Cards -->
    <div class="space-y-3">
      <div class="p-4 bg-deep-card">
        <div class="flex flex-col gap-3">
          <!-- Header row -->
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-2">
              <Skeleton width="1rem" height="1rem" border-radius="50%" />
              <Skeleton width="8rem" height="1.25rem" border-radius="0.25rem" />
            </div>
            <Skeleton width="5rem" height="1.5rem" border-radius="0.25rem" />
          </div>
          <!-- Content rows -->
          <div class="flex items-center gap-2">
            <Skeleton width="1rem" height="1rem" border-radius="50%" />
            <Skeleton width="6rem" height="1.25rem" border-radius="0.25rem" />
          </div>
          <div class="flex items-center gap-2">
            <Skeleton width="1rem" height="1rem" border-radius="50%" />
            <Skeleton width="10rem" height="1rem" border-radius="0.25rem" />
          </div>
          <!-- Action buttons -->
          <div class="flex justify-end gap-2 mt-2">
            <Skeleton width="2.5rem" height="2rem" border-radius="0.25rem" />
            <Skeleton width="2.5rem" height="2rem" border-radius="0.25rem" />
            <Skeleton width="2.5rem" height="2rem" border-radius="0.25rem" />
          </div>
        </div>
      </div>

      <div class="p-4 bg-deep-card">
        <div class="flex flex-col gap-3">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-2">
              <Skeleton width="1rem" height="1rem" border-radius="50%" />
              <Skeleton width="7rem" height="1.25rem" border-radius="0.25rem" />
            </div>
            <Skeleton width="6rem" height="1.5rem" border-radius="0.25rem" />
          </div>
          <div class="flex items-center gap-2">
            <Skeleton width="1rem" height="1rem" border-radius="50%" />
            <Skeleton width="5rem" height="1.25rem" border-radius="0.25rem" />
          </div>
          <div class="flex justify-end gap-2 mt-2">
            <Skeleton width="2.5rem" height="2rem" border-radius="0.25rem" />
            <Skeleton width="2.5rem" height="2rem" border-radius="0.25rem" />
          </div>
        </div>
      </div>

      <div class="p-4 bg-deep-card">
        <div class="flex flex-col gap-3">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-2">
              <Skeleton width="1rem" height="1rem" border-radius="50%" />
              <Skeleton width="9rem" height="1.25rem" border-radius="0.25rem" />
            </div>
            <Skeleton width="5rem" height="1.5rem" border-radius="0.25rem" />
          </div>
          <div class="flex items-center gap-2">
            <Skeleton width="1rem" height="1rem" border-radius="50%" />
            <Skeleton width="8rem" height="1.25rem" border-radius="0.25rem" />
          </div>
          <div class="flex justify-end gap-2 mt-2">
            <Skeleton width="2.5rem" height="2rem" border-radius="0.25rem" />
            <Skeleton width="2.5rem" height="2rem" border-radius="0.25rem" />
            <Skeleton width="2.5rem" height="2rem" border-radius="0.25rem" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
</script>

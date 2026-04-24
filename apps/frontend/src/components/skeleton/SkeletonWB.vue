<template>
  <div class="space-y-4">
    <!-- UserAlerts placeholder -->
    <Skeleton
      height="3rem"
      border-radius="0.5rem"
    />

    <!-- Top Navigation Buttons -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
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

    <!-- Main Content -->
    <div class="flex flex-col items-center justify-center h-96">
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
        width="12rem"
        height="0.875rem"
        border-radius="0.5rem"
        class="mb-8"
      />

      <!-- Quick Stats -->
      <div class="grid grid-cols-3 gap-4 w-full max-w-md">
        <div class="p-4 bg-deep-card rounded-lg text-center">
          <Skeleton
            width="3rem"
            height="1.5rem"
            border-radius="0.5rem"
            class="mx-auto mb-2"
          />
          <Skeleton
            width="6rem"
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
        <div class="p-4 bg-deep-card rounded-lg text-center">
          <Skeleton
            width="3rem"
            height="1.5rem"
            border-radius="0.5rem"
            class="mx-auto mb-2"
          />
          <Skeleton
            width="7rem"
            height="0.75rem"
            border-radius="0.5rem"
            class="mx-auto"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
</script>

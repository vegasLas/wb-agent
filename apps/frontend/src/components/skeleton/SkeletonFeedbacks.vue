<template>
  <div class="space-y-3">
    <!-- Stats Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div
        v-for="i in 4"
        :key="`stat-${i}`"
        class="p-3 bg-deep-card rounded-lg text-center"
      >
        <Skeleton
          width="3rem"
          height="1.5rem"
          border-radius="0.5rem"
          class="mx-auto mb-2"
        />
        <Skeleton
          width="80%"
          height="0.75rem"
          border-radius="0.5rem"
          class="mx-auto"
        />
      </div>
    </div>

    <!-- Actions Bar -->
    <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-deep-card rounded-lg">
      <div class="flex gap-1">
        <Skeleton
          v-for="i in 4"
          :key="`mode-${i}`"
          width="5rem"
          height="2rem"
          border-radius="0.5rem"
        />
      </div>
      <div class="flex items-center gap-2">
        <Skeleton width="8rem" height="2rem" border-radius="0.5rem" />
        <Skeleton width="8rem" height="2rem" border-radius="0.5rem" />
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1">
      <Skeleton width="100%" height="2.5rem" border-radius="0.5rem" />
      <Skeleton width="100%" height="2.5rem" border-radius="0.5rem" />
      <Skeleton width="100%" height="2.5rem" border-radius="0.5rem" />
    </div>

    <!-- Feedback Cards -->
    <div class="space-y-3">
      <div
        v-for="i in 3"
        :key="`card-${i}`"
        class="p-4 bg-deep-card rounded-lg space-y-3"
      >
        <!-- Header: product image + info -->
        <div class="flex gap-4">
          <Skeleton
            width="5rem"
            height="5rem"
            border-radius="0.5rem"
            class="flex-shrink-0"
          />
          <div class="flex-1 min-w-0 space-y-2">
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0 space-y-1.5">
                <Skeleton width="70%" height="1rem" border-radius="0.5rem" />
                <Skeleton width="40%" height="0.75rem" border-radius="0.5rem" />
              </div>
              <div class="flex-shrink-0 flex items-center gap-1">
                <Skeleton width="3rem" height="1rem" border-radius="0.5rem" />
                <div class="flex gap-0.5">
                  <Skeleton
                    v-for="s in 5"
                    :key="`star-${s}`"
                    width="0.75rem"
                    height="0.75rem"
                    border-radius="50%"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Feedback text -->
        <div class="space-y-2">
          <Skeleton width="100%" height="0.875rem" border-radius="0.5rem" />
          <Skeleton width="85%" height="0.875rem" border-radius="0.5rem" />
          <Skeleton width="60%" height="0.875rem" border-radius="0.5rem" />
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-2 pt-1">
          <Skeleton width="8rem" height="2rem" border-radius="0.5rem" />
        </div>
      </div>
    </div>

    <!-- Paginator -->
    <div class="flex justify-center gap-2 pt-2">
      <Skeleton width="2rem" height="2rem" border-radius="0.375rem" />
      <Skeleton width="2rem" height="2rem" border-radius="0.375rem" />
      <Skeleton width="2rem" height="2rem" border-radius="0.375rem" />
      <Skeleton width="2rem" height="2rem" border-radius="0.375rem" />
      <Skeleton width="2rem" height="2rem" border-radius="0.375rem" />
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
</script>

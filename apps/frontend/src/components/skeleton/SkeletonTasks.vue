<template>
  <div class="space-y-3">
    <!-- Status Filter Buttons -->
    <div class="flex gap-2">
      <Skeleton
        v-for="i in 4"
        :key="i"
        height="2.5rem"
        class="flex-1"
      />
    </div>

    <!-- Search -->
    <Skeleton height="2.5rem" />

    <!-- Add Button Row -->
    <div class="flex justify-between items-center">
      <Skeleton
        width="8rem"
        height="1rem"
      />
      <Skeleton
        width="6rem"
        height="2rem"
      />
    </div>

    <!-- Task Cards -->
    <div class="space-y-3">
      <div
        v-for="i in 3"
        :key="i"
        class="p-4 border rounded-lg bg-white dark:bg-gray-800"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-2 flex-1">
            <Skeleton
              shape="circle"
              size="1rem"
            />
            <Skeleton
              width="70%"
              height="1rem"
            />
          </div>
          <div class="flex gap-1 ml-2">
            <Skeleton
              width="4rem"
              height="1.25rem"
            />
            <Skeleton
              width="4rem"
              height="1.25rem"
            />
          </div>
        </div>
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <Skeleton
              shape="circle"
              size="0.875rem"
            />
            <Skeleton
              width="5rem"
              height="0.875rem"
            />
          </div>
          <div class="flex items-center gap-2">
            <Skeleton
              shape="circle"
              size="0.875rem"
            />
            <Skeleton
              width="8rem"
              height="0.875rem"
            />
          </div>
          <div class="flex items-center gap-2">
            <Skeleton
              shape="circle"
              size="0.875rem"
            />
            <Skeleton
              width="60%"
              height="0.5rem"
              class="flex-1"
            />
            <Skeleton
              width="2rem"
              height="0.75rem"
            />
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <Skeleton
            width="2.5rem"
            height="2rem"
          />
          <Skeleton
            width="6rem"
            height="2rem"
          />
          <Skeleton
            width="2.5rem"
            height="2rem"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
</script>

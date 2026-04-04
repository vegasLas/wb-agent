<template>
  <div class="p-4">
    <!-- Header Skeleton -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-2">
        <Skeleton
          width="80px"
          height="32px"
          border-radius="6px"
        />
        <Skeleton
          width="80px"
          height="32px"
          border-radius="6px"
        />
        <Skeleton
          width="100px"
          height="32px"
          border-radius="6px"
        />
      </div>
      <div class="hidden sm:flex items-center gap-2">
        <Skeleton
          width="32px"
          height="32px"
          border-radius="6px"
        />
        <Skeleton
          width="140px"
          height="20px"
        />
        <Skeleton
          width="32px"
          height="32px"
          border-radius="6px"
        />
      </div>
    </div>

    <!-- Month Headers Skeleton -->
    <div class="flex gap-8 mb-6">
      <div class="flex-1 text-center">
        <Skeleton
          width="100px"
          height="24px"
          class="mx-auto"
        />
      </div>
      <div class="flex-1 text-center hidden md:block">
        <Skeleton
          width="100px"
          height="24px"
          class="mx-auto"
        />
      </div>
    </div>

    <!-- Calendar Grid Skeleton -->
    <div class="flex gap-4 mb-6">
      <!-- Week Days -->
      <div class="flex-1">
        <div class="grid grid-cols-7 gap-1 mb-2">
          <Skeleton
            v-for="n in 7"
            :key="`day-${n}`"
            width="100%"
            height="24px"
          />
        </div>
        <div class="grid grid-cols-7 gap-1">
          <Skeleton
            v-for="n in 35"
            :key="`cell-${n}`"
            width="100%"
            height="96px"
            border-radius="8px"
          />
        </div>
      </div>
    </div>

    <!-- Promotion Cards Skeleton -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <div
        v-for="n in 4"
        :key="`card-${n}`"
        class="rounded-lg border border-gray-200 dark:border-gray-700 p-4"
      >
        <!-- Title -->
        <Skeleton
          width="90%"
          height="20px"
          class="mb-3"
        />
        
        <!-- Status Badges -->
        <div class="flex gap-2 mb-3">
          <Skeleton
            width="80px"
            height="24px"
            border-radius="12px"
          />
          <Skeleton
            width="60px"
            height="20px"
          />
        </div>
        
        <!-- Date Range -->
        <Skeleton
          width="70%"
          height="16px"
          class="mb-2"
        />
        <Skeleton
          width="60%"
          height="16px"
          class="mb-4"
        />
        
        <!-- Buttons -->
        <div class="flex gap-2">
          <Skeleton
            width="50%"
            height="32px"
            border-radius="6px"
          />
          <Skeleton
            width="50%"
            height="32px"
            border-radius="6px"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
</script>

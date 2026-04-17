<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="mb-6">
      <Skeleton
        width="8rem"
        height="2rem"
        border-radius="0.25rem"
        class="mb-2"
      />
      <Skeleton
        width="60%"
        height="1rem"
        border-radius="0.25rem"
      />
    </div>

    <!-- Tabs Navigation -->
    <div class="border-b border-deep-border pb-2">
      <div class="flex gap-4">
        <Skeleton
          width="6rem"
          height="2rem"
          border-radius="0.25rem"
        />
        <Skeleton
          width="6rem"
          height="2rem"
          border-radius="0.25rem"
        />
      </div>
    </div>

    <!-- Tab Content Card -->
    <div class="p-4 bg-deep-card">
      <div class="space-y-4">
        <Skeleton
          width="45%"
          height="1.5rem"
          border-radius="0.25rem"
        />
        <Skeleton
          width="100%"
          height="1rem"
          border-radius="0.25rem"
        />
        <Skeleton
          width="80%"
          height="1rem"
          border-radius="0.25rem"
        />
      </div>
    </div>

    <!-- Tariff Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="p-4 bg-deep-card">
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <Skeleton
              width="40%"
              height="1.25rem"
              border-radius="0.25rem"
            />
            <Skeleton
              width="3rem"
              height="1.25rem"
              border-radius="0.25rem"
            />
          </div>
          <div class="flex items-center gap-2">
            <Skeleton
              width="4rem"
              height="2rem"
              border-radius="0.25rem"
            />
            <Skeleton
              width="3rem"
              height="1rem"
              border-radius="0.25rem"
            />
          </div>
          <Skeleton
            width="100%"
            height="2.5rem"
            border-radius="0.25rem"
          />
        </div>
      </div>

      <div class="p-4 bg-deep-card">
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <Skeleton
              width="35%"
              height="1.25rem"
              border-radius="0.25rem"
            />
            <Skeleton
              width="3rem"
              height="1.25rem"
              border-radius="0.25rem"
            />
          </div>
          <div class="flex items-center gap-2">
            <Skeleton
              width="4rem"
              height="2rem"
              border-radius="0.25rem"
            />
            <Skeleton
              width="3rem"
              height="1rem"
              border-radius="0.25rem"
            />
          </div>
          <Skeleton
            width="100%"
            height="2.5rem"
            border-radius="0.25rem"
          />
        </div>
      </div>

      <div class="p-4 bg-deep-card">
        <div class="space-y-4">
          <Skeleton
            width="50%"
            height="1.25rem"
            border-radius="0.25rem"
          />
          <Skeleton
            width="4rem"
            height="2rem"
            border-radius="0.25rem"
          />
          <Skeleton
            width="100%"
            height="2.5rem"
            border-radius="0.25rem"
          />
        </div>
      </div>

      <div class="p-4 bg-deep-card">
        <div class="space-y-4">
          <Skeleton
            width="45%"
            height="1.25rem"
            border-radius="0.25rem"
          />
          <div class="flex items-center gap-2">
            <Skeleton
              width="5rem"
              height="2rem"
              border-radius="0.25rem"
            />
            <Skeleton
              width="4rem"
              height="1rem"
              border-radius="0.25rem"
            />
          </div>
          <Skeleton
            width="100%"
            height="2.5rem"
            border-radius="0.25rem"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
</script>

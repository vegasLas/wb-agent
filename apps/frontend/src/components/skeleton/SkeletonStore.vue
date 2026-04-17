<template>
  <div class="space-y-6">
    <!-- Header with Subscription Status Badge and Toggle Buttons -->
    <div class="flex justify-between items-center">
      <Skeleton
        width="10rem"
        height="1.75rem"
        border-radius="0.25rem"
      />
      <div class="flex gap-2">
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

    <!-- Subscription Status Card -->
    <div class="p-4 bg-deep-card">
      <div class="space-y-3">
        <Skeleton
          width="40%"
          height="1.25rem"
          border-radius="0.25rem"
        />
        <div class="flex items-center gap-2">
          <Skeleton
            width="1rem"
            height="1rem"
            border-radius="50%"
          />
          <Skeleton
            width="50%"
            height="1rem"
            border-radius="0.25rem"
          />
        </div>
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

<template>
  <div class="space-y-3">
    <!-- UserAlerts placeholder -->
    <Skeleton height="3rem" border-radius="0.25rem" />

    <!-- Status Filter Buttons (3 buttons with counts) -->
    <div class="flex gap-2">
      <div class="flex-1 flex items-center justify-between p-2 bg-deep-card rounded">
        <Skeleton width="4rem" height="1.25rem" border-radius="0.25rem" />
        <Skeleton width="1.5rem" height="1.25rem" border-radius="50%" />
      </div>
      <div class="flex-1 flex items-center justify-between p-2 bg-deep-card rounded">
        <Skeleton width="5rem" height="1.25rem" border-radius="0.25rem" />
        <Skeleton width="1.5rem" height="1.25rem" border-radius="50%" />
      </div>
      <div class="flex-1 flex items-center justify-between p-2 bg-deep-card rounded">
        <Skeleton width="4rem" height="1.25rem" border-radius="0.25rem" />
        <Skeleton width="1.5rem" height="1.25rem" border-radius="50%" />
      </div>
    </div>

    <!-- Search Input -->
    <Skeleton width="100%" height="2.5rem" border-radius="0.25rem" />

    <!-- Credits Tag and Add Button Row -->
    <div class="flex justify-between items-center">
      <Skeleton width="10rem" height="1.75rem" border-radius="0.25rem" />
      <Skeleton width="7rem" height="2.25rem" border-radius="0.25rem" />
    </div>

    <!-- Booking Cards -->
    <div class="space-y-3">
      <div class="p-4 bg-deep-card">
        <div class="flex flex-col gap-3">
          <!-- Header with warehouse and supplier -->
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-2 flex-1">
              <Skeleton width="1rem" height="1rem" border-radius="50%" />
              <div class="space-y-1">
                <Skeleton width="6rem" height="1.25rem" border-radius="0.25rem" />
                <Skeleton width="5rem" height="1rem" border-radius="0.25rem" />
              </div>
            </div>
            <Skeleton width="5rem" height="1.5rem" border-radius="0.25rem" />
          </div>

          <!-- Supply Type -->
          <div class="flex items-center gap-2">
            <Skeleton width="1rem" height="1rem" border-radius="50%" />
            <Skeleton width="5rem" height="1.25rem" border-radius="0.25rem" />
          </div>

          <!-- Date Info -->
          <div class="flex items-center gap-2">
            <Skeleton width="1rem" height="1rem" border-radius="50%" />
            <div class="space-y-1">
              <Skeleton width="8rem" height="1rem" border-radius="0.25rem" />
              <Skeleton width="6rem" height="1rem" border-radius="0.25rem" />
            </div>
          </div>

          <!-- Coefficient -->
          <div class="flex items-center gap-2">
            <Skeleton width="1rem" height="1rem" border-radius="50%" />
            <Skeleton width="10rem" height="1.25rem" border-radius="0.25rem" />
          </div>

          <!-- Status -->
          <div class="flex items-center gap-2">
            <Skeleton width="1rem" height="1rem" border-radius="50%" />
            <Skeleton width="5rem" height="1.25rem" border-radius="0.25rem" />
          </div>

          <!-- Created Date -->
          <div class="flex items-center gap-2">
            <Skeleton width="1rem" height="1rem" border-radius="50%" />
            <Skeleton width="8rem" height="1rem" border-radius="0.25rem" />
          </div>

          <!-- Action Buttons -->
          <div class="flex justify-end gap-2 mt-2">
            <Skeleton width="2.5rem" height="2rem" border-radius="0.25rem" />
            <Skeleton width="2.5rem" height="2rem" border-radius="0.25rem" />
            <Skeleton width="2.5rem" height="2rem" border-radius="0.25rem" />
            <Skeleton width="2.5rem" height="2rem" border-radius="0.25rem" />
          </div>
        </div>
      </div>

      <div class="p-4 bg-deep-card">
        <div class="flex flex-col gap-3">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-2 flex-1">
              <Skeleton width="1rem" height="1rem" border-radius="50%" />
              <div class="space-y-1">
                <Skeleton width="7rem" height="1.25rem" border-radius="0.25rem" />
                <Skeleton width="4rem" height="1rem" border-radius="0.25rem" />
              </div>
            </div>
            <Skeleton width="6rem" height="1.5rem" border-radius="0.25rem" />
          </div>

          <div class="flex items-center gap-2">
            <Skeleton width="1rem" height="1rem" border-radius="50%" />
            <Skeleton width="6rem" height="1.25rem" border-radius="0.25rem" />
          </div>

          <div class="flex items-center gap-2">
            <Skeleton width="1rem" height="1rem" border-radius="50%" />
            <div class="space-y-1">
              <Skeleton width="7rem" height="1rem" border-radius="0.25rem" />
              <Skeleton width="5rem" height="1rem" border-radius="0.25rem" />
            </div>
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

      <div class="p-4 bg-deep-card">
        <div class="flex flex-col gap-3">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-2 flex-1">
              <Skeleton width="1rem" height="1rem" border-radius="50%" />
              <div class="space-y-1">
                <Skeleton width="5rem" height="1.25rem" border-radius="0.25rem" />
              </div>
            </div>
            <Skeleton width="5rem" height="1.5rem" border-radius="0.25rem" />
          </div>

          <div class="flex items-center gap-2">
            <Skeleton width="1rem" height="1rem" border-radius="50%" />
            <Skeleton width="7rem" height="1.25rem" border-radius="0.25rem" />
          </div>

          <div class="flex items-center gap-2">
            <Skeleton width="1rem" height="1rem" border-radius="50%" />
            <Skeleton width="9rem" height="1.25rem" border-radius="0.25rem" />
          </div>

          <div class="flex justify-end gap-2 mt-2">
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

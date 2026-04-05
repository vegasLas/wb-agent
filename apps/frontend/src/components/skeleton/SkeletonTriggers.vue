<template>
  <!-- Triggers List View Skeleton - Matches TriggersListView.vue structure -->
  <div class="space-y-3">
    <!-- Status Filter Buttons (3 buttons: RELEVANT, COMPLETED, EXPIRED) -->
    <div class="flex gap-2">
      <Skeleton
        width="100%"
        height="2.25rem"
        border-radius="0.25rem"
      />
      <Skeleton
        width="100%"
        height="2.25rem"
        border-radius="0.25rem"
      />
      <Skeleton
        width="100%"
        height="2.25rem"
        border-radius="0.25rem"
      />
    </div>

    <!-- Search Input -->
    <Skeleton
      width="100%"
      height="2.5rem"
      border-radius="0.25rem"
    />

    <!-- Active Count Tag and Add Button Row -->
    <div class="flex items-center justify-between gap-4">
      <Skeleton
        width="12rem"
        height="1.75rem"
        border-radius="0.25rem"
      />
      <Skeleton
        width="7rem"
        height="2.25rem"
        border-radius="0.25rem"
      />
    </div>

    <!-- Trigger Cards -->
    <div class="space-y-3">
      <!-- Card 1 -->
      <div class="p-4 bg-white dark:bg-[rgb(31,31,32)]">
        <div class="flex flex-col gap-3">
          <!-- Warehouses section -->
          <div class="flex items-center gap-2">
            <Skeleton
              width="1rem"
              height="1rem"
              border-radius="50%"
            />
            <div class="flex flex-wrap gap-2">
              <Skeleton
                width="6rem"
                height="1.25rem"
                border-radius="0.25rem"
              />
              <Skeleton
                width="5rem"
                height="1.25rem"
                border-radius="0.25rem"
              />
            </div>
          </div>

          <!-- Supply types section -->
          <div class="flex items-center gap-2">
            <Skeleton
              width="1rem"
              height="1rem"
              border-radius="50%"
            />
            <div class="flex flex-wrap gap-2">
              <Skeleton
                width="5rem"
                height="1.25rem"
                border-radius="0.25rem"
              />
              <Skeleton
                width="6rem"
                height="1.25rem"
                border-radius="0.25rem"
              />
            </div>
          </div>

          <!-- Search mode section -->
          <div class="flex items-center gap-2">
            <Skeleton
              width="1rem"
              height="1rem"
              border-radius="50%"
            />
            <div class="flex flex-wrap gap-2 items-center">
              <Skeleton
                width="5rem"
                height="1.25rem"
                border-radius="0.25rem"
              />
              <Skeleton
                width="8rem"
                height="1.25rem"
                border-radius="0.25rem"
              />
            </div>
          </div>

          <!-- Check interval section -->
          <div class="flex items-center gap-2">
            <Skeleton
              width="1rem"
              height="1rem"
              border-radius="50%"
            />
            <Skeleton
              width="60%"
              height="1rem"
              border-radius="0.25rem"
            />
          </div>

          <!-- Free/Paid and coefficient section -->
          <div class="flex items-center gap-2">
            <Skeleton
              width="1rem"
              height="1rem"
              border-radius="50%"
            />
            <div class="flex flex-wrap gap-2">
              <Skeleton
                width="5rem"
                height="1.25rem"
                border-radius="0.25rem"
              />
              <Skeleton
                width="6rem"
                height="1.25rem"
                border-radius="0.25rem"
              />
            </div>
          </div>

          <!-- Last notification date -->
          <div class="flex items-center gap-2">
            <Skeleton
              width="0.75rem"
              height="0.75rem"
              border-radius="50%"
            />
            <Skeleton
              width="70%"
              height="1rem"
              border-radius="0.25rem"
            />
          </div>

          <!-- Created Date -->
          <div class="flex items-center gap-2">
            <Skeleton
              width="0.75rem"
              height="0.75rem"
              border-radius="50%"
            />
            <Skeleton
              width="50%"
              height="1rem"
              border-radius="0.25rem"
            />
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-2 mt-4">
            <Skeleton
              width="5rem"
              height="2rem"
              border-radius="0.25rem"
            />
            <Skeleton
              width="2.5rem"
              height="2rem"
              border-radius="0.25rem"
            />
          </div>
        </div>
      </div>

      <!-- Card 2 -->
      <div class="p-4 bg-white dark:bg-[rgb(31,31,32)]">
        <div class="flex flex-col gap-3">
          <div class="flex items-center gap-2">
            <Skeleton
              width="1rem"
              height="1rem"
              border-radius="50%"
            />
            <div class="flex flex-wrap gap-2">
              <Skeleton
                width="7rem"
                height="1.25rem"
                border-radius="0.25rem"
              />
            </div>
          </div>

          <div class="flex items-center gap-2">
            <Skeleton
              width="1rem"
              height="1rem"
              border-radius="50%"
            />
            <div class="flex flex-wrap gap-2">
              <Skeleton
                width="6rem"
                height="1.25rem"
                border-radius="0.25rem"
              />
              <Skeleton
                width="5rem"
                height="1.25rem"
                border-radius="0.25rem"
              />
              <Skeleton
                width="7rem"
                height="1.25rem"
                border-radius="0.25rem"
              />
            </div>
          </div>

          <div class="flex items-center gap-2">
            <Skeleton
              width="1rem"
              height="1rem"
              border-radius="50%"
            />
            <div class="flex flex-wrap gap-2 items-center">
              <Skeleton
                width="6rem"
                height="1.25rem"
                border-radius="0.25rem"
              />
              <Skeleton
                width="2.5rem"
                height="1.25rem"
                border-radius="0.25rem"
              />
              <Skeleton
                width="2.5rem"
                height="1.25rem"
                border-radius="0.25rem"
              />
              <Skeleton
                width="2.5rem"
                height="1.25rem"
                border-radius="0.25rem"
              />
            </div>
          </div>

          <div class="flex items-center gap-2">
            <Skeleton
              width="1rem"
              height="1rem"
              border-radius="50%"
            />
            <Skeleton
              width="55%"
              height="1rem"
              border-radius="0.25rem"
            />
          </div>

          <div class="flex items-center gap-2">
            <Skeleton
              width="1rem"
              height="1rem"
              border-radius="50%"
            />
            <div class="flex flex-wrap gap-2">
              <Skeleton
                width="6rem"
                height="1.25rem"
                border-radius="0.25rem"
              />
            </div>
          </div>

          <div class="flex items-center gap-2">
            <Skeleton
              width="0.75rem"
              height="0.75rem"
              border-radius="50%"
            />
            <Skeleton
              width="45%"
              height="1rem"
              border-radius="0.25rem"
            />
          </div>

          <div class="flex justify-end gap-2 mt-4">
            <Skeleton
              width="5rem"
              height="2rem"
              border-radius="0.25rem"
            />
            <Skeleton
              width="2.5rem"
              height="2rem"
              border-radius="0.25rem"
            />
          </div>
        </div>
      </div>

      <!-- Card 3 (Archived/Completed style) -->
      <div class="p-4 bg-white dark:bg-[rgb(31,31,32)]">
        <div class="flex flex-col gap-3">
          <div class="flex items-center gap-2">
            <Skeleton
              width="1rem"
              height="1rem"
              border-radius="50%"
            />
            <div class="flex flex-wrap gap-2">
              <Skeleton
                width="6rem"
                height="1.25rem"
                border-radius="0.25rem"
              />
              <Skeleton
                width="5rem"
                height="1.25rem"
                border-radius="0.25rem"
              />
            </div>
          </div>

          <div class="flex items-center gap-2">
            <Skeleton
              width="1rem"
              height="1rem"
              border-radius="50%"
            />
            <div class="flex flex-wrap gap-2">
              <Skeleton
                width="7rem"
                height="1.25rem"
                border-radius="0.25rem"
              />
            </div>
          </div>

          <div class="flex items-center gap-2">
            <Skeleton
              width="1rem"
              height="1rem"
              border-radius="50%"
            />
            <div class="flex flex-wrap gap-2 items-center">
              <Skeleton
                width="5rem"
                height="1.25rem"
                border-radius="0.25rem"
              />
            </div>
          </div>

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

          <div class="flex items-center gap-2">
            <Skeleton
              width="1rem"
              height="1rem"
              border-radius="50%"
            />
            <div class="flex flex-wrap gap-2">
              <Skeleton
                width="5rem"
                height="1.25rem"
                border-radius="0.25rem"
              />
              <Skeleton
                width="7rem"
                height="1.25rem"
                border-radius="0.25rem"
              />
            </div>
          </div>

          <div class="flex items-center gap-2">
            <Skeleton
              width="0.75rem"
              height="0.75rem"
              border-radius="50%"
            />
            <Skeleton
              width="40%"
              height="1rem"
              border-radius="0.25rem"
            />
          </div>

          <div class="flex justify-end gap-2 mt-4">
            <Skeleton
              width="5rem"
              height="2rem"
              border-radius="0.25rem"
            />
            <Skeleton
              width="2.5rem"
              height="2rem"
              border-radius="0.25rem"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
</script>

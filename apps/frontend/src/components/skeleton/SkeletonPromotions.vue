<template>
  <div class="min-h-screen bg-deep-bg">
    <!-- Header with Date Navigation -->
    <div class="sticky top-0 z-30 bg-deep-bg border-b border-deep-border px-4 py-3">
      <div class="flex items-center justify-between">
        <!-- Date Navigation -->
        <div class="hidden sm:flex items-center gap-2">
          <Skeleton
            width="28px"
            height="28px"
            border-radius="6px"
          />
          <Skeleton
            width="140px"
            height="20px"
          />
          <Skeleton
            width="28px"
            height="28px"
            border-radius="6px"
          />
          <Skeleton
            width="120px"
            height="16px"
            class="ml-4"
          />
        </div>
        <!-- Filter Buttons -->
        <div class="hidden sm:flex items-center gap-2">
          <Skeleton
            width="80px"
            height="28px"
            border-radius="6px"
          />
          <Skeleton
            width="80px"
            height="28px"
            border-radius="6px"
          />
          <Skeleton
            width="80px"
            height="28px"
            border-radius="6px"
          />
        </div>
      </div>
    </div>

    <!-- Mobile Date Navigation -->
    <div class="sm:hidden flex items-center justify-between px-4 py-2 border-b border-deep-border">
      <Skeleton
        width="28px"
        height="28px"
        border-radius="6px"
      />
      <Skeleton
        width="120px"
        height="20px"
      />
      <Skeleton
        width="28px"
        height="28px"
        border-radius="6px"
      />
    </div>

    <!-- Mobile Filter Buttons -->
    <div class="sm:hidden flex items-center justify-center gap-2 px-4 py-2 border-b border-deep-border bg-deep-card">
      <Skeleton
        width="70px"
        height="24px"
        border-radius="6px"
      />
      <Skeleton
        width="70px"
        height="24px"
        border-radius="6px"
      />
      <Skeleton
        width="70px"
        height="24px"
        border-radius="6px"
      />
    </div>

    <!-- Main Content -->
    <div class="p-4">
      <!-- Horizontal Scrollable Container -->
      <div class="overflow-x-auto pb-4 -mx-4 px-4">
        <div class="min-w-[1200px]">
          <!-- Two Month Headers -->
          <div class="flex mb-2">
            <div class="flex-1 text-center">
              <Skeleton
                width="120px"
                height="24px"
                class="mx-auto"
              />
            </div>
            <div class="flex-1 text-center">
              <Skeleton
                width="120px"
                height="24px"
                class="mx-auto"
              />
            </div>
          </div>

          <!-- Dates Row -->
          <div class="flex mb-1 border-b border-deep-border">
            <!-- Current Month Dates -->
            <div
              v-for="n in 31"
              :key="`date-c-${n}`"
              class="w-10 flex-shrink-0 py-2 border-r border-deep-border"
            >
              <Skeleton
                width="20px"
                height="14px"
                class="mx-auto"
              />
            </div>
            <!-- Next Month Dates -->
            <div
              v-for="n in 31"
              :key="`date-n-${n}`"
              class="w-10 flex-shrink-0 py-2 border-r border-deep-border last:border-r-0"
            >
              <Skeleton
                width="20px"
                height="14px"
                class="mx-auto"
              />
            </div>
          </div>

          <!-- Timeline Grid with Promotion Bars -->
          <div class="relative py-4 space-y-3">
            <!-- Row 1 -->
            <div class="relative h-[90px]">
              <div
                class="absolute h-[85px]"
                style="left: 40px; width: 280px"
              >
                <div class="h-full mx-1 rounded-lg border border-deep-border bg-deep-card px-3 py-2 flex items-center gap-3">
                  <div class="flex-1 min-w-0">
                    <Skeleton
                      width="85%"
                      height="16px"
                      class="mb-2"
                    />
                    <div class="flex items-center gap-2 mb-2">
                      <Skeleton
                        width="70px"
                        height="20px"
                        border-radius="12px"
                      />
                      <Skeleton
                        width="50px"
                        height="14px"
                      />
                    </div>
                    <Skeleton
                      width="60%"
                      height="12px"
                    />
                  </div>
                  <Skeleton
                    width="32px"
                    height="32px"
                    border-radius="6px"
                  />
                </div>
              </div>
              <div
                class="absolute h-[85px]"
                style="left: 400px; width: 320px"
              >
                <div class="h-full mx-1 rounded-lg border border-deep-border bg-deep-card px-3 py-2 flex items-center gap-3">
                  <div class="flex-1 min-w-0">
                    <Skeleton
                      width="80%"
                      height="16px"
                      class="mb-2"
                    />
                    <div class="flex items-center gap-2 mb-2">
                      <Skeleton
                        width="80px"
                        height="20px"
                        border-radius="12px"
                      />
                      <Skeleton
                        width="55px"
                        height="14px"
                      />
                    </div>
                    <Skeleton
                      width="55%"
                      height="12px"
                    />
                  </div>
                  <Skeleton
                    width="32px"
                    height="32px"
                    border-radius="6px"
                  />
                </div>
              </div>
            </div>

            <!-- Row 2 -->
            <div class="relative h-[90px]">
              <div
                class="absolute h-[85px]"
                style="left: 120px; width: 200px"
              >
                <div class="h-full mx-1 rounded-lg border border-deep-border bg-deep-card px-3 py-2 flex items-center gap-3">
                  <div class="flex-1 min-w-0">
                    <Skeleton
                      width="70%"
                      height="16px"
                      class="mb-2"
                    />
                    <div class="flex items-center gap-2 mb-2">
                      <Skeleton
                        width="75px"
                        height="20px"
                        border-radius="12px"
                      />
                      <Skeleton
                        width="50px"
                        height="14px"
                      />
                    </div>
                    <Skeleton
                      width="70%"
                      height="12px"
                    />
                  </div>
                  <Skeleton
                    width="32px"
                    height="32px"
                    border-radius="6px"
                  />
                </div>
              </div>
              <div
                class="absolute h-[85px]"
                style="left: 550px; width: 380px"
              >
                <div class="h-full mx-1 rounded-lg border border-deep-border bg-deep-card px-3 py-2 flex items-center gap-3">
                  <div class="flex-1 min-w-0">
                    <Skeleton
                      width="90%"
                      height="16px"
                      class="mb-2"
                    />
                    <div class="flex items-center gap-2 mb-2">
                      <Skeleton
                        width="85px"
                        height="20px"
                        border-radius="12px"
                      />
                      <Skeleton
                        width="60px"
                        height="14px"
                      />
                    </div>
                    <Skeleton
                      width="50%"
                      height="12px"
                    />
                  </div>
                  <Skeleton
                    width="32px"
                    height="32px"
                    border-radius="6px"
                  />
                </div>
              </div>
            </div>

            <!-- Row 3 -->
            <div class="relative h-[90px]">
              <div
                class="absolute h-[85px]"
                style="left: 0px; width: 300px"
              >
                <div class="h-full mx-1 rounded-lg border border-deep-border bg-deep-card px-3 py-2 flex items-center gap-3">
                  <div class="flex-1 min-w-0">
                    <Skeleton
                      width="80%"
                      height="16px"
                      class="mb-2"
                    />
                    <div class="flex items-center gap-2 mb-2">
                      <Skeleton
                        width="70px"
                        height="20px"
                        border-radius="12px"
                      />
                      <Skeleton
                        width="55px"
                        height="14px"
                      />
                    </div>
                    <Skeleton
                      width="60%"
                      height="12px"
                    />
                  </div>
                  <Skeleton
                    width="32px"
                    height="32px"
                    border-radius="6px"
                  />
                </div>
              </div>
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

<template>
  <div class="min-h-screen bg-white dark:bg-[#171819]">
    <!-- Header Skeleton -->
    <div
      class="sticky top-0 z-30 bg-white dark:bg-[#171819] border-b border-gray-200 dark:border-gray-700 px-4 py-3"
    >
      <div class="flex items-center justify-between">
        <!-- Date Navigation Skeleton (hidden on mobile) -->
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
      </div>
    </div>

    <!-- Mobile Date Navigation Skeleton -->
    <div
      class="sm:hidden flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700"
    >
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

    <!-- Main Content Skeleton -->
    <div class="p-4">
      <!-- Horizontal Scrollable Container -->
      <div class="overflow-x-auto pb-4 -mx-4 px-4">
        <div class="min-w-[1200px]">
          <!-- Two Month Headers Skeleton -->
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

          <!-- Dates Row Skeleton -->
          <div class="flex mb-1 border-b border-gray-200 dark:border-gray-700">
            <!-- Current Month Dates (31 days) -->
            <div
              v-for="n in 31"
              :key="`date-c-${n}`"
              class="w-10 flex-shrink-0 py-2 border-r border-gray-100 dark:border-gray-800"
            >
              <Skeleton
                width="20px"
                height="14px"
                class="mx-auto"
              />
            </div>
            <!-- Next Month Dates (31 days) -->
            <div
              v-for="n in 31"
              :key="`date-n-${n}`"
              class="w-10 flex-shrink-0 py-2 border-r border-gray-100 dark:border-gray-800 last:border-r-0"
            >
              <Skeleton
                width="20px"
                height="14px"
                class="mx-auto"
              />
            </div>
          </div>

          <!-- Timeline Grid Skeleton with Promotion Bars -->
          <div class="relative py-4 space-y-3">
            <!-- Row 1 - Promotion bars at different positions -->
            <div class="relative h-[90px]">
              <div
                class="absolute h-[85px]"
                style="left: 40px; width: 280px"
              >
                <div
                  class="h-full mx-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 flex items-center gap-3"
                >
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
                <div
                  class="h-full mx-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 flex items-center gap-3"
                >
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
              <div
                class="absolute h-[85px]"
                style="left: 850px; width: 250px"
              >
                <div
                  class="h-full mx-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 flex items-center gap-3"
                >
                  <div class="flex-1 min-w-0">
                    <Skeleton
                      width="75%"
                      height="16px"
                      class="mb-2"
                    />
                    <div class="flex items-center gap-2 mb-2">
                      <Skeleton
                        width="65px"
                        height="20px"
                        border-radius="12px"
                      />
                      <Skeleton
                        width="45px"
                        height="14px"
                      />
                    </div>
                    <Skeleton
                      width="65%"
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
                <div
                  class="h-full mx-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 flex items-center gap-3"
                >
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
                <div
                  class="h-full mx-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 flex items-center gap-3"
                >
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
                <div
                  class="h-full mx-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 flex items-center gap-3"
                >
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
              <div
                class="absolute h-[85px]"
                style="left: 720px; width: 280px"
              >
                <div
                  class="h-full mx-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 flex items-center gap-3"
                >
                  <div class="flex-1 min-w-0">
                    <Skeleton
                      width="75%"
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
                        width="50px"
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

            <!-- Row 4 -->
            <div class="relative h-[90px]">
              <div
                class="absolute h-[85px]"
                style="left: 200px; width: 260px"
              >
                <div
                  class="h-full mx-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 flex items-center gap-3"
                >
                  <div class="flex-1 min-w-0">
                    <Skeleton
                      width="85%"
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
                        width="45px"
                        height="14px"
                      />
                    </div>
                    <Skeleton
                      width="65%"
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
                style="left: 600px; width: 320px"
              >
                <div
                  class="h-full mx-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 flex items-center gap-3"
                >
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

            <!-- Row 5 -->
            <div class="relative h-[90px]">
              <div
                class="absolute h-[85px]"
                style="left: 80px; width: 340px"
              >
                <div
                  class="h-full mx-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 flex items-center gap-3"
                >
                  <div class="flex-1 min-w-0">
                    <Skeleton
                      width="85%"
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
                        width="60px"
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
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from 'primevue/skeleton';
</script>

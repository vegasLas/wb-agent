<template>
  <div class="h-[78vh] lg:h-[calc(100vh-100px)] flex gap-4">
    <!-- Chat area -->
    <div
      class="flex-1 h-full bg-card border border-deep-border rounded-2xl flex flex-col overflow-hidden pb-1 max-w-[900px]"
    >
      <!-- Header -->
      <div
        class="px-4 py-3 border-b border-deep-border flex items-center justify-between gap-3"
      >
        <div class="flex items-center gap-2 min-w-0">
          <SkeletonBlock preset="icon" size="1.25rem" />
          <SkeletonBlock preset="title" width="8rem" height="1.25rem" />
        </div>

        <!-- Mobile actions -->
        <div class="flex items-center gap-2 md:hidden">
          <SkeletonBlock preset="button" width="6rem" height="2rem" />
          <SkeletonBlock preset="button" width="6rem" height="2rem" />
        </div>

        <!-- Desktop new chat -->
        <SkeletonBlock class="hidden md:block" preset="button" width="6rem" height="1.5rem" />
      </div>

      <!-- Messages -->
      <div class="flex-1 p-4 space-y-4 overflow-hidden">
        <div
          v-for="i in messageCount"
          :key="`msg-${i}`"
          :class="[
            'flex',
            i % 2 === 0 ? 'justify-start' : 'justify-end',
          ]"
        >
          <div
            :class="[
              'max-w-[70%] space-y-2',
              i % 2 === 0 ? 'items-start' : 'items-end',
            ]"
          >
            <Skeleton
              :width="`${40 + (i % 3) * 20}%`"
              height="0.875rem"
              border-radius="0.5rem"
              class="min-w-[120px]"
            />
            <Skeleton
              :width="`${50 + (i % 2) * 30}%`"
              height="0.875rem"
              border-radius="0.5rem"
              class="min-w-[160px]"
            />
          </div>
        </div>
      </div>

      <!-- Input -->
      <div class="px-4 py-3 border-t border-deep-border">
        <SkeletonBlock preset="input" height="2.75rem" />
      </div>
    </div>

    <!-- Desktop sidebar -->
    <div
      class="hidden md:flex w-[260px] h-full bg-card border border-deep-border rounded-2xl flex-col overflow-hidden p-3 space-y-3"
    >
      <SkeletonBlock preset="button" width="100%" height="2.25rem" />
      <SkeletonListItem
        v-for="i in sidebarItems"
        :key="`sidebar-${i}`"
        icon
        title-width="70%"
        subtitle-width="40%"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import SkeletonBlock from './SkeletonBlock.vue';
import SkeletonListItem from './SkeletonListItem.vue';

interface Props {
  messageCount?: number;
  sidebarItems?: number;
}

withDefaults(defineProps<Props>(), {
  messageCount: 5,
  sidebarItems: 3,
});
</script>

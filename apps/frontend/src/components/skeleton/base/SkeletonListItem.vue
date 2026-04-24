<template>
  <div class="flex items-center gap-3 p-3 bg-deep-card rounded-lg">
    <!-- Icon / Avatar slot -->
    <div v-if="avatar">
      <SkeletonBlock preset="avatar" size="2.5rem" />
    </div>
    <div v-else-if="icon">
      <SkeletonBlock preset="icon" size="1.5rem" />
    </div>

    <!-- Content -->
    <div class="flex-1 space-y-1.5 min-w-0">
      <SkeletonBlock preset="title" :width="titleWidth" />
      <SkeletonBlock preset="caption" :width="subtitleWidth" />
      <div v-if="extraLines > 0" class="space-y-1.5 pt-1">
        <SkeletonBlock
          v-for="i in extraLines"
          :key="`extra-${i}`"
          preset="text"
          :width="`${50 + (i % 2) * 20}%`"
        />
      </div>
    </div>

    <!-- Actions -->
    <div v-if="actions > 0" class="flex items-center gap-2 ml-2">
      <SkeletonBlock
        v-for="i in actions"
        :key="`action-${i}`"
        preset="button"
        :width="actionWidth"
        :height="actionHeight"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import SkeletonBlock from './SkeletonBlock.vue';

interface Props {
  avatar?: boolean;
  icon?: boolean;
  titleWidth?: string;
  subtitleWidth?: string;
  extraLines?: number;
  actions?: number;
  actionWidth?: string;
  actionHeight?: string;
}

withDefaults(defineProps<Props>(), {
  avatar: false,
  icon: false,
  titleWidth: '60%',
  subtitleWidth: '40%',
  extraLines: 0,
  actions: 0,
  actionWidth: '2.5rem',
  actionHeight: '2rem',
});
</script>

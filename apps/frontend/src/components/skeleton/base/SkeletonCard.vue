<template>
  <div class="p-4 bg-deep-card rounded-lg space-y-3">
    <!-- Header -->
    <div v-if="header" class="flex items-center justify-between">
      <SkeletonBlock preset="title" :width="titleWidth" />
      <SkeletonBlock v-if="headerAction" preset="button" :width="actionWidth" />
    </div>

    <!-- Content rows -->
    <div v-for="i in rows" :key="`row-${i}`" class="flex items-center gap-2">
      <SkeletonBlock v-if="hasIcon" preset="icon" />
      <SkeletonBlock preset="text" :width="`${60 + (i % 3) * 15}%`" />
    </div>

    <!-- Footer / Action -->
    <div v-if="footer" class="pt-2">
      <SkeletonBlock preset="button" :width="footerWidth" />
    </div>

    <!-- Slot for custom content -->
    <slot />
  </div>
</template>

<script setup lang="ts">
import SkeletonBlock from './SkeletonBlock.vue';

interface Props {
  header?: boolean;
  headerAction?: boolean;
  rows?: number;
  hasIcon?: boolean;
  footer?: boolean;
  titleWidth?: string;
  actionWidth?: string;
  footerWidth?: string;
}

withDefaults(defineProps<Props>(), {
  header: true,
  headerAction: false,
  rows: 2,
  hasIcon: false,
  footer: false,
  titleWidth: '40%',
  actionWidth: '5rem',
  footerWidth: '100%',
});
</script>

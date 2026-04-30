<template>
  <div class="min-h-screen bg-deep-bg text-theme">
    <!-- Header -->
    <div class="sticky top-0 z-30 bg-deep-bg/95 backdrop-blur border-b border-deep-border">
      <div class="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        <RouterLink
          to="/"
          class="inline-flex items-center gap-2 text-sm text-secondary hover:text-theme transition-colors"
        >
          <i class="pi pi-arrow-left" />
          <span>На главную</span>
        </RouterLink>
        <h1 class="text-sm font-semibold">Политика конфиденциальности</h1>
      </div>
    </div>

    <!-- Content -->
    <main class="py-8 px-4">
      <div class="max-w-3xl mx-auto">
        <PolicyPrivacy />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { PolicyPrivacy } from '@/components/legal';
</script>

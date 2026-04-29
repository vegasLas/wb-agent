<template>
  <div class="min-h-screen bg-theme text-theme transition-colors duration-200">
    <!-- Navigation -->
    <nav class="fixed top-0 left-0 right-0 z-50 bg-theme/80 backdrop-blur-xl border-b border-theme transition-colors duration-200">
      <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <a href="/" class="flex items-center gap-2">
          <img src="/logo.png" alt="WBOI" class="h-8 w-auto block" draggable="false" />
          <span class="text-2xl font-bold text-gradient">WBOI</span>
        </a>

        <div class="hidden md:flex items-center gap-8">
          <a href="#features" class="text-secondary hover:text-theme transition-colors">Возможности</a>
          <a href="#how-it-works" class="text-secondary hover:text-theme transition-colors">Как работает</a>
          <a href="#pricing" class="text-secondary hover:text-theme transition-colors">Тарифы</a>
        </div>

        <div class="flex items-center gap-3">
          <!-- Theme Toggle -->
          <button
            @click="toggleTheme"
            class="p-2 rounded-xl bg-elevated border border-theme text-secondary hover:text-theme transition-all duration-200"
            :title="isDark ? 'Светлая тема' : 'Тёмная тема'"
          >
            <svg v-if="isDark" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </button>

          <a
            href="https://app.wboi.ru"
            class="px-5 py-2 rounded-xl bg-gradient-purple text-white font-medium text-sm transition-all duration-300 hover:shadow-lg hover:shadow-purple/30"
          >
            Войти
          </a>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main>
      <HeroSection />

      <div class="relative">
        <div class="absolute inset-0 bg-gradient-to-b from-transparent via-purple/5 to-transparent pointer-events-none"></div>
        <StatsSection />
      </div>

      <FeaturesGrid />

      <div class="relative">
        <div class="absolute inset-0 bg-gradient-to-b from-transparent via-purple/5 to-transparent pointer-events-none"></div>
        <HowItWorks />
      </div>

      <PricingTeaser />
    </main>

    <LandingFooter />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useColorMode } from '@vueuse/core';
import HeroSection from './components/HeroSection.vue';
import StatsSection from './components/StatsSection.vue';
import FeaturesGrid from './components/FeaturesGrid.vue';
import HowItWorks from './components/HowItWorks.vue';
import PricingTeaser from './components/PricingTeaser.vue';
import LandingFooter from './components/LandingFooter.vue';

const colorMode = useColorMode({
  attribute: 'class',
  selector: 'html',
});

const isDark = computed(() => colorMode.value === 'dark');

function toggleTheme() {
  colorMode.value = isDark.value ? 'light' : 'dark';
}
</script>

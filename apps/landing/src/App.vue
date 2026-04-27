<template>
  <div class="min-h-screen bg-deep-bg text-white">
    <!-- Navigation -->
    <nav class="fixed top-0 left-0 right-0 z-50 bg-deep-bg/80 backdrop-blur-xl border-b border-deep-border/50">
      <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <a href="/" class="flex items-center gap-2">
          <img src="/logo.png" alt="WBOI" class="h-8 w-auto block" draggable="false" />
          <span class="text-2xl font-bold text-gradient">WBOI</span>
        </a>

        <div class="hidden md:flex items-center gap-8">
          <a href="#features" class="text-gray-400 hover:text-white transition-colors">Возможности</a>
          <a href="#how-it-works" class="text-gray-400 hover:text-white transition-colors">Как работает</a>
          <a href="#pricing" class="text-gray-400 hover:text-white transition-colors">Тарифы</a>
        </div>

        <a
          href="https://app.wboi.ru"
          class="px-5 py-2 rounded-xl bg-gradient-purple text-white font-medium text-sm transition-all duration-300 hover:shadow-lg hover:shadow-purple/30"
        >
          Войти
        </a>
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
import HeroSection from './components/HeroSection.vue';
import StatsSection from './components/StatsSection.vue';
import FeaturesGrid from './components/FeaturesGrid.vue';
import HowItWorks from './components/HowItWorks.vue';
import PricingTeaser from './components/PricingTeaser.vue';
import LandingFooter from './components/LandingFooter.vue';
</script>

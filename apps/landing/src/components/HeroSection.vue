<template>
  <section
    class="relative min-h-screen flex items-center justify-center overflow-hidden"
  >
    <ParticleBackground />

    <div class="relative z-10 text-center px-4 max-w-5xl mx-auto">
      <div
        class="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-deep-elevated border border-deep-border"
      >
        <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
        <span class="text-sm text-secondary"
          >AI-ассистент 24/7</span
        >
      </div>

      <h1
        ref="titleRef"
        class="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tight mb-6"
      >
        <span class="text-gradient">WBOI</span>
      </h1>

      <p
        ref="subtitleRef"
        class="text-xl md:text-2xl lg:text-3xl text-secondary mb-4 max-w-3xl mx-auto leading-relaxed"
      >
        AI-платформа для селлеров
        <span class="text-theme font-semibold">Wildberries</span>
      </p>

      <p
        ref="descRef"
        class="text-base md:text-lg text-muted mb-10 max-w-2xl mx-auto"
      >
        Умный AI-ассистент анализирует данные, отвечает на вопросы и помогает принимать решения.
        Автобронирование, аналитика, реклама и отзывы — всё под рукой
      </p>

      <div
        ref="buttonsRef"
        class="flex flex-col sm:flex-row items-center justify-center gap-4"
      >
        <a
          href="https://app.wboi.ru"
          class="group relative px-8 py-4 rounded-2xl bg-gradient-purple text-white font-semibold text-lg transition-all duration-300 glow-purple hover:glow-purple-hover hover:scale-105"
        >
          <span class="flex items-center gap-2">
            Войти в приложение
            <svg
              class="w-5 h-5 transition-transform group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </span>
        </a>


      </div>
    </div>

    <!-- Gradient overlays -->
    <div
      class="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-deep-bg to-transparent pointer-events-none"
    ></div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { gsap } from 'gsap';
import ParticleBackground from './ParticleBackground.vue';

const titleRef = ref<HTMLElement | null>(null);
const subtitleRef = ref<HTMLElement | null>(null);
const descRef = ref<HTMLElement | null>(null);
const buttonsRef = ref<HTMLElement | null>(null);
const scrollIndicatorRef = ref<HTMLElement | null>(null);

onMounted(() => {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  tl.from(titleRef.value, { y: 50, opacity: 0, duration: 1 })
    .from(subtitleRef.value, { y: 40, opacity: 0, duration: 0.8 }, '-=0.6')
    .from(descRef.value, { y: 30, opacity: 0, duration: 0.8 }, '-=0.5')
    .from(buttonsRef.value, { y: 30, opacity: 0, duration: 0.8 }, '-=0.5')
    .from(scrollIndicatorRef.value, { opacity: 0, duration: 1 }, '-=0.3');
});
</script>

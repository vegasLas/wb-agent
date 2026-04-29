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
          >Работаем со всеми складами Wildberries</span
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
        Интеллектуальная платформа для селлеров
        <span class="text-theme font-semibold">Wildberries</span>
      </p>

      <p
        ref="descRef"
        class="text-base md:text-lg text-muted mb-10 max-w-2xl mx-auto"
      >
        Автобронирование поставок, AI-ассистент, управление рекламой, аналитика
        продаж по регионам и автоматические ответы на отзывы — всё в одном месте
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

        <a
          href="https://t.me/wb_booking_bot"
          target="_blank"
          rel="noopener"
          class="px-8 py-4 rounded-2xl bg-deep-elevated border border-deep-border text-theme font-semibold text-lg transition-all duration-300 hover:bg-deep-card hover:border-purple/50 hover:scale-105"
        >
          <span class="flex items-center gap-2">
            <svg
              class="w-5 h-5 text-blue-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"
              />
            </svg>
            Telegram бот
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

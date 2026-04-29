<template>
  <section class="relative py-20 px-4">
    <div class="max-w-6xl mx-auto">
      <div
        ref="statsRef"
        class="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12"
      >
        <div
          v-for="(stat, index) in stats"
          :key="stat.label"
          ref="statItemRefs"
          class="text-center"
        >
          <div class="text-3xl md:text-5xl font-bold text-gradient mb-2">
            <AnimatedCounter :target="stat.value" :suffix="stat.suffix" />
          </div>
          <p class="text-secondary text-sm md:text-base">{{ stat.label }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import AnimatedCounter from './AnimatedCounter.vue';

gsap.registerPlugin(ScrollTrigger);

const statsRef = ref<HTMLElement | null>(null);
const statItemRefs = ref<HTMLElement[]>([]);

const stats = [
  { value: 5000, suffix: '+', label: 'Активных пользователей' },
  { value: 150000, suffix: '+', label: 'Автобронирований' },
  { value: 98, suffix: '%', label: 'Успешных поставок' },
  { value: 24, suffix: '/7', label: 'Работа сервиса' },
];

onMounted(() => {
  statItemRefs.value.forEach((stat, index) => {
    gsap.from(stat, {
      scrollTrigger: {
        trigger: statsRef.value,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
      y: 40,
      opacity: 0,
      duration: 0.7,
      delay: index * 0.12,
      ease: 'power3.out',
    });
  });
});
</script>

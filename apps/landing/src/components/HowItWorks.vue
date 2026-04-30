<template>
  <section id="how-it-works" class="relative py-24 md:py-32 px-4">
    <div class="max-w-6xl mx-auto">
      <div ref="headerRef" class="text-center mb-16 md:mb-20">
        <h2 class="text-3xl md:text-5xl font-bold mb-4">
          Как это <span class="text-gradient">работает</span>
        </h2>
        <p class="text-secondary text-lg max-w-2xl mx-auto">
          Начните использовать WBOI за три простых шага
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
        <div
          v-for="(step, index) in steps"
          :key="step.title"
          ref="stepRefs"
          class="relative text-center"
        >
          <div
            class="w-20 h-20 mx-auto rounded-3xl bg-gradient-purple flex items-center justify-center mb-6 text-3xl font-bold text-white shadow-lg"
          >
            {{ index + 1 }}
          </div>

          <h3 class="text-xl font-semibold text-theme mb-3">{{ step.title }}</h3>
          <p class="text-secondary leading-relaxed">{{ step.description }}</p>

          <!-- Connector line (hidden on mobile) -->
          <div
            v-if="index < steps.length - 1"
            class="hidden md:block absolute top-10 left-[calc(50%+60px)] w-[calc(100%-120px)] h-px bg-gradient-to-r from-purple/50 to-purple/10"
          ></div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const headerRef = ref<HTMLElement | null>(null);
const stepRefs = ref<HTMLElement[]>([]);

const steps = [
  {
    title: 'Подключите аккаунт',
    description: 'Зарегистрируйтесь в браузере. Добавьте API-ключ поставщика Wildberries для начала работы.',
  },
  {
    title: 'Настройте автоматизацию',
    description: 'Создайте правила автобронирования, триггеры таймслотов, автоответы на отзывы и подключите нужные модули.',
  },
  {
    title: 'Наблюдайте за ростом',
    description: 'Следите за аналитикой, управляйте рекламой и задавайте вопросы AI-ассистенту — он поможет найти инсайты для роста продаж.',
  },
];

onMounted(() => {
  gsap.from(headerRef.value, {
    scrollTrigger: {
      trigger: headerRef.value,
      start: 'top 85%',
      toggleActions: 'play none none none',
    },
    y: 40,
    opacity: 0,
    duration: 0.8,
    ease: 'power3.out',
  });

  stepRefs.value.forEach((step, index) => {
    gsap.from(step, {
      scrollTrigger: {
        trigger: step,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
      y: 50,
      opacity: 0,
      duration: 0.7,
      delay: index * 0.2,
      ease: 'power3.out',
    });
  });
});
</script>

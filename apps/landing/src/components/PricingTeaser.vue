<template>
  <section id="pricing" class="relative py-24 md:py-32 px-4">
    <div class="max-w-5xl mx-auto">
      <div ref="headerRef" class="text-center mb-16 md:mb-20">
        <h2 class="text-3xl md:text-5xl font-bold mb-4">
          Прозрачные <span class="text-gradient">тарифы</span>
        </h2>
        <p class="text-gray-400 text-lg max-w-2xl mx-auto">
          Выберите подходящий план и начните автоматизировать свой бизнес на Wildberries
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          v-for="(plan, index) in plans"
          :key="plan.name"
          ref="planRefs"
          class="relative p-6 md:p-8 rounded-3xl border transition-all duration-500"
          :class="[
            plan.popular
              ? 'bg-gradient-to-b from-purple/20 to-deep-card border-purple/50 glow-purple'
              : 'bg-deep-card border-deep-border hover:border-purple/30',
          ]"
        >
          <div
            v-if="plan.popular"
            class="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-purple text-white text-sm font-medium"
          >
            Популярный
          </div>

          <h3 class="text-xl font-semibold text-white mb-2">{{ plan.name }}</h3>
          <p class="text-gray-400 text-sm mb-6">{{ plan.description }}</p>

          <div class="mb-6">
            <span class="text-4xl font-bold text-white">{{ plan.price }}</span>
            <span class="text-gray-400"> ₽</span>
            <span class="text-gray-500 text-sm"> / {{ plan.period }}</span>
          </div>

          <ul class="space-y-3 mb-8">
            <li v-for="feature in plan.features" :key="feature" class="flex items-start gap-3">
              <svg class="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span class="text-gray-300 text-sm">{{ feature }}</span>
            </li>
          </ul>

          <a
            :href="`https://app.wboi.ru/store/subscription`"
            class="block w-full text-center py-3 rounded-2xl font-semibold transition-all duration-300"
            :class="[
              plan.popular
                ? 'bg-gradient-purple text-white hover:shadow-lg hover:shadow-purple/30'
                : 'bg-deep-elevated text-white border border-deep-border hover:border-purple/40',
            ]"
          >
            Выбрать
          </a>
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
const planRefs = ref<HTMLElement[]>([]);

const plans = [
  {
    name: '30 дней',
    description: 'Для знакомства с платформой',
    price: '990',
    period: 'мес',
    popular: false,
    features: ['Все модули платформы', '1 поставщик', 'Базовая поддержка'],
  },
  {
    name: '90 дней',
    description: 'Оптимальный выбор',
    price: '2.490',
    period: '3 мес',
    popular: true,
    features: ['Все модули платформы', 'До 3 поставщиков', 'Приоритетная поддержка', 'Экономия 20%'],
  },
  {
    name: '365 дней',
    description: 'Для крупного бизнеса',
    price: '7.990',
    period: 'год',
    popular: false,
    features: ['Все модули платформы', 'Неограниченные поставщики', 'VIP поддержка', 'Экономия 35%'],
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

  planRefs.value.forEach((plan, index) => {
    gsap.from(plan, {
      scrollTrigger: {
        trigger: plan,
        start: 'top 90%',
        toggleActions: 'play none none none',
      },
      y: 60,
      opacity: 0,
      duration: 0.7,
      delay: index * 0.15,
      ease: 'power3.out',
    });
  });
});
</script>

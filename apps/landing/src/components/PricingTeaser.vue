<template>
  <section id="pricing" class="relative py-24 md:py-32 px-4">
    <div class="max-w-6xl mx-auto">
      <div ref="headerRef" class="text-center mb-16 md:mb-20">
        <h2 class="text-3xl md:text-5xl font-bold mb-4">
          Прозрачные <span class="text-gradient">тарифы</span>
        </h2>
        <p class="text-secondary text-lg max-w-2xl mx-auto">
          Выберите подходящий план и начните автоматизировать свой бизнес на
          Wildberries
        </p>
      </div>

      <!-- Period Selector -->
      <div class="flex justify-center mb-12">
        <div class="inline-flex bg-[var(--color-elevated)] rounded-lg p-1 gap-1">
          <button
            v-for="period in periodOptions"
            :key="period.index"
            :class="[
              'px-4 py-2 text-sm font-medium rounded-md transition-all',
              selectedPeriodIndex === period.index
                ? 'bg-[var(--color-card)] text-[var(--color-text)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--color-text)]',
            ]"
            @click="selectedPeriodIndex = period.index"
          >
            {{ period.label }}
          </button>
        </div>
      </div>

      <!-- Pricing Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="tier in tiers"
          :key="tier.key"
          ref="planRefs"
          class="rounded-2xl border transition-all duration-300 overflow-hidden hover:shadow-lg"
          :class="[
            tier.popular
              ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
              : 'bg-[var(--color-card)] border-[var(--color-border)]',
          ]"
        >
          <div class="p-6 space-y-4">
            <!-- Title -->
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-theme">{{ tier.label }}</h3>
              <div class="flex gap-1">
                <span
                  v-if="tier.popular"
                  class="px-2 py-0.5 rounded-md bg-[var(--color-elevated)] text-[var(--text-secondary)] text-xs font-medium border border-[var(--color-border)]"
                >
                  Popular
                </span>
              </div>
            </div>

            <!-- Price -->
            <div>
              <div class="flex items-baseline gap-1">
                <p class="text-4xl font-bold text-theme">{{ formatPrice(tier.totalPrice) }} ₽</p>
              </div>

              <!-- Monthly equivalent -->
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {{ formatPrice(tier.monthlyPrice) }} ₽/мес
              </p>
            </div>

            <p class="text-sm text-gray-600 dark:text-gray-300">
              {{ tier.description }}
            </p>

            <!-- CTA Button -->
            <a
              :href="`https://app.wboi.ru/store?plan=${tier.key}`"
              class="block w-full text-center py-2.5 rounded-xl font-medium transition-all duration-200 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-white"
            >
              Попробовать
            </a>

            <!-- Divider -->
            <div class="border-t border-[var(--color-border)]"></div>

            <!-- Features -->
            <div>
              <p class="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-3">
                Возможности
              </p>

              <ul class="space-y-2">
                <li
                  v-if="tier.prevTier"
                  class="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <svg class="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span>Всё из {{ tier.prevTier }}</span>
                </li>
                <li
                  v-for="feature in tier.features"
                  :key="feature"
                  class="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <svg class="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span>{{ feature }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const headerRef = ref<HTMLElement | null>(null);
const planRefs = ref<HTMLElement[]>([]);

const periodOptions = [
  { label: '1 мес', index: 0 },
  { label: '6 мес', index: 2 },
  { label: '1 год', index: 3 },
];

const selectedPeriodIndex = ref(0);

const monthsPerPeriod = [1, 3, 6, 12];

// Total tariff prices per period index
const liteTotals = [790, 1990, 3490, 6070];
const proTotals = [2490, 5990, 10990, 18890];
const maxTotals = [6990, 17990, 32990, 56200];

// Effective monthly prices (for secondary display)
const liteMonthly = liteTotals.map((t, i) => Math.round(t / monthsPerPeriod[i]));
const proMonthly = proTotals.map((t, i) => Math.round(t / monthsPerPeriod[i]));
const maxMonthly = maxTotals.map((t, i) => Math.round(t / monthsPerPeriod[i]));

// Animate total prices (main display)
const animatedLiteTotal = ref(liteTotals[0]);
const animatedProTotal = ref(proTotals[0]);
const animatedMaxTotal = ref(maxTotals[0]);

function animateValue(
  targetRef: ReturnType<typeof ref<number>>,
  from: number,
  to: number,
  duration = 400
) {
  const startTime = performance.now();

  function tick(now: number) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // easeOutQuart
    const eased = 1 - Math.pow(1 - progress, 4);
    targetRef.value = Math.round(from + (to - from) * eased);

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}

watch(selectedPeriodIndex, (newIndex, oldIndex) => {
  animateValue(animatedLiteTotal, liteTotals[oldIndex], liteTotals[newIndex]);
  animateValue(animatedProTotal, proTotals[oldIndex], proTotals[newIndex]);
  animateValue(animatedMaxTotal, maxTotals[oldIndex], maxTotals[newIndex]);
});

function formatPrice(price: number) {
  return price.toLocaleString('ru-RU');
}

const tiers = computed(() => {
  const idx = selectedPeriodIndex.value;
  return [
    {
      key: 'LITE',
      label: 'Лайт',
      totalPrice: animatedLiteTotal.value,
      monthlyPrice: liteMonthly[idx],
      description: 'Для начинающих продавцов на Wildberries.',
      prevTier: 'Бесплатного',
      features: [
        '6 активных автоброней',
        '1 WB аккаунт',
        '300 отзывов в месяц',
        'AI чат free x5 limit',
      ],
    },
    {
      key: 'PRO',
      label: 'Про',
      totalPrice: animatedProTotal.value,
      monthlyPrice: proMonthly[idx],
      description: 'Полный доступ для растущего бизнеса.',
      prevTier: 'Лайта',
      popular: true,
      features: [
        '30 активных автоброней',
        '3 WB аккаунта',
        '2.000 отзывов в месяц',
        'AI чат lite x5 limit',
      ],
    },
    {
      key: 'MAX',
      label: 'Максимум',
      totalPrice: animatedMaxTotal.value,
      monthlyPrice: maxMonthly[idx],
      description: 'Для агентств и крупных продавцов.',
      prevTier: 'Про',
      features: [
        '90 активных автоброней',
        '∞ WB аккаунтов',
        '∞ отзывов',
        'AI чат lite x25 limit',
      ],
    },
  ];
});

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

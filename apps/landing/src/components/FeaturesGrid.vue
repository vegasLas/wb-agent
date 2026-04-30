<template>
  <section id="features" class="relative py-24 md:py-32 px-4">
    <div class="max-w-7xl mx-auto">
      <div ref="headerRef" class="text-center mb-16 md:mb-20">
        <h2 class="text-3xl md:text-5xl font-bold mb-4">
          Все инструменты для <span class="text-gradient">роста продаж</span>
        </h2>
        <p class="text-secondary text-lg max-w-2xl mx-auto">
          Полный набор функций, которые нужны каждому селлеру на Wildberries
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="(feature, index) in features"
          :key="feature.title"
          ref="cardRefs"
          class="group relative p-6 md:p-8 rounded-3xl bg-deep-card border border-deep-border transition-all duration-500 hover:border-purple/40 hover:glow-purple-hover"
          :data-index="index"
        >
          <div
            class="w-12 h-12 rounded-2xl bg-gradient-purple flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
          >
            <component :is="feature.icon" class="w-6 h-6 text-white" />
          </div>

          <h3 class="text-xl font-semibold text-theme mb-3">{{ feature.title }}</h3>
          <p class="text-secondary leading-relaxed">{{ feature.description }}</p>

          <div
            class="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          ></div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, h } from 'vue';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const headerRef = ref<HTMLElement | null>(null);
const cardRefs = ref<HTMLElement[]>([]);

const IconBrain = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', class: 'w-6 h-6' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' })
]);

const IconCalendar = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', class: 'w-6 h-6' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' })
]);

const IconArrows = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', class: 'w-6 h-6' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4 4' })
]);

const IconClock = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', class: 'w-6 h-6' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' })
]);

const IconTag = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', class: 'w-6 h-6' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' })
]);

const IconMessage = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', class: 'w-6 h-6' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' })
]);

const IconChart = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', class: 'w-6 h-6' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' })
]);

const IconPie = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', class: 'w-6 h-6' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z' }),
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z' })
]);

const IconSearch = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', class: 'w-6 h-6' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' })
]);

const IconMap = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', class: 'w-6 h-6' }, [
  h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z' })
]);

const features = [
  { title: 'AI Ассистент', description: 'Умный AI-ассистент анализирует ваши продажи, подсказывает оптимальные решения, отвечает на сложные вопросы и работает с данными вашего бизнеса в реальном времени', icon: IconBrain },
  { title: 'Автобронирование', description: 'Автоматическое бронирование слотов поставок по заданным параметрам: черновик, склад, дата и коэффициент', icon: IconCalendar },
  { title: 'Перепланирования', description: 'Быстрое перенос существующих поставок на другие даты и склады без ручного отслеживания', icon: IconArrows },
  { title: 'Таймслоты', description: 'Автоматические триггеры для поиска слотов с заданными интервалами и порогами коэффициентов', icon: IconClock },
  { title: 'Акции', description: 'Календарь акций Wildberries, управление участием, таймлайн мероприятий и экспорт в Excel', icon: IconTag },
  { title: 'Отзывы', description: 'Управление отзывами, автоответы, AI-генерация ответов, группировка по товарам и правила', icon: IconMessage },
  { title: 'Реклама', description: 'Статистика рекламных кампаний, данные по пресетам и эффективность вложений в продвижение', icon: IconChart },
  { title: 'Аналитика', description: 'Отчёты по поставкам, распределение по складам, статистика коэффициентов и рекомендации', icon: IconPie },
  { title: 'MPStats', description: 'Поиск товаров, аналитика по SKU, графики продаж, избранное и интеграция с MPStats', icon: IconSearch },
  { title: 'Продажи по регионам', description: 'Аналитика продаж по странам, федеральным округам, областям и городам с детализацией', icon: IconMap },
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

  cardRefs.value.forEach((card, index) => {
    gsap.from(card, {
      scrollTrigger: {
        trigger: card,
        start: 'top 90%',
        toggleActions: 'play none none none',
      },
      y: 50,
      opacity: 0,
      duration: 0.6,
      delay: index * 0.08,
      ease: 'power3.out',
    });
  });
});
</script>

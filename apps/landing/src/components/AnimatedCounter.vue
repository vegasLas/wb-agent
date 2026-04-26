<template>
  <span ref="counterRef">{{ displayValue }}</span>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { gsap } from 'gsap';

interface Props {
  target: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}

const props = withDefaults(defineProps<Props>(), {
  suffix: '',
  prefix: '',
  duration: 2,
});

const counterRef = ref<HTMLElement | null>(null);
const animatedValue = ref(0);

const displayValue = computed(() => {
  return `${props.prefix}${Math.round(animatedValue.value).toLocaleString('ru-RU')}${props.suffix}`;
});

onMounted(() => {
  const el = counterRef.value;
  if (!el) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          gsap.to(animatedValue, {
            value: props.target,
            duration: props.duration,
            ease: 'power2.out',
          });
          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.5 }
  );

  observer.observe(el);
});
</script>

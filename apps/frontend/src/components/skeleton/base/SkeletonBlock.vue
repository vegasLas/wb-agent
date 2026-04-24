<template>
  <Skeleton
    :width="computedWidth"
    :height="computedHeight"
    :border-radius="computedBorderRadius"
    :shape="shape"
    :size="size"
    :class="computedClass"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Skeleton from 'primevue/skeleton';

type BlockPreset = 'title' | 'text' | 'caption' | 'button' | 'avatar' | 'icon' | 'badge' | 'input' | 'custom';

interface Props {
  preset?: BlockPreset;
  width?: string;
  height?: string;
  borderRadius?: string;
  shape?: 'circle' | 'square' | 'rectangle' | undefined;
  size?: string;
  class?: string;
  lines?: number;
}

const props = withDefaults(defineProps<Props>(), {
  preset: 'custom',
  width: undefined,
  height: undefined,
  borderRadius: undefined,
  shape: undefined,
  size: undefined,
  class: undefined,
  lines: 1,
});

const presetConfig: Record<BlockPreset, { width?: string; height?: string; borderRadius?: string; shape?: 'circle' | 'square' | 'rectangle' }> = {
  title: { width: '40%', height: '1.25rem', borderRadius: '0.5rem' },
  text: { width: '70%', height: '0.875rem', borderRadius: '0.5rem' },
  caption: { width: '50%', height: '0.75rem', borderRadius: '0.5rem' },
  button: { width: '6rem', height: '2rem', borderRadius: '0.5rem' },
  avatar: { width: undefined, height: undefined, borderRadius: undefined, shape: 'circle' as const },
  icon: { width: '1rem', height: '1rem', borderRadius: '50%' },
  badge: { width: '3rem', height: '1.25rem', borderRadius: '9999px' },
  input: { width: '100%', height: '2.5rem', borderRadius: '0.5rem' },
  custom: {},
};

const computedWidth = computed(() => props.width ?? presetConfig[props.preset].width);
const computedHeight = computed(() => props.height ?? presetConfig[props.preset].height);
const computedBorderRadius = computed(() => props.borderRadius ?? presetConfig[props.preset].borderRadius);
const computedClass = computed(() => props.class);
</script>

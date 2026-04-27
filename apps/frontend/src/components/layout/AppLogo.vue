<template>
  <img
    src="/logo.png"
    alt="WBOI"
    :style="{ width: size + 'px', height: 'auto' }"
    class="block"
    draggable="false"
  />
</template>

<script setup lang="ts">
interface Props {
  size?: number;
}

withDefaults(defineProps<Props>(), {
  size: 36,
});
</script>

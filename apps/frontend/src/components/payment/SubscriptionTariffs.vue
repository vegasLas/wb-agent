<template>
  <div class="space-y-6">
    <!-- Tier Selector -->
    <div class="flex justify-center gap-2">
      <Button
        v-for="t in tierList"
        :key="t"
        :severity="selectedTier === t ? 'primary' : 'secondary'"
        @click="selectedTier = t"
      >
        {{ t }}
      </Button>
    </div>

    <!-- Tariff Cards for Selected Tier -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card
        v-for="tariff in tierTariffs"
        :key="tariff.id"
        class="hover:shadow-lg transition-shadow"
      >
        <template #title>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">{{ tariff.name }}</h3>
            <Tag
              v-if="tariff.discount"
              severity="warn"
              :value="`-${tariff.discount}%`"
            />
          </div>
        </template>

        <template #content>
          <div class="space-y-4">
            <div class="flex items-center gap-2">
              <p class="text-2xl font-bold">{{ tariff.price }} ₽</p>
              <p
                v-if="tariff.discount"
                class="text-sm text-gray-400 line-through"
              >
                {{ calculateOriginalPrice(tariff.price, tariff.discount) }} ₽
              </p>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              {{ tariff.description }}
            </p>
            <Button
              :severity="selectedTariff?.id === tariff.id ? 'secondary' : 'primary'"
              class="w-full"
              @click="selectTariff(tariff)"
            >
              {{ selectedTariff?.id === tariff.id ? 'Выбрано' : 'Выбрать' }}
            </Button>
          </div>
        </template>
      </Card>
    </div>

    <!-- Payment Modal -->
    <PaymentModal
      v-if="selectedTariff && showModal"
      v-model="showModal"
      :tariff-id="selectedTariff.id"
      :tariff-name="selectedTariff.name || ''"
      :tariff-price="selectedTariff.price"
      @update:model-value="handleModalClose"
      @success="handleSuccess"
      @fail="handleFail"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import {
  LITE_TARIFFS,
  PRO_TARIFFS,
  MAX_TARIFFS,
} from '../../constants';
import PaymentModal from './PaymentModal.vue';
import type { SubscriptionTariff, SubscriptionTier } from '../../constants';

const showModal = ref(false);
const selectedTier = ref<SubscriptionTier>('PRO');
const selectedTariff = ref<SubscriptionTariff | null>(null);

const tierList: SubscriptionTier[] = ['LITE', 'PRO', 'MAX'];

const tierTariffs = computed(() => {
  switch (selectedTier.value) {
    case 'LITE':
      return LITE_TARIFFS;
    case 'PRO':
      return PRO_TARIFFS;
    case 'MAX':
      return MAX_TARIFFS;
    default:
      return PRO_TARIFFS;
  }
});

function calculateOriginalPrice(price: number, discount: number): number {
  const originalPrice = price / (1 - discount / 100);
  if (originalPrice < 100) {
    return Math.ceil(originalPrice / 10) * 10 - 1;
  } else if (originalPrice < 1000) {
    const rounded = Math.ceil(originalPrice / 50) * 50;
    return rounded % 100 === 0 ? rounded - 1 : rounded;
  } else {
    const rounded = Math.ceil(originalPrice / 100) * 100;
    const variation = Math.floor(Math.random() * 3);
    return rounded - (variation === 0 ? 1 : variation === 1 ? 10 : 23);
  }
}

function selectTariff(tariff: SubscriptionTariff) {
  selectedTariff.value = tariff;
  showModal.value = true;
}

function handleModalClose() {
  showModal.value = false;
  selectedTariff.value = null;
}

function handleSuccess() {
  showModal.value = false;
  selectedTariff.value = null;
}

function handleFail() {
  // Keep modal open to show error
}
</script>

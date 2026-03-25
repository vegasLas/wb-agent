<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <div
      v-for="tariff in SUBSCRIPTION_TARIFFS"
      :key="tariff.id"
      class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:shadow-lg transition-shadow"
    >
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ tariff.name }}</h3>
        <span
          v-if="tariff.discount"
          class="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full"
        >
          -{{ tariff.discount }}%
        </span>
      </div>

      <!-- Price and Button -->
      <div class="space-y-4">
        <div class="flex items-center gap-2">
          <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ tariff.price }} ₽</p>
          <p
            v-if="tariff.discount"
            class="text-sm text-gray-400 line-through"
          >
            {{ calculateOriginalPrice(tariff.price, tariff.discount) }} ₽
          </p>
        </div>

        <BaseButton
          :color="selectedTariff?.id === tariff.id ? 'gray' : 'primary'"
          class="w-full"
          @click="selectTariff(tariff)"
        >
          {{ selectedTariff?.id === tariff.id ? 'Выбрано' : 'Выбрать' }}
        </BaseButton>
      </div>
    </div>
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
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { SUBSCRIPTION_TARIFFS } from '../../constants';
import { BaseButton } from '../ui';
import PaymentModal from './PaymentModal.vue';
import type { SubscriptionTariff } from '../../constants';

const showModal = ref(false);
const selectedTariff = ref<SubscriptionTariff | null>(null);

function calculateOriginalPrice(price: number, discount: number): number {
  const originalPrice = price / (1 - discount / 100);

  // Round to make the price look more natural/pretty
  if (originalPrice < 100) {
    // For prices under 100, round to nearest 9 or 5
    return Math.ceil(originalPrice / 10) * 10 - 1;
  } else if (originalPrice < 1000) {
    // For prices 100-999, round to nearest 99 or 90
    const rounded = Math.ceil(originalPrice / 50) * 50;
    return rounded % 100 === 0 ? rounded - 1 : rounded;
  } else {
    // For prices 1000+, round to nearest 100 then subtract to make it prettier
    const rounded = Math.ceil(originalPrice / 100) * 100;
    const variation = Math.floor(Math.random() * 3); // 0, 1, or 2
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

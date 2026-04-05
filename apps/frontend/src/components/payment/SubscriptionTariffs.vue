<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <Card
      v-for="tariff in SUBSCRIPTION_TARIFFS"
      :key="tariff.id"
      class="hover:shadow-lg transition-shadow"
    >
      <template #title>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">
            {{ tariff.name }}
          </h3>
          <Tag
            v-if="tariff.discount"
            severity="warn"
            :value="`-${tariff.discount}%`"
          />
        </div>
      </template>

      <template #content>
        <!-- Price and Button -->
        <div class="space-y-4">
          <div class="flex items-center gap-2">
            <p class="text-2xl font-bold">
              {{ tariff.price }} ₽
            </p>
            <p
              v-if="tariff.discount"
              class="text-sm text-gray-400 line-through"
            >
              {{ calculateOriginalPrice(tariff.price, tariff.discount) }} ₽
            </p>
          </div>

          <Button
            :severity="
              selectedTariff?.id === tariff.id ? 'secondary' : 'primary'
            "
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
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import { SUBSCRIPTION_TARIFFS } from '../../constants';
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

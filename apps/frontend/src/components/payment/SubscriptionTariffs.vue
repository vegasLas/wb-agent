<template>
  <div class="subscription-tariffs">
    <h4 class="font-medium mb-4">Тарифы подписки</h4>

    <!-- Tariffs Grid -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="tariff in SUBSCRIPTION_TARIFFS"
        :key="tariff.id"
        :class="[
          'rounded-lg border p-4 cursor-pointer transition-all bg-white dark:bg-gray-800',
          selectedTariff?.id === tariff.id
            ? 'border-blue-500 ring-2 ring-blue-500/20'
            : 'border-gray-200 hover:border-blue-300 dark:border-gray-700'
        ]"
        @click="selectTariff(tariff)"
      >
        <!-- Header with discount badge -->
        <div class="flex items-center justify-between mb-2">
          <h5 class="font-semibold">{{ tariff.name }}</h5>
          <span
            v-if="tariff.discount"
            class="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full"
          >
            -{{ tariff.discount }}%
          </span>
        </div>

        <!-- Price -->
        <div class="flex items-center gap-2 mb-4">
          <span class="text-2xl font-bold">{{ tariff.price }} ₽</span>
          <span
            v-if="tariff.discount"
            class="text-sm text-gray-400 line-through"
          >
            {{ calculateOriginalPrice(tariff.price, tariff.discount) }} ₽
          </span>
        </div>

        <!-- Description -->
        <p class="text-sm text-gray-500 mb-4">{{ tariff.description }}</p>

        <!-- Select Button -->
        <BaseButton
          :color="selectedTariff?.id === tariff.id ? 'gray' : 'primary'"
          size="sm"
          class="w-full"
          @click.stop="handleSelect(tariff)"
        >
          {{ selectedTariff?.id === tariff.id ? 'Выбрано' : 'Выбрать' }}
        </BaseButton>
      </div>
    </div>

    <!-- Payment Button (Telegram MainButton simulation) -->
    <div v-if="selectedTariff && !showModal" class="mt-6">
      <BaseButton color="green" size="lg" class="w-full" @click="handlePayment">
        Оплатить
      </BaseButton>
    </div>

    <!-- Payment Modal placeholder -->
    <BaseModal
      v-if="showModal"
      :title="'Оплата: ' + selectedTariff?.name"
      @close="closeModal"
    >
      <div class="p-4">
        <p class="mb-4">
          Вы выбрали тариф: <strong>{{ selectedTariff?.name }}</strong>
        </p>
        <p class="mb-4">Сумма к оплате: <strong>{{ selectedTariff?.price }} ₽</strong></p>
        <p class="text-gray-500 text-sm">
          Здесь будет интеграция с платежной системой (Plan 12)
        </p>
      </div>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { SUBSCRIPTION_TARIFFS } from '../../constants';
import { BaseButton, BaseModal } from '../ui';
import type { SubscriptionTariff } from '../../constants';

const emit = defineEmits<{
  (e: 'select', tariff: SubscriptionTariff): void;
}>();

const selectedTariff = ref<SubscriptionTariff | null>(null);
const showModal = ref(false);

function selectTariff(tariff: SubscriptionTariff) {
  selectedTariff.value = tariff;
}

function handleSelect(tariff: SubscriptionTariff) {
  selectedTariff.value = tariff;
  emit('select', tariff);
}

function handlePayment() {
  if (selectedTariff.value) {
    showModal.value = true;
  }
}

function closeModal() {
  showModal.value = false;
  selectedTariff.value = null;
}

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
</script>

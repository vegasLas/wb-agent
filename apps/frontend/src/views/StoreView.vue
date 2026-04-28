<template>
  <div class="store-component space-y-6">
    <!-- Header with Subscription Status Badge -->
    <div class="flex justify-between mb-6 items-center">
      <div class="flex items-center gap-2">
        <Tag
          v-if="userStore.subscriptionActive"
          severity="success"
          :value="`Подписка ${userStore.subscriptionTier} · ${userStore.subscriptionRemainingDays} дн.`"
        />
        <Tag
          v-else-if="userStore.isFree"
          severity="info"
          :value="`FREE план`"
        />
        <Tag
          v-else
          severity="danger"
          icon="pi pi-exclamation-triangle"
          value="нет подписки"
        />
      </div>
    </div>

    <!-- Current Plan Info -->
    <Card v-if="userStore.subscriptionActive" class="mb-4">
      <template #content>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500 dark:text-gray-400">Текущий план</div>
            <div class="text-xl font-bold">{{ userStore.subscriptionTier }}</div>
          </div>
          <div class="text-right">
            <div class="text-sm text-gray-500 dark:text-gray-400">Действует до</div>
            <div class="text-lg font-medium">{{ formatDate(userStore.user.subscriptionExpiresAt) }}</div>
          </div>
        </div>
      </template>
    </Card>

    <!-- FREE Plan Info -->
    <Card v-if="userStore.isFree" class="mb-4 border-blue-200">
      <template #content>
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500 dark:text-gray-400">Текущий план</div>
            <div class="text-xl font-bold text-blue-600">FREE</div>
            <div class="text-xs text-gray-500 mt-1">
              {{ AUTOBOOKING_SLOTS.FREE }} бронь, {{ MAX_ACCOUNTS.FREE }} аккаунт, {{ FEEDBACK_QUOTA.FREE }} отзывов
            </div>
          </div>
          <Button
            severity="primary"
            @click="scrollToTariffs"
          >
            Оформить подписку
          </Button>
        </div>
      </template>
    </Card>

    <!-- Three Tier Cards -->
    <div ref="tariffsSection" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card
        v-for="tier in tiers"
        :key="tier.key"
        :class="[
          'hover:shadow-lg transition-shadow',
          currentTier === tier.key ? 'ring-2 ring-green-500' : '',
        ]"
      >
        <template #title>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">{{ tier.label }}</h3>
            <Tag v-if="tier.popular" severity="warn" value="★ Popular" />
            <Tag v-if="currentTier === tier.key" severity="success" value="Активен" />
          </div>
        </template>

        <template #content>
          <div class="space-y-4">
            <div class="text-center">
              <p class="text-3xl font-bold">{{ tier.price }} ₽</p>
              <p class="text-sm text-gray-500 dark:text-gray-400">/ месяц</p>
            </div>

            <ul class="space-y-2 text-sm">
              <li class="flex items-center gap-2">
                <i class="pi pi-check text-green-500" />
                <span>{{ tier.slots }} активных броней</span>
              </li>
              <li class="flex items-center gap-2">
                <i class="pi pi-check text-green-500" />
                <span>{{ tier.accounts }} WB аккаунт{{ tier.accounts === 1 ? '' : tier.accounts === 3 ? 'а' : 'ов' }}</span>
              </li>
              <li class="flex items-center gap-2">
                <i class="pi pi-check text-green-500" />
                <span>AI чат: {{ tier.aiBudget }}₽/мес</span>
              </li>
              <li class="flex items-center gap-2">
                <i class="pi pi-check text-green-500" />
                <span>Отзывы: {{ tier.feedbackQuota }}</span>
              </li>
              <li
                v-for="feature in tier.features"
                :key="feature"
                class="flex items-center gap-2"
              >
                <i class="pi pi-check text-green-500" />
                <span>{{ feature }}</span>
              </li>
            </ul>

            <!-- Period Selector -->
            <div class="flex gap-2 justify-center">
              <Button
                v-for="tariff in tier.tariffs"
                :key="tariff.id"
                size="small"
                :severity="selectedTariff?.id === tariff.id ? 'primary' : 'secondary'"
                @click="selectedTariff = tariff"
              >
                {{ tariff.days === 30 ? '1 мес' : tariff.days === 90 ? '3 мес' : '1 год' }}
              </Button>
            </div>

            <div class="space-y-2">
              <Button
                v-if="selectedTariff?.tier === tier.key"
                class="w-full"
                @click="onSelectTariff(selectedTariff)"
              >
                Оформить за {{ selectedTariff.price }} ₽
              </Button>
              <Button
                v-else
                class="w-full"
                severity="secondary"
                @click="selectedTariff = tier.tariffs[0]"
              >
                Выбрать
              </Button>

              <Button
                v-if="tier.key === 'LITE' && userStore.isFree && !userStore.user.trialUsedAt"
                class="w-full"
                severity="secondary"
                variant="outlined"
                @click="activateTrial(tier.key)"
              >
                Пробный период 14 дней
              </Button>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Payment Modal -->
    <PaymentModal
      v-if="selectedTariffForModal && showPaymentModal"
      v-model="showPaymentModal"
      :tariff-id="selectedTariffForModal.id"
      :tariff-name="selectedTariffForModal.name || ''"
      :tariff-price="selectedTariffForModal.price"
      @update:model-value="handleModalClose"
      @success="handleModalSuccess"
      @fail="handleModalFail"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUserStore } from '@/stores/user';
import { useViewReady } from '../composables/ui';
import { paymentsAPI } from '@/api/payments/api';

const tariffsSection = ref<HTMLElement | null>(null);
function scrollToTariffs() {
  tariffsSection.value?.scrollIntoView({ behavior: 'smooth' });
}
import Button from 'primevue/button';
import Card from 'primevue/card';
import Tag from 'primevue/tag';
import { useToast } from 'primevue/usetoast';
import PaymentModal from '../components/payment/PaymentModal.vue';

import {
  LITE_TARIFFS,
  PRO_TARIFFS,
  MAX_TARIFFS,
  AUTOBOOKING_SLOTS,
  MAX_ACCOUNTS,
  AI_CHAT_BUDGET_USD,
  FEEDBACK_QUOTA,
} from '../constants';
import type { SubscriptionTariff, SubscriptionTier } from '../constants';

const toast = useToast();
const { viewReady } = useViewReady();
const userStore = useUserStore();

const selectedTariff = ref<SubscriptionTariff | null>(null);
const showPaymentModal = ref(false);
const selectedTariffForModal = ref<SubscriptionTariff | null>(null);

const currentTier = computed(() => userStore.subscriptionTier);

const tiers = [
  {
    key: 'LITE' as SubscriptionTier,
    label: 'Lite',
    price: LITE_TARIFFS[0].price,
    slots: AUTOBOOKING_SLOTS.LITE,
    accounts: MAX_ACCOUNTS.LITE,
    aiBudget: AI_CHAT_BUDGET_USD.LITE,
    feedbackQuota: FEEDBACK_QUOTA.LITE,
    features: ['Триггеры', 'Тарифы', 'Отчеты', 'Акции', 'Реклама', 'MPStats Basic'],
    tariffs: LITE_TARIFFS,
  },
  {
    key: 'PRO' as SubscriptionTier,
    label: 'Pro',
    price: PRO_TARIFFS[0].price,
    slots: AUTOBOOKING_SLOTS.PRO,
    accounts: MAX_ACCOUNTS.PRO,
    aiBudget: AI_CHAT_BUDGET_USD.PRO,
    feedbackQuota: FEEDBACK_QUOTA.PRO,
    features: ['Триггеры', 'Тарифы', 'Отчеты', 'Акции', 'Реклама', 'MPStats Advanced'],
    tariffs: PRO_TARIFFS,
    popular: true,
  },
  {
    key: 'MAX' as SubscriptionTier,
    label: 'Max',
    price: MAX_TARIFFS[0].price,
    slots: AUTOBOOKING_SLOTS.MAX,
    accounts: '∞',
    aiBudget: AI_CHAT_BUDGET_USD.MAX,
    feedbackQuota: '∞',
    features: ['Триггеры', 'Тарифы', 'Отчеты', 'Акции', 'Реклама', 'MPStats Advanced'],
    tariffs: MAX_TARIFFS,
  },
];

function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function onSelectTariff(tariff: SubscriptionTariff) {
  selectedTariffForModal.value = tariff;
  showPaymentModal.value = true;
}

function handleModalClose() {
  showPaymentModal.value = false;
  selectedTariffForModal.value = null;
}

function handleModalSuccess() {
  showPaymentModal.value = false;
  selectedTariffForModal.value = null;
}

function handleModalFail() {
  // Keep modal open to show error
}

async function activateTrial(tier: SubscriptionTier) {
  if (tier !== 'LITE') return;
  try {
    const response = await paymentsAPI.activateTrial();
    toast.add({
      severity: 'success',
      summary: 'Пробный период активирован',
      detail: response.message,
      life: 5000,
    });
    await userStore.fetchUser();
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: error?.response?.data?.message || 'Не удалось активировать пробный период',
      life: 5000,
    });
  }
}

viewReady();
</script>

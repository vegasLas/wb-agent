<template>
  <div class="space-y-6">
    <!-- Period Selector -->
    <div class="flex justify-center">
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
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card
        v-for="tier in tiers"
        :key="tier.key"
        :class="[
          'hover:shadow-lg transition-shadow overflow-hidden',
          currentTier === tier.key ? 'ring-2 ring-green-500' : '',
          tier.popular ? 'bg-gray-50 dark:bg-gray-800/50' : '',
        ]"
      >
        <template #title>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">{{ tier.label }}</h3>
            <div class="flex gap-1">
              <Tag
                v-if="currentTier === tier.key"
                severity="success"
                value="Активен"
                class="text-xs"
              />
            </div>
          </div>
        </template>

        <template #content>
          <div class="space-y-4">
            <!-- Price -->
            <div>
              <div class="flex items-baseline gap-1">
                <p class="text-4xl font-bold">
                  {{ formatPrice(tier.monthlyPrice) }} ₽
                </p>
                <div
                  class="text-sm text-gray-500 dark:text-gray-400 leading-tight"
                >
                  <div>в месяц</div>
                </div>
              </div>

              <!-- Savings info -->
              <div
                v-if="selectedPeriodIndex > 0 && tier.key !== 'FREE'"
                class="mt-1 space-y-0.5"
              >
                <p class="text-xs text-gray-400 dark:text-gray-500">
                  При оплате {{ periodTotalLabel }} —
                  {{ formatPrice(tier.totalPrice) }} ₽
                </p>
              </div>
            </div>

            <p class="text-sm text-gray-600 dark:text-gray-300">
              {{ tier.description }}
            </p>

            <Button
              v-if="tier.key !== 'FREE'"
              :class="[
                'w-full !text-white',
                currentTier === tier.key
                  ? '!bg-green-600 !border-green-600 hover:!bg-green-700'
                  : '!bg-gray-900 !border-gray-900 hover:!bg-gray-800',
              ]"
              @click="
                currentTier === tier.key
                  ? undefined
                  : tier.key === 'LITE' && isTrialEligible
                    ? activateTrial(tier.key)
                    : onSelectTier(tier)
              "
            >
              {{
                currentTier === tier.key
                  ? 'Текущий план'
                  : tier.key === 'LITE' && isTrialEligible
                    ? 'попробовать (14 дней)'
                    : 'Выбрать'
              }}
            </Button>
            <Button
              v-else
              class="w-full !bg-gray-900 !border-gray-900 hover:!bg-gray-800 !text-white"
              disabled
            >
              Текущий план
            </Button>

            <Divider />

            <!-- Features -->
            <div>
              <p
                class="text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-3"
              >
                Возможности
              </p>

              <ul class="space-y-2">
                <li
                  v-if="tier.prevTier"
                  class="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <i
                    class="pi pi-check-circle text-green-500 mt-0.5 flex-shrink-0"
                  />
                  <span>Всё из {{ tier.prevTier }}</span>
                </li>
                <li
                  v-for="feature in tier.features"
                  :key="feature"
                  class="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  <i
                    class="pi pi-check-circle text-green-500 mt-0.5 flex-shrink-0"
                  />
                  <span>{{ feature }}</span>
                </li>
              </ul>
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
import { ref, computed, watch } from 'vue';
import { useUserStore } from '@/stores/user';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Divider from 'primevue/divider';
import { useToast } from 'primevue/usetoast';
import PaymentModal from './PaymentModal.vue';

import {
  LITE_TARIFFS,
  PRO_TARIFFS,
  MAX_TARIFFS,
  AUTOBOOKING_SLOTS,
  MAX_ACCOUNTS,
  FEEDBACK_QUOTA,
} from '../../constants';
import type { SubscriptionTariff, SubscriptionTier } from '../../constants';
import { paymentsAPI } from '@/api/payments/api';

const toast = useToast();
const userStore = useUserStore();

const showPaymentModal = ref(false);
const selectedTariffForModal = ref<SubscriptionTariff | null>(null);

const currentTier = computed(() => userStore.subscriptionTier);

// Debug trial eligibility
const isTrialEligible = computed(() => {
  const eligible = userStore.isFree && !userStore.user.trialUsedAt;
  console.log(
    '[TRIAL DEBUG] isFree:',
    userStore.isFree,
    '| trialUsedAt:',
    userStore.user.trialUsedAt,
    '| eligible:',
    eligible,
  );
  return eligible;
});

const periodOptions = [
  { label: '1 мес', index: 0 },
  { label: '6 мес', index: 2 },
  { label: '1 год', index: 3 },
];

const selectedPeriodIndex = ref(0);

// Effective monthly prices (total / months)
const monthsPerIndex = [1, 3, 6, 12];

const liteMonthlyPrices = LITE_TARIFFS.map((t, i) =>
  Math.round(t.price / monthsPerIndex[i]),
);
const proMonthlyPrices = PRO_TARIFFS.map((t, i) =>
  Math.round(t.price / monthsPerIndex[i]),
);
const maxMonthlyPrices = MAX_TARIFFS.map((t, i) =>
  Math.round(t.price / monthsPerIndex[i]),
);

// Animated monthly prices for display
const animatedLiteMonthly = ref(liteMonthlyPrices[0]);
const animatedProMonthly = ref(proMonthlyPrices[0]);
const animatedMaxMonthly = ref(maxMonthlyPrices[0]);

function animateValue(
  targetRef: ReturnType<typeof ref<number>>,
  from: number,
  to: number,
  duration = 400,
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
  animateValue(
    animatedLiteMonthly,
    liteMonthlyPrices[oldIndex],
    liteMonthlyPrices[newIndex],
  );
  animateValue(
    animatedProMonthly,
    proMonthlyPrices[oldIndex],
    proMonthlyPrices[newIndex],
  );
  animateValue(
    animatedMaxMonthly,
    maxMonthlyPrices[oldIndex],
    maxMonthlyPrices[newIndex],
  );
});

function formatPrice(price: number) {
  return price.toLocaleString('ru-RU');
}

const periodTotalLabel = computed(() => {
  const map: Record<number, string> = {
    0: 'за 1 мес',
    2: 'за 6 мес',
    3: 'за 1 год',
  };
  return map[selectedPeriodIndex.value] || '';
});

const tiers = computed(() => {
  const idx = selectedPeriodIndex.value;
  return [
    {
      key: 'FREE' as SubscriptionTier,
      label: 'Бесплатный',
      monthlyPrice: 0,
      baseMonthly: 0,
      totalPrice: 0,
      description: 'Базовые возможности для ознакомления.',
      prevTier: null as string | null,
      features: [
        `${AUTOBOOKING_SLOTS.FREE} активная автобронь`,
        `${MAX_ACCOUNTS.FREE} WB аккаунт`,
        `${FEEDBACK_QUOTA.FREE} отзывов в месяц`,
        'AI-ассистент — базовый',
        'Триггеры',
        'Тарифы и отчеты',
        'Акции и реклама',
        'MPStats Basic',
      ],
    },
    {
      key: 'LITE' as SubscriptionTier,
      label: 'Лайт',
      monthlyPrice: animatedLiteMonthly.value,
      baseMonthly: liteMonthlyPrices[0],
      totalPrice: LITE_TARIFFS[idx].price,
      description: 'Для начинающих продавцов на Wildberries.',
      prevTier: 'Бесплатного',
      features: [
        `${AUTOBOOKING_SLOTS.LITE} активных автоброней`,
        `${FEEDBACK_QUOTA.LITE} отзывов в месяц`,
        'AI-ассистент — увеличенный лимит',
      ],
    },
    {
      key: 'PRO' as SubscriptionTier,
      label: 'Про',
      monthlyPrice: animatedProMonthly.value,
      baseMonthly: proMonthlyPrices[0],
      totalPrice: PRO_TARIFFS[idx].price,
      description: 'Полный доступ для растущего бизнеса.',
      prevTier: 'Лайта',
      popular: true,
      features: [
        `${AUTOBOOKING_SLOTS.PRO} активных автоброней`,
        `${MAX_ACCOUNTS.PRO} WB аккаунта`,
        `${FEEDBACK_QUOTA.PRO} отзывов в месяц`,
        'AI-ассистент — x5 лайт',
      ],
    },
    {
      key: 'MAX' as SubscriptionTier,
      label: 'Премиум',
      monthlyPrice: animatedMaxMonthly.value,
      baseMonthly: maxMonthlyPrices[0],
      totalPrice: MAX_TARIFFS[idx].price,
      description: 'Для агентств и крупных продавцов.',
      prevTier: 'Про',
      features: [
        `${AUTOBOOKING_SLOTS.MAX} активных автоброней`,
        '∞ WB аккаунтов',
        '∞ отзывов',
        'AI-ассистент — x25 лайт',
      ],
    },
  ];
});

function onSelectTier(tier: (typeof tiers.value)[0]) {
  if (tier.key === 'FREE') return;

  const index = selectedPeriodIndex.value;
  let tariff: SubscriptionTariff | undefined;
  switch (tier.key) {
    case 'LITE':
      tariff = LITE_TARIFFS[index];
      break;
    case 'PRO':
      tariff = PRO_TARIFFS[index];
      break;
    case 'MAX':
      tariff = MAX_TARIFFS[index];
      break;
  }

  if (tariff) {
    selectedTariffForModal.value = tariff;
    showPaymentModal.value = true;
  }
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
      detail:
        error?.response?.data?.message ||
        'Не удалось активировать пробный период',
      life: 5000,
    });
  }
}
</script>

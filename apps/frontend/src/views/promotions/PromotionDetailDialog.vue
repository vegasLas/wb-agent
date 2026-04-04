<template>
  <Dialog
    v-model:visible="visible"
    position="bottom"
    :header="dialogHeader"
    :style="{ width: '90vw', maxWidth: '680px' }"
    :modal="true"
    :dismissable-mask="true"
  >
    <div class="max-h-[70vh] overflow-auto">
      <!-- Loading State -->
      <div
        v-if="detailLoading"
        class="flex flex-col items-center justify-center py-16"
      >
        <i class="pi pi-refresh animate-spin text-4xl text-orange-500 mb-4" />
        <p class="text-gray-600 dark:text-gray-400">Загрузка деталей...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="detailError" class="text-center py-12 px-4">
        <div
          class="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
        >
          <i class="pi pi-exclamation-circle text-red-500 text-3xl mb-2" />
          <p class="text-red-600 dark:text-red-400">
            {{ detailError }}
          </p>
        </div>
      </div>

      <!-- Detail Content -->
      <div v-else-if="detail" class="space-y-5">
        <!-- Header Section: Date Range + Status -->
        <div class="flex items-center gap-3 flex-wrap">
          <div class="text-lg text-gray-900 dark:text-gray-100">
            {{ d.formattedStartDateShort.value }} →
            {{ d.formattedEndDateShort.value }}
          </div>
          <Tag
            :value="d.statusLabel.value"
            :severity="d.statusSeverity.value"
            class="text-xs font-medium"
          />
        </div>

        <!-- Auto Action Status -->
        <div
          v-if="d.isAutoAction.value"
          class="flex items-center justify-between"
        >
          <div class="text-orange-500 dark:text-orange-400 font-medium">
            Автоакция: вы участвуете
          </div>
          <a
            href="#"
            class="text-blue-500 dark:text-blue-400 text-sm hover:underline"
            @click.prevent="showRules = true"
          >
            Правила участия
          </a>
        </div>

        <!-- Description -->
        <div
          v-if="d.parsedDescription.value"
          class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line"
        >
          {{ d.parsedDescription.value }}
        </div>

        <!-- Advantages -->
        <div v-if="d.advantagesTranslated.value.length > 0">
          <h4
            class="text-base font-medium text-gray-900 dark:text-gray-100 mb-3"
          >
            Преимущества акции
          </h4>
          <div class="flex flex-wrap gap-2">
            <Tag
              v-for="(advantage, index) in d.advantagesTranslated.value"
              :key="index"
              :value="advantage"
              severity="secondary"
              class="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-0"
            />
          </div>
        </div>

        <!-- Product Statistics -->
        <div class="pt-2">
          <h4 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            {{ d.eligibleProducts.value }} подходящих товара
          </h4>

          <div class="grid grid-cols-2 gap-4">
            <!-- Participating -->
            <div>
              <div class="text-sm text-gray-900 dark:text-gray-100 mb-1">
                {{ d.participatingProducts.value }} товара участвует
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ d.participatingWithStock.value }} из них с остатком
              </div>
            </div>

            <!-- Not Participating -->
            <div class="text-right">
              <div class="text-sm text-gray-900 dark:text-gray-100 mb-1">
                {{ d.notParticipatingProducts.value }} товаров не участвуют
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ d.notParticipatingWithStock.value }} из них с остатком
              </div>
            </div>
          </div>
        </div>

        <!-- Search Promotion Section -->
        <div v-if="d.rangingLevels.value.length > 0" class="pt-2">
          <div class="flex items-center gap-2 mb-4">
            <h4 class="text-base font-medium text-gray-900 dark:text-gray-100">
              Продвижение в поиске и каталоге
            </h4>
            <i
              v-tooltip="'Чем больше товаров участвует, тем выше буст в поиске'"
              class="pi pi-question-circle text-gray-400 cursor-help"
            />
            <div
              class="ml-auto text-green-600 dark:text-green-400 font-semibold"
            >
              +{{ d.maxCoefficient.value }}% к выдаче
            </div>
          </div>

          <!-- Info Box -->
          <div class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <p class="text-xs text-gray-600 dark:text-gray-400 mb-4">
              Все товары, подходящие под акцию из вашего ассортимента, получают
              повышенное продвижение в поиске и каталоге.
            </p>

            <!-- Progress Bar Section -->
            <div class="relative">
              <!-- Progress Bar Container -->
              <div
                class="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-6"
              >
                <!-- Progress Fill -->
                <div
                  class="h-full bg-green-500 rounded-full transition-all duration-500"
                  :style="{ width: d.progressPercentage.value + '%' }"
                />
              </div>

              <!-- Level Markers -->
              <div class="absolute top-0 left-0 right-0">
                <div class="flex justify-between">
                  <div
                    v-for="(level, index) in d.rangingLevelsDisplay.value"
                    :key="index"
                    class="relative flex flex-col items-center"
                    :style="{
                      width: 100 / d.rangingLevelsDisplay.value.length + '%',
                    }"
                  >
                    <!-- Dot on the line -->
                    <div
                      class="w-2 h-2 rounded-full -mt-[3px]"
                      :class="
                        level.isCompleted || level.isActive
                          ? 'bg-green-500'
                          : 'bg-gray-300 dark:bg-gray-600'
                      "
                    />
                  </div>
                </div>
              </div>

              <!-- Level Labels Below -->
              <div class="flex justify-between mt-2">
                <div
                  v-for="(level, index) in d.rangingLevelsDisplay.value"
                  :key="index"
                  class="flex flex-col items-center text-center"
                  :style="{
                    width: 100 / d.rangingLevelsDisplay.value.length + '%',
                  }"
                >
                  <!-- Coefficient -->
                  <span
                    class="text-xs mb-1"
                    :class="
                      level.isActive
                        ? 'text-green-600 dark:text-green-400 font-semibold'
                        : 'text-gray-400 dark:text-gray-500'
                    "
                  >
                    +{{ level.coefficient }}%
                  </span>
                  <!-- Product Count -->
                  <span
                    class="text-xs"
                    :class="
                      level.isActive
                        ? 'text-green-600 dark:text-green-400 font-medium'
                        : 'text-gray-500 dark:text-gray-500'
                    "
                  >
                    {{
                      level.nomenclatures === 0
                        ? '0 товаров'
                        : level.nomenclatures
                    }}
                  </span>
                </div>
              </div>

              <!-- Goal Badge - positioned at the end -->
              <div v-if="d.isMaxLevel.value" class="absolute -right-2 -top-3">
                <div
                  class="bg-green-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center"
                >
                  <i class="pi pi-check text-xs" />
                </div>
              </div>
            </div>

            <!-- Goal Label -->
            <div v-if="d.isMaxLevel.value" class="text-right mt-4">
              <span
                class="text-xs text-green-600 dark:text-green-400 font-medium"
                >Цель выполнена</span
              >
            </div>
          </div>
        </div>

        <!-- Footer Note -->
        <div
          class="pt-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700"
        >
          <p>
            Скидка на участвующие товары применилась в момент старта автоакции
            {{ d.formattedStartDateOnly.value }}. К исключённым товарам скидка
            не применилась.
          </p>
          <p class="mt-2">
            Можете настроить список, чтобы вернуть исключённые товары в акцию
          </p>
        </div>

        <!-- Tags Row -->
        <div class="flex flex-wrap gap-2 pt-2">
          <Tag
            v-if="d.isImportant.value"
            value="Важная"
            severity="warning"
            class="text-xs"
          />
          <Tag
            v-if="d.isAnnouncement.value"
            value="Анонс"
            severity="secondary"
            class="text-xs"
          />
          <Tag
            v-if="d.isHasRecovery.value"
            value="Восстановление"
            severity="success"
            class="text-xs"
          />
          <Tag
            v-if="d.isMultiLevels.value"
            value="Многоуровневая"
            severity="info"
            class="text-xs"
          />
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-16 text-gray-500 dark:text-gray-400">
        <i class="pi pi-inbox text-4xl mb-4" />
        <p>Нет данных для отображения</p>
      </div>
    </div>

    <template #footer>
      <Button label="Закрыть" severity="secondary" @click="visible = false" />
    </template>
  </Dialog>

  <!-- Rules Dialog -->
  <Dialog
    v-model:visible="showRules"
    header="Правила участия"
    :style="{ width: '90vw', maxWidth: '500px' }"
    :modal="true"
  >
    <div class="text-sm text-gray-700 dark:text-gray-300 space-y-4">
      <p>
        Для участия в автоакции ваши товары должны соответствовать следующим
        требованиям:
      </p>
      <ul class="list-disc list-inside space-y-2">
        <li>Товар должен быть в наличии на складе WB</li>
        <li>Цена товара должна соответствовать рекомендациям системы</li>
        <li>Товар не должен участвовать в других несовместимых акциях</li>
        <li>Рейтинг товара должен быть не ниже 4.0</li>
      </ul>
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-4">
        Скидка применяется автоматически при старте акции.
      </p>
    </div>
    <template #footer>
      <Button label="Понятно" severity="primary" @click="showRules = false" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import { usePromotionDetailEnhanced } from '../../composables/usePromotionDetailEnhanced';
import type { PromotionDetail } from '../../types';

interface Props {
  show: boolean;
  promotionName?: string;
  detail: PromotionDetail | null;
  detailLoading: boolean;
  detailError: string | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:show': [value: boolean];
}>();

const showRules = ref(false);

// Use the enhanced composable for all display logic
const d = usePromotionDetailEnhanced(() => props.detail);

// Dialog visibility
const visible = computed({
  get: () => props.show,
  set: (value: boolean) => {
    emit('update:show', value);
  },
});

// Dialog header
const dialogHeader = computed(() => {
  return props.promotionName ? props.promotionName : 'Детали акции';
});
</script>

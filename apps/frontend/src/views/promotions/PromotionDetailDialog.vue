<template>
  <Dialog
    v-model:visible="visible"
    position="bottom"
    :header="dialogHeader"
    :style="{ width: '90vw', maxWidth: '600px' }"
    :modal="true"
  >
    <div class="max-h-[60vh] overflow-auto">
      <!-- Loading State -->
      <div
        v-if="detailLoading"
        class="flex flex-col items-center justify-center py-16"
      >
        <i class="pi pi-refresh animate-spin text-4xl text-orange-500 mb-4" />
        <p class="text-gray-600 dark:text-gray-400">
          Загрузка деталей...
        </p>
      </div>

      <!-- Error State -->
      <div
        v-else-if="detailError"
        class="text-center py-12 px-4"
      >
        <div class="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <i class="pi pi-exclamation-circle text-red-500 text-3xl mb-2" />
          <p class="text-red-600 dark:text-red-400">
            {{ detailError }}
          </p>
        </div>
      </div>

      <!-- Detail Content -->
      <div
        v-else-if="detail"
        class="space-y-6"
      >
        <!-- Description -->
        <div
          v-if="d.formattedDescription.value || d.description.value"
          class="p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800"
        >
          <div
            class="text-sm text-gray-700 dark:text-gray-300"
            v-html="d.formattedDescription.value || d.description.value"
          />
        </div>

        <!-- Key Info Grid -->
        <div class="grid grid-cols-2 gap-4">
          <!-- Period ID -->
          <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
              ID периода
            </div>
            <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
              {{ d.periodId.value }}
            </div>
          </div>

          <!-- Group ID -->
          <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
              ID группы
            </div>
            <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
              {{ d.groupId.value }}
            </div>
          </div>

          <!-- Start Date -->
          <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Начало
            </div>
            <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
              {{ d.formattedStartDate.value }}
            </div>
          </div>

          <!-- End Date -->
          <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
              Окончание
            </div>
            <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
              {{ d.formattedEndDate.value }}
            </div>
          </div>
        </div>

        <!-- Participation Stats -->
        <div class="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
            Статистика участия
          </h4>
          
          <div class="space-y-3">
            <!-- Participation Percentage -->
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600 dark:text-gray-400">Процент участия</span>
              <span
                class="text-sm font-medium"
                :class="d.participationPercentageClass.value"
              >
                {{ d.participationPercentage.value }}%
              </span>
            </div>

            <!-- In Promo Stock -->
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600 dark:text-gray-400">В акции (остатки)</span>
              <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ d.inPromoStock.value.current }} / {{ d.inPromoStock.value.total }}
              </span>
            </div>

            <!-- Not In Promo Stock -->
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600 dark:text-gray-400">Вне акции (остатки)</span>
              <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ d.notInPromoStock.value.current }} / {{ d.notInPromoStock.value.total }}
              </span>
            </div>

            <!-- Action In Stock -->
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-600 dark:text-gray-400">Действие в наличии</span>
              <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ d.actionInStock.value }}
              </span>
            </div>
          </div>
        </div>

        <!-- Ranging Info -->
        <div
          v-if="d.rangingLevels.value.length > 0"
          class="p-4 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
            Уровни ранжирования
          </h4>
          
          <div class="space-y-2">
            <div
              v-for="(level, index) in d.rangingLevels.value"
              :key="index"
              class="flex items-center justify-between p-2 rounded"
              :class="{ 'bg-orange-50 dark:bg-orange-900/20': d.currentLevelIndex.value === index }"
            >
              <span class="text-sm text-gray-600 dark:text-gray-400">
                Уровень {{ index + 1 }}: {{ level.nomenclatures }} номенклатур
              </span>
              <Tag
                :value="`+${level.coefficient}`"
                severity="warning"
                class="text-xs"
              />
            </div>
          </div>

          <!-- Current Level Info -->
          <div
            v-if="d.currentCoefficient.value > 0"
            class="mt-4 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20"
          >
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-700 dark:text-gray-300">Текущий коэффициент</span>
              <span class="text-lg font-bold text-orange-600 dark:text-orange-400">
                +{{ d.currentCoefficient.value }}
              </span>
            </div>
            <div
              v-if="!d.isMaxLevel.value && d.nmToNextLevel.value > 0"
              class="mt-2 text-xs text-gray-600 dark:text-gray-400"
            >
              До следующего уровня: {{ d.nmToNextLevel.value }} номенклатур
            </div>
            <div
              v-if="d.isMaxLevel.value"
              class="mt-2 text-xs text-green-600 dark:text-green-400 font-medium"
            >
              <i class="pi pi-check-circle mr-1" />
              Достигнут максимальный уровень!
            </div>
          </div>
        </div>

        <!-- Advantages -->
        <div
          v-if="d.advantages.value.length > 0"
          class="p-4 rounded-lg border border-gray-200 dark:border-gray-700"
        >
          <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            Преимущества
          </h4>
          <ul class="space-y-2">
            <li
              v-for="(advantage, index) in d.advantages.value"
              :key="index"
              class="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
            >
              <i class="pi pi-check-circle text-green-500 mt-0.5" />
              <span>{{ advantage }}</span>
            </li>
          </ul>
        </div>

        <!-- Flags -->
        <div class="flex flex-wrap gap-2">
          <Tag
            v-if="d.isAutoAction.value"
            value="Автоакция"
            severity="info"
            class="text-xs"
          />
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
      <div
        v-else
        class="text-center py-16 text-gray-500 dark:text-gray-400"
      >
        <i class="pi pi-inbox text-4xl mb-4" />
        <p>Нет данных для отображения</p>
      </div>
    </div>

    <template #footer>
      <Button
        label="Закрыть"
        severity="secondary"
        @click="visible = false"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import { usePromotionDetail, isCurrentLevel } from '../../composables';
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

// Use the composable for all display logic
const d = usePromotionDetail(() => props.detail);

// Dialog visibility
const visible = computed({
  get: () => props.show,
  set: (value: boolean) => {
    emit('update:show', value);
  },
});

// Dialog header
const dialogHeader = computed(() => {
  return props.promotionName ? `Детали: ${props.promotionName}` : 'Детали акции';
});

// Re-export composable methods for template
const formatDateTime = d.formattedStartDate.value === '-' ? 
  () => '-' : 
  (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
</script>

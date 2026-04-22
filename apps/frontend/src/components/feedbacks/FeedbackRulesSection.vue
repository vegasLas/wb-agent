<template>
  <div class="space-y-2">
    <!-- Loading -->
    <LoadingSpinner v-if="goodsLoading || rulesLoading" />

    <!-- Empty -->
    <EmptyState
      v-else-if="allGoods.length === 0"
      icon="pi pi-box"
      message="Нет товаров для настройки правил"
    />

    <!-- Rules Table -->
    <div
      v-else
      class="space-y-3"
    >
      <div class="flex items-center justify-between">
        <span class="text-sm text-surface-500">
          Всего товаров: {{ allGoods.length }}
        </span>
        <InputText
          v-model="searchQuery"
          placeholder="Поиск по названию или артикулу"
          class="w-64"
        />
      </div>

      <DataTable
        :value="filteredGoods"
        :paginator="true"
        :rows="20"
        class="p-datatable-sm"
      >
        <Column
          field="title"
          header="Товар"
        >
          <template #body="{ data }">
            <div class="flex items-center gap-3">
              <img
                v-if="data.thumbnail"
                :src="data.thumbnail"
                alt=""
                class="w-10 h-10 object-cover rounded"
              >
              <div
                v-else
                class="w-10 h-10 bg-surface-200 dark:bg-surface-700 rounded flex items-center justify-center"
              >
                <i class="pi pi-image text-surface-400" />
              </div>
              <div class="flex flex-col">
                <span class="text-sm font-medium line-clamp-1">{{ data.title }}</span>
                <span class="text-xs text-surface-500">{{ data.vendorCode }}</span>
              </div>
            </div>
          </template>
        </Column>

        <Column
          field="subject"
          header="Категория"
        >
          <template #body="{ data }">
            <span class="text-sm">{{ data.subject }}</span>
          </template>
        </Column>

        <Column header="Автоответ">
          <template #body="{ data }">
            <ToggleSwitch
              :model-value="getProductSetting(data.nmID)"
              @update:model-value="(val) => $emit('toggle-product', data.nmID, val)"
            />
          </template>
        </Column>

        <Column header="Правило включено">
          <template #body="{ data }">
            <ToggleSwitch
              :model-value="getRule(data.nmID)?.enabled ?? true"
              @update:model-value="(val) => updateRuleField(data.nmID, 'enabled', val)"
            />
          </template>
        </Column>

        <Column header="Мин. рейтинг">
          <template #body="{ data }">
            <InputNumber
              :model-value="getRule(data.nmID)?.minRating ?? null"
              :min="1"
              :max="5"
              placeholder="1-5"
              class="w-16"
              @update:model-value="(val) => updateRuleField(data.nmID, 'minRating', val)"
            />
          </template>
        </Column>

        <Column header="Макс. рейтинг">
          <template #body="{ data }">
            <InputNumber
              :model-value="getRule(data.nmID)?.maxRating ?? null"
              :min="1"
              :max="5"
              placeholder="1-5"
              class="w-16"
              @update:model-value="(val) => updateRuleField(data.nmID, 'maxRating', val)"
            />
          </template>
        </Column>

        <Column header="Исключить ключевые слова">
          <template #body="{ data }">
            <InputText
              :model-value="formatKeywords(getRule(data.nmID)?.excludeKeywords)"
              placeholder="через запятую"
              class="w-40"
              @update:model-value="(val) => updateKeywords(data.nmID, val)"
            />
          </template>
        </Column>

        <Column header="Требовать подтверждения">
          <template #body="{ data }">
            <ToggleSwitch
              :model-value="getRule(data.nmID)?.requireApproval ?? false"
              @update:model-value="(val) => updateRuleField(data.nmID, 'requireApproval', val)"
            />
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import ToggleSwitch from 'primevue/toggleswitch';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import { LoadingSpinner, EmptyState } from '@/components/common';
import type { GoodsItem, FeedbackProductRule } from '@/api/feedbacks/types';

interface Props {
  goodsByCategory: Record<string, GoodsItem[]>;
  productRules: FeedbackProductRule[];
  productSettings: Array<{ nmId: number; autoAnswerEnabled: boolean }>;
  goodsLoading: boolean;
  rulesLoading: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update-rule', nmId: number, rule: Partial<FeedbackProductRule>): void;
  (e: 'toggle-product', nmId: number, enabled: boolean): void;
}>();

function getProductSetting(nmId: number): boolean {
  const setting = props.productSettings.find((s) => s.nmId === nmId);
  return setting?.autoAnswerEnabled ?? true;
}

const searchQuery = ref('');

const allGoods = computed<GoodsItem[]>(() => {
  const result: GoodsItem[] = [];
  for (const goods of Object.values(props.goodsByCategory)) {
    result.push(...goods);
  }
  return result;
});

const filteredGoods = computed<GoodsItem[]>(() => {
  if (!searchQuery.value.trim()) return allGoods.value;
  const q = searchQuery.value.toLowerCase();
  return allGoods.value.filter(
    (g) =>
      g.title.toLowerCase().includes(q) ||
      g.vendorCode.toLowerCase().includes(q) ||
      String(g.nmID).includes(q),
  );
});

function getRule(nmId: number): FeedbackProductRule | undefined {
  return props.productRules.find((r) => r.nmId === nmId);
}

function formatKeywords(keywords: string[] | undefined): string {
  if (!keywords || keywords.length === 0) return '';
  return keywords.join(', ');
}

function updateRuleField(
  nmId: number,
  field: keyof FeedbackProductRule,
  value: unknown,
) {
  emit('update-rule', nmId, { [field]: value });
}

function updateKeywords(nmId: number, value: string) {
  const keywords = value
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
  emit('update-rule', nmId, { excludeKeywords: keywords });
}
</script>

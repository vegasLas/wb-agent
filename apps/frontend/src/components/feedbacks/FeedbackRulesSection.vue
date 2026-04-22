<template>
  <div class="space-y-3">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <span class="text-sm text-surface-500">
        Правил: {{ productRules.length }}
      </span>
      <Button
        label="Добавить правило"
        icon="pi pi-plus"
        size="small"
        @click="openCreateDialog"
      />
    </div>

    <!-- Loading -->
    <LoadingSpinner v-if="rulesLoading" />

    <!-- Empty -->
    <EmptyState
      v-else-if="productRules.length === 0"
      icon="pi pi-sliders-h"
      message="Нет правил. Нажмите 'Добавить правило' чтобы создать."
    />

    <!-- Rules List -->
    <div v-else class="space-y-3">
      <div
        v-for="rule in productRules"
        :key="rule.id"
        class="p-3 bg-surface-0 dark:bg-surface-800 rounded-lg border border-surface-200 dark:border-surface-700"
      >
        <!-- Top row: products + actions -->
        <div class="flex items-start justify-between gap-3">
          <!-- Products -->
          <div class="flex items-center gap-2 flex-wrap">
            <div
              v-for="nmId in rule.nmIds.slice(0, 3)"
              :key="nmId"
              class="flex items-center gap-1.5"
            >
              <img
                v-if="getGoods(nmId)?.thumbnail"
                :src="getGoods(nmId)!.thumbnail"
                alt=""
                class="w-8 h-8 object-cover rounded"
              />
              <div
                v-else
                class="w-8 h-8 bg-surface-200 dark:bg-surface-700 rounded flex items-center justify-center"
              >
                <i class="pi pi-image text-surface-400 text-xs" />
              </div>
              <span class="text-xs text-surface-600 dark:text-surface-300">
                {{ getGoods(nmId)?.vendorCode ?? nmId }}
              </span>
            </div>
            <span
              v-if="rule.nmIds.length > 3"
              class="text-xs text-surface-500 bg-surface-100 dark:bg-surface-700 px-2 py-1 rounded-full"
            >
              +{{ rule.nmIds.length - 3 }}
            </span>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1 shrink-0">
            <Button
              icon="pi pi-pencil"
              severity="secondary"
              text
              size="small"
              class="p-1 w-7 h-7"
              @click="openEditDialog(rule)"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              size="small"
              class="p-1 w-7 h-7"
              @click="confirmDelete(rule)"
            />
          </div>
        </div>

        <!-- Settings summary -->
        <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-surface-500">
          <span v-if="rule.minRating !== null">
            Мин: <b class="text-surface-700 dark:text-surface-200">{{ rule.minRating }}</b>
          </span>
          <span v-if="rule.maxRating !== null">
            Макс: <b class="text-surface-700 dark:text-surface-200">{{ rule.maxRating }}</b>
          </span>
          <span v-if="rule.excludeKeywords.length > 0">
            Ключевые: <b class="text-surface-700 dark:text-surface-200">{{ rule.excludeKeywords.length }}</b>
          </span>
          <span v-if="rule.requireApproval">
            <i class="pi pi-check-circle text-amber-500" />
            Требует подтверждения
          </span>
        </div>

        <!-- Enabled toggle -->
        <div class="mt-2 flex items-center gap-2">
          <ToggleSwitch
            :model-value="rule.enabled"
            @update:model-value="(val) => $emit('update-rule', rule.id, { enabled: val })"
          />
          <span class="text-xs" :class="rule.enabled ? 'text-green-600' : 'text-surface-500'">
            {{ rule.enabled ? 'Включено' : 'Выключено' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Edit Dialog -->
    <RuleEditDialog
      v-model:visible="dialogVisible"
      :rule="editingRule"
      :goods-by-category="goodsByCategory"
      @save="onDialogSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import Button from 'primevue/button';
import ToggleSwitch from 'primevue/toggleswitch';
import { LoadingSpinner, EmptyState } from '@/components/common';
import { confirmPromise } from '@/utils/ui/confirm';
import RuleEditDialog from './RuleEditDialog.vue';
import type { FeedbackProductRule, GoodsItem } from '@/api/feedbacks/types';

interface Props {
  goodsByCategory: Record<string, GoodsItem[]>;
  productRules: FeedbackProductRule[];
  rulesLoading: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'create-rule', payload: Partial<FeedbackProductRule> & { nmIds: number[] }): void;
  (e: 'update-rule', id: string, payload: Partial<FeedbackProductRule>): void;
  (e: 'delete-rule', id: string): void;
}>();

const dialogVisible = ref(false);
const editingRule = ref<FeedbackProductRule | null>(null);

const allGoods = computed(() => {
  const result: GoodsItem[] = [];
  for (const goods of Object.values(props.goodsByCategory)) {
    result.push(...goods);
  }
  return result;
});

const goodsMap = computed(() => {
  const map = new Map<number, GoodsItem>();
  for (const item of allGoods.value) {
    map.set(item.nmID, item);
  }
  return map;
});

function getGoods(nmId: number): GoodsItem | undefined {
  return goodsMap.value.get(nmId);
}

function openCreateDialog() {
  editingRule.value = null;
  dialogVisible.value = true;
}

function openEditDialog(rule: FeedbackProductRule) {
  editingRule.value = rule;
  dialogVisible.value = true;
}

async function confirmDelete(rule: FeedbackProductRule) {
  const confirmed = await confirmPromise({
    header: 'Удалить правило?',
    message: 'Это действие нельзя отменить.',
    acceptLabel: 'Удалить',
    rejectLabel: 'Отмена',
  });
  if (confirmed) {
    emit('delete-rule', rule.id);
  }
}

function onDialogSave(payload: Partial<FeedbackProductRule> & { nmIds?: number[] }) {
  if (editingRule.value) {
    emit('update-rule', editingRule.value.id, payload);
  } else if (payload.nmIds) {
    emit('create-rule', payload as Partial<FeedbackProductRule> & { nmIds: number[] });
  }
}
</script>

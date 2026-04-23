<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between px-1">
      <span class="text-sm font-medium text-surface-500 tracking-wide">
        Правил: {{ feedbackRules.length }}
      </span>
      <Button
        label="Добавить правило"
        icon="pi pi-plus"
        size="small"
        class="shadow-sm hover:shadow-md transition-shadow duration-300"
        @click="openCreateDialog"
      />
    </div>

    <!-- Loading -->
    <LoadingSpinner v-if="rulesLoading" />

    <!-- Empty -->
    <EmptyState
      v-else-if="feedbackRules.length === 0"
      icon="pi pi-sliders-h"
      message="Нет правил. Нажмите 'Добавить правило' чтобы создать."
    />

    <!-- Rules Card -->
    <Card v-else>
      <template #content>
        <div class="overflow-x-auto -mx-3 -my-2">
          <table class="w-full">
            <thead>
              <tr class="text-left">
                <th class="pb-3 pl-5 pr-2 text-xs font-semibold text-surface-400 uppercase tracking-wider">
                  Статус
                </th>
                <th class="pb-3 px-2 text-xs font-semibold text-surface-400 uppercase tracking-wider">
                  Товары
                </th>
                <th class="pb-3 px-2 text-xs font-semibold text-surface-400 uppercase tracking-wider">
                  Режим / Условия
                </th>
                <th class="pb-3 px-2 pr-5 text-xs font-semibold text-surface-400 uppercase tracking-wider text-right">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(rule, index) in feedbackRules"
                :key="rule.id"
                class="group transition-all duration-200 ease-out border-t border-surface-100 dark:border-surface-800"
                :class="[
                  !rule.enabled && 'opacity-55'
                ]"
              >
                <!-- Status / Toggle -->
                <td class="py-4 pl-5 pr-2 align-middle">
                  <div class="flex items-center gap-2">
                    <ToggleSwitch
                      :model-value="rule.enabled"
                      @update:model-value="(val) => $emit('update-rule', rule.id, { enabled: val })"
                    />
                    <span
                      class="text-xs font-medium transition-colors duration-300"
                      :class="rule.enabled ? 'text-emerald-500' : 'text-surface-400'"
                    >
                      {{ rule.enabled ? 'Активно' : 'Выключено' }}
                    </span>
                  </div>
                </td>

                <!-- Products -->
                <td class="py-4 px-2 align-middle">
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
                        class="w-8 h-8 object-cover rounded-md shadow-sm"
                      />
                      <div
                        v-else
                        class="w-8 h-8 bg-surface-100 dark:bg-surface-700 rounded-md flex items-center justify-center"
                      >
                        <i class="pi pi-image text-surface-300 text-xs" />
                      </div>
                      <span class="text-xs text-surface-600 dark:text-surface-300 font-medium">
                        {{ getGoods(nmId)?.vendorCode ?? nmId }}
                      </span>
                    </div>
                    <span
                      v-if="rule.nmIds.length > 3"
                      class="text-xs text-surface-400 bg-surface-100 dark:bg-surface-700 px-2 py-0.5 rounded-full font-medium"
                    >
                      +{{ rule.nmIds.length - 3 }}
                    </span>
                  </div>
                </td>

                <!-- Conditions -->
                <td class="py-4 px-2 align-middle">
                  <div class="flex flex-wrap items-center gap-2">
                    <span
                      class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md font-medium"
                      :class="rule.mode === 'skip'
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        : 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400'"
                    >
                      <i class="pi text-[10px]" :class="rule.mode === 'skip' ? 'pi-ban' : 'pi-pen-to-square'" />
                      {{ rule.mode === 'skip' ? 'Пропуск' : 'Инструкция' }}
                    </span>
                    <span
                      v-if="rule.minRating !== null"
                      class="inline-flex items-center gap-1 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-md"
                    >
                      <i class="pi pi-star-fill text-[10px]" />
                      от {{ rule.minRating }}
                    </span>
                    <span
                      v-if="rule.maxRating !== null"
                      class="inline-flex items-center gap-1 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-md"
                    >
                      <i class="pi pi-star-fill text-[10px]" />
                      до {{ rule.maxRating }}
                    </span>
                    <span
                      v-if="rule.keywords.length > 0"
                      class="inline-flex items-center gap-1 text-xs bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-md"
                    >
                      <i class="pi pi-tag text-[10px]" />
                      {{ rule.keywords.length }}
                    </span>
                  </div>
                </td>

                <!-- Actions -->
                <td class="py-4 px-2 pr-5 align-middle text-right">
                  <div class="flex items-center justify-end gap-1">
                    <Button
                      icon="pi pi-pencil"
                      severity="secondary"
                      text
                      size="small"
                      class="p-1 w-8 h-8 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors duration-200"
                      @click="openEditDialog(rule)"
                    />
                    <Button
                      icon="pi pi-trash"
                      severity="danger"
                      text
                      size="small"
                      class="p-1 w-8 h-8 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                      @click="confirmDelete(rule)"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </Card>

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
import Card from 'primevue/card';
import Button from 'primevue/button';
import ToggleSwitch from 'primevue/toggleswitch';
import { LoadingSpinner, EmptyState } from '@/components/common';
import { confirmPromise } from '@/utils/ui/confirm';
import RuleEditDialog from './RuleEditDialog.vue';
import type { FeedbackRule, GoodsItem } from '@/api/feedbacks/types';

interface Props {
  goodsByCategory: Record<string, GoodsItem[]>;
  feedbackRules: FeedbackRule[];
  rulesLoading: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'create-rule', payload: Partial<FeedbackRule> & { nmIds: number[] }): void;
  (e: 'update-rule', id: string, payload: Partial<FeedbackRule>): void;
  (e: 'delete-rule', id: string): void;
}>();

const dialogVisible = ref(false);
const editingRule = ref<FeedbackRule | null>(null);

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

function openEditDialog(rule: FeedbackRule) {
  editingRule.value = rule;
  dialogVisible.value = true;
}

async function confirmDelete(rule: FeedbackRule) {
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

function onDialogSave(payload: Partial<FeedbackRule> & { nmIds?: number[] }) {
  if (editingRule.value) {
    emit('update-rule', editingRule.value.id, payload);
  } else if (payload.nmIds) {
    emit('create-rule', payload as Partial<FeedbackRule> & { nmIds: number[] });
  }
}
</script>

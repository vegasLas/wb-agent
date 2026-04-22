<template>
  <div class="space-y-2">
    <!-- Loading -->
    <LoadingSpinner v-if="rejectedLoading" />

    <!-- Empty -->
    <EmptyState
      v-else-if="groupedRejected.length === 0"
      icon="pi pi-ban"
      message="Нет отклоненных ответов"
    />

    <!-- Search -->
    <div v-else class="flex items-center gap-2">
      <InputText
        v-model="searchQuery"
        placeholder="Поиск..."
        class="w-full text-sm"
      />
      <Button
        icon="pi pi-refresh"
        severity="secondary"
        text
        size="small"
        @click="$emit('refresh')"
      />
    </div>

    <!-- Compact grouped list -->
    <div v-if="groupedRejected.length > 0" class="space-y-1">
      <div
        v-for="group in groupedRejected"
        :key="group.nmId"
        class="bg-surface-50 dark:bg-surface-900 rounded-lg overflow-hidden"
      >
        <!-- Group header -->
        <div
          class="flex items-center justify-between p-2 cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          @click="toggleGroup(group.nmId)"
        >
          <div class="flex items-center gap-2 min-w-0">
            <i
              class="pi text-xs text-surface-500 shrink-0"
              :class="expandedGroups.has(group.nmId) ? 'pi-chevron-down' : 'pi-chevron-right'"
            />
            <div class="flex items-center gap-1.5 min-w-0 overflow-hidden">
              <template v-for="[code, count] in getVendorCodeCountsForGroup(group.items)" :key="code">
                <div class="flex items-center gap-1 shrink-0">
                  <Chip
                    :label="code"
                    class="text-xs py-0 px-1.5"
                  />
                  <Badge :value="String(count)" severity="secondary" class="text-xs" />
                </div>
              </template>
              <span v-if="getVendorCodeCountsForGroup(group.items).size === 0" class="text-xs text-surface-500">
                nmID: {{ group.nmId }}
              </span>
            </div>
          </div>
        </div>

        <!-- Group items -->
        <div v-show="expandedGroups.has(group.nmId)" class="border-t border-surface-200 dark:border-surface-700">
          <div
            v-for="item in group.items"
            :key="item.id"
            class="p-2 space-y-1.5"
          >
            <!-- Expandable feedback + answer (PrimeVue Inplace) -->
            <div class="space-y-1">
              <!-- Feedback text -->
              <Inplace
                v-if="item.feedbackText?.trim()"
                v-model:active="expandedFeedback[item.id]"
                class="text-xs"
              >
                <template #display>
                  <span class="text-surface-400">
                    <span class="font-medium">Отзыв:</span>
                    {{ truncate(item.feedbackText, 80) }}
                    <span class="text-surface-500 underline ml-1">Ещё</span>
                  </span>
                </template>
                <template #content>
                  <span class="text-surface-300 cursor-pointer" @click="expandedFeedback[item.id] = false">
                    <span class="font-medium">Отзыв:</span>
                    {{ item.feedbackText }}
                    <span class="text-surface-500 underline ml-1">Скрыть</span>
                  </span>
                </template>
              </Inplace>
              <div v-else class="text-xs text-surface-500 italic">
                <span class="font-medium">Отзыв:</span> текст отсутствует
              </div>

              <!-- Rejected answer text -->
              <Inplace
                v-model:active="expandedAnswer[item.id]"
                class="text-xs"
              >
                <template #display>
                  <span class="text-red-400">
                    <span class="font-medium">Ответ:</span>
                    {{ truncate(item.rejectedAnswerText, 80) }}
                    <span class="text-red-500 underline ml-1">Ещё</span>
                  </span>
                </template>
                <template #content>
                  <span class="text-red-300 cursor-pointer" @click="expandedAnswer[item.id] = false">
                    <span class="font-medium">Ответ:</span>
                    {{ item.rejectedAnswerText }}
                    <span class="text-red-500 underline ml-1">Скрыть</span>
                  </span>
                </template>
              </Inplace>
            </div>

            <!-- Compact nmIds MultiSelect -->
            <MultiSelect
              :model-value="item.nmIds || []"
              :options="goodsOptions"
              option-label="title"
              option-value="nmID"
              filter
              placeholder="Товары"
              class="w-full text-sm"
              display="chip"
              :max-selected-labels="2"
              selected-items-label="Выбрано {0}"
              empty-filter-message="Ничего не найдено"
              empty-message="Нет товаров"
              @update:model-value="(val) => onNmIdsChange(item.id, val as number[])"
            >
              <template #option="slotProps">
                <div class="flex items-center gap-2">
                  <img
                    v-if="slotProps.option.thumbnail"
                    :src="slotProps.option.thumbnail"
                    alt=""
                    class="w-6 h-6 object-cover rounded"
                  />
                  <div v-else class="w-6 h-6 bg-surface-200 dark:bg-surface-700 rounded flex items-center justify-center">
                    <i class="pi pi-image text-surface-400 text-xs" />
                  </div>
                  <div class="flex flex-col">
                    <span class="text-xs">{{ slotProps.option.title }}</span>
                    <span class="text-xs text-surface-500">nmID: {{ slotProps.option.nmID }}</span>
                  </div>
                </div>
              </template>
              <template #chip="slotProps">
                <Chip
                  :label="goodsMap.get(slotProps.value as number)?.vendorCode ?? String(slotProps.value)"
                  class="text-xs py-0 px-1.5"
                />
              </template>
            </MultiSelect>

            <!-- Compact note row -->
            <div class="flex items-center gap-1.5">
              <div v-if="editingId === item.id && editingField === 'note'" class="flex gap-1 flex-1">
                <InputText
                  v-model="editValue"
                  class="flex-1 text-xs py-1"
                  placeholder="Примечание"
                />
                <Button
                  icon="pi pi-check"
                  severity="success"
                  text
                  size="small"
                  class="p-1"
                  @click="saveNote(item.id)"
                />
                <Button
                  icon="pi pi-times"
                  severity="danger"
                  text
                  size="small"
                  class="p-1"
                  @click="cancelEdit"
                />
              </div>
              <div v-else class="flex items-center gap-1.5 flex-1 min-w-0">
                <span class="text-xs text-surface-500 shrink-0">Примечание:</span>
                <span class="text-xs text-surface-700 dark:text-surface-300 truncate">
                  {{ item.userFeedback || '—' }}
                </span>
                <Button
                  icon="pi pi-pencil"
                  severity="secondary"
                  text
                  size="small"
                  class="p-1 shrink-0 ml-auto"
                  @click="startEditNote(item)"
                />
              </div>
              <Button
                icon="pi pi-trash"
                severity="danger"
                text
                size="small"
                class="p-1 shrink-0"
                @click="$emit('delete', item.id)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Badge from 'primevue/badge';
import Chip from 'primevue/chip';
import MultiSelect from 'primevue/multiselect';
import Inplace from 'primevue/inplace';
import { LoadingSpinner, EmptyState } from '@/components/common';
import type { RejectedAnswerContext, GoodsItem } from '@/api/feedbacks/types';

interface Props {
  rejectedAnswers: RejectedAnswerContext[];
  rejectedLoading: boolean;
  goodsByCategory: Record<string, GoodsItem[]>;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update-note', id: string, note: string): void;
  (e: 'update-nmids', id: string, nmIds: number[]): void;
  (e: 'delete', id: string): void;
  (e: 'refresh'): void;
}>();

const searchQuery = ref('');
const editingId = ref<string | null>(null);
const editingField = ref<'note' | null>(null);
const editValue = ref('');
const expandedGroups = ref<Set<number>>(new Set());
const expandedFeedback = ref<Record<string, boolean>>({});
const expandedAnswer = ref<Record<string, boolean>>({});

interface GroupedRejected {
  nmId: number;
  items: RejectedAnswerContext[];
}

const goodsOptions = computed(() => {
  const result: GoodsItem[] = [];
  for (const goods of Object.values(props.goodsByCategory)) {
    result.push(...goods);
  }
  return result.sort((a, b) => a.nmID - b.nmID);
});

const goodsMap = computed(() => {
  const map = new Map<number, GoodsItem>();
  for (const goods of Object.values(props.goodsByCategory)) {
    for (const item of goods) {
      map.set(item.nmID, item);
    }
  }
  return map;
});

function getVendorCodesForNmIds(nmIds: number[] | undefined): string[] {
  if (!nmIds || nmIds.length === 0) return [];
  const codes: string[] = [];
  for (const nmId of nmIds) {
    const goods = goodsMap.value.get(nmId);
    if (goods?.vendorCode) {
      codes.push(goods.vendorCode);
    }
  }
  return codes;
}

function getVendorCodeCountsForGroup(items: RejectedAnswerContext[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const codes = getVendorCodesForNmIds(item.nmIds);
    for (const code of codes) {
      counts.set(code, (counts.get(code) || 0) + 1);
    }
  }
  return counts;
}

const groupedRejected = computed<GroupedRejected[]>(() => {
  let filtered = props.rejectedAnswers;

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.feedbackText.toLowerCase().includes(q) ||
        r.rejectedAnswerText.toLowerCase().includes(q) ||
        r.userFeedback?.toLowerCase().includes(q),
    );
  }

  const groupMap = new Map<number, RejectedAnswerContext[]>();

  for (const item of filtered) {
    const primaryNmId = (item.nmIds || [])[0];
    if (!primaryNmId) continue;

    const existing = groupMap.get(primaryNmId) || [];
    existing.push(item);
    groupMap.set(primaryNmId, existing);
  }

  const result: GroupedRejected[] = [];
  for (const [nmId, items] of groupMap.entries()) {
    result.push({ nmId, items });
  }

  return result.sort((a, b) => b.items.length - a.items.length);
});

function toggleGroup(nmId: number) {
  const set = expandedGroups.value;
  if (set.has(nmId)) {
    set.delete(nmId);
  } else {
    set.add(nmId);
  }
}

function startEditNote(item: RejectedAnswerContext) {
  editingId.value = item.id;
  editingField.value = 'note';
  editValue.value = item.userFeedback || '';
}

function cancelEdit() {
  editingId.value = null;
  editingField.value = null;
  editValue.value = '';
}

function saveNote(id: string) {
  emit('update-note', id, editValue.value);
  cancelEdit();
}

function onNmIdsChange(id: string, nmIds: number[]) {
  emit('update-nmids', id, nmIds);
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
</script>

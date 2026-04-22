<template>
  <div class="space-y-2">
    <!-- Loading -->
    <LoadingSpinner v-if="rejectedLoading" />

    <!-- Empty -->
    <EmptyState
      v-else-if="groupedRejected.length === 0"
      icon="pi pi-ban"
      message="Нет правок"
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
              :class="
                expandedGroups.has(group.nmId)
                  ? 'pi-chevron-down'
                  : 'pi-chevron-right'
              "
            />
            <div class="flex items-center gap-1.5 min-w-0 overflow-hidden">
              <template
                v-for="[code, count] in getVendorCodeCountsForGroup(
                  group.items,
                )"
                :key="code"
              >
                <div class="flex items-center gap-1 shrink-0">
                  <Chip :label="code" class="text-xs py-0 px-1.5" />
                  <Badge
                    :value="String(count)"
                    severity="secondary"
                    class="text-xs"
                  />
                </div>
              </template>
              <span
                v-if="getVendorCodeCountsForGroup(group.items).size === 0"
                class="text-xs text-surface-500"
              >
                nmID: {{ group.nmId }}
              </span>
            </div>
          </div>
        </div>

        <!-- Group items -->
        <div
          v-show="expandedGroups.has(group.nmId)"
          class="border-t border-surface-200 dark:border-surface-700"
        >
          <div
            v-for="item in group.items"
            :key="item.id"
            class="p-2 space-y-1.5"
          >
            <!-- Expandable texts -->
            <div class="space-y-1">
              <!-- Generated answer text -->
              <Inplace v-model:active="expandedAnswer[item.id]" class="text-xs">
                <template #display>
                  <span class="text-red-400 cursor-pointer hover:opacity-80 transition-opacity">
                    <span class="font-medium">Сгенерированный ответ:</span>
                    {{ truncate(item.rejectedAnswerText, 80) }}
                  </span>
                </template>
                <template #content>
                  <span
                    class="text-red-300 cursor-pointer hover:opacity-80 transition-opacity"
                    @click="expandedAnswer[item.id] = false"
                  >
                    <span class="font-medium">Сгенерированный ответ:</span>
                    {{ item.rejectedAnswerText }}
                  </span>
                </template>
              </Inplace>

              <!-- User feedback / note -->
              <div
                v-if="editingId === item.id && editingField === 'note'"
                class="flex gap-1"
              >
                <InputText
                  v-model="editValue"
                  class="flex-1 text-xs py-1"
                  placeholder="Замечание"
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
              <div v-else class="flex items-center gap-1.5 text-xs">
                <span class="text-surface-500 shrink-0">Замечание:</span>
                <span class="text-surface-300 truncate flex-1">
                  {{ item.userFeedback || '—' }}
                </span>
                <Button
                  icon="pi pi-pencil"
                  severity="secondary"
                  text
                  size="small"
                  class="p-1 shrink-0"
                  @click="startEditNote(item)"
                />
              </div>
            </div>

            <!-- nmId chip -->
            <div class="flex items-center gap-1.5">
              <span class="text-xs text-surface-500">Товар:</span>
              <Chip
                :label="getVendorCodeForNmId(item.nmId) || String(item.nmId)"
                class="text-xs py-0 px-1.5"
              />
            </div>

            <!-- Delete button -->
            <div class="flex justify-end">
              <Button
                icon="pi pi-trash"
                severity="danger"
                text
                size="small"
                class="p-1"
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
  (e: 'delete', id: string): void;
  (e: 'refresh'): void;
}>();

const searchQuery = ref('');
const editingId = ref<string | null>(null);
const editingField = ref<'note' | null>(null);
const editValue = ref('');
const expandedGroups = ref<Set<number>>(new Set());
const expandedAnswer = ref<Record<string, boolean>>({});

interface GroupedRejected {
  nmId: number;
  items: RejectedAnswerContext[];
}

const goodsMap = computed(() => {
  const map = new Map<number, GoodsItem>();
  for (const goods of Object.values(props.goodsByCategory)) {
    for (const item of goods) {
      map.set(item.nmID, item);
    }
  }
  return map;
});

function getVendorCodeForNmId(nmId: number): string | undefined {
  return goodsMap.value.get(nmId)?.vendorCode;
}

function getVendorCodeCountsForGroup(
  items: RejectedAnswerContext[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const code = getVendorCodeForNmId(item.nmId);
    if (code) {
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
    const nmId = item.nmId;
    if (!nmId) continue;

    const existing = groupMap.get(nmId) || [];
    existing.push(item);
    groupMap.set(nmId, existing);
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

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
</script>

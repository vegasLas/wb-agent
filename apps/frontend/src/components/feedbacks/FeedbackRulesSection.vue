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
              :model-value="getDisplayValue(data.nmID, 'enabled') ?? true"
              @update:model-value="(val) => setPending(data.nmID, 'enabled', val)"
            />
          </template>
        </Column>

        <Column header="Мин. рейтинг">
          <template #body="{ data }">
            <InputNumber
              :model-value="getDisplayValue(data.nmID, 'minRating') ?? null"
              :min="1"
              :max="5"
              placeholder="1-5"
              class="w-20"
              @update:model-value="(val) => setPending(data.nmID, 'minRating', val)"
            />
          </template>
        </Column>

        <Column header="Макс. рейтинг">
          <template #body="{ data }">
            <InputNumber
              :model-value="getDisplayValue(data.nmID, 'maxRating') ?? null"
              :min="1"
              :max="5"
              placeholder="1-5"
              class="w-20"
              @update:model-value="(val) => setPending(data.nmID, 'maxRating', val)"
            />
          </template>
        </Column>

        <Column header="Исключить ключевые слова">
          <template #body="{ data }">
            <Button
              :label="keywordsButtonLabel(data.nmID)"
              :icon="keywordsButtonIcon(data.nmID)"
              size="small"
              severity="secondary"
              outlined
              @click="openKeywordsDialog(data.nmID)"
            />
          </template>
        </Column>

        <Column header="Требовать подтверждения">
          <template #body="{ data }">
            <ToggleSwitch
              :model-value="getDisplayValue(data.nmID, 'requireApproval') ?? false"
              @update:model-value="(val) => setPending(data.nmID, 'requireApproval', val)"
            />
          </template>
        </Column>

        <Column
          header=""
          class="w-24"
        >
          <template #body="{ data }">
            <div
              v-if="isDirty(data.nmID)"
              class="flex items-center gap-1"
            >
              <Button
                icon="pi pi-check"
                size="small"
                severity="success"
                title="Сохранить"
                @click="saveRow(data.nmID)"
              />
              <Button
                icon="pi pi-times"
                size="small"
                severity="secondary"
                title="Отмена"
                @click="cancelRow(data.nmID)"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </div>

    <!-- Keywords Dialog -->
    <Dialog
      v-model:visible="keywordsDialogOpen"
      header="Ключевые слова"
      modal
      :style="{ width: '25rem' }"
    >
      <div class="space-y-3">
        <p class="text-sm text-surface-500">
          Введите ключевые слова через запятую. Отзывы, содержащие эти слова, будут исключены из автоответа.
        </p>
        <Textarea
          v-model="editingKeywords"
          rows="5"
          class="w-full"
          placeholder="плохой, брак, сломан"
        />
        <div
          v-if="editingKeywordTags.length > 0"
          class="flex flex-wrap gap-1"
        >
          <span
            v-for="(tag, idx) in editingKeywordTags"
            :key="idx"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-surface-200 dark:bg-surface-700"
          >
            {{ tag }}
            <i
              class="pi pi-times cursor-pointer text-surface-500 hover:text-red-500"
              @click="removeKeywordTag(idx)"
            />
          </span>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-2">
          <Button
            label="Отмена"
            severity="secondary"
            @click="closeKeywordsDialog"
          />
          <Button
            label="Сохранить"
            @click="saveKeywordsDialog"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import ToggleSwitch from 'primevue/toggleswitch';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Textarea from 'primevue/textarea';
import { LoadingSpinner, EmptyState } from '@/components/common';
import { toastHelpers } from '@/utils/ui/toast';
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
  return setting?.autoAnswerEnabled ?? false;
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

// ── Dirty state tracking ─────────────────────────────────────────────

const pendingChanges = ref<Map<number, Partial<FeedbackProductRule>>>(new Map());

function isDirty(nmId: number): boolean {
  return pendingChanges.value.has(nmId);
}

function getDisplayValue<K extends keyof FeedbackProductRule>(
  nmId: number,
  field: K,
): FeedbackProductRule[K] | undefined {
  const pending = pendingChanges.value.get(nmId)?.[field];
  if (pending !== undefined) return pending as FeedbackProductRule[K];
  return getRule(nmId)?.[field];
}

function setPending<K extends keyof FeedbackProductRule>(
  nmId: number,
  field: K,
  value: FeedbackProductRule[K],
) {
  const current = pendingChanges.value.get(nmId) ?? {};
  pendingChanges.value.set(nmId, { ...current, [field]: value });
}

function saveRow(nmId: number) {
  const raw = pendingChanges.value.get(nmId);
  if (!raw) return;

  // Strip nulls so backend optional() validator doesn't choke on them
  const changes: Partial<FeedbackProductRule> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value !== null && value !== undefined) {
      (changes as Record<string, unknown>)[key] = value;
    }
  }

  // Validate rating ranges
  const minRating = (changes as Record<string, unknown>).minRating as number | undefined;
  const maxRating = (changes as Record<string, unknown>).maxRating as number | undefined;

  if (minRating !== undefined) {
    if (minRating < 1 || minRating > 5 || !Number.isInteger(minRating)) {
      toastHelpers.error('Ошибка валидации', 'Мин. рейтинг должен быть целым числом от 1 до 5');
      return;
    }
  }
  if (maxRating !== undefined) {
    if (maxRating < 1 || maxRating > 5 || !Number.isInteger(maxRating)) {
      toastHelpers.error('Ошибка валидации', 'Макс. рейтинг должен быть целым числом от 1 до 5');
      return;
    }
  }
  if (minRating !== undefined && maxRating !== undefined) {
    if (minRating > maxRating) {
      toastHelpers.error('Ошибка валидации', 'Мин. рейтинг не может быть больше макс. рейтинга');
      return;
    }
  }

  emit('update-rule', nmId, changes);
  pendingChanges.value.delete(nmId);
}

function cancelRow(nmId: number) {
  pendingChanges.value.delete(nmId);
}

// ── Keywords dialog ──────────────────────────────────────────────────

const keywordsDialogOpen = ref(false);
const editingNmId = ref<number | null>(null);
const editingKeywords = ref('');

const editingKeywordTags = computed(() => {
  return editingKeywords.value
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
});

function keywordsButtonLabel(nmId: number): string {
  const keywords = getDisplayValue(nmId, 'excludeKeywords');
  if (!keywords || keywords.length === 0) return 'Добавить слова';
  const count = keywords.length;
  // Russian pluralization
  const word =
    count % 10 === 1 && count % 100 !== 11
      ? 'слово'
      : [2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)
        ? 'слова'
        : 'слов';
  return `${count} ${word}`;
}

function keywordsButtonIcon(nmId: number): string {
  const keywords = getDisplayValue(nmId, 'excludeKeywords');
  return !keywords || keywords.length === 0 ? 'pi pi-plus' : 'pi pi-pencil';
}

function openKeywordsDialog(nmId: number) {
  editingNmId.value = nmId;
  const keywords = getDisplayValue(nmId, 'excludeKeywords');
  editingKeywords.value = keywords?.join(', ') ?? '';
  keywordsDialogOpen.value = true;
}

function closeKeywordsDialog() {
  keywordsDialogOpen.value = false;
  editingNmId.value = null;
  editingKeywords.value = '';
}

function saveKeywordsDialog() {
  if (editingNmId.value === null) return;
  const keywords = editingKeywords.value
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
  setPending(editingNmId.value, 'excludeKeywords', keywords);
  closeKeywordsDialog();
}

function removeKeywordTag(index: number) {
  const tags = [...editingKeywordTags.value];
  tags.splice(index, 1);
  editingKeywords.value = tags.join(', ');
}
</script>

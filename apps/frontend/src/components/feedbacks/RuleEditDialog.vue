<template>
  <Dialog
    v-model:visible="visible"
    :header="isEdit ? 'Редактировать правило' : 'Новое правило'"
    modal
    :style="{ width: '30rem' }"
  >
    <div class="space-y-4">
      <!-- Products -->
      <div class="space-y-1">
        <label class="text-sm font-medium">Товары</label>
        <MultiSelect
          v-model="form.nmIds"
          :options="goodsOptions"
          option-label="title"
          option-value="nmID"
          filter
          placeholder="Выберите товары"
          class="w-full"
          display="chip"
          :max-selected-labels="3"
          selected-items-label="Выбрано {0}"
        >
          <template #option="slotProps">
            <div class="flex items-center gap-2">
              <img
                v-if="slotProps.option.thumbnail"
                :src="slotProps.option.thumbnail"
                alt=""
                class="w-6 h-6 object-cover rounded"
              />
              <div
                v-else
                class="w-6 h-6 bg-surface-200 dark:bg-surface-700 rounded flex items-center justify-center"
              >
                <i class="pi pi-image text-surface-400 text-xs" />
              </div>
              <div class="flex flex-col">
                <span class="text-sm">{{ slotProps.option.title }}</span>
                <span class="text-xs text-surface-500">{{ slotProps.option.vendorCode }}</span>
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
        <small v-if="validationErrors.nmIds" class="text-red-500">{{ validationErrors.nmIds }}</small>
      </div>

      <!-- Ratings -->
      <div class="flex gap-4">
        <div class="flex-1 space-y-1">
          <label class="text-sm font-medium">Мин. рейтинг</label>
          <InputNumber
            v-model="form.minRating"
            :min="1"
            :max="5"
            placeholder="1-5"
            class="w-full"
          />
          <small v-if="validationErrors.minRating" class="text-red-500">{{ validationErrors.minRating }}</small>
        </div>
        <div class="flex-1 space-y-1">
          <label class="text-sm font-medium">Макс. рейтинг</label>
          <InputNumber
            v-model="form.maxRating"
            :min="1"
            :max="5"
            placeholder="1-5"
            class="w-full"
          />
          <small v-if="validationErrors.maxRating" class="text-red-500">{{ validationErrors.maxRating }}</small>
        </div>
      </div>

      <!-- Keywords -->
      <div class="space-y-1">
        <label class="text-sm font-medium">Исключить ключевые слова</label>
        <Textarea
          v-model="keywordsRaw"
          rows="3"
          class="w-full"
          placeholder="через запятую"
        />
        <div v-if="keywordTags.length > 0" class="flex flex-wrap gap-1 mt-1">
          <Tag
            v-for="(tag, idx) in keywordTags"
            :key="idx"
            :value="tag"
            severity="secondary"
            class="text-xs"
          >
            <template #default>
              <span class="flex items-center gap-1">
                {{ tag }}
                <i
                  class="pi pi-times cursor-pointer hover:text-red-500"
                  @click="removeTag(idx)"
                />
              </span>
            </template>
          </Tag>
        </div>
      </div>

      <!-- Toggles -->
      <div class="flex items-center justify-between">
        <span class="text-sm">Требовать подтверждения</span>
        <ToggleSwitch v-model="form.requireApproval" />
      </div>
      <div class="flex items-center justify-between">
        <span class="text-sm">Правило включено</span>
        <ToggleSwitch v-model="form.enabled" />
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button label="Отмена" severity="secondary" @click="close" />
        <Button
          :label="isEdit ? 'Сохранить' : 'Создать'"
          :disabled="!isValid"
          @click="submit"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Dialog from 'primevue/dialog';
import MultiSelect from 'primevue/multiselect';
import InputNumber from 'primevue/inputnumber';
import Textarea from 'primevue/textarea';
import ToggleSwitch from 'primevue/toggleswitch';
import Button from 'primevue/button';
import Chip from 'primevue/chip';
import Tag from 'primevue/tag';
import type { FeedbackProductRule, GoodsItem } from '@/api/feedbacks/types';

interface FormState {
  nmIds: number[];
  minRating: number | null;
  maxRating: number | null;
  excludeKeywords: string[];
  requireApproval: boolean;
  enabled: boolean;
}

interface Props {
  visible: boolean;
  rule?: FeedbackProductRule | null;
  goodsByCategory: Record<string, GoodsItem[]>;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'save', payload: Partial<FormState> & { nmIds?: number[] }): void;
}>();

const isEdit = computed(() => !!props.rule);

const visible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
});

const goodsOptions = computed<GoodsItem[]>(() => {
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

const defaultForm = (): FormState => ({
  nmIds: [],
  minRating: 1,
  maxRating: 5,
  excludeKeywords: [],
  requireApproval: false,
  enabled: true,
});

const form = ref<FormState>(defaultForm());
const keywordsRaw = ref('');

const keywordTags = computed(() => {
  return keywordsRaw.value
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
});

function removeTag(index: number) {
  const tags = [...keywordTags.value];
  tags.splice(index, 1);
  keywordsRaw.value = tags.join(', ');
}

watch(
  () => props.rule,
  (rule) => {
    if (rule) {
      form.value = {
        nmIds: [...rule.nmIds],
        minRating: rule.minRating ?? 1,
        maxRating: rule.maxRating ?? 5,
        excludeKeywords: [...rule.excludeKeywords],
        requireApproval: rule.requireApproval,
        enabled: rule.enabled,
      };
      keywordsRaw.value = rule.excludeKeywords.join(', ');
    } else {
      form.value = defaultForm();
      keywordsRaw.value = '';
    }
  },
  { immediate: true },
);

const validationErrors = computed<Record<string, string>>(() => {
  const e: Record<string, string> = {};

  if (form.value.nmIds.length === 0) {
    e.nmIds = 'Выберите хотя бы один товар';
  }

  const minVal = form.value.minRating;
  if (minVal === null || !Number.isInteger(minVal) || minVal < 1 || minVal > 5) {
    e.minRating = 'Должно быть целое число от 1 до 5';
  }

  const maxVal = form.value.maxRating;
  if (maxVal === null || !Number.isInteger(maxVal) || maxVal < 1 || maxVal > 5) {
    e.maxRating = 'Должно быть целое число от 1 до 5';
  }

  if (minVal !== null && maxVal !== null && minVal > maxVal) {
    e.minRating = 'Мин. рейтинг не может быть больше макс.';
  }

  return e;
});

const isValid = computed(() => Object.keys(validationErrors.value).length === 0);

function submit() {
  if (!isValid.value) return;

  // Default null ratings to 1-5 to prevent backend validation errors
  const minRating = form.value.minRating ?? 1;
  const maxRating = form.value.maxRating ?? 5;

  const payload: Partial<FormState> & { nmIds?: number[] } = {
    nmIds: form.value.nmIds,
    minRating,
    maxRating,
    excludeKeywords: keywordTags.value,
    requireApproval: form.value.requireApproval,
    enabled: form.value.enabled,
  };

  emit('save', payload);
  close();
}

function close() {
  emit('update:visible', false);
}
</script>

<template>
  <Dialog
    v-model:visible="localVisible"
    :header="dialogHeader"
    modal
    :style="{ width: '90vw', maxWidth: '600px' }"
    @hide="onHide"
  >
    <div class="space-y-3">
      <!-- Alert -->
      <Message severity="info" class="text-sm">
        Выберите существующую группу, чтобы добавить товар в неё, или другой
        товар, чтобы создать новую связь.
      </Message>

      <!-- Current Group (if source is already grouped) -->
      <div v-if="currentGroup" class="space-y-2">
        <div class="text-sm font-medium text-primary-400">
          Текущая группа
        </div>
        <Card class="shadow-sm w-fit">
          <template #content>
            <div class="space-y-2">
              <div class="flex items-center gap-1 flex-wrap">
                <div
                  v-for="nmId in currentGroup.nmIds"
                  :key="nmId"
                  class="inline-flex items-center gap-1"
                >
                  <Tag
                    :value="getGoodsLabel(nmId)"
                    severity="secondary"
                    class="text-xs"
                  />
                  <Button
                    v-if="nmId !== props.sourceNmId"
                    icon="pi pi-times"
                    severity="danger"
                    text
                    class="p-0 w-5 h-5"
                    :loading="loadingTarget === `remove-${nmId}`"
                    @click="onRemoveFromGroup(nmId)"
                  />
                </div>
              </div>
              <div class="text-xs text-surface-500">
                {{ currentGroup.nmIds.length }} товаров в группе
              </div>
            </div>
          </template>
        </Card>
      </div>

      <!-- Search -->
      <InputText
        v-model="searchQuery"
        placeholder="Поиск группы или товара..."
        class="w-full text-sm"
      />

      <!-- Other Groups Section -->
      <div v-if="filteredOtherGroups.length > 0" class="space-y-2">
        <div class="text-sm font-medium text-surface-500">
          Другие группы
        </div>
        <div class="flex flex-wrap gap-2">
          <Card
            v-for="group in filteredOtherGroups"
            :key="group.id"
            class="shadow-sm w-fit"
          >
            <template #content>
              <div class="space-y-2">
                <div class="flex items-center gap-1 flex-wrap">
                  <Tag
                    v-for="nmId in group.nmIds"
                    :key="nmId"
                    :value="getGoodsLabel(nmId)"
                    severity="secondary"
                    class="text-xs"
                  />
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-xs text-surface-500">
                    {{ group.nmIds.length }} товаров
                  </span>
                  <Button
                    label="Добавить в группу"
                    icon="pi pi-plus"
                    severity="primary"
                    size="small"
                    class="text-xs"
                    :loading="loadingTarget === group.id"
                    @click="onAddToGroup(group)"
                  />
                </div>
              </div>
            </template>
          </Card>
        </div>
      </div>

      <!-- Other Goods Section -->
      <div class="space-y-2">
        <div class="text-sm font-medium text-surface-500">Другие товары</div>
        <div class="grid grid-cols-1 gap-2">
          <Card
            v-for="goods in filteredGoods"
            :key="goods.nmID"
            class="shadow-sm"
          >
            <template #content>
              <div class="flex items-center gap-3">
                <img
                  v-if="goods.thumbnail"
                  :src="goods.thumbnail"
                  alt=""
                  class="w-10 h-10 object-cover rounded-lg shrink-0"
                />
                <div
                  v-else
                  class="w-10 h-10 bg-surface-200 dark:bg-surface-700 rounded-lg flex items-center justify-center shrink-0"
                >
                  <i class="pi pi-image text-surface-400 text-xs" />
                </div>

                <div class="flex-1 min-w-0">
                  <div class="text-xs font-semibold text-surface-900 dark:text-surface-0 truncate">
                    {{ goods.title || goods.vendorCode || 'Товар' }}
                  </div>
                  <div class="text-xs text-surface-500">
                    {{ goods.vendorCode }} · nmID: {{ goods.nmID }}
                  </div>
                  <div
                    v-if="getGroupForNmId(goods.nmID)"
                    class="text-xs text-primary-400"
                  >
                    В группе с {{ getGroupForNmId(goods.nmID)!.nmIds.length }}
                    товарами
                  </div>
                </div>

                <Button
                  label="Объединить"
                  icon="pi pi-link"
                  severity="secondary"
                  size="small"
                  class="text-xs shrink-0"
                  :loading="loadingTarget === String(goods.nmID)"
                  @click="onMergeWithGood(goods.nmID)"
                />
              </div>
            </template>
          </Card>

          <div
            v-if="filteredGoods.length === 0 && filteredOtherGroups.length === 0"
            class="text-center text-sm text-surface-500 py-6"
          >
            Ничего не найдено
          </div>
        </div>
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Card from 'primevue/card';
import Tag from 'primevue/tag';
import Message from 'primevue/message';
import type { GoodsItem, FeedbackGoodsGroup } from '@/api/feedbacks/types';

interface Props {
  visible: boolean;
  goodsByCategory: Record<string, GoodsItem[]>;
  goodsGroups: FeedbackGoodsGroup[];
  sourceNmId: number;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'merge', sourceNmId: number, targetNmId: number): void;
  (e: 'remove-from-group', groupId: string, nmId: number): void;
  (e: 'update:visible', value: boolean): void;
}>();

const localVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
});

const searchQuery = ref('');
const loadingTarget = ref<string | null>(null);

watch(localVisible, (isOpen) => {
  if (isOpen) {
    searchQuery.value = '';
    loadingTarget.value = null;
  }
});

watch(
  () => props.goodsGroups,
  () => {
    loadingTarget.value = null;
  },
  { deep: true },
);

const sourceGoods = computed<GoodsItem | undefined>(() => {
  for (const goods of Object.values(props.goodsByCategory)) {
    const found = goods.find((g) => g.nmID === props.sourceNmId);
    if (found) return found;
  }
  return undefined;
});

const dialogHeader = computed(() => {
  const g = sourceGoods.value;
  const label = g?.vendorCode || g?.title || `nmID ${props.sourceNmId}`;
  return `Объединить товар: ${label}`;
});

const allGoods = computed<GoodsItem[]>(() => {
  const result: GoodsItem[] = [];
  for (const goods of Object.values(props.goodsByCategory)) {
    result.push(...goods);
  }
  return result;
});

function getGroupForNmId(nmId: number): FeedbackGoodsGroup | undefined {
  return props.goodsGroups.find((g) => g.nmIds.includes(nmId));
}

function getGoodsLabel(nmId: number): string {
  for (const goods of Object.values(props.goodsByCategory)) {
    const found = goods.find((g) => g.nmID === nmId);
    if (found) {
      return found.vendorCode || found.title || String(nmId);
    }
  }
  return String(nmId);
}

const currentGroup = computed(() => {
  return getGroupForNmId(props.sourceNmId);
});

const filteredOtherGroups = computed(() => {
  let list = props.goodsGroups.filter(
    (g) => !g.nmIds.includes(props.sourceNmId),
  );

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter((group) =>
      group.nmIds.some((nmId) => {
        const label = getGoodsLabel(nmId).toLowerCase();
        return label.includes(q);
      }),
    );
  }

  return list;
});

const filteredGoods = computed(() => {
  let list = allGoods.value.filter((g) => g.nmID !== props.sourceNmId);

  const sourceGroup = currentGroup.value;
  if (sourceGroup) {
    list = list.filter((g) => !sourceGroup.nmIds.includes(g.nmID));
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(
      (g) =>
        g.title?.toLowerCase().includes(q) ||
        g.vendorCode?.toLowerCase().includes(q) ||
        String(g.nmID).includes(q),
    );
  }

  return list.sort((a, b) => a.nmID - b.nmID);
});

function onAddToGroup(group: FeedbackGoodsGroup) {
  const targetNmId = group.nmIds[0];
  if (!targetNmId) return;
  loadingTarget.value = group.id;
  emit('merge', props.sourceNmId, targetNmId);
}

function onMergeWithGood(targetNmId: number) {
  loadingTarget.value = String(targetNmId);
  emit('merge', props.sourceNmId, targetNmId);
}

function onRemoveFromGroup(nmId: number) {
  if (!currentGroup.value) return;
  loadingTarget.value = `remove-${nmId}`;
  emit('remove-from-group', currentGroup.value.id, nmId);
}

function onHide() {
  loadingTarget.value = null;
  emit('update:visible', false);
}
</script>

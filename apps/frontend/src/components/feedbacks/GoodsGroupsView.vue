<template>
  <div class="space-y-3">
    <!-- Alert -->
    <Message severity="info" class="text-sm">
      Объединяйте товары в группы, чтобы они использовали общие правки при
      генерации AI-ответов. Выберите товар и нажмите
      <strong>«Объединить»</strong>.
    </Message>

    <!-- Existing groups -->
    <Panel
      v-if="props.goodsGroups.length > 0"
      :header="`Текущие группы (${props.goodsGroups.length})`"
      toggleable
      :collapsed="groupsCollapsed"
      @toggle="groupsCollapsed = !groupsCollapsed"
      class="text-sm"
    >
      <div class="flex flex-wrap gap-3">
        <Card
          v-for="group in props.goodsGroups"
          :key="group.id"
          class="shadow-sm w-fit"
        >
          <template #content>
            <div class="space-y-2">
              <div class="flex items-center gap-1.5 flex-wrap">
                <div
                  v-for="nmId in group.nmIds"
                  :key="nmId"
                  class="inline-flex items-center gap-0.5 bg-surface-200 dark:bg-surface-700 rounded-full pl-2.5 pr-1 py-0.5"
                >
                  <span
                    class="text-xs text-surface-700 dark:text-surface-300"
                    >{{ getGoodsLabel(nmId) }}</span
                  >
                  <Button
                    icon="pi pi-times"
                    severity="danger"
                    text
                    class="p-0 w-5 h-5 min-w-0"
                    @click="
                      confirmRemoveFromGroup(
                        group.id,
                        nmId,
                        getGoodsLabel(nmId),
                      )
                    "
                  />
                </div>
              </div>
              <div class="flex justify-end">
                <Button
                  icon="pi pi-trash"
                  severity="danger"
                  text
                  size="small"
                  class="p-1"
                  @click="confirmDeleteGroup(group.id)"
                />
              </div>
            </div>
          </template>
        </Card>
      </div>
    </Panel>

    <!-- Goods list -->
    <div class="space-y-2">
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium text-surface-500">Все товары</span>
        <InputText
          v-model="searchQuery"
          placeholder="Поиск..."
          class="flex-1 text-sm"
        />
      </div>

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
                class="w-12 h-12 object-cover rounded-lg shrink-0"
              />
              <div
                v-else
                class="w-12 h-12 bg-surface-200 dark:bg-surface-700 rounded-lg flex items-center justify-center shrink-0"
              >
                <i class="pi pi-image text-surface-400 text-sm" />
              </div>

              <div class="flex-1 min-w-0">
                <div
                  class="text-sm font-semibold text-surface-900 dark:text-surface-0 truncate"
                >
                  {{ goods.title || goods.vendorCode || 'Товар' }}
                </div>
                <div class="text-xs text-surface-500">
                  {{ goods.vendorCode }} · nmID: {{ goods.nmID }}
                </div>
              </div>

              <Tag
                v-if="getGroupSize(goods.nmID) > 1"
                :value="`В группе: ${getGroupSize(goods.nmID)}`"
                severity="info"
                class="text-xs shrink-0"
              />

              <Button
                icon="pi pi-link"
                label="Объединить"
                severity="primary"
                size="small"
                class="text-xs shrink-0"
                @click="openMergeDialog(goods.nmID)"
              />
            </div>
          </template>
        </Card>

        <div
          v-if="filteredGoods.length === 0"
          class="text-center text-sm text-surface-500 py-6"
        >
          Ничего не найдено
        </div>
      </div>
    </div>

    <!-- Merge dialog -->
    <GoodsMergeDialog
      v-model:visible="showMergeDialog"
      :goods-by-category="props.goodsByCategory"
      :goods-groups="props.goodsGroups"
      :source-nm-id="mergeDialogSourceNmId ?? 0"
      @merge="onMerge"
      @remove-from-group="onRemoveFromGroup"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Card from 'primevue/card';
import Panel from 'primevue/panel';
import Message from 'primevue/message';
import { showConfirm } from '@/utils/ui/confirm';
import GoodsMergeDialog from './GoodsMergeDialog.vue';
import type { GoodsItem, FeedbackGoodsGroup } from '@/api/feedbacks/types';

interface Props {
  goodsByCategory: Record<string, GoodsItem[]>;
  goodsGroups: FeedbackGoodsGroup[];
  goodsLoading: boolean;
  groupsLoading: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'merge', sourceNmId: number, targetNmId: number): void;
  (e: 'delete-group', id: string): void;
  (e: 'remove-from-group', groupId: string, nmId: number): void;
}>();

const searchQuery = ref('');
const showMergeDialog = ref(false);
const mergeDialogSourceNmId = ref<number | null>(null);
const groupsCollapsed = ref(false);

const allGoods = computed<GoodsItem[]>(() => {
  const result: GoodsItem[] = [];
  for (const goods of Object.values(props.goodsByCategory)) {
    result.push(...goods);
  }
  return result;
});

const filteredGoods = computed(() => {
  if (!searchQuery.value.trim()) return allGoods.value;
  const q = searchQuery.value.toLowerCase();
  return allGoods.value.filter(
    (g) =>
      g.title?.toLowerCase().includes(q) ||
      g.vendorCode?.toLowerCase().includes(q) ||
      String(g.nmID).includes(q),
  );
});

function getGoodsLabel(nmId: number): string {
  for (const goods of Object.values(props.goodsByCategory)) {
    const found = goods.find((g) => g.nmID === nmId);
    if (found) {
      return found.vendorCode || found.title || String(nmId);
    }
  }
  return String(nmId);
}

function getGroupSize(nmId: number): number {
  for (const group of props.goodsGroups) {
    if (group.nmIds.includes(nmId)) {
      return group.nmIds.length;
    }
  }
  return 1;
}

function openMergeDialog(nmId: number) {
  mergeDialogSourceNmId.value = nmId;
  showMergeDialog.value = true;
}

function onMerge(sourceNmId: number, targetNmId: number) {
  emit('merge', sourceNmId, targetNmId);
}

function confirmRemoveFromGroup(groupId: string, nmId: number, label: string) {
  showConfirm({
    message: `Удалить «${label}» из группы?`,
    header: 'Подтверждение',
    acceptLabel: 'Удалить',
    rejectLabel: 'Отмена',
    accept: () => {
      emit('remove-from-group', groupId, nmId);
    },
  });
}

function confirmDeleteGroup(groupId: string) {
  showConfirm({
    message: 'Удалить группу? Все товары будут разгруппированы.',
    header: 'Подтверждение',
    acceptLabel: 'Удалить',
    rejectLabel: 'Отмена',
    accept: () => {
      emit('delete-group', groupId);
    },
  });
}

function onRemoveFromGroup(groupId: string, nmId: number) {
  emit('remove-from-group', groupId, nmId);
}
</script>

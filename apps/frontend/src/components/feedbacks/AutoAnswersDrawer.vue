<template>
  <Drawer
    v-model:visible="visible"
    position="right"
    class="w-full sm:w-[32rem]"
    header="Автоответы"
  >
    <div class="space-y-4">
      <!-- Global toggle -->
      <div
        class="flex items-center justify-between p-3 bg-surface-50 dark:bg-surface-900 rounded-lg"
      >
        <div class="flex flex-col">
          <span class="text-sm font-medium">Автоответы для всех товаров</span>
          <span class="text-xs text-surface-500">
            {{ autoAnswerEnabled ? 'Включены' : 'Выключены' }}
          </span>
        </div>
        <ToggleSwitch
          :model-value="autoAnswerEnabled"
          :disabled="settingsLoading"
          @update:model-value="(val) => $emit('update:auto-answer', val)"
        />
      </div>

      <!-- Alert explaining the rules -->
      <Message severity="info" :closable="false" class="text-xs">
        Товар допускается к автоответам, если опубликовано ≥ 30 ответов или
        накоплено ≥ 20 правок. Пока условия не выполнены — автоответы для этого
        товара будут отключены. Это делается для того, чтобы сгенерированные
        ответы были наиболее корректными, спасибо за понимание ❤️
      </Message>

      <!-- Loading -->
      <LoadingSpinner v-if="goodsLoading || statsLoading" />

      <!-- Products list -->
      <div v-else class="space-y-1">
        <div
          v-for="product in productComplianceList"
          :key="product.nmId"
          class="flex items-center justify-between p-2 bg-surface-50 dark:bg-surface-900 rounded-lg"
        >
          <div class="flex items-center gap-3 min-w-0">
            <img
              v-if="product.thumbnail"
              :src="product.thumbnail"
              alt=""
              class="w-8 h-8 object-cover rounded shrink-0"
            />
            <div
              v-else
              class="w-8 h-8 bg-surface-200 dark:bg-surface-700 rounded flex items-center justify-center shrink-0"
            >
              <i class="pi pi-image text-surface-400 text-xs" />
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-sm font-medium truncate">{{
                product.vendorCode
              }}</span>
              <span class="text-xs text-surface-500"
                >nmID: {{ product.nmId }}</span
              >
            </div>
          </div>

          <div class="flex items-center gap-3 shrink-0">
            <!-- Stats -->
            <div class="flex items-center gap-1.5">
              <Badge
                :value="String(product.postedCount)"
                severity="success"
                class="text-xs"
                title="Опубликовано"
              />
              <Badge
                :value="String(product.rejectedCount)"
                :severity="product.rejectedCount >= 20 ? 'danger' : 'secondary'"
                class="text-xs"
                title="Правки"
              />
            </div>
            <!-- Compliance toggle -->
            <ToggleSwitch
              :model-value="product.autoAnswerEnabled"
              :disabled="!product.compliant"
              size="small"
              @update:model-value="
                (val) => $emit('toggle-product', product.nmId, val)
              "
            />
          </div>
        </div>
      </div>
    </div>
  </Drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Drawer from 'primevue/drawer';
import ToggleSwitch from 'primevue/toggleswitch';
import Badge from 'primevue/badge';
import Message from 'primevue/message';
import { LoadingSpinner } from '@/components/common';
import type { GoodsItem } from '@/api/feedbacks/types';

interface ProductCompliance {
  nmId: number;
  vendorCode: string;
  thumbnail: string | null;
  postedCount: number;
  rejectedCount: number;
  compliant: boolean;
  autoAnswerEnabled: boolean;
}

interface Props {
  visible: boolean;
  autoAnswerEnabled: boolean;
  settingsLoading: boolean;
  statsLoading: boolean;
  goodsLoading: boolean;
  goodsByCategory: Record<string, GoodsItem[]>;
  productStats: Record<number, { postedCount: number; rejectedCount: number }>;
  productSettings: { nmId: number; autoAnswerEnabled: boolean }[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'update:auto-answer', value: boolean): void;
  (e: 'toggle-product', nmId: number, enabled: boolean): void;
}>();

const visible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
});

const allGoods = computed<GoodsItem[]>(() => {
  const result: GoodsItem[] = [];
  for (const goods of Object.values(props.goodsByCategory)) {
    result.push(...goods);
  }
  return result;
});

const productComplianceList = computed<ProductCompliance[]>(() => {
  return allGoods.value.map((goods) => {
    const stat = props.productStats[goods.nmID];
    const postedCount = stat?.postedCount ?? 0;
    const rejectedCount = stat?.rejectedCount ?? 0;
    const compliant = postedCount >= 30 || rejectedCount >= 20;
    const setting = props.productSettings.find((s) => s.nmId === goods.nmID);
    const autoAnswerEnabled = setting?.autoAnswerEnabled ?? false;
    return {
      nmId: goods.nmID,
      vendorCode: goods.vendorCode,
      thumbnail: goods.thumbnail,
      postedCount,
      rejectedCount,
      compliant,
      autoAnswerEnabled: compliant ? autoAnswerEnabled : false,
    };
  });
});
</script>

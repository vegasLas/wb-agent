<template>
  <Card class="h-full">
    <template #content>
      <div class="space-y-4">
        <!-- Color -->
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-500 dark:text-gray-400">Цвет:</span>
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium">{{ itemFull.color?.color || '—' }}</span>
            <i class="pi pi-chevron-down text-xs text-gray-400" />
          </div>
        </div>

        <!-- Photos -->
        <div class="flex items-start justify-between gap-4">
          <span class="text-sm text-gray-500 dark:text-gray-400 pt-1">Фото:</span>
          <div
            v-if="photos.length > 0"
            class="flex gap-1 overflow-x-auto pb-1 max-w-[75%] justify-end"
          >
            <img
              v-for="(photo, idx) in photos.slice(0, 8)"
              :key="idx"
              :src="photo"
              class="w-12 h-12 rounded object-cover border border-gray-200 dark:border-gray-700 flex-shrink-0"
              alt=""
            >
            <button
              v-if="photos.length > 8"
              class="w-12 h-12 rounded border border-gray-200 dark:border-gray-700 flex items-center justify-center text-xs text-gray-500 flex-shrink-0"
            >
              +{{ photos.length - 8 }}
            </button>
          </div>
        </div>

        <!-- Subject -->
        <InfoRow label="Предмет">
          <span class="text-sm text-blue-600">{{ itemFull.subject?.name || '—' }}</span>
        </InfoRow>

        <!-- Similar -->
        <InfoRow label="Смотреть похожие">
          <span class="text-sm text-blue-600 cursor-pointer">Похожие товары</span>
        </InfoRow>

        <!-- Seller -->
        <InfoRow label="Продавец">
          <span class="text-sm text-blue-600">{{ itemFull.seller?.name || '—' }}</span>
        </InfoRow>

        <!-- Brand -->
        <InfoRow label="Бренд">
          <span class="text-sm text-blue-600">{{ itemFull.brand || '—' }}</span>
        </InfoRow>

        <!-- Revenue vs other colors -->
        <InfoRow label="Выручка относительно других цветов">
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium">{{ itemFull.color?.colors?.revenue || 0 }} %</span>
            <div class="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                class="h-full bg-blue-500 rounded-full"
                :style="{ width: `${Math.min(itemFull.color?.colors?.revenue || 0, 100)}%` }"
              />
            </div>
          </div>
        </InfoRow>

        <!-- Balance vs other colors -->
        <InfoRow label="Остаток относительно других цветов">
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium">{{ itemFull.color?.colors?.balance || 0 }} %</span>
            <div class="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                class="h-full bg-blue-500 rounded-full"
                :style="{ width: `${Math.min(itemFull.color?.colors?.balance || 0, 100)}%` }"
              />
            </div>
          </div>
        </InfoRow>

        <!-- Stock -->
        <InfoRow label="Наличие">
          <span class="text-sm font-medium">{{ formatNumber(itemFull.balance || 0) }}</span>
        </InfoRow>
        <InfoRow label="Наличие fbs">
          <span class="text-sm font-medium">{{ formatNumber(itemFull.stock?.fbs || 0) }}</span>
        </InfoRow>

        <!-- Prices -->
        <InfoRow label="Цена с WB кошельком">
          <span class="text-sm font-medium">{{ formatCurrency(itemFull.price?.wallet_price) }}</span>
        </InfoRow>
        <InfoRow label="Цена с СПП">
          <span class="text-sm font-medium">{{ formatCurrency(itemFull.price?.final_price) }}</span>
        </InfoRow>
        <InfoRow label="Цена">
          <span class="text-sm font-medium">{{ formatCurrency(itemFull.price?.price) }}</span>
        </InfoRow>

        <!-- Discount -->
        <InfoRow label="Скидка">
          <span class="text-sm font-medium">{{ itemFull.discount || 0 }} %</span>
        </InfoRow>

        <!-- Commission -->
        <InfoRow label="Комиссия FBO / FBS">
          <span class="text-sm font-medium">{{ itemFull.subject?.commission?.fbo || 0 }} % / {{ itemFull.subject?.commission?.fbs || 0 }} %</span>
        </InfoRow>

        <!-- Buyout -->
        <InfoRow label="Выкуп / С учетом возврата">
          <span class="text-sm font-medium">{{ formatPercent(purchasePercent) }} / {{ formatPercent(purchaseAfterReturnPercent) }}</span>
        </InfoRow>

        <!-- Country -->
        <InfoRow label="Страна">
          <span class="text-sm font-medium">{{ itemFull.country || '—' }}</span>
        </InfoRow>

        <!-- Updated -->
        <InfoRow label="Обновлено">
          <span class="text-sm font-medium">{{ formatDate(itemFull.updated) }}</span>
        </InfoRow>

        <!-- Rating -->
        <InfoRow label="Рейтинг">
          <div class="flex items-center gap-1">
            <span class="text-sm font-medium">{{ itemFull.rating || 0 }}</span>
            <i class="pi pi-star-fill text-amber-400 text-xs" />
          </div>
        </InfoRow>

        <!-- Comments -->
        <InfoRow label="Количество отзывов">
          <span class="text-sm font-medium">{{ formatNumber(itemFull.comments || 0) }}</span>
        </InfoRow>

        <!-- First date -->
        <InfoRow label="Обнаружено">
          <span class="text-sm font-medium">{{ formatDate(itemFull.first_date) }}</span>
        </InfoRow>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Card from 'primevue/card';
import InfoRow from './InfoRow.vue';
import type { MpstatsItemFull } from '@/api/mpstats/types';

interface Props {
  itemFull: MpstatsItemFull;
}

const props = defineProps<Props>();

const photos = computed(() => {
  const list = props.itemFull.photo?.list || [];
  return list.map((p) => p.t || p.f).filter(Boolean);
});

const purchasePercent = computed(() => props.itemFull.subject?.purchase?.purchase || 0);
const purchaseAfterReturnPercent = computed(() => props.itemFull.subject?.purchase?.purchase_after_return || 0);

function formatCurrency(value: number): string {
  return Math.round(value || 0).toLocaleString('ru-RU') + ' ₽';
}

function formatNumber(value: number): string {
  return (value || 0).toLocaleString('ru-RU');
}

function formatPercent(value: number): string {
  return (value || 0).toFixed(2).replace('.', ',') + ' %';
}

function formatDate(value: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ru-RU');
}
</script>

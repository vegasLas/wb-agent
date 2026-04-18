<template>
  <DataTable
    :value="cards"
    striped-rows
    class="p-datatable-sm"
    scrollable
    scroll-height="flex"
  >
    <Column header="" style="width: 4rem">
      <template #body="{ data }">
        <img
          :src="data.thumbnail || '/placeholder-product.png'"
          class="w-10 h-10 rounded object-cover"
          alt=""
        />
      </template>
    </Column>

    <Column field="title" header="Название">
      <template #body="{ data }">
        <div class="font-medium text-sm max-w-[200px] truncate">
          {{ data.title }}
        </div>
        <div class="text-xs text-gray-500">
          {{ data.vendorCode }}
        </div>
      </template>
    </Column>

    <Column field="nmID" header="Артикул" style="width: 6rem">
      <template #body="{ data }">
        <span class="text-xs font-mono">{{ data.nmID }}</span>
      </template>
    </Column>

    <Column field="currentPrice" header="Цена" style="width: 6rem">
      <template #body="{ data }">
        <span class="text-sm font-medium">
          {{ formatCurrency(data.currentPrice) }}
        </span>
      </template>
    </Column>

    <Column field="stocks" header="Остатки" style="width: 5rem">
      <template #body="{ data }">
        <span class="text-sm">{{ data.stocks }}</span>
      </template>
    </Column>

    <Column field="subject" header="Предмет" style="width: 8rem">
      <template #body="{ data }">
        <span class="text-xs text-gray-600 dark:text-gray-400 truncate">{{
          data.subject
        }}</span>
      </template>
    </Column>

    <Column field="feedbackRating" header="Рейтинг" style="width: 5rem">
      <template #body="{ data }">
        <span class="text-sm">{{ data.feedbackRating }}</span>
      </template>
    </Column>

    <Column header="Действия" style="width: 12rem">
      <template #body="{ data }">
        <div class="flex gap-2">
          <Button
            label="комиссия"
            severity="info"
            size="small"
            class="text-xs whitespace-nowrap"
            @click="$emit('show-commissions', data)"
          />
          <Button
            label="тарифы"
            severity="success"
            size="small"
            class="text-xs whitespace-nowrap"
            @click="$emit('show-tariffs', data)"
          />
        </div>
      </template>
    </Column>
  </DataTable>
</template>

<script setup lang="ts">
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import type { ContentCardTableItem } from '@/types';

defineProps<{
  cards: ContentCardTableItem[];
}>();

const emit = defineEmits<{
  'show-commissions': [card: ContentCardTableItem];
  'show-tariffs': [card: ContentCardTableItem];
}>();

function formatCurrency(value: number | null): string {
  if (value === undefined || value === null) return '-';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
</script>

<template>
  <DataTable
    :value="adverts"
    striped-rows
    class="p-datatable-sm"
    :paginator="totalPages > 1"
    :rows="pageSize"
    :total-records="totalCount"
    :lazy="true"
    :first="(currentPage - 1) * pageSize"
    @page="onPageChange"
  >
    <Column header="" style="width: 6rem">
      <template #body="{ data }">
        <Button
          label="Кластеры"
          severity="help"
          size="small"
          class="text-xs whitespace-nowrap"
          @click="$emit('show-info', data)"
        />
      </template>
    </Column>

    <Column field="id" header="ID" style="width: 5rem">
      <template #body="{ data }">
        <span class="text-xs font-mono">{{ data.id }}</span>
      </template>
    </Column>

    <Column field="campaign_name" header="Название">
      <template #body="{ data }">
        <div class="font-medium text-sm">{{ data.campaign_name }}</div>
        <div class="text-xs text-gray-500">
          {{ formatDate(data.create_date) }}
        </div>
      </template>
    </Column>

    <Column field="status_id" header="Статус" style="width: 8rem">
      <template #body="{ data }">
        <Tag
          :value="getStatusLabel(data.status_id)"
          :severity="getStatusSeverity(data.status_id)"
          class="text-xs"
        />
      </template>
    </Column>

    <Column field="products_count" header="Товаров" style="width: 6rem">
      <template #body="{ data }">
        <span class="text-sm">{{ data.products_count }}</span>
      </template>
    </Column>

    <Column field="budget" header="Бюджет" style="width: 7rem">
      <template #body="{ data }">
        <span class="text-sm font-medium">
          {{ formatCurrency(data.budget) }}
        </span>
      </template>
    </Column>

    <Column field="autofill" header="Автозаполнение" style="width: 8rem">
      <template #body="{ data }">
        <Tag
          :value="data.autofill?.is_enable ? 'Вкл' : 'Выкл'"
          :severity="data.autofill?.is_enable ? 'success' : 'secondary'"
          class="text-xs"
        />
      </template>
    </Column>
  </DataTable>
</template>

<script setup lang="ts">
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import type { AdvertItem } from '@/stores/adverts';

defineProps<{
  adverts: AdvertItem[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
}>();

const emit = defineEmits<{
  'show-info': [advert: AdvertItem];
  'page-change': [page: number, rows: number];
}>();

// Status mapping
const statusMap: Record<number, { label: string; severity: string }> = {
  4: { label: 'Готова', severity: 'success' },
  5: { label: 'Завершена', severity: 'secondary' },
  6: { label: 'Отклонена', severity: 'danger' },
  7: { label: 'Ошибка', severity: 'danger' },
  8: { label: 'Ожидает', severity: 'warning' },
  9: { label: 'Активна', severity: 'info' },
  10: { label: 'Приостановлена', severity: 'warning' },
  11: { label: 'Приостановлена', severity: 'warn' },
};

function getStatusLabel(statusId: number): string {
  return statusMap[statusId]?.label || `Статус ${statusId}`;
}

function getStatusSeverity(statusId: number): string {
  return statusMap[statusId]?.severity || 'secondary';
}

function onPageChange(event: { first: number; rows: number }) {
  const page = Math.floor(event.first / event.rows) + 1;
  emit('page-change', page, event.rows);
}

// Formatting functions
function formatDate(dateString: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatCurrency(value: number): string {
  if (value === undefined || value === null) return '-';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
</script>

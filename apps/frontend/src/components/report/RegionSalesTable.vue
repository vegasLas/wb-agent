<template>
  <DataTable
    v-model:expanded-rows="expandedRows"
    :value="rows"
    striped-rows
    class="p-datatable-sm"
    data-key="fedOkr"
  >
    <Column
      expander
      style="width: 3rem"
    />

    <Column
      field="country"
      header="Страна"
      style="width: 8rem"
    >
      <template #body="{ data }">
        <span class="text-sm">{{ data.country }}</span>
      </template>
    </Column>

    <Column
      field="fedOkr"
      header="Фед. округ"
    >
      <template #body="{ data }">
        <span class="font-medium text-sm">{{ data.fedOkr }}</span>
      </template>
    </Column>

    <Column
      field="qty"
      header="Выкупили, шт."
      style="width: 8rem"
    >
      <template #body="{ data }">
        <span class="text-sm font-medium">{{ formatNumber(data.qty) }}</span>
      </template>
    </Column>

    <Column
      field="reward"
      header="К перечислению, руб."
      style="width: 10rem"
    >
      <template #body="{ data }">
        <span class="text-sm font-medium">{{ formatCurrency(data.reward) }}</span>
      </template>
    </Column>

    <Column
      field="share"
      header="Доля, %"
      style="width: 6rem"
    >
      <template #body="{ data }">
        <span class="text-sm">{{ data.share.toFixed(2) }}</span>
      </template>
    </Column>

    <template #expansion="{ data: rowData }">
      <div class="pl-4 py-2">
        <DataTable
          v-model:expanded-rows="expandedOblasts[rowData.fedOkr]"
          :value="rowData.oblasts"
          class="p-datatable-sm mb-2"
          data-key="oblast"
        >
          <Column
            expander
            style="width: 3rem"
          />

          <Column
            field="oblast"
            header="Область"
          >
            <template #body="{ data }">
              <span class="font-medium text-sm">{{ data.oblast }}</span>
            </template>
          </Column>

          <Column
            field="qty"
            header="Выкупили, шт."
            style="width: 8rem"
          >
            <template #body="{ data }">
              <span class="text-sm">{{ formatNumber(data.qty) }}</span>
            </template>
          </Column>

          <Column
            field="reward"
            header="К перечислению, руб."
            style="width: 10rem"
          >
            <template #body="{ data }">
              <span class="text-sm">{{ formatCurrency(data.reward) }}</span>
            </template>
          </Column>

          <Column
            field="share"
            header="Доля, %"
            style="width: 6rem"
          >
            <template #body="{ data }">
              <span class="text-sm">{{ data.share.toFixed(2) }}</span>
            </template>
          </Column>

          <template #expansion="{ data: oblastData }">
            <div class="pl-4 py-2">
              <DataTable
                :value="oblastData.cities"
                class="p-datatable-sm"
                data-key="city"
              >
                <Column
                  field="city"
                  header="Город"
                >
                  <template #body="{ data }">
                    <span class="text-sm">{{ data.city }}</span>
                  </template>
                </Column>

                <Column
                  field="qty"
                  header="Выкупили, шт."
                  style="width: 8rem"
                >
                  <template #body="{ data }">
                    <span class="text-sm">{{ formatNumber(data.qty) }}</span>
                  </template>
                </Column>

                <Column
                  field="reward"
                  header="К перечислению, руб."
                  style="width: 10rem"
                >
                  <template #body="{ data }">
                    <span class="text-sm">{{ formatCurrency(data.reward) }}</span>
                  </template>
                </Column>

                <Column
                  field="share"
                  header="Доля, %"
                  style="width: 6rem"
                >
                  <template #body="{ data }">
                    <span class="text-sm">{{ data.share.toFixed(2) }}</span>
                  </template>
                </Column>
              </DataTable>
            </div>
          </template>
        </DataTable>
      </div>
    </template>
  </DataTable>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import type { RegionSaleRow } from '@/types';

defineProps<{
  rows: RegionSaleRow[];
}>();

const expandedRows = ref<Record<string, boolean>>({});
const expandedOblasts = ref<Record<string, Record<string, boolean>>>({});

function formatNumber(value: number): string {
  if (value === undefined || value === null) return '-';
  return new Intl.NumberFormat('ru-RU').format(value);
}

function formatCurrency(value: number): string {
  if (value === undefined || value === null) return '-';
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
</script>

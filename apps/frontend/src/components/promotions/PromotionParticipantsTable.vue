<template>
  <DataTable
    v-model:selection="selectedItems"
    :value="excelItems"
    size="small"
    class="p-datatable-sm"
    scrollable
    scroll-height="flex"
    :paginator="excelItems.length > 10"
    :rows="10"
    :rows-per-page-options="[10, 25, 50, 100]"
    striped-rows
    removable-sort
    :selection-mode="canEdit ? 'multiple' : undefined"
    data-key="vendorCode"
  >
    <!-- Selection Checkbox -->
    <Column
      v-if="canEdit"
      selection-mode="multiple"
      header-style="width: 3rem"
    />

    <!-- Vendor Code -->
    <Column
      v-if="isVisible('vendorCode')"
      field="vendorCode"
      header="Артикул"
      sortable
      style="min-width: 130px"
    >
      <template #body="slotProps">
        <span class="text-sm font-medium text-gray-900 dark:text-gray-100">
          {{ slotProps.data.vendorCode }}
        </span>
      </template>
    </Column>

    <!-- Product Name -->
    <Column
      v-if="isVisible('name')"
      field="name"
      header="Наименование"
      sortable
      style="min-width: 250px"
    >
      <template #body="slotProps">
        <span class="text-sm text-gray-900 dark:text-gray-100 line-clamp-2">
          {{ slotProps.data.name }}
        </span>
      </template>
    </Column>

    <!-- Brand -->
    <Column
      v-if="isVisible('brand')"
      field="brand"
      header="Бренд"
      sortable
      style="min-width: 100px"
    >
      <template #body="slotProps">
        <span class="text-sm text-gray-600 dark:text-gray-400">
          {{ slotProps.data.brand }}
        </span>
      </template>
    </Column>

    <!-- Subject -->
    <Column
      v-if="isVisible('subject')"
      field="subject"
      header="Предмет"
      sortable
      style="min-width: 120px"
    >
      <template #body="slotProps">
        <span class="text-sm text-gray-600 dark:text-gray-400">
          {{ slotProps.data.subject }}
        </span>
      </template>
    </Column>

    <!-- WB Article -->
    <Column
      v-if="isVisible('wbCode')"
      field="wbCode"
      header="Арт. WB"
      sortable
      style="min-width: 100px"
    >
      <template #body="slotProps">
        <span class="text-sm text-gray-500 dark:text-gray-400 font-mono">
          {{ slotProps.data.wbCode }}
        </span>
      </template>
    </Column>

    <!-- Current Price -->
    <Column
      v-if="isVisible('currentPrice')"
      field="currentPrice"
      header="Тек. цена"
      sortable
      style="min-width: 100px"
    >
      <template #body="slotProps">
        <span class="text-sm text-gray-900 dark:text-gray-100">
          {{ formatPrice(slotProps.data.currentPrice) }}
        </span>
      </template>
    </Column>

    <!-- Promo Price -->
    <Column
      v-if="isVisible('promoPrice')"
      field="promoPrice"
      header="Цена в акции"
      sortable
      style="min-width: 100px"
    >
      <template #body="slotProps">
        <span class="text-sm font-medium text-orange-600 dark:text-orange-400">
          {{ formatPrice(slotProps.data.promoPrice) }}
        </span>
      </template>
    </Column>

    <!-- Current Discount -->
    <Column
      v-if="isVisible('currentDiscount')"
      field="currentDiscount"
      header="Тек. скидка"
      sortable
      style="min-width: 100px"
    >
      <template #body="slotProps">
        <span class="text-sm text-gray-600 dark:text-gray-400">
          {{ slotProps.data.currentDiscount }}%
        </span>
      </template>
    </Column>

    <!-- Uploaded Discount -->
    <Column
      v-if="isVisible('uploadedDiscount')"
      field="uploadedDiscount"
      header="Загр. скидка"
      sortable
      style="min-width: 100px"
    >
      <template #body="slotProps">
        <span
          class="text-sm font-medium"
          :class="getDiscountClass(slotProps.data)"
        >
          {{ slotProps.data.uploadedDiscount }}%
        </span>
      </template>
    </Column>

    <!-- Already Participating -->
    <Column
      v-if="isVisible('inPromo')"
      field="inPromo"
      header="В акции"
      sortable
      style="min-width: 90px"
    >
      <template #body="slotProps">
        <span
          class="text-sm"
          :class="
            slotProps.data.inPromo === 'Да'
              ? 'text-green-600 dark:text-green-400 font-medium'
              : 'text-gray-500 dark:text-gray-400'
          "
        >
          {{ slotProps.data.inPromo }}
        </span>
      </template>
    </Column>

    <!-- Stock WB -->
    <Column
      v-if="isVisible('wbStock')"
      field="wbStock"
      header="Остаток WB"
      sortable
      style="min-width: 100px"
    >
      <template #body="slotProps">
        <span
          class="text-sm"
          :class="getStockClass(slotProps.data.wbStock)"
        >
          {{ slotProps.data.wbStock }}
        </span>
      </template>
    </Column>

    <!-- Stock Seller -->
    <Column
      v-if="isVisible('sellerStock')"
      field="sellerStock"
      header="Остаток продавца"
      sortable
      style="min-width: 120px"
    >
      <template #body="slotProps">
        <span
          class="text-sm"
          :class="getStockClass(slotProps.data.sellerStock)"
        >
          {{ slotProps.data.sellerStock }}
        </span>
      </template>
    </Column>

    <!-- Turnover -->
    <Column
      v-if="isVisible('turnover')"
      field="turnover"
      header="Оборачиваемость"
      sortable
      style="min-width: 120px"
    >
      <template #body="slotProps">
        <span
          class="text-sm"
          :class="getTurnoverClass(slotProps.data.turnover)"
        >
          {{ Math.round(slotProps.data.turnover) }} дн.
        </span>
      </template>
    </Column>

    <!-- Days on Site -->
    <Column
      v-if="isVisible('daysOnSite')"
      field="daysOnSite"
      header="Дней на сайте"
      sortable
      style="min-width: 110px"
    >
      <template #body="slotProps">
        <span class="text-sm text-gray-600 dark:text-gray-400">
          {{ Math.round(slotProps.data.daysOnSite) }}
        </span>
      </template>
    </Column>
  </DataTable>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import type { PromotionExcelItem } from '@/types';
import { usePromotionTableDisplay } from '@/composables/promotions/tableDisplay';

interface Props {
  excelItems: PromotionExcelItem[];
  canEdit: boolean;
  visibleFields: string[];
  modelValue: PromotionExcelItem[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: PromotionExcelItem[]];
}>();

const selectedItems = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const { formatPrice, getDiscountClass, getStockClass, getTurnoverClass } =
  usePromotionTableDisplay();

function isVisible(field: string): boolean {
  return props.visibleFields.includes(field);
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>

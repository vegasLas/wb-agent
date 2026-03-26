<template>
  <div v-if="tempSelectedAccount">
    <div class="flex items-center justify-between mb-3">
      <h4 class="text-lg font-medium">Выберите поставщика</h4>
      <Button
        size="small"
        outlined
        :loading="refreshingSuppliers"
        @click="$emit('refresh')"
        aria-label="Обновить список поставщиков"
      >
        <i class="pi pi-refresh" />
      </Button>
    </div>

    <div
      v-if="tempSelectedAccount.suppliers.length"
      class="space-y-2 max-h-48 overflow-y-auto"
    >
      <SupplierCard
        v-for="supplier in tempSelectedAccount.suppliers"
        :key="supplier.supplierId"
        :supplier="supplier"
        :is-selected="tempSelectedSupplierId === supplier.supplierId"
        @select="$emit('select-supplier', $event)"
      />
    </div>

    <EmptySupplierState
      v-else
      :refreshing-suppliers="refreshingSuppliers"
      @refresh="$emit('refresh')"
    />
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import SupplierCard from './SupplierCard.vue';
import EmptySupplierState from './EmptySupplierState.vue';
import type { Account } from '../../stores/user';

interface Props {
  tempSelectedAccount: Account | null;
  tempSelectedSupplierId: string | null;
  refreshingSuppliers: boolean;
}

defineProps<Props>();
defineEmits<{
  'select-supplier': [supplierId: string];
  refresh: [];
}>();
</script>

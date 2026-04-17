<template>
  <Dialog
    :visible="visible"
    :header="title"
    :style="{ width: '95vw', maxWidth: '1200px' }"
    :modal="true"
    :closable="true"
    @update:visible="$emit('update:visible', $event)"
    @hide="$emit('hide')"
  >
    <div class="space-y-4">
      <!-- Error message -->
      <ErrorMessage
        v-if="error"
        :message="error"
      />

      <!-- Loading state -->
      <LoadingSpinner v-if="loading" />

      <!-- Content -->
      <template v-else-if="hasPresetInfo">
        <!-- Detailed table -->
        <PresetInfoTable
          :items="presetInfo?.items || []"
          :total-count="presetTotalCount"
          :current-page="presetCurrentPage"
          :page-size="presetPageSize"
          :total-pages="presetTotalPages"
          :active-filter="activeFilter"
          @page-change="$emit('page-change', $event)"
          @filter-state-change="$emit('filter-state-change', $event)"
        />
      </template>

      <!-- Empty state -->
      <EmptyState
        v-else-if="!loading && !error"
        icon="pi-chart-bar"
        message="Нет данных о статистике"
      />
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import Dialog from 'primevue/dialog';
import PresetInfoTable from '../table/PresetInfoTable.vue';
import ErrorMessage from '../common/ErrorMessage.vue';
import LoadingSpinner from '../common/LoadingSpinner.vue';
import EmptyState from '../common/EmptyState.vue';
import type { PresetInfo } from '@/stores/adverts';

defineProps<{
  visible: boolean;
  title: string;
  loading: boolean;
  error: string | null;
  hasPresetInfo: boolean;
  presetInfo: PresetInfo | null;
  presetTotalCount: number;
  presetCurrentPage: number;
  presetPageSize: number;
  presetTotalPages: number;
  activeFilter?: number;
}>();

defineEmits<{
  'update:visible': [value: boolean];
  'page-change': [page: number, rows: number];
  'filter-state-change': [state: number];
  'hide': [];
}>();
</script>

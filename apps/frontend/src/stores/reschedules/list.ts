import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { useRescheduleStore } from './index';
import type { AutobookingReschedule, RescheduleStatus } from '../../types';

export interface RescheduleFilters {
  status: RescheduleStatus[];
  supplyType: string[];
  warehouseIds: number[];
  supplierIds: string[];
  dateFrom?: string;
  dateTo?: string;
}

export type RescheduleSortBy = 'createdAt' | 'updatedAt' | 'supplyId' | 'supplierId';
export type RescheduleSortOrder = 'asc' | 'desc';

export const useRescheduleListStore = defineStore('rescheduleList', () => {
  const rescheduleStore = useRescheduleStore();

  // Filter and sorting state - start with all statuses to show everything initially
  const filters = ref<RescheduleFilters>({
    status: [], // Show all statuses by default
    supplyType: [],
    warehouseIds: [],
    supplierIds: [],
  });

  // Selected status for stats cards (like autobooking)
  const selectedStatus = ref<RescheduleStatus>('ACTIVE');

  const sortBy = ref<RescheduleSortBy>('createdAt');
  const sortOrder = ref<RescheduleSortOrder>('desc');
  const searchQuery = ref('');

  // View state
  const selectedReschedules = ref<Set<string>>(new Set());
  const showFilters = ref(false);
  const viewMode = ref<'grid' | 'list'>('grid');

  // Status counts for stats cards (computed from reschedule store)
  const statusCounts = computed(() => {
    return {
      ACTIVE: rescheduleStore.counts['ACTIVE'] || 0,
      COMPLETED: rescheduleStore.counts['COMPLETED'] || 0,
      ARCHIVED: rescheduleStore.counts['ARCHIVED'] || 0,
    };
  });

  // Computed filtered and sorted reschedules
  const filteredReschedules = computed(() => {
    let result = [...rescheduleStore.reschedules];

    // Apply status filter
    if (filters.value.status.length > 0) {
      result = result.filter((reschedule) =>
        filters.value.status.includes(reschedule.status as RescheduleStatus),
      );
    }

    // Apply supply type filter
    if (filters.value.supplyType.length > 0) {
      result = result.filter((reschedule) =>
        filters.value.supplyType.includes(reschedule.supplyType),
      );
    }

    // Apply warehouse filter
    if (filters.value.warehouseIds.length > 0) {
      result = result.filter((reschedule) =>
        filters.value.warehouseIds.includes(reschedule.warehouseId),
      );
    }

    // Apply supplier filter
    if (filters.value.supplierIds.length > 0) {
      result = result.filter((reschedule) =>
        filters.value.supplierIds.includes(reschedule.supplierId),
      );
    }

    // Apply date range filter
    if (filters.value.dateFrom) {
      result = result.filter(
        (reschedule) => reschedule.createdAt >= filters.value.dateFrom!,
      );
    }

    if (filters.value.dateTo) {
      result = result.filter(
        (reschedule) => reschedule.createdAt <= filters.value.dateTo!,
      );
    }

    // Apply search query
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter(
        (reschedule) =>
          reschedule.supplyId.toString().toLowerCase().includes(query) ||
          reschedule.supplierId.toLowerCase().includes(query),
      );
    }

    // Sort results
    result.sort((a, b) => {
      let aValue: any = a[sortBy.value];
      let bValue: any = b[sortBy.value];

      // Handle different data types
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        // For non-date strings, use case-insensitive comparison
        if (sortBy.value !== 'createdAt' && sortBy.value !== 'updatedAt') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }
        // Date strings (ISO format) sort correctly as-is
      }
      // Numbers compare directly without modification

      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortOrder.value === 'desc' ? -comparison : comparison;
    });

    return result;
  });

  // Statistics
  const rescheduleStats = computed(() => {
    const all = rescheduleStore.reschedules;
    return {
      total: all.length,
      active: all.filter((r) => r.status === 'ACTIVE').length,
      completed: all.filter((r) => r.status === 'COMPLETED').length,
      archived: all.filter((r) => r.status === 'ARCHIVED').length,
      filtered: filteredReschedules.value.length,
      selected: selectedReschedules.value.size,
    };
  });

  // Unique values for filter dropdowns
  const availableSupplyTypes = computed(() => {
    const types = new Set(rescheduleStore.reschedules.map((r) => r.supplyType));
    return Array.from(types);
  });

  const availableWarehouseIds = computed(() => {
    const ids = new Set(rescheduleStore.reschedules.map((r) => r.warehouseId));
    return Array.from(ids);
  });

  const availableSupplierIds = computed(() => {
    const ids = new Set(rescheduleStore.reschedules.map((r) => r.supplierId));
    return Array.from(ids);
  });

  // Filter actions
  function updateFilter<K extends keyof RescheduleFilters>(
    key: K,
    value: RescheduleFilters[K],
  ) {
    filters.value[key] = value;
  }

  function clearFilters() {
    filters.value = {
      status: [], // Clear all filters
      supplyType: [],
      warehouseIds: [],
      supplierIds: [],
    };
    searchQuery.value = '';
  }

  // Set default status filter after data loads
  function setDefaultStatusFilter() {
    if (
      rescheduleStore.reschedules.length > 0 &&
      filters.value.status.length === 0
    ) {
      // Set ACTIVE as default only if we have reschedules and no filter set
      filters.value.status = ['ACTIVE'];
    }
  }

  function toggleStatusFilter(status: RescheduleStatus) {
    const currentStatuses = [...filters.value.status];
    const index = currentStatuses.indexOf(status);

    if (index > -1) {
      currentStatuses.splice(index, 1);
    } else {
      currentStatuses.push(status);
    }

    filters.value.status = currentStatuses;
  }

  // Sorting actions
  function updateSort(field: RescheduleSortBy, order?: RescheduleSortOrder) {
    sortBy.value = field;
    if (order) {
      sortOrder.value = order;
    } else {
      // Toggle order if same field
      sortOrder.value =
        sortBy.value === field && sortOrder.value === 'asc' ? 'desc' : 'asc';
    }
  }

  // Selection actions
  function selectReschedule(id: string) {
    selectedReschedules.value.add(id);
  }

  function deselectReschedule(id: string) {
    selectedReschedules.value.delete(id);
  }

  function toggleRescheduleSelection(id: string) {
    if (selectedReschedules.value.has(id)) {
      deselectReschedule(id);
    } else {
      selectReschedule(id);
    }
  }

  function selectAllVisible() {
    filteredReschedules.value.forEach((reschedule) => {
      selectedReschedules.value.add(reschedule.id);
    });
  }

  function clearSelection() {
    selectedReschedules.value.clear();
  }

  function isSelected(id: string): boolean {
    return selectedReschedules.value.has(id);
  }

  // Bulk actions
  async function deleteSelectedReschedules() {
    const ids = Array.from(selectedReschedules.value);
    const promises = ids.map((id) => rescheduleStore.deleteReschedule(id));

    try {
      await Promise.all(promises);
      clearSelection();
    } catch (error) {
      console.error('Failed to delete selected reschedules:', error);
      throw error;
    }
  }

  // View actions
  function toggleFilters() {
    showFilters.value = !showFilters.value;
  }

  function setViewMode(mode: 'grid' | 'list') {
    viewMode.value = mode;
  }

  return {
    // State
    filters: readonly(filters),
    sortBy: readonly(sortBy),
    sortOrder: readonly(sortOrder),
    searchQuery,
    selectedReschedules: readonly(selectedReschedules),
    showFilters,
    viewMode,
    selectedStatus,

    // Computed
    filteredReschedules,
    rescheduleStats,
    statusCounts,
    availableSupplyTypes,
    availableWarehouseIds,
    availableSupplierIds,

    // Actions
    updateFilter,
    clearFilters,
    setDefaultStatusFilter,
    toggleStatusFilter,
    updateSort,
    selectReschedule,
    deselectReschedule,
    toggleRescheduleSelection,
    selectAllVisible,
    clearSelection,
    isSelected,
    deleteSelectedReschedules,
    toggleFilters,
    setViewMode,
  };
});

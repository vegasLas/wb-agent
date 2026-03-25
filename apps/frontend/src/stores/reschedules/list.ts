import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { useReschedulesStore } from './index';
import type { Reschedule } from '../../types';

export const useRescheduleListStore = defineStore('rescheduleList', () => {
  const reschedulesStore = useReschedulesStore();

  // State
  const searchQuery = ref('');
  const selectedStatus = ref<'all' | 'pending' | 'completed' | 'failed'>('all');
  const sortBy = ref<'date' | 'created'>('created');
  const sortOrder = ref<'asc' | 'desc'>('desc');

  // Getters
  const filteredReschedules = computed(() => {
    let filtered = reschedulesStore.reschedules;

    // Filter by status
    if (selectedStatus.value !== 'all') {
      filtered = filtered.filter((r) => r.status === selectedStatus.value);
    }

    // Filter by search query
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter((r) =>
        r.supplyId.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      if (sortBy.value === 'date') {
        comparison = new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
      } else {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      
      return sortOrder.value === 'asc' ? comparison : -comparison;
    });

    return filtered;
  });

  const countsByStatus = computed(() => {
    return {
      all: reschedulesStore.reschedules.length,
      pending: reschedulesStore.pendingReschedules.length,
      completed: reschedulesStore.completedReschedules.length,
      failed: reschedulesStore.failedReschedules.length,
    };
  });

  // Actions
  function setSearchQuery(query: string) {
    searchQuery.value = query;
  }

  function setSelectedStatus(status: 'all' | 'pending' | 'completed' | 'failed') {
    selectedStatus.value = status;
  }

  function setSortBy(sort: 'date' | 'created') {
    if (sortBy.value === sort) {
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy.value = sort;
      sortOrder.value = 'desc';
    }
  }

  return {
    // State
    searchQuery: readonly(searchQuery),
    selectedStatus: readonly(selectedStatus),
    sortBy: readonly(sortBy),
    sortOrder: readonly(sortOrder),

    // Getters
    filteredReschedules,
    countsByStatus,

    // Actions
    setSearchQuery,
    setSelectedStatus,
    setSortBy,
  };
});

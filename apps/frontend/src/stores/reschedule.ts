import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { api } from '../api';
import { useUserStore } from './user';

export interface Reschedule {
  id: string;
  userId: number;
  supplierId: string;
  warehouseId: number;
  dateType: string;
  startDate: string | null;
  endDate: string | null;
  customDates: string[];
  completedDates: string[];
  maxCoefficient: number;
  status: string;
  supplyType: string;
  supplyId: string;
  createdAt: string;
  updatedAt: string;
  currentDate: string;
}

interface RescheduleCounts {
  [key: string]: number;
}

export const useRescheduleStore = defineStore('reschedule', () => {
  const userStore = useUserStore();
  const reschedules = ref<Reschedule[]>([]);
  const counts = ref<RescheduleCounts>({});
  const currentPage = ref(1);
  const hasNextPage = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Selected reschedule for update form
  const selectedReschedule = ref<Reschedule | null>(null);

  // Fetch reschedules with pagination
  async function fetchReschedules(page: number = 1) {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.get('/reschedules', { params: { page } });
      if (response.data.success) {
        reschedules.value = response.data.items || [];
        counts.value = response.data.counts || {};
        currentPage.value = response.data.currentPage || 1;
        hasNextPage.value = !!response.data.nextPage;
      } else {
        console.warn('[RescheduleStore] API returned success: false');
        error.value = 'API returned unsuccessful response';
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch reschedules';
      error.value = errorMessage;
      console.error('Failed to fetch reschedules:', err);
    } finally {
      loading.value = false;
    }
  }

  // Get reschedule by ID
  function getRescheduleById(id: string) {
    return reschedules.value.find((reschedule) => reschedule.id === id);
  }

  // Set selected reschedule for update form
  function setSelectedReschedule(reschedule: Reschedule) {
    selectedReschedule.value = reschedule;
  }

  // Filter reschedules by status
  const activeReschedules = computed(() =>
    reschedules.value.filter((reschedule) => reschedule.status === 'ACTIVE'),
  );

  const completedReschedules = computed(() =>
    reschedules.value.filter((reschedule) => reschedule.status === 'COMPLETED'),
  );

  const archivedReschedules = computed(() =>
    reschedules.value.filter((reschedule) => reschedule.status === 'ARCHIVED'),
  );

  return {
    reschedules: readonly(reschedules),
    counts: readonly(counts),
    currentPage: readonly(currentPage),
    hasNextPage: readonly(hasNextPage),
    loading: readonly(loading),
    error: readonly(error),
    selectedReschedule: readonly(selectedReschedule),
    activeReschedules,
    completedReschedules,
    archivedReschedules,
    fetchReschedules,
    getRescheduleById,
    setSelectedReschedule,
  };
});

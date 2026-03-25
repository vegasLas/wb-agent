import { ref, computed, readonly } from 'vue';
import { defineStore } from 'pinia';
import { reschedulesAPI } from '../../api';
import { useUserStore } from '../user';
import { doAction } from '../../utils/doAction';
import type { AutobookingReschedule, CreateAutobookingRescheduleRequest, UpdateAutobookingRescheduleRequest, Supply } from '../../types';

export * from './types';

export const useRescheduleStore = defineStore('reschedule', () => {
  const userStore = useUserStore();

  // State
  const reschedules = ref<AutobookingReschedule[]>([]);
  const counts = ref<Record<string, number>>({});
  const currentPage = ref(1);
  const hasNextPage = ref(false);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Selected reschedule for update form
  const selectedReschedule = ref<AutobookingReschedule | null>(null);

  // Supplies state (moved from form store)
  const supplies = ref<Supply[]>([]);
  const loadingSupplies = ref(false);
  const suppliesError = ref<string | null>(null);

  // Computed
  const activeReschedules = computed(() =>
    reschedules.value.filter((reschedule) => reschedule.status === 'ACTIVE'),
  );

  const completedReschedules = computed(() =>
    reschedules.value.filter((reschedule) => reschedule.status === 'COMPLETED'),
  );

  const archivedReschedules = computed(() =>
    reschedules.value.filter((reschedule) => reschedule.status === 'ARCHIVED'),
  );

  // Available supplies filtered for rescheduling (statusId 1 and 3 only)
  const availableSupplies = computed(() =>
    supplies.value.filter(
      (supply) => supply.statusId === 1 || supply.statusId === 3,
    ),
  );

  // Actions
  async function fetchReschedules(page: number = 1) {
    loading.value = true;
    error.value = null;

    try {
      const response = await reschedulesAPI.fetchReschedules(page);
      if (response.success) {
        reschedules.value = response.items || [];
        counts.value = response.counts || {};
        currentPage.value = response.currentPage || 1;
        hasNextPage.value = !!response.nextPage;
      } else {
        console.warn('[RescheduleStore] API returned success: false');
        error.value = 'API returned unsuccessful response';
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch reschedules';
      error.value = errorMessage;

      console.error(
        'Ошибка загрузки: Не удалось загрузить перепланирования. Попробуйте обновить страницу.',
      );
    } finally {
      loading.value = false;
    }
  }

  async function createReschedule(data: CreateAutobookingRescheduleRequest) {
    loading.value = true;
    error.value = null;

    try {
      const response = await reschedulesAPI.createReschedule(data);
      if (response) {
        await fetchReschedules(currentPage.value); // Refresh list
        // Decrease user's autobooking count as 1 credit was consumed
        userStore.decreaseAutobookingCount();
        console.log('Перепланирование создано: Автоматическое перепланирование успешно настроено');
        return response;
      }
      throw new Error('Failed to create reschedule');
    } catch (err: any) {
      error.value = err.message || 'Failed to create reschedule';
      console.error('Failed to create reschedule:', err);
      console.error(err.message || 'Не удалось создать перепланирование');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateReschedule(data: UpdateAutobookingRescheduleRequest) {
    loading.value = true;
    error.value = null;

    try {
      const response = await reschedulesAPI.updateReschedule(data);
      if (response.success) {
        await fetchReschedules(currentPage.value); // Refresh list
        return response.data;
      }
      throw new Error('Failed to update reschedule');
    } catch (err: any) {
      error.value = err.message || 'Failed to update reschedule';
      console.error('Failed to update reschedule:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function deleteReschedule(id: string) {
    // Show confirmation dialog
    const confirmed = await doAction({
      title: 'Удаление перепланирования',
      message: 'Вы уверены, что хотите удалить это перепланирование?',
      buttonText: 'Удалить',
    });

    if (!confirmed) {
      return false;
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await reschedulesAPI.deleteReschedule(id);
      if (response.success) {
        await fetchReschedules(currentPage.value); // Refresh list
        // Increase user's autobooking count as 1 credit was returned
        userStore.increaseAutobookingCount();
        console.log('Успешно удалено:', response.message || 'Перепланирование успешно удалено');
        return true;
      }
      throw new Error('Failed to delete reschedule');
    } catch (err: any) {
      error.value = err.message || 'Failed to delete reschedule';
      console.error('Failed to delete reschedule:', err);
      console.error(err.message || 'Не удалось удалить перепланирование');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function archiveReschedule(id: string) {
    // Show confirmation dialog
    const confirmed = await doAction({
      title: 'Архивирование перепланирования',
      message: 'Вы уверены, что хотите архивировать это перепланирование?',
      buttonText: 'Архивировать',
    });

    if (!confirmed) {
      return false;
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await reschedulesAPI.updateReschedule({
        id,
        status: 'ARCHIVED',
      });
      if (response.success) {
        await fetchReschedules(currentPage.value); // Refresh list
        console.log('Успешно архивировано: Перепланирование перемещено в архив');
        return response.data;
      }
      throw new Error('Failed to archive reschedule');
    } catch (err: any) {
      error.value = err.message || 'Failed to archive reschedule';
      console.error('Failed to archive reschedule:', err);
      console.error(err.message || 'Не удалось архивировать перепланирование');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function activateReschedule(id: string) {
    // Show confirmation dialog
    const confirmed = await doAction({
      title: 'Активация перепланирования',
      message: 'Вы уверены, что хотите активировать это перепланирование?',
      buttonText: 'Активировать',
    });

    if (!confirmed) {
      return false;
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await reschedulesAPI.updateReschedule({
        id,
        status: 'ACTIVE',
      });
      if (response.success) {
        await fetchReschedules(currentPage.value); // Refresh list
        console.log('Успешно активировано: Перепланирование активировано и будет выполнено');
        return response.data;
      }
      throw new Error('Failed to activate reschedule');
    } catch (err: any) {
      error.value = err.message || 'Failed to activate reschedule';
      console.error('Failed to activate reschedule:', err);
      console.error(err.message || 'Не удалось активировать перепланирование');
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function loadNextPage() {
    if (hasNextPage.value && !loading.value) {
      await fetchReschedules(currentPage.value + 1);
    }
  }

  async function refresh() {
    await fetchReschedules(currentPage.value);
  }

  function getRescheduleById(id: string) {
    return reschedules.value.find((reschedule) => reschedule.id === id);
  }

  async function fetchSupplies(supplierId?: string) {
    loadingSupplies.value = true;
    suppliesError.value = null;

    try {
      // Using suppliers API endpoint to fetch supplies
      const response = await apiClient.get('/suppliers/supplies', { params: { supplierId } });

      if (response.data.success) {
        supplies.value = (response.data.data as Supply[]) || [];
      } else {
        throw new Error('Failed to fetch supplies');
      }
    } catch (err: any) {
      suppliesError.value = err.message || 'Failed to fetch supplies';
      console.error('Failed to fetch supplies:', err);
      supplies.value = [];
    } finally {
      loadingSupplies.value = false;
    }
  }

  function setSelectedReschedule(reschedule: AutobookingReschedule) {
    selectedReschedule.value = reschedule;
  }

  return {
    // State
    reschedules: readonly(reschedules),
    counts: readonly(counts),
    currentPage: readonly(currentPage),
    hasNextPage: readonly(hasNextPage),
    loading: readonly(loading),
    error: readonly(error),
    selectedReschedule: readonly(selectedReschedule),

    // Computed
    activeReschedules,
    completedReschedules,
    archivedReschedules,
    availableSupplies,

    // Actions
    fetchReschedules,
    createReschedule,
    updateReschedule,
    deleteReschedule,
    archiveReschedule,
    activateReschedule,
    loadNextPage,
    refresh,
    getRescheduleById,
    setSelectedReschedule,
    supplies: readonly(supplies),
    loadingSupplies: readonly(loadingSupplies),
    suppliesError: readonly(suppliesError),
    fetchSupplies,
  };
});

// Import apiClient here to avoid circular dependency
import apiClient from '../../api/client';

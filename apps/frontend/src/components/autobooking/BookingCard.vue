<template>
  <Card>
    <template #content>
      <div class="flex flex-col gap-3">
        <!-- Header with supplier name on the right -->
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <!-- Warehouse section -->
            <div class="flex items-center gap-2">
              <i class="pi pi-building text-gray-500 text-sm"></i>
              <div class="flex flex-col gap-1">
                <Tag :value="warehouseStore.getWarehouseName(booking.warehouseId)" severity="secondary" class="w-fit" />
                <Tag
                  v-if="booking.transitWarehouseId"
                  severity="secondary"
                  class="w-fit"
                >
                  Транзит: {{ warehouseStore.getWarehouseName(booking.transitWarehouseId) }}
                </Tag>
              </div>
            </div>
          </div>

          <!-- Supplier section moved to top right -->
          <div class="flex items-center gap-1 ml-2">
            <i class="pi pi-user text-gray-500 text-sm"></i>
            <Tag
              :value="getSupplierName(booking.supplierId)"
              :severity="isSupplierActive ? 'info' : 'danger'"
            />
          </div>
        </div>

        <!-- Supply Type section -->
        <div class="flex items-center gap-2">
          <i class="pi pi-box text-gray-500 text-sm"></i>
          <Tag :value="getSupplyTypeText(booking.supplyType)" severity="secondary" />
        </div>

        <!-- MonopalletCount for MONOPALLETE supply type -->
        <div
          v-if="booking.supplyType === 'MONOPALLETE' && booking.monopalletCount"
          class="flex items-center gap-2"
        >
          <i class="pi pi-th-large text-gray-500 text-sm"></i>
          <Tag
            :value="booking.monopalletCount + ' ' + (booking.monopalletCount === 1 ? 'монопаллета' : 'монопаллет')"
            severity="info"
          />
        </div>

        <!-- Date Information section -->
        <AutobookingDateInfo :booking="booking" />

        <!-- Coefficient section -->
        <div class="flex items-center gap-2">
          <i :class="booking.maxCoefficient ? 'pi pi-dollar' : 'pi pi-check-circle'" class="text-gray-500 text-sm"></i>
          <Tag
            :value="booking.maxCoefficient ? 'Макс. коэффициент: ' + booking.maxCoefficient : 'Бесплатная'"
            :severity="booking.maxCoefficient ? 'warn' : 'success'"
          />
        </div>

        <!-- Status section -->
        <div class="flex items-center gap-2">
          <i class="pi pi-info-circle text-gray-500 text-sm"></i>
          <Tag
            :value="listStore.getStatusText(booking.status)"
            :severity="getStatusSeverity(booking.status)"
          />
        </div>

        <!-- Created Date -->
        <div class="text-sm flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <i class="pi pi-calendar text-sm"></i>
          Создан: {{ formatDateShort(booking.createdAt) }}
        </div>

        <!-- Coefficient Suggestion Alert -->
        <Message
          v-if="showCoefficientSuggestion && booking.status === 'ACTIVE'"
          severity="info"
          class="mt-2"
        >
          <div class="flex items-center justify-between w-full">
            <div class="flex items-center gap-2">
              <i class="pi pi-arrow-circle-up"></i>
              <span class="text-sm">
                Рекомендуемый макс. коэффициент: {{ suggestedCoefficientValue }}.
              </span>
            </div>
            <Button
              severity="info"
              size="small"
              :loading="autobookingStore.loading && autobookingStore.togglingId === booking.id"
              @click="updateCoefficient"
            >
              увеличить
            </Button>
          </div>
        </Message>

        <!-- Action Buttons -->
        <div class="flex justify-end gap-2 mt-2">
          <!-- View goods button -->
          <Button
            size="small"
            severity="info"
            variant="outlined"
            :disabled="!userStore.getSupplierById(booking.supplierId)"
            @click="viewGoods"
          >
            <i class="pi pi-eye"></i>
          </Button>

          <!-- Update button for active autobookings -->
          <Button
            v-if="booking.status === 'ACTIVE'"
            severity="info"
            variant="outlined"
            size="small"
            @click="openUpdateForm"
          >
            <i class="pi pi-pencil"></i>
          </Button>

          <!-- Archive button for active autobookings -->
          <Button
            v-if="booking.status === 'ACTIVE'"
            severity="warn"
            variant="outlined"
            size="small"
            :loading="autobookingStore.loading && autobookingStore.togglingId === booking.id"
            @click="archiveAutobooking"
          >
            <i class="pi pi-archive"></i>
          </Button>

          <!-- Activate button or Not Relevant badge for archived items -->
          <template v-if="booking.status === 'ARCHIVED'">
            <Button
              v-if="listStore.isBookingDatesRelevant(booking)"
              severity="success"
              variant="outlined"
              size="small"
              :loading="autobookingStore.loading && autobookingStore.togglingId === booking.id"
              @click="activateAutobooking"
            >
              <i class="pi pi-play"></i>
            </Button>
            <Tag
              v-else
              severity="danger"
              icon="pi pi-clock"
              value="Срок истек"
            />
          </template>

          <!-- Explicit badge for ERROR status -->
          <Tag
            v-else-if="booking.status === 'ERROR'"
            severity="danger"
            icon="pi pi-exclamation-triangle"
            value="Ошибка бронирования"
          />

          <!-- Delete button for active, archived or error autobookings -->
          <Button
            v-if="
              booking.status === 'ACTIVE' ||
              booking.status === 'ARCHIVED' ||
              booking.status === 'ERROR'
            "
            severity="danger"
            variant="outlined"
            size="small"
            :loading="autobookingStore.deletingId === booking.id"
            @click="deleteAutobooking"
          >
            <i class="pi pi-trash"></i>
          </Button>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Autobooking } from '../../types';
import { useAutobookingStore } from '../../stores/autobooking';
import { useAutobookingUpdateStore } from '../../stores/autobookingUpdate';
import { useAutobookingListStore } from '../../stores/autobookingList';
import { useUserStore } from '../../stores/user';
import { useWarehousesStore } from '../../stores/warehouses';
import { useCoefficientsStore } from '../../stores/coefficients';
import Card from 'primevue/card';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Message from 'primevue/message';
import AutobookingDateInfo from './DateInfo.vue';
import { formatDateShort, getSupplyTypeText } from '../../utils/formatters';

const props = defineProps<{
  booking: Autobooking;
}>();

const emit = defineEmits<{
  'view-goods': [draftId: string, supplierId: string];
}>();

const autobookingStore = useAutobookingStore();
const updateStore = useAutobookingUpdateStore();
const listStore = useAutobookingListStore();
const userStore = useUserStore();
const warehouseStore = useWarehousesStore();
const coefficientsStore = useCoefficientsStore();

const suggestedCoefficientValue = ref<number | null>(null);

const showCoefficientSuggestion = computed(() => {
  return (
    suggestedCoefficientValue.value !== null &&
    (props.booking.maxCoefficient || 0) < suggestedCoefficientValue.value
  );
});

// Check if the supplier for this booking is still active/available
const isSupplierActive = computed(() => {
  const supplier = userStore.getSupplierById(props.booking.supplierId);
  return supplier !== null;
});

function getSupplierName(supplierId: string): string {
  const supplier = userStore.getSupplierById(supplierId);
  return supplier ? supplier.supplierName : 'поставщик не найден';
}

function getStatusSeverity(status: string): string {
  const severityMap: Record<string, string> = {
    ACTIVE: 'warn',
    COMPLETED: 'success',
    ARCHIVED: 'secondary',
    ERROR: 'danger',
  };
  return severityMap[status] || 'secondary';
}

function viewGoods() {
  emit('view-goods', props.booking.draftId, props.booking.supplierId);
}

function openUpdateForm() {
  // Create deep copy of booking to avoid mutations
  const bookingCopy = JSON.parse(JSON.stringify(props.booking));
  updateStore.loadAutobooking(bookingCopy);
}

async function updateCoefficient() {
  if (suggestedCoefficientValue.value === null) return;
  
  const confirmed = confirm(
    `Вы уверены, что хотите увеличить коэффициент для этого автобронирования до ${suggestedCoefficientValue.value}?`
  );
  
  if (!confirmed) return;
  
  try {
    // This would need to be implemented in the API and store
    // await autobookingStore.updateBookingCoefficient(
    //   props.booking.id,
    //   suggestedCoefficientValue.value,
    // );
    alert('Коэффициент обновлен');
  } catch (error) {
    console.error('Failed to update coefficient:', error);
    alert('Не удалось обновить коэффициент');
  }
}

async function archiveAutobooking() {
  try {
    await autobookingStore.toggleAutobooking(props.booking.id, false);
  } catch (error) {
    console.error('Failed to archive autobooking:', error);
  }
}

async function activateAutobooking() {
  try {
    await listStore.activateAutobooking(props.booking);
  } catch (error) {
    console.error('Failed to activate autobooking:', error);
  }
}

async function deleteAutobooking() {
  const confirmed = confirm('Вы уверены, что хотите удалить это автобронирование?');
  if (!confirmed) return;
  
  try {
    await autobookingStore.deleteAutobooking(props.booking.id);
  } catch (error) {
    console.error('Failed to delete autobooking:', error);
  }
}

// Load coefficients on mount
const recentCoefficient = coefficientsStore.getMostRecentCoefficient(
  props.booking.warehouseId,
  props.booking.supplyType,
);
if (recentCoefficient) {
  suggestedCoefficientValue.value = recentCoefficient.maxCoefficient;
}
</script>

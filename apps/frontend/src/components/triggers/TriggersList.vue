<template>
  <div class="space-y-4">
    <Message
      v-if="triggerStore.activeTriggersCount >= 30"
      severity="warn"
      :closable="false"
      class="mb-4"
    >
      <div class="font-medium">Достигнут лимит активных таймслотов</div>
      <div class="text-sm">
        У вас уже активировано максимальное количество таймслотов (30).
        Отключите некоторые таймслоты, чтобы активировать новые.
      </div>
    </Message>

    <!-- Status Filter Buttons -->
    <div class="flex gap-2">
      <Button
        v-for="status in ['RELEVANT', 'COMPLETED', 'EXPIRED'] as const"
        :key="status"
        :variant="
          triggerStore.selectedStatus === status ? 'filled' : 'outlined'
        "
        severity="primary"
        size="small"
        class="flex-1 justify-between"
        @click="triggerStore.setSelectedStatus(status)"
      >
        <span class="truncate">{{ getStatusLabel(status) }}</span>
        <span
          :class="[
            'ml-2 px-2 py-0.5 rounded text-xs font-medium',
            triggerStore.selectedStatus === status
              ? 'bg-white text-blue-600 dark:text-blue-400'
              : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
          ]"
        >
          {{ getStatusCount(status) }}
        </span>
      </Button>
    </div>

    <!-- Search Input -->
    <InputText
      v-model="triggerStore.searchQuery"
      type="text"
      :placeholder="getSearchPlaceholder()"
      class="mb-4 w-full"
    />

    <!-- Header with count and create button -->
    <div class="flex items-center justify-between gap-4">
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
        активных таймслотов: {{ triggerStore.activeTriggersCount }}/30
      </span>

      <Button
        severity="primary"
        size="small"
        :disabled="triggerStore.activeTriggersCount >= 30"
        @click="navigateToCreate"
      >
        <i class="pi pi-plus mr-1 text-xs" />
        добавить
      </Button>
    </div>

    <!-- Trigger Cards -->
    <Card
      v-for="trigger in triggerStore.filteredTriggers"
      :key="trigger.id"
      class="shadow-sm"
      :pt="{ content: { class: 'p-4' } }"
    >
      <template #content>
        <div class="flex flex-col gap-3">
          <!-- Warehouses section -->
          <div class="flex items-center gap-2">
            <i
              class="pi pi-building text-gray-500 dark:text-gray-400 flex-shrink-0"
            />
            <div class="flex flex-wrap gap-2">
              <Tag
                v-for="warehouseId in trigger.warehouseIds"
                :key="warehouseId"
                severity="secondary"
                :value="warehouseStore.getWarehouseName(warehouseId)"
                class="text-xs"
              />
            </div>
          </div>

          <!-- Supply types section -->
          <div class="flex items-center gap-2">
            <i
              class="pi pi-box text-gray-500 dark:text-gray-400 flex-shrink-0"
            />
            <div class="flex flex-wrap gap-2">
              <Tag
                v-for="type in trigger.supplyTypes"
                :key="type"
                severity="secondary"
                :value="getSupplyTypeLabel(type)"
                class="text-xs"
              />
            </div>
          </div>

          <!-- Search mode section -->
          <div class="flex items-center gap-2">
            <i
              class="pi pi-calendar text-gray-500 dark:text-gray-400 flex-shrink-0"
            />
            <div class="flex flex-wrap gap-2 items-center">
              <Tag
                severity="secondary"
                :value="getSearchModeLabel(trigger.searchMode)"
                class="text-xs"
              />
              <Tag
                v-if="
                  ['RANGE', 'WEEK'].includes(trigger.searchMode) &&
                  trigger.startDate &&
                  trigger.endDate
                "
                severity="warn"
                :value="
                  formatDate(trigger.startDate) +
                  ' - ' +
                  formatDate(trigger.endDate)
                "
                class="text-xs"
              />
              <div
                v-else-if="
                  trigger.searchMode !== 'UNTIL_FOUND' &&
                  trigger.selectedDates?.length
                "
                class="flex flex-wrap gap-1"
              >
                <Tag
                  v-for="date in trigger.selectedDates.slice(0, 3)"
                  :key="date"
                  severity="success"
                  :value="formatDate(date)"
                  class="text-xs"
                />
                <Tag
                  v-if="trigger.selectedDates.length > 3"
                  severity="secondary"
                  :value="'+' + (trigger.selectedDates.length - 3)"
                  class="text-xs"
                />
              </div>
            </div>
          </div>

          <!-- Check interval section -->
          <div class="flex items-center gap-2">
            <i
              class="pi pi-clock text-gray-500 dark:text-gray-400 flex-shrink-0"
            />
            <div class="flex flex-col gap-1">
              <span class="text-xs text-gray-600 dark:text-gray-400">
                Повторная проверка через: {{ trigger.checkInterval }} мин
              </span>
            </div>
          </div>

          <!-- Free/Paid and coefficient section -->
          <div class="flex items-center gap-2">
            <i
              class="pi pi-dollar text-gray-500 dark:text-gray-400 flex-shrink-0"
            />
            <div class="flex flex-wrap gap-2">
              <Tag
                :severity="trigger.maxCoefficient === 0 ? 'success' : 'info'"
                :value="trigger.maxCoefficient === 0 ? 'Бесплатная' : 'Платная'"
                class="text-xs"
              />
              <Tag
                v-if="trigger.maxCoefficient !== 0"
                severity="warn"
                :value="'Коэф. до ' + trigger.maxCoefficient"
                class="text-xs"
              />
            </div>
          </div>

          <!-- Last notification date if exists -->
          <div
            v-if="trigger.lastNotificationAt"
            class="text-sm flex items-center gap-2 text-gray-600 dark:text-gray-400"
          >
            <i class="pi pi-bell text-xs" />
            Посл. уведомление:
            {{ formatDateTime(trigger.lastNotificationAt) }}
          </div>

          <!-- Created Date -->
          <div
            class="text-sm flex items-center gap-2 text-gray-600 dark:text-gray-400"
          >
            <i class="pi pi-calendar text-xs" />
            Создан: {{ formatDate(trigger.createdAt) }}
          </div>

          <!-- Coefficient History for all warehouses and supply types -->
          <CoefficientHistoryAlert
            :warehouse-ids="trigger.warehouseIds"
            :supply-types="trigger.supplyTypes"
          />
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-2 mt-4">
          <Button
            :severity="getActionButtonColor(trigger)"
            :loading="triggerStore.togglingId === trigger.id"
            :disabled="
              triggerStore.togglingId === trigger.id ||
              trigger.status !== 'RELEVANT' ||
              (!trigger.isActive && triggerStore.activeTriggersCount >= 30)
            "
            size="small"
            @click="triggerStore.toggleTrigger(trigger.id)"
          >
            <i :class="[getActionButtonIcon(trigger), 'mr-1 text-xs']" />
            {{ getActionButtonLabel(trigger) }}
          </Button>

          <Button
            severity="danger"
            variant="text"
            size="small"
            :loading="triggerStore.deletingId === trigger.id"
            @click="confirmDeleteTrigger(trigger.id)"
          >
            <i class="pi pi-trash text-xs" />
          </Button>
        </div>
      </template>
    </Card>

    <!-- Empty State -->
    <div
      v-if="triggerStore.filteredTriggers.length === 0"
      class="text-center py-8 text-gray-500 dark:text-gray-400"
    >
      {{ getEmptyStateMessage() }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useTriggerStore } from '../../stores/triggers';
import { useWarehousesStore } from '../../stores/warehouses';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Card from 'primevue/card';
import Tag from 'primevue/tag';
import Message from 'primevue/message';
import CoefficientHistoryAlert from './CoefficientHistoryAlert.vue';
import type { SupplyTrigger, SearchMode } from '../../types';

const router = useRouter();
const triggerStore = useTriggerStore();
const warehouseStore = useWarehousesStore();

function navigateToCreate() {
  router.push({ name: 'TriggerCreate' });
}

async function confirmDeleteTrigger(id: string) {
  const confirmed = confirm('Вы уверены, что хотите удалить этот таймслот?');
  if (!confirmed) return;

  try {
    await triggerStore.deleteTrigger(id);
  } catch (error) {
    console.error('Failed to delete trigger:', error);
  }
}

function getSupplyTypeLabel(type: string): string {
  switch (type) {
    case 'BOX':
      return 'Короба';
    case 'SUPERSAFE':
      return 'Суперсейф';
    case 'MONOPALLETE':
      return 'Монопаллеты';
    default:
      return type;
  }
}

function getSearchModeLabel(mode: SearchMode): string {
  switch (mode) {
    case 'TODAY':
      return 'Сегодня';
    case 'TOMORROW':
      return 'Завтра';
    case 'WEEK':
      return 'Неделя';
    case 'UNTIL_FOUND':
      return 'До нахождения';
    case 'CUSTOM_DATES':
      return 'Выбранные даты';
    case 'RANGE':
      return 'Диапазон дат';
    default:
      return mode;
  }
}

function formatDate(date: string | Date | null): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('ru-RU');
}

function formatDateTime(date: string | Date | null): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'RELEVANT':
      return 'актуальные';
    case 'COMPLETED':
      return 'завершенные';
    case 'EXPIRED':
      return 'истекшие';
    default:
      return status;
  }
}

function getActionButtonLabel(trigger: SupplyTrigger): string {
  if (trigger.status !== 'RELEVANT') {
    return trigger.status === 'COMPLETED' ? 'завершен' : 'истек';
  }
  return trigger.isActive ? 'стоп' : 'запуск';
}

function getActionButtonIcon(trigger: SupplyTrigger): string {
  switch (trigger.status) {
    case 'COMPLETED':
      return 'pi pi-check-circle';
    case 'EXPIRED':
      return 'pi pi-exclamation-circle';
    default:
      return trigger.isActive ? 'pi pi-pause' : 'pi pi-play';
  }
}

function getActionButtonColor(
  trigger: SupplyTrigger,
):
  | 'warn'
  | 'secondary'
  | 'success'
  | 'info'
  | 'primary'
  | 'danger'
  | 'help'
  | 'contrast'
  | undefined {
  switch (trigger.status) {
    case 'COMPLETED':
      return 'info';
    case 'EXPIRED':
      return 'secondary';
    default:
      return trigger.isActive ? 'warn' : 'success';
  }
}

function getStatusCount(status: string): number {
  switch (status) {
    case 'RELEVANT':
      return triggerStore.relevantTriggersCount;
    case 'COMPLETED':
      return triggerStore.completedTriggersCount;
    case 'EXPIRED':
      return triggerStore.expiredTriggersCount;
    default:
      return 0;
  }
}

function getSearchPlaceholder(): string {
  switch (triggerStore.selectedStatus) {
    case 'RELEVANT':
      return 'Поиск по актуальным таймслотам...';
    case 'COMPLETED':
      return 'Поиск по завершенным таймслотам...';
    case 'EXPIRED':
      return 'Поиск по истекшим таймслотам...';
    default:
      return 'Поиск по таймслотам...';
  }
}

function getEmptyStateMessage(): string {
  if (triggerStore.searchQuery) {
    return 'Таймслоты не найдены';
  }

  switch (triggerStore.selectedStatus) {
    case 'RELEVANT':
      return 'Нет актуальных таймслотов';
    case 'COMPLETED':
      return 'Нет завершенных таймслотов';
    case 'EXPIRED':
      return 'Нет истекших таймслотов';
    default:
      return 'Таймслоты не созданы';
  }
}
</script>

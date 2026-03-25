<template>
  <div class="space-y-4">
    <!-- Status Filter Buttons -->
    <div class="flex gap-2">
      <BaseButton
        v-for="status in ['RELEVANT', 'COMPLETED', 'EXPIRED'] as const"
        :key="status"
        :variant="triggerStore.selectedStatus === status ? 'solid' : 'soft'"
        color="primary"
        size="sm"
        class="flex-1 justify-between"
        @click="triggerStore.setSelectedStatus(status)"
      >
        <span class="truncate">{{ getStatusLabel(status) }}</span>
        <span
          :class="[
            'ml-2 px-2 py-0.5 rounded text-xs font-medium',
            triggerStore.selectedStatus === status
              ? 'bg-white text-blue-600'
              : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
          ]"
        >
          {{ getStatusCount(status) }}
        </span>
      </BaseButton>
    </div>

    <!-- Search Input -->
    <BaseInput
      v-model="triggerStore.searchQuery"
      type="text"
      :placeholder="getSearchPlaceholder()"
      class="mb-4"
    />

    <!-- Header with count and create button -->
    <div class="flex items-center justify-between gap-4">
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
        активных таймслотов: {{ triggerStore.activeTriggersCount }}/30
      </span>

      <BaseButton
        color="primary"
        size="sm"
        :disabled="triggerStore.activeTriggersCount >= 30"
        @click="viewStore.setView('triggers-form')"
      >
        <PlusIcon class="w-4 h-4 mr-1" />
        добавить
      </BaseButton>
    </div>

    <!-- Trigger Cards -->
    <div
      v-for="trigger in triggerStore.filteredTriggers"
      :key="trigger.id"
      class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
    >
      <div class="flex flex-col gap-3">
        <!-- Warehouses section -->
        <div class="flex items-center gap-2">
          <BuildingOffice2Icon class="w-5 h-5 text-gray-500 flex-shrink-0" />
          <div class="flex flex-wrap gap-2">
            <span
              v-for="warehouseId in trigger.warehouseIds"
              :key="warehouseId"
              class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
            >
              {{ warehouseStore.getWarehouseName(warehouseId) }}
            </span>
          </div>
        </div>

        <!-- Supply types section -->
        <div class="flex items-center gap-2">
          <CubeIcon class="w-5 h-5 text-gray-500 flex-shrink-0" />
          <div class="flex flex-wrap gap-2">
            <span
              v-for="type in trigger.supplyTypes"
              :key="type"
              class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
            >
              {{ getSupplyTypeLabel(type) }}
            </span>
          </div>
        </div>

        <!-- Search mode section -->
        <div class="flex items-center gap-2">
          <CalendarIcon class="w-5 h-5 text-gray-500 flex-shrink-0" />
          <div class="flex flex-wrap gap-2 items-center">
            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
              {{ getSearchModeLabel(trigger.searchMode) }}
            </span>
            <span
              v-if="['RANGE', 'WEEK'].includes(trigger.searchMode) && trigger.startDate && trigger.endDate"
              class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200"
            >
              {{ formatDate(trigger.startDate) }} - {{ formatDate(trigger.endDate) }}
            </span>
            <div
              v-else-if="trigger.searchMode !== 'UNTIL_FOUND' && trigger.selectedDates?.length"
              class="flex flex-wrap gap-1"
            >
              <span
                v-for="date in trigger.selectedDates.slice(0, 3)"
                :key="date"
                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
              >
                {{ formatDate(date) }}
              </span>
              <span
                v-if="trigger.selectedDates.length > 3"
                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
              >
                +{{ trigger.selectedDates.length - 3 }}
              </span>
            </div>
          </div>
        </div>

        <!-- Check interval section -->
        <div class="flex items-center gap-2">
          <ClockIcon class="w-5 h-5 text-gray-500 flex-shrink-0" />
          <div class="flex flex-col gap-1">
            <span class="text-xs text-gray-600 dark:text-gray-400">
              Повторная проверка через: {{ trigger.checkInterval }} мин
            </span>
          </div>
        </div>

        <!-- Free/Paid and coefficient section -->
        <div class="flex items-center gap-2">
          <CurrencyDollarIcon class="w-5 h-5 text-gray-500 flex-shrink-0" />
          <div class="flex flex-wrap gap-2">
            <span
              :class="[
                'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                trigger.maxCoefficient === 0
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
              ]"
            >
              {{ trigger.maxCoefficient === 0 ? 'Бесплатная' : 'Платная' }}
            </span>
            <span
              v-if="trigger.maxCoefficient !== 0"
              class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200"
            >
              Коэф. до {{ trigger.maxCoefficient }}
            </span>
          </div>
        </div>

        <!-- Last notification date if exists -->
        <div
          v-if="trigger.lastNotificationAt"
          class="text-sm flex items-center gap-2 text-gray-600 dark:text-gray-400"
        >
          <BellIcon class="w-4 h-4" />
          Посл. уведомление:
          {{ formatDateTime(trigger.lastNotificationAt) }}
        </div>

        <!-- Created Date -->
        <div class="text-sm flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <CalendarDaysIcon class="w-4 h-4" />
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
        <BaseButton
          :color="getActionButtonColor(trigger)"
          :loading="triggerStore.togglingId === trigger.id"
          :disabled="
            triggerStore.togglingId === trigger.id ||
            trigger.status !== 'RELEVANT' ||
            (!trigger.isActive && triggerStore.activeTriggersCount >= 30)
          "
          size="sm"
          @click="triggerStore.toggleTrigger(trigger.id)"
        >
          <component
            :is="getActionButtonIcon(trigger)"
            class="w-4 h-4 mr-1"
          />
          {{ getActionButtonLabel(trigger) }}
        </BaseButton>

        <BaseButton
          color="red"
          variant="ghost"
          size="sm"
          :loading="triggerStore.deletingId === trigger.id"
          @click="triggerStore.deleteTrigger(trigger.id)"
        >
          <TrashIcon class="w-4 h-4" />
        </BaseButton>
      </div>
    </div>

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
import {
  PlusIcon,
  BuildingOffice2Icon,
  CubeIcon,
  CalendarIcon,
  CalendarDaysIcon,
  ClockIcon,
  CurrencyDollarIcon,
  BellIcon,
  TrashIcon,
  PauseIcon,
  PlayIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/vue/24/outline';
import { useTriggerStore } from '../../stores/triggers';
import { useWarehousesStore } from '../../stores/warehouses';
import { useViewStore } from '../../stores/view';
import BaseButton from '../ui/BaseButton.vue';
import BaseInput from '../ui/BaseInput.vue';
import CoefficientHistoryAlert from './CoefficientHistoryAlert.vue';
import type { SupplyTrigger, SearchMode } from '../../types';

const triggerStore = useTriggerStore();
const warehouseStore = useWarehousesStore();
const viewStore = useViewStore();

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

function getActionButtonIcon(trigger: SupplyTrigger) {
  switch (trigger.status) {
    case 'COMPLETED':
      return CheckCircleIcon;
    case 'EXPIRED':
      return ExclamationCircleIcon;
    default:
      return trigger.isActive ? PauseIcon : PlayIcon;
  }
}

function getActionButtonColor(trigger: SupplyTrigger): 'yellow' | 'gray' | 'green' | 'blue' | 'primary' {
  switch (trigger.status) {
    case 'COMPLETED':
      return 'blue';
    case 'EXPIRED':
      return 'gray';
    default:
      return trigger.isActive ? 'yellow' : 'green';
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

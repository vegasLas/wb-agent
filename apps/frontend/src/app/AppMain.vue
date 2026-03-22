<template>
  <main
    :class="[props.showMain ? 'visible' : 'invisible']"
    class="container mx-auto px-4 py-6"
  >
    <div class="header">
      <div class="flex items-center justify-between">
        <!-- Main Navigation Dropdown -->
        <div class="flex items-center gap-2">
          <BaseDropdown :items="navigationItems" placement="bottom-start">
            <template #trigger>
              <BaseButton
                :color="selectedNavItem.active ? 'primary' : 'gray'"
                variant="solid"
              >
                <template #icon>
                  <component :is="selectedNavItem.icon" class="w-5 h-5" />
                </template>
                {{ selectedNavItem.label }}
                <ChevronDownIcon class="w-4 h-4 ml-2" />
              </BaseButton>
            </template>
            <BaseDropdownItem
              v-for="item in navigationOptions"
              :key="item.id"
              @click="viewStore.setView(item.view as ViewType)"
            >
              <component :is="item.icon" class="w-5 h-5 mr-2" />
              {{ item.label }}
            </BaseDropdownItem>
          </BaseDropdown>

          <BaseButton
            color="yellow"
            variant="soft"
            square
            @click="showHelpModal = true"
          >
            <template #icon>
              <QuestionMarkCircleIcon class="w-5 h-5" />
            </template>
          </BaseButton>
        </div>

        <!-- Icons -->
        <div class="flex items-center gap-2">
          <BaseButton
            :color="viewStore.mainView === 'store' ? 'primary' : 'gray'"
            variant="soft"
            square
            @click="viewStore.setView('store')"
          >
            <template #icon>
              <ShoppingBagIcon class="w-5 h-5" />
            </template>
          </BaseButton>
          <BaseButton
            :color="accountModalStore.showModal ? 'primary' : 'gray'"
            variant="soft"
            square
            @click="accountModalStore.showModal = true"
            aria-label="Управление аккаунтами"
          >
            <template #icon>
              <UsersIcon class="w-5 h-5" />
            </template>
          </BaseButton>
          <BaseButton
            :color="viewStore.mainView === 'account' ? 'primary' : 'gray'"
            variant="soft"
            @click="viewStore.setView('account')"
          >
            <template #icon>
              <UserCircleIcon v-if="!userStore.activeSupplier?.supplierName" class="w-5 h-5" />
            </template>
            <span
              v-if="userStore.activeSupplier?.supplierName"
              class="text-sm truncate max-w-[60px] inline-block"
            >
              {{ userStore.activeSupplier.supplierName }}
            </span>
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="mt-6">
      <!-- View components will be rendered here based on current view -->
      <RouterView />
    </div>

    <!-- Help Modal - placeholder for future implementation -->
    <!-- <MainHelpModal :show="showHelpModal" @close="showHelpModal = false" /> -->
    
    <!-- Account Management Modal -->
    <AccountManagementView v-model="accountModalStore.showModal" />
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  ChevronDownIcon,
  CalendarIcon,
  ClockIcon,
  ChartPieIcon,
  ShoppingBagIcon,
  UsersIcon,
  UserCircleIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/vue/24/outline';

// Stores
import { useViewStore } from '../stores/view';
import { useUserStore } from '../stores/user';
import { useAccountSupplierModalStore } from '../stores/accountSupplierModal';

// Components
import { BaseButton, BaseDropdown, BaseDropdownItem } from '../components/ui';
import { AccountManagementView } from '../components/account-management';

// Types
import type { ViewType } from '../types';

const props = defineProps<{
  showMain: boolean;
}>();

const viewStore = useViewStore();
const userStore = useUserStore();
const accountModalStore = useAccountSupplierModalStore();

// State for modals
const showHelpModal = ref(false);

// Navigation dropdown configuration
const navigationOptions = [
  {
    id: 'autobookings',
    label: 'автоброни',
    icon: CalendarIcon,
    view: 'autobookings-main',
  },
  {
    id: 'triggers',
    label: 'слоты',
    icon: ClockIcon,
    view: 'triggers-main',
  },
  {
    id: 'report',
    label: 'отчеты',
    icon: ChartPieIcon,
    view: 'report',
  },
];

// Selected navigation item
const selectedNavItem = computed(() => {
  const currentView = viewStore.mainView;
  const option = navigationOptions.find(
    (opt) =>
      currentView === opt.id ||
      (currentView === 'triggers' && opt.id === 'triggers') ||
      (currentView === 'autobookings' && opt.id === 'autobookings') ||
      (currentView === 'report' && opt.id === 'report'),
  );
  return option
    ? {
        ...option,
        active: true,
      }
    : {
        ...navigationOptions[0],
        active: false,
      };
});

// Navigation dropdown items
const navigationItems = computed(() =>
  navigationOptions.map((option) => ({
    label: option.label,
    icon: option.icon,
    click: () => {
      viewStore.setView(option.view as ViewType);
    },
  })),
);
</script>

<style scoped>
body {
  background-color: var(--dp-background-color);
}
</style>

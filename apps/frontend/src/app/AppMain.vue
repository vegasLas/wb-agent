<template>
  <main
    :class="[props.showMain ? 'visible' : 'invisible']"
    class="container mx-auto px-4 py-6"
  >
    <div class="header">
      <div class="flex items-center justify-between">
        <!-- Main Navigation Dropdown -->
        <div class="flex items-center gap-2">
          <Button
            ref="navMenuButton"
            :severity="selectedNavItem.active ? 'primary' : 'secondary'"
            @click="toggleNavMenu"
          >
            <i :class="selectedNavItem.iconClass"></i>
            <span class="ml-2">{{ selectedNavItem.label }}</span>
            <i class="pi pi-chevron-down ml-2"></i>
          </Button>
          <Menu ref="navMenu" :model="navigationItems" :popup="true" />

          <Button
            severity="warning"
            variant="outlined"
            class="rounded"
            @click="showHelpModal = true"
          >
            <template #icon>
              <i class="pi pi-question-circle"></i>
            </template>
          </Button>
        </div>

        <!-- Icons -->
        <div class="flex items-center gap-2">
          <Button
            :severity="isStoreRoute ? 'primary' : 'secondary'"
            variant="outlined"
            class="rounded"
            @click="navigateToStore"
          >
            <template #icon>
              <i class="pi pi-shopping-bag"></i>
            </template>
          </Button>
          <Button
            :severity="accountModalStore.showModal ? 'primary' : 'secondary'"
            variant="outlined"
            class="rounded"
            @click="accountModalStore.showModal = true"
            aria-label="Управление аккаунтами"
          >
            <template #icon>
              <i class="pi pi-users"></i>
            </template>
          </Button>
          <Button
            :severity="isAccountRoute ? 'primary' : 'secondary'"
            variant="outlined"
            @click="navigateToAccount"
          >
            <template #icon>
              <i
                v-if="!userStore.activeSupplier?.supplierName"
                class="pi pi-user"
              ></i>
            </template>
            <span
              v-if="userStore.activeSupplier?.supplierName"
              class="text-sm truncate max-w-[60px] inline-block"
            >
              {{ userStore.activeSupplier.supplierName }}
            </span>
          </Button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="mt-6">
      <RouterView />
    </div>

    <!-- Help Modal -->
    <MainHelpModal v-model="showHelpModal" />

    <!-- Account Management Modal -->
    <AccountManagementView v-model="accountModalStore.showModal" />
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';

// PrimeVue imports
import Button from 'primevue/button';
import Menu from 'primevue/menu';

// Stores
import { useUserStore } from '../stores/user';
import { useAccountSupplierModalStore } from '../stores/accountSupplierModal';

// Components
import { AccountManagementView } from '../components/account-management';
import { MainHelpModal } from '../components/help';

const props = defineProps<{
  showMain: boolean;
}>();

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const accountModalStore = useAccountSupplierModalStore();

// State for modals
const showHelpModal = ref(false);

// Menu refs
const navMenu = ref<InstanceType<typeof Menu> | null>(null);
const navMenuButton = ref<InstanceType<typeof Button> | null>(null);

const toggleNavMenu = (event: MouseEvent) => {
  navMenu.value?.toggle(event);
};

// Route checks
const isStoreRoute = computed(() => 
  route.name === 'Store' || route.name === 'StoreSubscription' || route.name === 'StoreBookings'
);

const isAccountRoute = computed(() => route.name === 'Account');

// Navigation functions
const navigateToStore = () => {
  router.push({ name: 'Store' });
};

const navigateToAccount = () => {
  router.push({ name: 'Account' });
};

// Navigation dropdown configuration
const navigationOptions = [
  {
    id: 'autobooking',
    label: 'автоброни',
    iconClass: 'pi pi-calendar',
    routeName: 'Autobooking',
  },
  {
    id: 'triggers',
    label: 'слоты',
    iconClass: 'pi pi-clock',
    routeName: 'Triggers',
  },
  {
    id: 'reports',
    label: 'отчеты',
    iconClass: 'pi pi-chart-pie',
    routeName: 'Reports',
  },
];

// Selected navigation item based on current route
const selectedNavItem = computed(() => {
  const currentRouteName = route.name;
  const option = navigationOptions.find(
    (opt) => currentRouteName === opt.routeName || currentRouteName?.toString().startsWith(opt.id)
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

// Navigation dropdown items for PrimeVue Menu
const navigationItems = computed(() =>
  navigationOptions.map((option) => ({
    label: option.label,
    icon: option.iconClass,
    command: () => {
      router.push({ name: option.routeName });
    },
  })),
);
</script>

<style scoped>
body {
  background-color: var(--dp-background-color);
}
</style>

<template>
  <header
    class="lg:sticky lg:top-0 lg:h-screen bg-white dark:bg-[#171819] lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700"
  >
    <div
      class="container mx-auto px-2 py-4 lg:mx-0 lg:max-w-none lg:px-4 lg:py-6 lg:h-full"
    >
      <div
        class="flex items-center justify-between lg:flex-col lg:items-stretch lg:justify-between lg:h-full lg:gap-6"
      >
        <!-- Top: Navigation -->
        <div
          class="flex items-center gap-1 lg:flex-col lg:items-stretch lg:gap-3"
        >
          <div class="lg:hidden flex items-center gap-1">
            <Button
              ref="navMenuButton"
              class="leading-none"
              :severity="isNavActive ? 'primary' : 'secondary'"
              @click="toggleNavMenu"
            >
              <i :class="currentNavItem.icon" />
              <span>{{ currentNavItem.label }}</span>
              <i class="pi pi-chevron-down" />
            </Button>

            <Menu
              ref="navMenu"
              :model="navItems"
              :popup="true"
            />
          </div>

          <!-- Desktop nav items as individual buttons -->
          <div class="hidden lg:flex lg:flex-col lg:items-stretch lg:gap-3">
            <Button
              v-for="item in navConfig"
              :key="item.id"
              :severity="
                route.name?.toString().startsWith(item.id)
                  ? 'primary'
                  : 'secondary'
              "
              class="lg:justify-start"
              @click="router.push({ name: item.route })"
            >
              <i :class="item.icon" />
              <span class="ml-2">{{ item.label }}</span>
            </Button>
          </div>

          <Button
            severity="warning"
            variant="outlined"
            class="rounded lg:justify-start"
            @click="$emit('show-help')"
          >
            <i class="pi pi-question-circle" />
            <span class="hidden lg:inline ml-2">Помощь</span>
          </Button>
        </div>

        <!-- Bottom: Actions -->
        <div
          class="flex items-center gap-1 lg:flex-col lg:items-stretch lg:gap-3"
        >
          <!-- Store Button -->
          <Button
            :severity="isStoreRoute ? 'primary' : 'secondary'"
            variant="outlined"
            class="rounded lg:justify-start"
            @click="navigateToStore"
          >
            <i class="pi pi-shopping-bag" />
            <span class="hidden lg:inline ml-2">Магазин</span>
          </Button>

          <!-- Accounts Button -->
          <Button
            :severity="accountModalStore.showModal ? 'primary' : 'secondary'"
            variant="outlined"
            class="rounded lg:justify-start"
            aria-label="Управление аккаунтами"
            @click="$emit('show-accounts')"
          >
            <i class="pi pi-users" />
            <span class="hidden lg:inline ml-2">Аккаунты</span>
          </Button>

          <!-- User/Supplier Button -->
          <Button
            :severity="isAccountRoute ? 'primary' : 'secondary'"
            variant="outlined"
            class="lg:justify-start"
            @click="navigateToAccount"
          >
            <template v-if="userStore.activeSupplier?.supplierName">
              <span class="text-sm truncate max-w-[60px] lg:max-w-full">
                {{ userStore.activeSupplier.supplierName }}
              </span>
            </template>
            <template v-else>
              <i class="pi pi-user" />
              <span class="hidden lg:inline ml-2">Профиль</span>
            </template>
          </Button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import Button from 'primevue/button';
import Menu from 'primevue/menu';
import { useUserStore } from '../../stores/user';
import { useAccountSupplierModalStore } from '../../stores/accountSupplierModal';

defineEmits<{
  'show-help': [];
  'show-accounts': [];
}>();

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const accountModalStore = useAccountSupplierModalStore();

const navMenu = ref<InstanceType<typeof Menu> | null>(null);
const navMenuButton = ref<InstanceType<typeof Button> | null>(null);

const toggleNavMenu = (event: MouseEvent) => {
  navMenu.value?.toggle(event);
};

// Navigation items - route to list views directly
const navConfig = [
  {
    id: 'autobooking',
    label: 'автоброни',
    icon: 'pi pi-calendar',
    route: 'AutobookingList',
  },
  {
    id: 'triggers',
    label: 'слоты',
    icon: 'pi pi-clock',
    route: 'TriggersList',
  },
  { id: 'reports', label: 'отчеты', icon: 'pi pi-chart-pie', route: 'Reports' },
];

// Route checks
const currentNavItem = computed(() => {
  const routePrefix = route.name?.toString().split('-')[0].toLowerCase();
  const item = navConfig.find((n) => routePrefix?.startsWith(n.id));
  return item || navConfig[0];
});

const isNavActive = computed(() => {
  return navConfig.some((n) => route.name?.toString().startsWith(n.id));
});

const navItems = computed(() =>
  navConfig.map((item) => ({
    label: item.label,
    icon: item.icon,
    command: () => router.push({ name: item.route }),
  })),
);

const isStoreRoute = computed(() => route.path.startsWith('/store'));

const isAccountRoute = computed(() => route.name === 'Account');

// Navigation handlers
const navigateToStore = () => router.push({ name: 'Store' });
const navigateToAccount = () => router.push({ name: 'Account' });
</script>

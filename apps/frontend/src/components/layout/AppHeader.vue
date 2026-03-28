<template>
  <header class="border-b border-gray-200 dark:border-gray-800">
    <div class="container mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <!-- Left: Navigation -->
        <div class="flex items-center gap-2">
          <Button
            ref="navMenuButton"
            :severity="isNavActive ? 'primary' : 'secondary'"
            @click="toggleNavMenu"
          >
            <i :class="currentNavItem.icon"></i>
            <span class="ml-2">{{ currentNavItem.label }}</span>
            <i class="pi pi-chevron-down ml-2"></i>
          </Button>
          
          <Menu ref="navMenu" :model="navItems" :popup="true" />

          <Button
            severity="warning"
            variant="outlined"
            class="rounded"
            @click="$emit('show-help')"
          >
            <i class="pi pi-question-circle"></i>
          </Button>
        </div>

        <!-- Right: Actions -->
        <div class="flex items-center gap-2">
          <!-- Store Button -->
          <Button
            :severity="isStoreRoute ? 'primary' : 'secondary'"
            variant="outlined"
            class="rounded"
            @click="navigateToStore"
          >
            <i class="pi pi-shopping-bag"></i>
          </Button>
          
          <!-- Accounts Button -->
          <Button
            :severity="accountModalStore.showModal ? 'primary' : 'secondary'"
            variant="outlined"
            class="rounded"
            @click="$emit('show-accounts')"
            aria-label="Управление аккаунтами"
          >
            <i class="pi pi-users"></i>
          </Button>
          
          <!-- User/Supplier Button -->
          <Button
            :severity="isAccountRoute ? 'primary' : 'secondary'"
            variant="outlined"
            @click="navigateToAccount"
          >
            <template v-if="userStore.activeSupplier?.supplierName">
              <span class="text-sm truncate max-w-[80px]">
                {{ userStore.activeSupplier.supplierName }}
              </span>
            </template>
            <template v-else>
              <i class="pi pi-user"></i>
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
  { id: 'autobooking', label: 'автоброни', icon: 'pi pi-calendar', route: 'AutobookingList' },
  { id: 'triggers', label: 'слоты', icon: 'pi pi-clock', route: 'TriggersList' },
  { id: 'reports', label: 'отчеты', icon: 'pi pi-chart-pie', route: 'Reports' },
];

// Route checks
const currentNavItem = computed(() => {
  const routePrefix = route.name?.toString().split('-')[0].toLowerCase();
  const item = navConfig.find(n => routePrefix?.startsWith(n.id));
  return item || navConfig[0];
});

const isNavActive = computed(() => {
  return navConfig.some(n => route.name?.toString().startsWith(n.id));
});

const navItems = computed(() => 
  navConfig.map(item => ({
    label: item.label,
    icon: item.icon,
    command: () => router.push({ name: item.route }),
  }))
);

const isStoreRoute = computed(() => 
  route.path.startsWith('/store')
);

const isAccountRoute = computed(() => 
  route.name === 'Account'
);

// Navigation handlers
const navigateToStore = () => router.push({ name: 'Store' });
const navigateToAccount = () => router.push({ name: 'Account' });
</script>

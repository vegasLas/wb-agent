<template>
  <div
    class="min-h-screen bg-white dark:bg-[#171819] flex flex-col lg:flex-row"
  >
    <!-- Main Content -->
    <main
      class="flex-1 container mx-auto px-4 py-6 lg:mx-0 lg:max-w-none lg:px-8 lg:py-6 overflow-y-auto relative pb-24"
    >
      <!-- Content skeleton overlay during view loading/navigation -->
      <div
        v-if="showContentSkeleton"
        class="absolute inset-0 bg-white dark:bg-[#171819] z-10"
      >
        <component :is="currentRouteSkeleton" />
      </div>

      <RouterView />
    </main>

    <!-- Bottom Navigation (Mobile) -->
    <BottomNavigation class="lg:hidden" />

    <!-- Global Modals -->
    <MainHelpModal v-model="showHelpModal" />
    <AccountManagementView v-model="accountModalStore.showModal" />
  </div>
</template>

<script setup lang="ts">
import { ref, inject, computed } from 'vue';
import { useAccountSupplierModalStore } from '../../stores/accountSupplierModal';
import { MainHelpModal } from '../help';
import { AccountManagementView } from '../account-management';
import { useSkeleton } from '../../composables/useSkeleton';
import BottomNavigation from '../BottomNavigation.vue';

const accountModalStore = useAccountSupplierModalStore();
const showHelpModal = ref(false);

const currentRouteSkeleton = inject('currentRouteSkeleton');
const { showSkeleton, isRouterInitializing } = useSkeleton();

const showContentSkeleton = computed(
  () => showSkeleton.value && !isRouterInitializing.value,
);
</script>

<template>
  <div
    class="min-h-screen bg-white dark:bg-[#171819] flex flex-col lg:flex-row"
  >
    <!-- App Header/Navigation -->
    <AppHeader
      class="lg:w-64 lg:flex-shrink-0"
      @show-help="showHelpModal = true"
      @show-accounts="accountModalStore.showModal = true"
    />

    <!-- Main Content -->
    <main
      class="flex-1 container mx-auto px-2 lg:mx-0 lg:max-w-none lg:px-8 lg:py-6 overflow-y-auto relative"
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
import AppHeader from './AppHeader.vue';

const accountModalStore = useAccountSupplierModalStore();
const showHelpModal = ref(false);

const currentRouteSkeleton = inject('currentRouteSkeleton');
const { showSkeleton, isRouterInitializing } = useSkeleton();

const showContentSkeleton = computed(
  () => showSkeleton.value && !isRouterInitializing.value,
);
</script>

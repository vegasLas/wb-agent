<template>
  <div class="min-h-screen bg-white dark:bg-[#171819]">
    <!-- App Header/Navigation -->
    <AppHeader 
      @show-help="showHelpModal = true"
      @show-accounts="accountModalStore.showModal = true"
    />
    
    <!-- Main Content -->
    <main class="container mx-auto px-4 py-6">
      <RouterView />
    </main>

    <!-- Global Modals -->
    <MainHelpModal v-model="showHelpModal" />
    <AccountManagementView v-model="accountModalStore.showModal" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAccountSupplierModalStore } from '../../stores/accountSupplierModal';
import { MainHelpModal } from '../help';
import { AccountManagementView } from '../account-management';
import AppHeader from './AppHeader.vue';

const accountModalStore = useAccountSupplierModalStore();
const showHelpModal = ref(false);
</script>

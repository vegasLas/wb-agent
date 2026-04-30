<template>
  <div class="space-y-4">
    <!-- Supplier API Key -->
    <SupplierApiKeyComponent />

    <!-- MPStats Token -->
    <MpstatsTokenComponent />
  </div>
</template>

<script setup lang="ts">
import MpstatsTokenComponent from '../mpstats/MpstatsTokenComponent.vue';
import SupplierApiKeyComponent from '../suppliers/SupplierApiKeyComponent.vue';
</script>

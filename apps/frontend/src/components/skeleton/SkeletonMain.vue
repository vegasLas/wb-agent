<template>
  <main class="container mx-auto px-4 py-6">
    <!-- Header Skeleton -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-2">
        <!-- Navigation Dropdown Skeleton -->
        <Skeleton width="8rem" height="2.25rem" borderRadius="0.25rem" />
        <!-- Help Button Skeleton -->
        <Skeleton width="2.25rem" height="2.25rem" borderRadius="0.25rem" />
      </div>
      <div class="flex items-center gap-2">
        <!-- Store Button Skeleton -->
        <Skeleton width="2.25rem" height="2.25rem" borderRadius="0.25rem" />
        <!-- Account Management Button Skeleton -->
        <Skeleton width="2.25rem" height="2.25rem" borderRadius="0.25rem" />
        <!-- User Profile Button Skeleton -->
        <Skeleton width="6rem" height="2.25rem" borderRadius="0.25rem" />
      </div>
    </div>

    <SkeletonTriggers v-if="isTriggersRoute" />
    <SkeletonAccount v-else-if="isAccountRoute" />
    <SkeletonStore v-else-if="isStoreRoute" />
    <SkeletonAutobookings v-else-if="isAutobookingRoute" />
    <SkeletonReport v-else-if="isReportRoute" />
    <SkeletonAutobookings v-else />
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Skeleton from 'primevue/skeleton';
import SkeletonTriggers from './SkeletonTriggers.vue';
import SkeletonAccount from './SkeletonAccount.vue';
import SkeletonStore from './SkeletonStore.vue';
import SkeletonAutobookings from './SkeletonAutobookings.vue';
import SkeletonReport from './SkeletonReport.vue';

const props = defineProps<{
  routeName: string;
}>();

const isTriggersRoute = computed(() => 
  props.routeName === 'Triggers' || props.routeName === 'TriggersList' || props.routeName === 'TriggerCreate'
);

const isAccountRoute = computed(() => 
  props.routeName === 'Account'
);

const isStoreRoute = computed(() => 
  props.routeName === 'Store' || props.routeName === 'StoreSubscription' || props.routeName === 'StoreBookings'
);

const isAutobookingRoute = computed(() => 
  props.routeName === 'Autobooking' || props.routeName === 'AutobookingList' || 
  props.routeName === 'AutobookingCreate' || props.routeName === 'AutobookingUpdate'
);

const isReportRoute = computed(() => 
  props.routeName === 'Reports'
);
</script>

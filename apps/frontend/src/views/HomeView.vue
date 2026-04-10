<template>
  <div class="space-y-4">
    <UserAlerts />

    <!-- Welcome Section -->
    <Card>
      <template #content>
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
            <i class="pi pi-home text-white text-xl" />
          </div>
          <div>
            <h1 class="text-lg font-semibold">Главная</h1>
            <p class="text-sm text-gray-500">Добро пожаловать в WB Agent</p>
          </div>
        </div>
      </template>
    </Card>

    <!-- Quick Stats -->
    <div class="grid grid-cols-2 gap-3">
      <Card class="text-center">
        <template #content>
          <div class="text-2xl font-bold text-blue-600">
            {{ userStore.user.autobookingCount || 0 }}
          </div>
          <div class="text-xs text-gray-500">Кредитов</div>
        </template>
      </Card>
      <Card class="text-center">
        <template #content>
          <div class="text-2xl font-bold text-green-600">
            {{ subscriptionDays }}
          </div>
          <div class="text-xs text-gray-500">Дней подписки</div>
        </template>
      </Card>
    </div>

    <!-- Quick Actions -->
    <Card>
      <template #title>
        <span class="text-base font-semibold">Быстрые действия</span>
      </template>
      <template #content>
        <div class="grid grid-cols-2 gap-3">
          <Button
            severity="primary"
            outlined
            @click="router.push('/autobooking/create')"
          >
            <i class="pi pi-plus mr-2" />
            Автобронирование
          </Button>
          <Button
            severity="secondary"
            outlined
            @click="router.push('/triggers/create')"
          >
            <i class="pi pi-clock mr-2" />
            Таймслот
          </Button>
          <Button
            severity="info"
            outlined
            @click="router.push('/promotions')"
          >
            <i class="pi pi-tag mr-2" />
            Акции
          </Button>
          <Button
            severity="success"
            outlined
            @click="router.push('/reports')"
          >
            <i class="pi pi-chart-bar mr-2" />
            Отчеты
          </Button>
        </div>
      </template>
    </Card>

    <!-- Recent Activity -->
    <Card v-if="recentActivity.length > 0">
      <template #title>
        <span class="text-base font-semibold">Недавняя активность</span>
      </template>
      <template #content>
        <div class="space-y-3">
          <div
            v-for="(item, index) in recentActivity"
            :key="index"
            class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
          >
            <i :class="[item.icon, 'text-lg', item.iconColor]" />
            <div class="flex-1">
              <div class="text-sm font-medium">{{ item.title }}</div>
              <div class="text-xs text-gray-500">{{ item.time }}</div>
            </div>
          </div>
        </div>
      </template>
    </Card>

    <!-- Empty State -->
    <Card v-else>
      <template #content>
        <div class="text-center py-8 text-gray-500">
          <i class="pi pi-inbox text-4xl mb-3 block" />
          <p class="text-sm">Пока нет активности</p>
          <p class="text-xs mt-1">Создайте первое автобронирование или таймслот</p>
        </div>
      </template>
    </Card>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useViewReady } from '../composables/useSkeleton';
import { useUserStore } from '../stores/user';
import Button from 'primevue/button';
import Card from 'primevue/card';
import UserAlerts from '../components/global/UserAlerts.vue';


const router = useRouter();
const { viewReady } = useViewReady();
const userStore = useUserStore();

const { user, subscriptionRemainingDays } = storeToRefs(userStore);

const subscriptionDays = computed(() => {
  return subscriptionRemainingDays.value || 0;
});

// Mock recent activity - replace with actual data from API
interface ActivityItem {
  icon: string;
  iconColor: string;
  title: string;
  time: string;
}

const recentActivity = ref<ActivityItem[]>([
  // Example data - will be populated from API
]);

onMounted(() => {
  // TODO: Fetch recent activity
  viewReady();
});
</script>

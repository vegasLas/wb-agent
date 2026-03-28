<template>
  <div class="min-h-screen flex items-center justify-center p-4 bg-white dark:bg-[#171819]">
    <div class="text-center max-w-md">
      <div
        class="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
        :class="iconBgClass"
      >
        <i :class="[iconClass, 'text-4xl', iconColorClass]" />
      </div>
      
      <h1 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        {{ title }}
      </h1>
      
      <p class="text-gray-600 dark:text-gray-400 mb-8">
        {{ message }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

type ErrorType = 'session_expired' | 'maintenance' | 'not_found';

const errorType = computed(() => (route.meta.errorType as ErrorType) || 'not_found');

const errorConfig: Record<ErrorType, { title: string; message: string; icon: string; iconBg: string; iconColor: string }> = {
  'session_expired': {
    title: 'Сессия истекла',
    message: 'Пожалуйста, переоткройте кабинет для обновления данных авторизации',
    icon: 'pi pi-clock',
    iconBg: 'bg-orange-100 dark:bg-orange-900/30',
    iconColor: 'text-orange-600 dark:text-orange-400',
  },
  'maintenance': {
    title: 'Технические работы',
    message: 'Сервис временно недоступен. Мы уже работаем над восстановлением.',
    icon: 'pi pi-wrench',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  'not_found': {
    title: 'Пользователь не найден',
    message: 'Произошла ошибка при загрузке данных пользователя',
    icon: 'pi pi-user-minus',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
  },
};

const config = computed(() => errorConfig[errorType.value]);
const title = computed(() => config.value.title);
const message = computed(() => config.value.message);
const iconClass = computed(() => config.value.icon);
const iconBgClass = computed(() => config.value.iconBg);
const iconColorClass = computed(() => config.value.iconColor);
</script>

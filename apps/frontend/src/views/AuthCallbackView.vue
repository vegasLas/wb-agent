<template>
  <div class="min-h-screen flex items-center justify-center bg-theme p-4">
    <div class="text-center">
      <i class="pi pi-spinner pi-spin text-purple text-4xl" />
      <p class="text-secondary mt-4">Завершение авторизации...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useBrowserAuthStore } from '@/stores/auth';
import { useUserStore } from '@/stores/user';
import { setAuthToken } from '@/api/client';

const route = useRoute();
const router = useRouter();
const authStore = useBrowserAuthStore();
const userStore = useUserStore();

onMounted(async () => {
  const accessToken = route.query.access_token as string;
  const refreshToken = route.query.refresh_token as string;
  const expiresIn = route.query.expires_in as string;
  const error = route.query.error as string;

  if (error) {
    const messages: Record<string, string> = {
      vk_denied: 'Авторизация VK отменена',
      subscription_required: 'Требуется активная подписка',
      auth_failed: 'Ошибка авторизации',
    };
    await router.replace({ path: '/login', query: { error: messages[error] || error } });
    return;
  }

  if (!accessToken || !refreshToken || !expiresIn) {
    await router.replace({ path: '/login', query: { error: 'invalid_callback' } });
    return;
  }

  // Store tokens directly in localStorage (browserAuthStore uses useStorage which syncs with these keys)
  localStorage.setItem('auth_access_token', accessToken);
  localStorage.setItem('auth_refresh_token', refreshToken);
  localStorage.setItem('auth_token_expires_at', String(Date.now() + parseInt(expiresIn, 10) * 1000));
  setAuthToken(accessToken);

  // Populate user store
  try {
    await userStore.fetchUser();
    await router.replace('/');
  } catch {
    // Clear tokens on failure
    localStorage.removeItem('auth_access_token');
    localStorage.removeItem('auth_refresh_token');
    localStorage.removeItem('auth_token_expires_at');
    setAuthToken(null);
    userStore.reset();
    await router.replace({ path: '/login', query: { error: 'failed_to_fetch_user' } });
  }
});
</script>

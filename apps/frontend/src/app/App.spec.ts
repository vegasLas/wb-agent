import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import App from './App.vue';

// Mock @vueuse/core
vi.mock('@vueuse/core', () => ({
  useColorMode: () => ({
    preference: 'light',
  }),
}));

// Create a mock router for testing
function createMockRouter() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      {
        path: '/',
        name: 'Account',
        component: { template: '<div>Account Page</div>' },
        meta: { title: 'Account' },
      },
      {
        path: '/autobooking',
        name: 'Autobooking',
        component: { template: '<div>Autobooking Page</div>' },
        meta: { title: 'Autobooking' },
      },
      {
        path: '/error/session-expired',
        name: 'SessionExpired',
        component: { template: '<div>Session Expired</div>' },
        meta: { title: 'Session Expired', public: true },
      },
      {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: { template: '<div>Not Found</div>' },
        meta: { title: 'Not Found', public: true },
      },
    ],
  });
}

describe('App', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders properly with router', async () => {
    const router = createMockRouter();
    router.push('/');
    await router.isReady();

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    });

    await flushPromises();

    // Component should mount without errors
    expect(wrapper.exists()).toBe(true);
  });

  it('shows initial loading state', async () => {
    const router = createMockRouter();

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    });

    // Should show loading initially before router is ready
    expect(wrapper.findComponent({ name: 'InitialLoading' }).exists()).toBe(
      true,
    );

    // Wait for router
    await router.isReady();
    await flushPromises();
  });

  it('renders error routes correctly', async () => {
    const router = createMockRouter();
    router.push('/error/session-expired');
    await router.isReady();

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    });

    await flushPromises();

    expect(wrapper.exists()).toBe(true);
  });
});

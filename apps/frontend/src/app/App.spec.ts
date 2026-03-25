import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import App from './App.vue';
import AppMain from './AppMain.vue';

// Mock vue-tg
vi.mock('vue-tg', () => ({
  useWebApp: () => ({
    initData: '',
    ready: vi.fn(),
    expand: vi.fn(),
  }),
  useWebAppTheme: () => ({
    colorScheme: { value: 'light' },
  }),
}));

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
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: { template: '<div>Not Found</div>' },
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
        stubs: {
          TechnicalMaintenanceError: true,
          NotFound: true,
          SkeletonMain: true,
          AppMain: true,
        },
      },
    });

    await flushPromises();
    
    // Component should mount without errors
    expect(wrapper.exists()).toBe(true);
  });
});

describe('AppMain', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders navigation', async () => {
    const router = createMockRouter();
    router.push('/');
    await router.isReady();

    const wrapper = mount(AppMain, {
      props: {
        showMain: true,
      },
      global: {
        plugins: [router],
        stubs: {
          RouterView: true,
          AccountManagementView: true,
        },
      },
    });

    await flushPromises();
    
    // Should have rendered content
    expect(wrapper.exists()).toBe(true);
  });

  it('renders with showMain prop', async () => {
    const router = createMockRouter();
    router.push('/');
    await router.isReady();

    const wrapper = mount(AppMain, {
      props: {
        showMain: true,
      },
      global: {
        plugins: [router],
        stubs: {
          RouterView: true,
          AccountManagementView: true,
        },
      },
    });

    await flushPromises();
    
    // Should have visible class
    expect(wrapper.classes()).toContain('visible');
  });

  it('is invisible when showMain is false', async () => {
    const router = createMockRouter();
    router.push('/');
    await router.isReady();

    const wrapper = mount(AppMain, {
      props: {
        showMain: false,
      },
      global: {
        plugins: [router],
        stubs: {
          RouterView: true,
          AccountManagementView: true,
        },
      },
    });

    await flushPromises();
    
    // Should have invisible class
    expect(wrapper.classes()).toContain('invisible');
  });
});

import { describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import AppMain from './AppMain.vue';

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
    
    // Should render AppMain component
    expect(wrapper.findComponent(AppMain).exists()).toBe(true);
  });
});

describe('AppMain', () => {
  it('renders navigation', async () => {
    const router = createMockRouter();
    router.push('/');
    await router.isReady();

    const wrapper = mount(AppMain, {
      global: {
        plugins: [router],
        stubs: {
          RouterView: true,
        },
      },
    });

    await flushPromises();
    
    // Should have navigation buttons
    const navButtons = wrapper.findAll('nav button');
    expect(navButtons.length).toBeGreaterThan(0);
    
    // Should have header with title
    expect(wrapper.find('header').exists()).toBe(true);
  });

  it('shows correct page title for route', async () => {
    const router = createMockRouter();
    router.push('/');
    await router.isReady();

    const wrapper = mount(AppMain, {
      global: {
        plugins: [router],
        stubs: {
          RouterView: true,
        },
      },
    });

    await flushPromises();
    
    // Should show "Account" as the page title
    expect(wrapper.text()).toContain('Account');
  });

  it('highlights active route', async () => {
    const router = createMockRouter();
    router.push('/');
    await router.isReady();

    const wrapper = mount(AppMain, {
      global: {
        plugins: [router],
        stubs: {
          RouterView: true,
        },
      },
    });

    await flushPromises();
    
    // Find the Account nav button (should be active since we're on /)
    const navButtons = wrapper.findAll('nav button');
    const accountButton = navButtons.find(btn => btn.text().includes('Account'));
    
    expect(accountButton).toBeDefined();
    expect(accountButton?.classes()).toContain('text-blue-500');
  });
});

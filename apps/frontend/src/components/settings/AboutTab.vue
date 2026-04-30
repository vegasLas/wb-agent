<template>
  <div class="space-y-6">
    <!-- App Info -->
    <div class="space-y-2">
      <div class="flex items-center gap-3">
        <AppLogo :size="40" />
        <div>
          <h3 class="text-lg font-semibold text-theme">WBOI</h3>
          <p class="text-sm text-secondary">Панель управления для селлеров Wildberries</p>
        </div>
      </div>
    </div>

    <!-- Legal Policies -->
    <div class="space-y-3">
      <h3 class="text-base font-medium text-theme">Правовая информация</h3>

      <Panel
        v-for="policy in policies"
        :key="policy.key"
        :header="policy.label"
        toggleable
        collapsed
        class="text-sm"
      >
        <component :is="policy.component" />
      </Panel>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppLogo from '../layout/AppLogo.vue';
import Panel from 'primevue/panel';
import { PolicyPrivacy, PolicyTerms, PolicyCookies } from '@/components/legal';

const policies = [
  { key: 'privacy', label: 'Политика конфиденциальности', component: PolicyPrivacy },
  { key: 'terms', label: 'Пользовательское соглашение', component: PolicyTerms },
  { key: 'cookies', label: 'Политика использования cookies', component: PolicyCookies },
];
</script>

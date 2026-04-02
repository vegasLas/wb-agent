import './styles.css';
import 'primeicons/primeicons.css';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { vMaska } from 'maska/vue';
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import { definePreset } from '@primeuix/themes';
import ConfirmationService from 'primevue/confirmationservice';
import DialogService from 'primevue/dialogservice';
import ToastService from 'primevue/toastservice';
import Tooltip from 'primevue/tooltip';

import App from './app/App.vue';
import router from './router';

// Custom preset with lighter Card background for dark mode
const MyPreset = definePreset(Aura, {
  components: {
    card: {
      colorScheme: {
        dark: {
          background: 'rgb(31, 31, 32)', // Lighter than default (was ~#0f172a)
          color: '{surface.0}',
        },
      },
    },
  },
});

const app = createApp(App);

// Install plugins
app.use(createPinia());
app.use(router);

// PrimeVue Configuration
app.use(PrimeVue, {
  theme: {
    preset: MyPreset,
    options: {
      prefix: 'p',
      darkModeSelector: '.dark',
      cssLayer: false,
    },
  },
  ripple: true,
  inputVariant: 'outlined',
});

// PrimeVue Services
app.use(ConfirmationService);
app.use(DialogService);
app.use(ToastService);

// Register directives
app.directive('maska', vMaska);
app.directive('tooltip', Tooltip);

// Mount app
app.mount('#root');

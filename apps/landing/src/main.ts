import { createApp } from 'vue';
import { useColorMode } from '@vueuse/core';
import App from './App.vue';
import './style.css';

// Initialize color mode before mounting
useColorMode({
  attribute: 'class',
  selector: 'html',
});

createApp(App).mount('#app');

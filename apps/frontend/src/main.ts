import './styles.css';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { vMaska } from 'maska/vue';
import App from './app/App.vue';
import router from './router';

const app = createApp(App);

// Install plugins
app.use(createPinia());
app.use(router);

// Register directives
app.directive('maska', vMaska);

// Mount app
app.mount('#root');

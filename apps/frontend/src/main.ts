import './styles.css';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './app/App.vue';
import router from './router';

const app = createApp(App);

// Install plugins
app.use(createPinia());
app.use(router);

// Mount app
app.mount('#root');

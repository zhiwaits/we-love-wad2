import './assets/main.css'

import { createApp } from 'vue'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle'
import axios from 'axios'
import App from './App.vue'
import store from './store'  // ← Import the Vuex store

const app = createApp(App)
app.use(store)  // ← Register the store with Vue
app.mount('#app')

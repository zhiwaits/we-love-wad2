import './assets/main.css'

import { createApp } from 'vue'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle'
import App from './App.vue'
import store from './store'
import router from './router'  
import './services/config'

const app = createApp(App)
app.use(store)
app.use(router)  
app.mount('#app')
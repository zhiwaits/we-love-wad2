import { createRouter, createWebHistory } from 'vue-router';

// Import your components
// (We'll create Dashboard.vue in next step, so this will show an error temporarily - that's OK)
import Dashboard from '../components/Dashboard.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Homepage.vue')  // ← Correct
  },
  {
    path: '/events/:id',
    name: 'EventDetail',
    component: () => import('../views/EventDetailPage.vue')
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
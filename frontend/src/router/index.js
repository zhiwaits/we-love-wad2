import { createRouter, createWebHistory } from 'vue-router';
import store from '../store';

// Import views
import Homepage from '../views/Homepage.vue';
import AuthPage from '../views/AuthPage.vue';
import Dashboard from '../components/Dashboard.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Homepage,
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: AuthPage,
    meta: { requiresAuth: false }
  },
  {
    path: '/register',
    name: 'Register',
    component: AuthPage,
    meta: { requiresAuth: false }
  },
  {
    path: '/events/:id',
    name: 'EventDetail',
    component: () => import('../views/EventDetailPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/events/create',
    name: 'CreateEvent',
    component: () => import('../views/CreateEventPage.vue'),
    meta: { requiresAuth: true, requiresRole: 'club' }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/clubs',
    name: 'BrowseClubs',
    component: () => import('../views/BrowseClubs.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.meta.requiresAuth;
  const requiredRole = to.meta.requiresRole;

  let isAuthenticated = store.getters['auth/isAuthenticated'];

  if (requiresAuth && !isAuthenticated) {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await store.dispatch('auth/checkAuth');
      } catch (error) {
        console.error('Failed to restore session before navigation:', error);
      }
      isAuthenticated = store.getters['auth/isAuthenticated'];
    }

    if (!isAuthenticated) {
      return next({ name: 'Login', query: { redirect: to.fullPath } });
    }
  }

  if (requiredRole) {
    const currentUser = store.getters['auth/currentUser'];
    const role = currentUser?.role || currentUser?.account_type;
    if (role !== requiredRole) {
      return next({ name: 'Home' });
    }
  }

  return next();
});

export default router;
import { createRouter, createWebHistory } from 'vue-router';
import store from '../store';

// Import views
import Homepage from '../views/Homepage.vue';
import AuthPage from '../views/AuthPage.vue';
import UserDashboard from '../components/UserDashboard.vue';
import ClubDashboard from '../components/ClubDashboard.vue';

const CLUB_ALLOWED_AUTH_ROUTES = new Set(['Home', 'ClubDashboard', 'CreateEvent', 'EditEvents']);
const ANONYMOUS_ROUTES = new Set(['Login', 'Register']);

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
    path: '/events/edit',
    name: 'EditEvents',
    component: () => import('../views/EditEventsPage.vue'),
    meta: { requiresAuth: true, requiresRole: 'club' }
  },
  {
    path: '/dashboard',
    name: 'UserDashboard',
    component: UserDashboard,
    meta: { requiresAuth: true, requiresRole: ['user'] }
  },
  {
    path: '/dashboard/club',
    name: 'ClubDashboard',
    component: ClubDashboard,
    meta: { requiresAuth: true, requiresRole: ['club'] }
  },
  {
    path: '/clubs',
    name: 'BrowseClubs',
    component: () => import('../views/BrowseClubs.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/clubs/:id',
    name: 'ClubDetail',
    component: () => import('../views/ClubDetailPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login'
  },
  {
    path: '/confirm-rsvp/:token',
    name: 'ConfirmRsvp',
    component: () => import('../views/ConfirmRsvp.vue'),
    meta: { requiresAuth: false }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to, from, next) => {
  const routeName = to.name;
  const requiresAuth = Boolean(to.meta.requiresAuth);
  const requiredRolesMeta = to.meta.requiresRole;
  const requiredRoles = requiredRolesMeta
    ? Array.isArray(requiredRolesMeta) ? requiredRolesMeta : [requiredRolesMeta]
    : [];

  const isAnonymousRoute = routeName ? ANONYMOUS_ROUTES.has(routeName) : false;

  let isAuthenticated = store.getters['auth/isAuthenticated'];

  if (isAnonymousRoute && isAuthenticated) {
    return next({ name: 'Home' });
  }

  const needsSession = requiresAuth || !isAnonymousRoute;

  if (needsSession && !isAuthenticated) {
    const token = localStorage.getItem('token');

    if (token) {
      try {
        await store.dispatch('auth/checkAuth');
      } catch (error) {
        console.error('Failed to restore session before navigation:', error);
      }
      isAuthenticated = store.getters['auth/isAuthenticated'];
    } else {
      await store.dispatch('resetAppState');
    }

    if (!isAuthenticated) {
      return next({ name: 'Login', query: { redirect: to.fullPath } });
    }
  }

  if (!needsSession) {
    return next();
  }

  const currentUser = store.getters['auth/currentUser'];
  const role = currentUser?.role || currentUser?.account_type || null;

  if (role === 'club' && routeName === 'UserDashboard') {
    return next({ name: 'ClubDashboard' });
  }

  if (role === 'club' && routeName && !CLUB_ALLOWED_AUTH_ROUTES.has(routeName)) {
    return next({ name: 'ClubDashboard' });
  }

  if (requiredRoles.length > 0 && (!role || !requiredRoles.includes(role))) {
    return next({ name: 'Home' });
  }

  return next();
});

export default router;
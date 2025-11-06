<script setup>
import { onMounted, computed, ref } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';
import UserHeader from './components/UserHeader.vue';
import ClubHeader from './components/ClubHeader.vue';
import Toast from './components/Toast.vue';

const store = useStore();
const route = useRoute();
const router = useRouter();

const ANONYMOUS_ROUTES = new Set(['Login', 'Register']);

const isBootstrapping = ref(true);

const currentUser = computed(() => store.getters['auth/currentUser']);
const isAuthenticated = computed(() => store.getters['auth/isAuthenticated']);
const isAnonymousRoute = computed(() => ANONYMOUS_ROUTES.has(route.name));

const showHeader = computed(() => !isAnonymousRoute.value && isAuthenticated.value);

const activeHeader = computed(() => {
  if (!showHeader.value) return null;
  const role = currentUser.value?.role || currentUser.value?.account_type;
  if (!role) return null;
  return role === 'club' ? ClubHeader : UserHeader;
});

const canRenderRoute = computed(() => !isBootstrapping.value && (isAuthenticated.value || isAnonymousRoute.value));

const redirectIfNeeded = async (targetName) => {
  try {
    if (route.name !== targetName) {
      await router.replace({ name: targetName });
    }
  } catch (error) {
    if (import.meta.env.MODE !== 'production') {
      console.warn(`Navigation to ${targetName} failed:`, error);
    }
  }
};

const bootstrapSession = async () => {
  const token = localStorage.getItem('token');

  if (!token) {
  await store.dispatch('resetAppState');
    if (!isAnonymousRoute.value) {
      await redirectIfNeeded('Login');
    }
    isBootstrapping.value = false;
    return;
  }

  try {
    await store.dispatch('auth/checkAuth');
  } catch (error) {
    console.error('Failed to restore session:', error);
  }

  const authenticated = store.getters['auth/isAuthenticated'];

  if (!authenticated) {
  await store.dispatch('resetAppState');
    await redirectIfNeeded('Login');
  } else if (isAnonymousRoute.value) {
    await redirectIfNeeded('Home');
  }

  isBootstrapping.value = false;
};

onMounted(async () => {
  await bootstrapSession();
});
</script>

<template>
  <div id="app">
    <div v-if="isBootstrapping" class="app-loading-screen">
      <span class="loading-text">SMU Events Hub is Loading...</span>
    </div>
    <template v-else>
      <component v-if="activeHeader" :is="activeHeader" />
      <transition name="fade" mode="out-in">
        <keep-alive v-if="canRenderRoute">
          <router-view />
        </keep-alive>
      </transition>
    </template>
    <Toast />
  </div>
</template>

<style>
#app {
  min-height: 100vh;
}

.app-loading-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-background, #f5f7fb);
}

.loading-text {
  font-size: 1.1rem;
  color: var(--color-text, #1f2933);
}

/* Route Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Outline button: neutral chip -> primary-tinted hover/active (Browse Events style) */
.btn.btn-outline {
  --btn-bg: var(--color-bg-2, var(--color-bg-1));
  --btn-border: var(--color-border);
  --btn-fg: var(--color-text);
  --btn-bg-hover: rgba(var(--color-primary-rgb, 33, 128, 141), 0.12);
  --btn-bg-active: rgba(var(--color-primary-rgb, 33, 128, 141), 0.18);

  color: var(--btn-fg);
  background-color: var(--btn-bg);
  border: 1px solid var(--btn-border);
  border-radius: var(--radius-full);
  padding: 8px 14px;
  font-weight: var(--font-weight-medium);
  transition:
    color var(--duration-fast),
    border-color var(--duration-fast),
    background-color var(--duration-fast),
    box-shadow var(--duration-fast),
    transform var(--duration-fast);
}

.btn.btn-outline:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
  background-color: var(--btn-bg-hover);
}

.btn.btn-outline:active {
  color: var(--color-primary);
  border-color: var(--color-primary);
  background-color: var(--btn-bg-active);
  transform: translateY(0.5px);
}

.btn.btn-outline:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb, 33, 128, 141), 0.25);
}

@media (prefers-color-scheme: dark) {
  .btn.btn-outline {
    --btn-bg: color-mix(in srgb, var(--color-surface) 86%, transparent);
    --btn-border: rgba(255, 255, 255, 0.16);
    --btn-bg-hover: rgba(var(--color-primary-rgb, 33, 128, 141), 0.20);
    --btn-bg-active: rgba(var(--color-primary-rgb, 33, 128, 141), 0.28);
  }
}

/* FullCalendar list view global fallback */
.fc-theme-standard td,
.fc-theme-standard th {
  border-color: var(--color-border);
}

.fc .fc-scrollgrid {
  border-color: var(--color-border);
}

.fc .fc-list,
.fc .fc-list-table {
  background-color: var(--color-surface);
}

.fc .fc-list-day-cushion {
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.fc .fc-list-event td {
  border-color: var(--color-border);
}

.fc .fc-list-event:hover td {
  background-color: rgba(var(--color-primary-rgb, 33, 128, 141), 0.08);
}
</style>
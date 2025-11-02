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
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`Navigation to ${targetName} failed:`, error);
    }
  }
};

const bootstrapSession = async () => {
  const token = localStorage.getItem('token');

  if (!token) {
    await store.dispatch('resetAppState', null, { root: true });
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
    await store.dispatch('resetAppState', null, { root: true });
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

  <component v-if="activeHeader" :is="activeHeader" />
    
    <router-view />
    <Toast />
  </div>
</template>

<style>
#app {
  min-height: 100vh;
}
</style>
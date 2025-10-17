<script setup>
import { onMounted, computed, watch } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';
import UserHeader from './components/UserHeader.vue';
import ClubHeader from './components/ClubHeader.vue';
import Toast from "./components/Toast.vue";

const store = useStore();
const route = useRoute();
const router = useRouter();

const showHeader = computed(() => !['Login', 'Register'].includes(route.name));

const currentUser = computed(() => store.getters['auth/currentUser']);

const activeHeader = computed(() => {
  if (!showHeader.value) return null;
  const role = currentUser.value?.role || currentUser.value?.account_type;
  return role === 'club' ? ClubHeader : UserHeader;
});


const checkAuthAndRedirect = async () => {

  if (route.name === 'Login' || route.name === 'Register') {
    return;
  }
  const token = localStorage.getItem('token');
  
  if (token) {
    console.log('Token found, restoring session...');
    try {
      await store.dispatch('auth/checkAuth');
      console.log('Session restored successfully');
    } catch (error) {
      console.error('Failed to restore session:', error);
      localStorage.removeItem('token');
    }
  }
  
  const isAuth = store.getters['auth/isAuthenticated'];
  console.log('Is authenticated:', isAuth);
  console.log('Current route:', route.name);
  
  if (!isAuth && route.name !== 'Login' && route.name !== 'Register') {
    console.log('Not authenticated, redirecting to login...');
    router.push('/login');
  }
  
  if (isAuth && (route.name === 'Login' || route.name === 'Register')) {
    console.log('Already authenticated, redirecting to home...');
    router.push('/');
  }
};

onMounted(() => {
  checkAuthAndRedirect();
});

watch(() => route.path, () => {
  checkAuthAndRedirect();
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
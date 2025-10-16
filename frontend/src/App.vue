<script setup>
import { onMounted, computed, watch } from 'vue';
import { useStore } from 'vuex';
import { useRoute, useRouter } from 'vue-router';
import Header from './components/Header.vue';
import Toast from "./components/Toast.vue";

const store = useStore();
const route = useRoute();
const router = useRouter();

// Hide header ONLY on login/register pages
const showHeader = computed(() => {
  return !['Login', 'Register'].includes(route.name);
});

// Check authentication and redirect
const checkAuthAndRedirect = async () => {
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
  
  // After checking auth, redirect if needed
  const isAuth = store.getters['auth/isAuthenticated'];
  console.log('Is authenticated:', isAuth);
  console.log('Current route:', route.name);
  
  // If not authenticated and not on auth pages, redirect to login
  if (!isAuth && route.name !== 'Login' && route.name !== 'Register') {
    console.log('Not authenticated, redirecting to login...');
    router.push('/login');
  }
  
  // If authenticated and on auth pages, redirect to home
  if (isAuth && (route.name === 'Login' || route.name === 'Register')) {
    console.log('Already authenticated, redirecting to home...');
    router.push('/');
  }
};

// Check on mount
onMounted(() => {
  checkAuthAndRedirect();
});

// Watch route changes
watch(() => route.path, () => {
  checkAuthAndRedirect();
});
</script>

<template>
  <div id="app">
    <!-- Show header everywhere except auth pages -->
    <Header v-if="showHeader" />
    
    <router-view />
  </div>
</template>

<style>
#app {
  min-height: 100vh;
}
</style>
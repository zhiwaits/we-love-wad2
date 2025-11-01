<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
import UserHomepage from './UserHomepage.vue';
import ClubHomePage from './ClubHomePage.vue';

const store = useStore();

const currentUser = computed(() => store.getters['auth/currentUser']);
const isClub = computed(() => {
  const role = currentUser.value?.role || currentUser.value?.account_type;
  return role === 'club';
});
</script>

<template>
  <component :is="isClub ? ClubHomePage : UserHomepage" />
</template>

<script setup>
import Header from "./components/Header.vue";
import Toast from "./components/Toast.vue";
</script>

<template>
    <div id="app">
        <Header></Header>
        
        <!-- Router View - This displays the current route's component -->
        <router-view></router-view>

        <Toast />
    </div>
</template>

<style scoped>
/* No styles needed here anymore - moved to individual pages */
</style>
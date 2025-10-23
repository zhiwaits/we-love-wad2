<script setup>
import CreateEvent from '../components/CreateEvent.vue';
</script>

<template>
  <section class="create-event-page">
    <div class="container">
      <CreateEvent />
    </div>
  </section>
</template>

<style scoped>
.create-event-page {
  background-color: var(--color-background);
  padding: clamp(24px, 5vw, 48px) 0;
}

.container {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 var(--space-16, 16px);
}
</style>

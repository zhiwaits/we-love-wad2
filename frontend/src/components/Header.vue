<template>
  <header class="header p-4">
    <div class="container-fluid">
      <div class="header-content">
        <div class="logo-section">
          <h1 class="logo">SMU Events Hub</h1>
          <p class="tagline">Discover amazing events</p>
        </div>
        <nav class="nav">
          <router-link to="/" class="nav-link">Browse Events</router-link>
          <router-link to="/dashboard" class="nav-link">My Dashboard</router-link>
          <a href="#" class="nav-link">Create Event</a>
        </nav>
        <button class="btn btn--primary">Sign In</button>
      </div>
    </div>
  </header>
</template>
<script>
export default { name: 'Header' }
</script>

<style scoped>
.header {
  background-color: var(--color-cream-50);
  padding: var(--space-16) 0;
  border-bottom: 1px solid var(--color-border);
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-32);
}

.logo-section {
  display: flex;
  flex-direction: column;
}

.logo {
  color: var(--color-black);
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin: 0;
  line-height: 1;
}

.tagline {
  color: var(--color-gray-300);
  font-size: var(--font-size-sm);
  margin: var(--space-2) 0 0 0;
}

.nav {
  display: flex;
  gap: var(--space-32);
}

.nav-link {
  color: var(--color-black);
  text-decoration: none;
  font-weight: var(--font-weight-medium);
  transition: color var(--duration-fast) var(--ease-standard);
}

.nav-link:hover {
  color: var(--color-blue);
}
</style>
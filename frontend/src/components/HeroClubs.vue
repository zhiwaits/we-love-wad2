<template>
    <section class="hero">
        <div class="container">
            <div class="hero-content">
                <h2 class="hero-title">Discover SMU clubs to find your people</h2>
                <p class="hero-subtitle">Connect with clubs that fuel your passions and friendships.</p>
            </div>
        </div>
    </section>
</template>

<script>
export default { name: 'Hero' }
</script>

<style scoped>
.hero {
    background-color: var(--color-surface);
    padding: var(--space-32) 0;
    text-align: center;
}

.hero-content {
    max-width: 800px;
    margin: 0 auto;
}

.hero-title {
    font-size: var(--font-size-4xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text);
    margin-bottom: var(--space-20);
    line-height: var(--line-height-tight);
}

.hero-subtitle {
    font-size: var(--font-size-lg);
    color: var(--color-text-secondary);
    line-height: var(--line-height-normal);
    margin: 0;
}
</style>
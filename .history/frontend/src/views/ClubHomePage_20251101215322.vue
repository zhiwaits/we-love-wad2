<script setup>
import CreateEvent from "../components/CreateEvent.vue";
</script>

<template>
    <div class="club-create-page">
        <div class="create-wrapper">
            <CreateEvent />
        </div>
    </div>
</template>

<style scoped>
.club-create-page {
    /* Full viewport so we can center the inner card with equal margins */
    min-height: 100vh;
    display: flex;
    align-items: center; /* vertical center */
    justify-content: center; /* horizontal center */
    background-color: var(--color-background);
    color: var(--color-text);
    padding: var(--space-24, 24px); /* ensures equal outer spacing on very small screens */
    box-sizing: border-box;
}

.create-wrapper {
    /* Constrain width of the create form and allow it to size naturally */
    width: 100%;
    max-width: 960px; /* reasonable form width */
    margin: auto; /* keep centered if parent layout changes */
}

.main-content {
    padding: var(--space-32, 32px) var(--space-16, 16px);
    background-color: inherit;
}

.content-layout {
    display: grid;
    grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
    gap: clamp(var(--space-16, 16px), 3vw, var(--space-32, 32px));
    align-items: start;
    background-color: inherit;
    color: inherit;
}

.sidebar {
    position: sticky;
    top: var(--space-24, 20px);
    height: fit-content;
}

.events-area {
    min-width: 0;
}

/* Responsive Design */
@media (max-width: 1024px) {
    .content-layout {
        grid-template-columns: minmax(240px, 280px) minmax(0, 1fr);
        gap: var(--space-24, 24px);
    }
}

@media (max-width: 768px) {
    .content-layout {
        grid-template-columns: 1fr;
        gap: var(--space-16, 16px);
    }

    .sidebar {
        position: static;
    }
}
</style>
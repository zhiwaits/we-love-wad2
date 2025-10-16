<script setup>
import Hero from "../components/HeroEvents.vue";
import Search from "../components/SearchEvents.vue";
import FilterPanel from "../components/EventsFilterPanel.vue";
import EventsGrid from "../components/EventsGrid.vue";
</script>

<template>
    <div class="home-page">
        <Hero></Hero>
        <Search></Search>

        <div class="container-fluid main-content">
            <div class="content-layout">
                <div class="sidebar">
                    <FilterPanel></FilterPanel>
                </div>

                <div class="events-area">
                    <EventsGrid></EventsGrid>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.home-page {
    background-color: var(--color-background);
    color: var(--color-text);
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
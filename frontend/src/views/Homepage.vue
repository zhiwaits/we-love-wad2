<script setup>
import Hero from "../components/Hero.vue";
import Search from "../components/Search.vue";
import FilterPanel from "../components/FilterPanel.vue";
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
.main-content {
    padding: var(--space-32, 32px) 0;
}

.content-layout {
    display: grid;
    grid-template-columns: 22vw 1fr;
    gap: var(--space-32, 32px);
}

.sidebar {
    position: sticky;
    top: var(--space-24, 20px);
    margin-left: 4vw;
    height: fit-content;
}

.events-area {
    min-width: 0;
}

/* Responsive Design */
@media (max-width: 1024px) {
    .content-layout {
        grid-template-columns: 250px 1fr;
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
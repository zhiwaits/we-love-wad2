<script setup>
import Header from "./components/Header.vue";
import Hero from "./components/Hero.vue";
import Search from "./components/Search.vue";
import FilterPanel from "./components/FilterPanel.vue";
import EventsGrid from "./components/EventsGrid.vue";
</script>

<template>
    <div id="app">
        <Header></Header>
        <Hero></Hero>
        <Search></Search>
        
        <!-- New Layout with Sidebar and Content -->
        <div class="container main-content">
            <div class="content-layout">
                <!-- Sidebar with Advanced Filters -->
                <div class="sidebar">
                    <FilterPanel></FilterPanel>
                </div>
                
                <!-- Main Content Area -->
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
    grid-template-columns: 300px 1fr;
    gap: var(--space-32, 32px);
}

.sidebar {
    position: sticky;
    top: var(--space-20, 20px);
    height: fit-content;
}

.events-area {
    min-width: 0; /* Prevents grid overflow */
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

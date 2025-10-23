<script setup>
import HeroClubEvents from "../components/HeroClubEvents.vue";
import SearchClubEvents from "../components/SearchClubEvents.vue";
import ClubEventsGrid from "../components/ClubEventsGrid.vue";
</script>

<template>
    <div class="club-home-page">
        <HeroClubEvents></HeroClubEvents>
        <SearchClubEvents></SearchClubEvents>

        <div class="container-fluid main-content">
            <div class="content-layout">
                <div class="events-area">
                    <ClubEventsGrid></ClubEventsGrid>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.club-home-page {
    background-color: var(--color-background);
    color: var(--color-text);
    min-height: 100vh;
}

.main-content {
    padding: var(--space-32, 32px) var(--space-16, 16px);
    background-color: inherit;
}

.content-layout {
    max-width: 1400px;
    margin: 0 auto;
}

.events-area {
    min-width: 0;
}

/* Responsive Design */
@media (max-width: 768px) {
    .main-content {
        padding: var(--space-24, 24px) var(--space-12, 12px);
    }
}
</style>

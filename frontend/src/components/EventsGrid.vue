<script>
import { mapGetters, mapActions, mapState } from 'vuex';
import EventDetailModal from './EventDetailModal.vue';

export default {
    name: 'EventsGrid',
    components: {
        EventDetailModal
    },

    data() {
        return {
            selectedEvent: null,
            showEventModal: false
        };
    },

    mounted() {
        this.$store.dispatch('fetchAllEvents');
    },

    computed: {
        // Get filtered events from store instead of hardcoded data
        ...mapGetters(['filteredEvents']),
        ...mapState(['filters']),

        // Alias for template clarity
        events() {
            return this.filteredEvents;
        }
    },

    methods: {
        ...mapActions(['toggleTag']),

        // Format attendees display
        formatAttendees(event) {
            if (event.maxAttendees) {
                return `${event.attendees} / ${event.maxAttendees} attending`;
            }
            return `${event.attendees} attending`;
        },

        // Format date for display
        formatDate(dateString) {
            const date = new Date(dateString);
            const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
            return date.toLocaleDateString('en-US', options);
        },

        // Handle tag click
        handleTagClick(tag) {
            this.toggleTag(tag);
            // Scroll to top to see filtered results
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },

        handleTagFromModal(tag) {
            this.handleTagClick(tag);
            this.closeEventModal();
        },

        openEventModal(event) {
            this.selectedEvent = event;
            this.showEventModal = true;
        },

        closeEventModal() {
            this.showEventModal = false;
            this.selectedEvent = null;
        },

        // Check if tag is selected
        isTagSelected(tag) {
            return this.filters.selectedTags.includes(tag);
        }
    }
}
</script>

<template>
    <section class="events-grid">
        <div class="container">
            <!-- No Results Message -->
            <div v-if="events.length === 0" class="no-results">
                <h3>No events found</h3>
                <p>Try adjusting your search or filters to find what you're looking for.</p>
            </div>

            <!-- Events Grid -->
            <div v-else class="events-container">
                <div
                    v-for="event in events"
                    :key="event.id"
                    class="event-card"
                    role="button"
                    tabindex="0"
                    @click="openEventModal(event)"
                    @keyup.enter.prevent="openEventModal(event)"
                    @keyup.space.prevent="openEventModal(event)"
                >
                    <div class="event-image">
                        <img v-if="event.image" :src="event.image" alt="Event Image" class="event-img" />
                        <div v-else class="event-image-placeholder"></div>
                        <div class="event-price-tag" :class="{ 'price-free': event.price === 'FREE' }">
                            {{ event.price }}
                        </div>
                    </div>

                    <div class="event-content">
                        <div class="event-header">
                            <span class="event-category">{{ event.category }}</span>
                            <span v-if="event.status" class="event-status">{{ event.status }}</span>
                        </div>

                        <h3 class="event-title">{{ event.title }}</h3>

                        <div class="event-details">
                            <div class="event-organiser">
                                <span>By {{ event.organiser }}</span>
                            </div>
                            <div class="event-datetime">
                                <span>{{ formatDate(event.date) }} | {{ event.time }}</span>
                            </div>
                            <div class="event-location">
                                <span>📍 {{ event.location }}</span>
                            </div>
                            <div class="event-attendees">
                                <span>👥 {{ formatAttendees(event) }}</span>
                            </div>
                        </div>

                        <p class="event-description">{{ event.description }}</p>

                        <!-- Tags Display -->
                        <!-- Tags Display - Now Clickable! -->
                        <div class="event-tags">
                            <span v-for="tag in event.tags" :key="tag" class="tag-badge"
                                @click.stop="handleTagClick(tag)" :class="{ 'tag-selected': isTagSelected(tag) }">
                                #{{ tag }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <EventDetailModal
            :visible="showEventModal"
            :event="selectedEvent"
            @close="closeEventModal"
            @tag-click="handleTagFromModal"
        />
    </section>
</template>

<style scoped>
.events-grid {
    background-color: var(--color-background);
}

.no-results {
    text-align: center;
    padding: var(--space-64) var(--space-24);
    color: var(--color-text-secondary);
}

.no-results h3 {
    font-size: var(--font-size-2xl);
    color: var(--color-text);
    margin-bottom: var(--space-16);
}

.no-results p {
    font-size: var(--font-size-lg);
}

.events-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 360px));
    justify-content: center;
    gap: var(--space-24);
    width: 100%;
}

.event-card {
    background-color: var(--color-surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-card-border);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
    transition: all var(--duration-normal) var(--ease-standard);
    cursor: pointer;
}

.event-card:hover {
    box-shadow: var(--shadow-lg);
    transform: translateY(-2px);
}

.event-image {
    position: relative;
    height: 200px;
    background: var(--color-bg-1);
}

.event-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    display: block;
}

.event-image-placeholder {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, var(--color-bg-1) 0%, var(--color-bg-2) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
}

.event-price-tag {
    position: absolute;
    top: var(--space-12);
    right: var(--space-12);
    background-color: var(--color-charcoal-700);
    color: var(--color-white);
    padding: var(--space-4) var(--space-12);
    border-radius: var(--radius-full);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
}

.price-free {
    background-color: var(--color-success) !important;
    color: var(--color-white) !important;
}

.event-content {
    padding: var(--space-20);
}

.event-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-12);
}

.event-category {
    background-color: var(--color-secondary);
    color: var(--color-text);
    padding: var(--space-4) var(--space-12);
    border-radius: var(--radius-full);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
}

.event-status {
    background-color: var(--color-warning);
    color: var(--color-white);
    padding: var(--space-4) var(--space-8);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
}

.event-title {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text);
    margin: 0 0 var(--space-6) 0;
    line-height: var(--line-height-tight);
}

.event-details {
    margin-bottom: var(--space-16);
}

.event-details>div {
    margin-bottom: var(--space-8);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
}

.event-details>div:last-child {
    margin-bottom: 0;
}

.event-datetime {
    font-weight: var(--font-weight-medium);
}

.event-organiser span {
    font-weight: var(--font-weight-semibold, 550);
    font-size: var(--font-size-base);
}

.event-description {
    font-size: var(--font-size-base);
    color: var(--color-text-secondary);
    line-height: var(--line-height-normal);
    margin: 0 0 var(--space-12) 0;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.event-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-8);
}

.tag-badge {
    background-color: var(--color-bg-1, #f0f0f0);
    color: var(--color-text-secondary);
    padding: var(--space-4) var(--space-8);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    transition: background-color 0.2s ease;
}

.tag-badge:hover {
    background-color: var(--color-bg-2, #e0e0e0);
}

.event-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-8);
}

.tag-badge {
    background-color: var(--color-bg-1, #f0f0f0);
    color: var(--color-text-secondary);
    padding: var(--space-4) var(--space-8);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    transition: all 0.2s ease;
    cursor: pointer;
    border: 1px solid transparent;
}

.tag-badge:hover {
    background-color: var(--color-bg-2, #e0e0e0);
    transform: translateY(-1px);
}

.tag-badge.tag-selected {
    background-color: var(--color-primary, #007bff);
    color: white;
    border-color: var(--color-primary, #007bff);
}

/* Responsive Design */
@media (max-width: 768px) {
    .events-container {
        grid-template-columns: 1fr;
    }
}
</style>
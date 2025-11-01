<script>
import { mapGetters, mapActions, mapState } from 'vuex';
import EventDetailModal from './EventDetailModal.vue';
import Pagination from './Pagination.vue';
import { shareEventLink } from '../utils/shareEvent';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const FALLBACK_PLACEHOLDER = 'https://placehold.co/600x400?text=Event';

export default {
    name: 'EventsGrid',
    components: {
        EventDetailModal,
        Pagination
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
        ...mapGetters(['filteredEvents']),
        ...mapGetters(['categoryColorMap']),
        ...mapState(['filters', 'pagination']),

        events() {
            return this.filteredEvents;
        }
    },

    methods: {
        ...mapActions(['toggleTag']),

        eventImageSrc(event) {
            if (!event) return FALLBACK_PLACEHOLDER;
            const raw = event.image || event.image_url || event.imageUrl || event.cover;
            if (!raw) return FALLBACK_PLACEHOLDER;
            if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
            const normalized = raw.replace('/uploads/event/event_', '/uploads/event/');
            return `${API_BASE_URL}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
        },

        handleEventImageError(eventObj, ev) {
            if (ev && ev.target) ev.target.src = FALLBACK_PLACEHOLDER;
        },

        // Format attendees display
        formatAttendees(event) {
            if (event.maxAttendees) {
                return `${event.attendees} / ${event.maxAttendees} attending`;
            }
            return `${event.attendees} attending`;
        },

        formatDate(dateString) {
            const date = new Date(dateString);
            const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
            return date.toLocaleDateString('en-US', options);
        },

        handleTagClick(tag) {
            this.toggleTag(tag);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },

        handleTagFromModal(tag) {
            this.handleTagClick(tag);
            this.closeEventModal();
        },

        async handleShare() {
            if (!this.selectedEvent) return;

            try {
                await shareEventLink(this.selectedEvent);
                this.$store.dispatch('showToast', {
                    message: 'Event link copied to your clipboard.',
                    type: 'success'
                });
            } catch (error) {
                console.error('Unable to share event', error);
                this.$store.dispatch('showToast', {
                    message: 'Unable to share this event. Please try again.',
                    type: 'error'
                });
            }
        },

        openEventModal(event) {
            this.selectedEvent = event;
            this.showEventModal = true;
        },

        closeEventModal() {
            this.showEventModal = false;
            this.selectedEvent = null;
        },

        isTagSelected(tag) {
            return this.filters.selectedTags.includes(tag);
        },
        async handleRsvpCreated(rsvpData) {
            console.log('RSVP Created:', rsvpData);

            // Refresh the events data to get updated attendee counts
            await this.$store.dispatch('fetchAllEvents', this.pagination.currentPage);

            // Update the selected event with the new attendee count
            if (this.selectedEvent) {
                const updatedEvent = this.events.find(e => e.id === this.selectedEvent.id);
                if (updatedEvent) {
                    this.selectedEvent = { ...updatedEvent };
                }
            }
        },

        handlePageChange(page) {
            this.$store.dispatch('fetchAllEvents', page);
            window.scrollTo({ top: 0, behavior: 'smooth' });
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
                        <img :src="eventImageSrc(event)" alt="Event Image" class="event-img" @error="handleEventImageError(event, $event)" />
                        <div v-if="!eventImageSrc(event)" class="event-image-placeholder"></div>
                        <div class="event-price-tag" :class="{ 'price-free': event.price === 'FREE' }">
                            {{ event.price }}
                        </div>
                    </div>

                    <div class="event-content">
                        <div class="event-header">
                            <span
                                class="event-category"
                                :class="`badge-${(event.category||'').toLowerCase().replace(/\s+/g,'-')}`"
                                :style="categoryColorMap && categoryColorMap[event.category] ? { backgroundColor: categoryColorMap[event.category], color: '#fff' } : {}"
                            >{{ event.category }}</span>
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

            <!-- Pagination -->
            <Pagination
                v-if="events.length > 0"
                :currentPage="pagination.currentPage"
                :totalPages="pagination.totalPages"
                :totalEvents="pagination.totalEvents"
                :eventsPerPage="pagination.eventsPerPage"
                @page-change="handlePageChange"
            />
        </div>
        <EventDetailModal
            :visible="showEventModal"
            :event="selectedEvent"
            @close="closeEventModal"
            @tag-click="handleTagFromModal"
            @rsvp-created="handleRsvpCreated"
            @share="handleShare"
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

/* Responsive Design */
@media (max-width: 768px) {
    .events-container {
        grid-template-columns: 1fr;
    }
}
</style>
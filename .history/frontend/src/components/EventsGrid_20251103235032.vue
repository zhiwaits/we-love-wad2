<script>
import { mapGetters, mapActions, mapState } from 'vuex';
import EventDetailModal from './EventDetailModal.vue';
import FullImageModal from './FullImageModal.vue';
import Pagination from './Pagination.vue';
import { shareEventLink } from '../utils/shareEvent';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const FALLBACK_PLACEHOLDER = 'https://placehold.co/600x400?text=Event';

export default {
    name: 'EventsGrid',
    components: {
        EventDetailModal,
        FullImageModal,
        Pagination
    },

    data() {
        return {
            selectedEvent: null,
            showEventModal: false,
            showImageModal: false,
            selectedImage: '',
            selectedImageAlt: ''
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
        },

        openImageModal(event) {
            this.selectedImage = this.eventImageSrc(event);
            this.selectedImageAlt = event.title || 'Event image';
            this.showImageModal = true;
        },

        closeImageModal() {
            this.showImageModal = false;
            this.selectedImage = '';
            this.selectedImageAlt = '';
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
                    <div class="event-image" @click="openImageModal(event)">
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
        <FullImageModal
            :visible="showImageModal"
            :imageSrc="selectedImage"
            :altText="selectedImageAlt"
            @close="closeImageModal"
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
    transition: transform var(--duration-normal) var(--ease-standard), box-shadow var(--duration-normal) var(--ease-standard), border-color var(--duration-normal) var(--ease-standard);
    cursor: pointer;
    display: flex;
    flex-direction: column;
    height: 100%;
    position: relative;
    opacity: 0;
    transform: translateY(12px);
    animation: card-enter 0.45s var(--ease-standard) forwards;
}

.event-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--color-primary);
    transform: scaleX(0);
    transition: transform var(--duration-normal) var(--ease-standard);
}

.event-card:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-4px);
    border-color: var(--color-primary);
}

.event-card:hover::before {
    transform: scaleX(1);
}

.event-image {
    position: relative;
    height: 200px;
    background: var(--color-bg-1);
    flex-shrink: 0;
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
    display: flex;
    flex-direction: column;
    gap: var(--space-12);
    flex: 1;
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
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    flex: 1;
}

.event-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-8);
    margin-top: auto;
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

/* Category badge color fallbacks (ensure consistent palette) */
.badge-academic { background-color: #007bff; color: #fff; }
.badge-workshop { background-color: #28a745; color: #fff; }
.badge-performance { background-color: #dc3545; color: #fff; }
.badge-recreation { background-color: #ffc107; color: #222; }
.badge-career { background-color: #17a2b8; color: #fff; }
.badge-social { background-color: #6f42c1; color: #fff; }
.badge-sports { background-color: #fd7e14; color: #fff; }

@keyframes card-enter {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
}

/* Responsive Design */
@media (max-width: 768px) {
    .events-container {
        grid-template-columns: 1fr;
    }
}
</style>
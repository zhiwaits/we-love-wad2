<script>
import { mapGetters, mapActions, mapState } from 'vuex';
import EventDetailModal from './EventDetailModal.vue';
import EditEventModal from './EditEventModal.vue';
import FullImageModal from './FullImageModal.vue';
import { shareEventLink } from '../utils/shareEvent';
import Pagination from './Pagination.vue';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const FALLBACK_PLACEHOLDER = 'https://placehold.co/600x400?text=Event';

export default {
    name: 'ClubEventsGrid',
    components: {
        EventDetailModal,
        EditEventModal,
        FullImageModal,
        Pagination
    },

    data() {
        return {
            selectedEvent: null,
            showEventModal: false,
            showEditModal: false,
            eventToEdit: null,
            currentPage: 1,
            itemsPerPage: 6,
            showImageModal: false,
            selectedImage: '',
            selectedImageAlt: '',
            showTagsModal: false,
            tagsModalEvent: null
        };
    },

    mounted() {
        this.$store.dispatch('fetchClubOwnedEvents').catch(() => {});
    },

    computed: {
        ...mapGetters(['filteredClubEvents', 'categoryColorMap']),
        ...mapGetters('auth', ['isClub']),
        ...mapState(['clubEventFilters']),
        ...mapState({ currentUser: state => state.auth.user }),

        events() {
            return this.filteredClubEvents;
        },

        paginatedEvents() {
            const safePage = Math.min(Math.max(this.currentPage, 1), this.totalPages);
            const startIndex = (safePage - 1) * this.itemsPerPage;
            return this.events.slice(startIndex, startIndex + this.itemsPerPage);
        },

        totalPages() {
            if (!this.events.length) {
                return 1;
            }
            return Math.ceil(this.events.length / this.itemsPerPage);
        }
    },

    methods: {
        ...mapActions(['toggleClubEventTag']),
        handlePageChange(page) {
            if (page < 1 || page > this.totalPages) {
                return;
            }
            this.currentPage = page;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },

        eventImageSrc(event) {
            if (!event) return FALLBACK_PLACEHOLDER;
            const raw = event.image || event.image_url || event.imageUrl || event.cover;
            if (!raw) return FALLBACK_PLACEHOLDER;
            if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
            const normalized = raw.replace('/uploads/event/event_', '/uploads/event/');
            const fullUrl = `${API_BASE_URL}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
            // Add cache-busting parameter to force browser to reload updated images
            return `${fullUrl}?v=${Date.now()}`;
        },

        handleEventImageError(eventObj, ev) {
            if (ev && ev.target) ev.target.src = FALLBACK_PLACEHOLDER;
        },

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
            this.toggleClubEventTag(tag);
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

        handleEdit(event) {
            this.eventToEdit = event;
            this.showEditModal = true;
        },

        openEventModal(event) {
            this.selectedEvent = event;
            this.showEventModal = true;
        },

        closeEventModal() {
            this.showEventModal = false;
            this.selectedEvent = null;
        },

        closeEditModal() {
            this.showEditModal = false;
            this.eventToEdit = null;
        },

        async handleEventUpdated() {
            this.$store.dispatch('showToast', {
                message: 'Event updated successfully!',
                type: 'success'
            });
            // Store is already updated by EditEventModal, no need to refetch
            this.closeEditModal();
        },

        async handleEventDeleted() {
            this.$store.dispatch('showToast', {
                message: 'Event deleted successfully!',
                type: 'success'
            });
            await this.$store.dispatch('fetchClubOwnedEvents', { force: true }).catch(() => {});
            this.closeEditModal();
        },

        isTagSelected(tag) {
            return this.clubEventFilters.selectedTags.includes(tag);
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
        },

        // Tag truncation logic
        getVisibleTagsCount(tags) {
            if (!tags || tags.length === 0) return 0;

            // Container constraints - more lenient estimate
            const containerWidth = 320; // More generous estimate for event card content area

            let currentRowWidth = 0;
            let rowCount = 1;
            let visibleCount = 0;

            for (let i = 0; i < tags.length; i++) {
                // More accurate tag width: padding (16px) + text + gap (8px)
                const tagWidth = 16 + (tags[i].length * 6.5) + 8; // Slightly more lenient character width

                // Check if this tag fits in current row
                if (currentRowWidth + tagWidth <= containerWidth) {
                    currentRowWidth += tagWidth;
                    visibleCount++;
                } else {
                    // Tag doesn't fit in current row
                    if (rowCount >= 2) {
                        // We've already used 2 rows, stop here
                        break;
                    } else {
                        // Start new row
                        rowCount++;
                        currentRowWidth = tagWidth;
                        visibleCount++;
                    }
                }
            }

            return visibleCount;
        },

        getVisibleTags(tags) {
            if (!Array.isArray(tags)) return [];
            const maxVisible = this.getVisibleTagsCount(tags);
            return tags.slice(0, maxVisible);
        },

        hasMoreTags(tags) {
            return Array.isArray(tags) && tags.length > this.getVisibleTagsCount(tags);
        },

        openTagsModal(event) {
            this.tagsModalEvent = event;
            this.showTagsModal = true;
        },

        closeTagsModal() {
            this.showTagsModal = false;
            this.tagsModalEvent = null;
        }
    },
    watch: {
        events() {
            this.currentPage = 1;
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
                <p>You haven't created any events yet, or try adjusting your filters.</p>
            </div>

            <!-- Events Grid -->
            <div v-else class="events-container">
                <div
                    v-for="event in paginatedEvents"
                    :key="event.id"
                    class="event-card"
                >
                    <div class="event-image" @click.stop="openImageModal(event)">
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
                        </div>

                        <h3 class="event-title" @click="openEventModal(event)">{{ event.title }}</h3>

                        <div class="event-details">
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

                        <p class="event-description" @click="openEventModal(event)">{{ event.description }}</p>

                        <!-- Tags Display -->
                        <div class="event-tags">
                            <span v-for="tag in getVisibleTags(event.tags)" :key="tag" class="tag-badge"
                                @click.stop="!isClub && handleTagClick(tag)" :class="{ 'tag-selected': isTagSelected(tag) }">
                                #{{ tag }}
                            </span>
                            <span
                                v-if="hasMoreTags(event.tags)"
                                class="tag-badge tag-more"
                                @click.stop="openTagsModal(event)"
                            >
                                ...
                            </span>
                        </div>

                        <!-- Action Buttons -->
                        <div class="event-actions">
                            <button class="btn btn--primary" @click.stop="handleEdit(event)">
                                Edit Event
                            </button>
                            <button class="btn btn--secondary" @click.stop="openEventModal(event)">
                                Preview
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <Pagination
                v-if="events.length > 0"
                :currentPage="currentPage"
                :totalPages="totalPages"
                :totalEvents="events.length"
                :eventsPerPage="itemsPerPage"
                @page-change="handlePageChange"
            />
        </div>
        <EventDetailModal
            :visible="showEventModal"
            :event="selectedEvent"
            @close="closeEventModal"
            @tag-click="handleTagFromModal"
            @share="handleShare"
        />
        <EditEventModal
            :visible="showEditModal"
            :event="eventToEdit"
            @close="closeEditModal"
            @updated="handleEventUpdated"
            @deleted="handleEventDeleted"
        />
        <FullImageModal
            :visible="showImageModal"
            :imageSrc="selectedImage"
            :altText="selectedImageAlt"
            @close="closeImageModal"
        />

        <!-- Tags Modal -->
        <div v-if="showTagsModal" class="modal-overlay" @click="closeTagsModal">
            <div class="modal-content tags-modal" @click.stop>
                <div class="modal-header">
                    <h3>All Tags</h3>
                    <button class="modal-close" @click="closeTagsModal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="tags-list">
                        <span
                            v-for="tag in tagsModalEvent.tags"
                            :key="tag"
                            class="tag-badge"
                            @click="!isClub && handleTagClick(tag)"
                        >
                            #{{ tag }}
                        </span>
                    </div>
                </div>
            </div>
        </div>
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
    cursor: pointer;
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

.event-title {
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text);
    margin: 0 0 var(--space-6) 0;
    line-height: var(--line-height-tight);
    cursor: pointer;
}

.event-title:hover {
    color: var(--color-primary);
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
    cursor: pointer;
}

.event-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-8);
    margin-top: auto;
    margin-bottom: var(--space-12);
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

/* Modal Styles */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal-content {
    background-color: var(--color-surface);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-20);
    border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
    margin: 0;
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-text);
}

.modal-close {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: var(--color-text-secondary);
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
    transition: all 0.2s ease;
}

.modal-close:hover {
    background-color: var(--color-bg-1);
    color: var(--color-text);
}

.modal-body {
    padding: var(--space-20);
}

.tags-modal .tags-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-8);
}

.tags-modal .tag-badge {
    margin: 0;
}

.tag-badge.tag-more {
    background-color: var(--color-bg-2, #e0e0e0);
    color: var(--color-text-secondary);
    cursor: pointer;
    font-weight: var(--font-weight-bold);
}

.tag-badge.tag-more:hover {
    background-color: var(--color-bg-1, #d0d0d0);
    transform: translateY(-1px);
}

.event-actions {
    display: flex;
    gap: var(--space-12);
    margin-top: auto;
}

.btn {
    flex: 1;
    padding: var(--space-10) var(--space-16);
    border-radius: var(--radius-base);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition: all 0.2s ease;
    border: none;
    text-align: center;
}

.btn--primary {
    background-color: var(--color-primary);
    color: white;
}

.btn--primary:hover {
    background-color: var(--color-primary-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
}

.btn--secondary {
    background-color: transparent;
    color: var(--color-text);
    border: 1px solid var(--color-border);
}

.btn--secondary:hover {
    background-color: var(--color-bg-1);
    border-color: var(--color-primary);
}

/* Category badge color fallbacks */
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

    .event-actions {
        flex-direction: column;
    }
}
</style>

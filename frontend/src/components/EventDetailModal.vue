<template>
    <transition name="modal-fade">
        <div v-if="visible && event" class="modal-overlay" @click.self="emitClose" role="dialog" aria-modal="true"
            :aria-label="`Details for ${event.title}`">
            <div class="modal-panel">
                <button class="modal-close" type="button" @click="emitClose" aria-label="Close event details">
                    <span aria-hidden="true">×</span>
                </button>

                <div class="modal-media" v-if="event">
                    <img :src="eventImageSrc(event)" :alt="`${event.title} hero`" @error="handleImageError" />
                    <div class="modal-chip category" v-if="event.category">{{ event.category }}</div>
                    <div class="modal-chip price" :class="{ free: event.price === 'FREE' }" v-if="event.price">
                        {{ event.price }}
                    </div>
                </div>

                <div class="modal-body">
                    <header class="modal-header">
                        <h2 class="event-title">{{ event.title }}</h2>
                        <p class="event-organiser" v-if="event.organiser">

                            By {{ event.organiser }}
                        </p>
                    </header>

                    <section class="event-meta">
                        <div class="meta-item" v-if="event.date">
                            <span class="icon">📅</span>
                            <div>
                                <span class="meta-label">Date</span>
                                <span>{{ formatDateLong(event.date) }}</span>
                            </div>
                        </div>
                        <div class="meta-item" v-if="event.time">
                            <span class="icon">⏰</span>
                            <div>
                                <span class="meta-label">Time</span>
                                <span>{{ event.time }}</span>
                            </div>
                        </div>
                        <div class="meta-item" v-if="event.venue || event.location">
                            <span class="icon">📍</span>
                            <div>
                                <span class="meta-label">Venue</span>
                                <span>{{ event.venue || event.location }}</span>
                                <span v-if="event.location && event.venue && event.venue !== event.location"
                                    class="meta-secondary">
                                    {{ event.location }}
                                </span>
                            </div>
                        </div>
                        <div class="meta-item" v-if="event.attendees != null">
                            <span class="icon">👥</span>
                            <div>
                                <span class="meta-label">Attendance</span>
                                <span>
                                    <strong>{{ event.attendees }}</strong>
                                    <template v-if="event.maxAttendees"> / {{ event.maxAttendees }}</template>
                                    attending
                                </span>
                                <span v-if="spotsRemaining !== null" class="meta-secondary">
                                    {{ spotsRemaining }} spots left
                                </span>
                                <span v-else class="meta-secondary">No maximum capacity</span>
                            </div>
                        </div>
                    </section>

                    <section class="event-status" v-if="statusVariant">
                        <span class="status-pill" :class="statusVariant">
                            {{ statusText }}
                        </span>
                    </section>

                    <section class="event-description" v-if="event.description">
                        <h3>About this event</h3>
                        <p>{{ event.description }}</p>
                    </section>

                    <section class="event-tags" v-if="event.tags && event.tags.length">
                        <h3>Tags</h3>
                        <div class="tag-list">
                            <button v-for="tag in event.tags" :key="tag" type="button" class="tag-pill"
                                @click="$emit('tag-click', tag)">
                                #{{ tag }}
                            </button>
                        </div>
                    </section>

                    <footer class="modal-actions">
                        <button type="button" class="btn btn-primary" :disabled="isClub" :class="{ 'btn-disabled': isClub }">
                            {{ isClub ? 'Clubs Cannot RSVP' : 'Join Event' }}
                        </button>
                        <div class="secondary-actions">
                            <button type="button" class="btn btn-outline">Save</button>
                            <button type="button" class="btn btn-outline" @click="$emit('share')">Share</button>
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    </transition>
</template>

<script>
import { mapGetters } from 'vuex';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const FALLBACK_PLACEHOLDER = 'https://placehold.co/900x400?text=Event';
export default {
    name: 'EventDetailModal',
    props: {
        event: {
            type: Object,
            default: null
        },
        visible: {
            type: Boolean,
            default: false
        }
    },
    emits: ['close', 'tag-click', 'share'],
    computed: {
        ...mapGetters('auth', ['isClub']),
        spotsRemaining() {
            if (this.event?.maxAttendees == null) return null;
            const remaining = this.event.maxAttendees - (this.event.attendees || 0);
            return remaining >= 0 ? remaining : 0;
        },
        remainingPercent() {
            if (this.event?.maxAttendees == null || this.event.maxAttendees === 0) return null;
            const percent = (this.spotsRemaining / this.event.maxAttendees) * 100;
            return Math.max(0, Math.min(100, Math.round(percent)));
        },
        statusText() {
            if (this.remainingPercent === null) return '';
            const suffix = `${this.remainingPercent}% spots remaining`;
            if (this.remainingPercent <= 10) return `Almost Full · ${suffix}`;
            if (this.remainingPercent <= 30) return `Filling Fast · ${suffix}`;
            if (this.remainingPercent <= 60) return `Seats Available · ${suffix}`;
            return `Plenty of Spots · ${suffix}`;
        },
        statusVariant() {
            if (this.remainingPercent === null) return null;
            if (this.remainingPercent <= 10) return 'danger';
            if (this.remainingPercent <= 30) return 'warning';
            if (this.remainingPercent <= 60) return 'info';
            return 'success';
        }
    },
    watch: {
        visible(val) {
            document.body.classList.toggle('modal-open', val);
        }
    },
    mounted() {
        if (this.visible) {
            document.body.classList.add('modal-open');
        }
        window.addEventListener('keyup', this.handleEsc, { passive: true });
    },
    beforeUnmount() {
        document.body.classList.remove('modal-open');
        window.removeEventListener('keyup', this.handleEsc);
    },
    methods: {
        emitClose() {
            this.$emit('close');
        },
        handleEsc(event) {
            if (event.key === 'Escape' && this.visible) {
                this.emitClose();
            }
        },
        eventImageSrc(event) {
            if (!event) return FALLBACK_PLACEHOLDER;
            const raw = event.image || event.image_url || event.imageUrl || event.cover;
            if (!raw) return FALLBACK_PLACEHOLDER;
            if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
            const normalized = raw.replace('/uploads/event/event_', '/uploads/event/');
            return `${API_BASE_URL}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
        },

        handleImageError(ev) {
            if (ev && ev.target) ev.target.src = FALLBACK_PLACEHOLDER;
        },
        formatDateLong(isoDate) {
            if (!isoDate) return '';
            try {
                return new Date(isoDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            } catch (e) {
                return isoDate;
            }
        }
    }
};
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(17, 24, 39, 0.55);
    display: flex;
    justify-content: center;
    align-items: center;
    padding: clamp(16px, 5vw, 48px);
    z-index: 1000;
    backdrop-filter: blur(4px);
}

.modal-panel {
    position: relative;
    display: flex;
    flex-direction: column;
    max-width: min(720px, 90vw);
    width: 100%;
    max-height: min(92vh, 880px);
    background: var(--color-surface);
    color: var(--color-text);
    border-radius: 24px;
    box-shadow: 0 24px 48px rgba(15, 23, 42, 0.2);
    overflow: hidden;
}

.modal-close {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: rgba(0, 0, 0, 0.05);
    color: var(--color-text);
    font-size: 24px;
    cursor: pointer;
    display: grid;
    place-items: center;
    transition: background 0.2s ease;
}

.modal-close:hover {
    background: rgba(0, 0, 0, 0.12);
}

.modal-media {
    position: relative;
    width: 100%;
    height: clamp(200px, 32vh, 240px);
    overflow: hidden;
    border-radius: 24px 24px 0 0;
    flex-shrink: 0;
}

.modal-media img {
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    margin: 0;
    border-radius: inherit;
}

.modal-chip {
    position: absolute;
    top: 20px;
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.01em;
}

.modal-chip.category {
    left: 20px;
    background: rgba(var(--color-info-rgb, 98, 108, 113), 0.85);
    color: var(--color-background);
}

.modal-chip.price {
    right: 20px;
    background: rgba(var(--color-warning-rgb, 168, 75, 47), 0.92);
    color: var(--color-background);
}

.modal-chip.price.free {
    background: rgba(var(--color-success-rgb, 33, 128, 141), 0.92);
}

.modal-body {
    padding: clamp(20px, 3vw, 32px);
    display: flex;
    flex-direction: column;
    gap: 20px;
    flex: 1;
    overflow-y: auto;
}

.modal-header {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.event-title {
    margin: 0;
    font-size: clamp(24px, 3vw, 32px);
    line-height: 1.15;
}

.event-organiser {
    margin: 0;
    font-size: 15px;
    color: var(--color-text-secondary);
    display: flex;
    gap: 8px;
    align-items: center;
}

.icon {
    font-size: 18px;
}

.event-meta {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px 20px;
}

.meta-item {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    background: rgba(var(--color-slate-500-rgb, 98, 108, 113), 0.08);
    border-radius: 16px;
    padding: 14px 16px;
}

.meta-label {
    display: block;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-secondary);
}

.meta-secondary {
    display: block;
    font-size: 13px;
    color: var(--color-text-secondary);
}

.event-status {
    display: flex;
    justify-content: flex-start;
}

.status-pill {
    padding: 6px 14px;
    border-radius: 999px;
    font-weight: 600;
    font-size: 13px;
    background: rgba(var(--color-info-rgb, 98, 108, 113), 0.18);
    color: var(--color-info, var(--color-text));
}

.status-pill.success {
    background: rgba(var(--color-success-rgb, 33, 128, 141), 0.18);
    color: var(--color-success);
}

.status-pill.warning {
    background: rgba(var(--color-warning-rgb, 168, 75, 47), 0.18);
    color: var(--color-warning);
}

.status-pill.danger {
    background: rgba(var(--color-error-rgb, 192, 21, 47), 0.18);
    color: var(--color-error);
}

.event-description h3,
.event-tags h3 {
    margin: 0 0 12px;
    font-size: 18px;
}

.event-description p {
    margin: 0;
    line-height: 1.6;
}

.tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.tag-pill {
    border: 1px solid var(--color-border);
    border-radius: 999px;
    padding: 6px 12px;
    background: transparent;
    color: var(--color-text-secondary);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.tag-pill:hover {
    background: var(--color-secondary);
    color: var(--color-text);
}

.modal-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
}

.btn {
    border-radius: 12px;
    padding: 12px 20px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn-primary {
    border: none;
    background: var(--color-primary);
    color: var(--color-btn-primary-text);
    box-shadow: 0 10px 20px rgba(var(--color-teal-500-rgb, 33, 128, 141), 0.25);
}

.btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 14px 24px rgba(var(--color-teal-500-rgb, 33, 128, 141), 0.28);
}

.btn-primary:disabled,
.btn-primary.btn-disabled {
    background: rgba(var(--color-slate-500-rgb, 98, 108, 113), 0.3);
    color: var(--color-text-secondary);
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
}

.btn-primary:disabled:hover,
.btn-primary.btn-disabled:hover {
    transform: none;
    box-shadow: none;
}

.btn-outline {
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text);
}

.btn-outline:hover {
    background: var(--color-secondary);
}

.secondary-actions {
    display: flex;
    gap: 10px;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
    transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
    opacity: 0;
}

@media (max-width: 640px) {
    .modal-panel {
        border-radius: 16px;
    }

    .modal-body {
        padding: 24px;
    }

    .modal-actions {
        flex-direction: column;
        align-items: stretch;
    }

    .secondary-actions {
        width: 100%;
        justify-content: center;
    }

    .btn {
        width: 100%;
    }
}
</style>

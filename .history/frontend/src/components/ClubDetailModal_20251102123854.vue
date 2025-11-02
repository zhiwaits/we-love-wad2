<template>
    <transition name="modal-fade">
        <div v-if="visible && club" class="modal-overlay" @click.self="emitClose" role="dialog" aria-modal="true"
            :aria-label="`Details for ${club.name || club.username}`">
            <div class="modal-panel">
                <button class="modal-close" type="button" @click="emitClose" aria-label="Close club details">
                    <span aria-hidden="true">×</span>
                </button>

                <div class="modal-media" v-if="club">
                    <img :src="clubImageSrc(club)" :alt="`${club.name || club.username} hero`" @error="handleImageError" />
                    <div class="modal-chip category" v-if="clubCategory">{{ clubCategory }}</div>
                </div>

                <div class="modal-body">
                    <header class="modal-header">
                        <h2 class="club-title">{{ club.name || club.username }}</h2>
                    </header>

                    <section class="club-meta">
                        <div class="meta-item">
                            <span class="icon">👥</span>
                            <div>
                                <span class="meta-label">Followers</span>
                                <span>{{ formatNumber(followersCount) }}</span>
                            </div>
                        </div>
                        <div class="meta-item">
                            <span class="icon">📅</span>
                            <div>
                                <span class="meta-label">Upcoming Events</span>
                                <span>{{ formatNumber(upcomingEvents) }}</span>
                            </div>
                        </div>
                        <div class="meta-item">
                            <span class="icon">🎉</span>
                            <div>
                                <span class="meta-label">Total Events</span>
                                <span>{{ formatNumber(totalEvents) }}</span>
                            </div>
                        </div>
                    </section>

                    <section class="club-description" v-if="club.club_description">
                        <h3>About this club</h3>
                        <p>{{ club.club_description }}</p>
                    </section>

                    <footer class="modal-actions">
                        <button type="button" class="btn btn-primary" @click="emitViewEvents">
                            View Events
                        </button>
                        <div class="secondary-actions">
                            <button type="button" class="btn btn-primary" @click="emitToggleFollow">
                                {{ isFollowing ? 'Unfollow' : 'Follow' }}
                            </button>
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
const FALLBACK_PLACEHOLDER = 'https://placehold.co/600x400?text=Club';

export default {
    name: 'ClubDetailModal',
    props: {
        club: {
            type: Object,
            default: null
        },
        visible: {
            type: Boolean,
            default: false
        },
        followersCount: {
            type: Number,
            default: 0
        },
        isFollowing: {
            type: Boolean,
            default: false
        },
        clubCategory: {
            type: String,
            default: ''
        },
        upcomingEvents: {
            type: Number,
            default: 0
        },
        totalEvents: {
            type: Number,
            default: 0
        }
    },
    emits: ['close', 'view-events', 'toggle-follow', 'share'],
    computed: {
        ...mapGetters('auth', ['isClub'])
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
        emitViewEvents() {
            this.$emit('view-events', this.club);
        },
        emitToggleFollow() {
            this.$emit('toggle-follow', this.club.id);
        },
        clubImageSrc(club) {
            if (!club) return FALLBACK_PLACEHOLDER;
            const raw = club.club_image;
            if (!raw) return FALLBACK_PLACEHOLDER;
            if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
            // Ensure the path starts with /uploads/club/
            const normalized = raw.startsWith('/uploads/club/') ? raw : `/uploads/club/${raw.replace(/^\/+/, '')}`;
            return `${API_BASE_URL}${normalized}`;
        },
        handleImageError(ev) {
            if (ev && ev.target) ev.target.src = FALLBACK_PLACEHOLDER;
        },
        formatNumber(n) {
            try { return new Intl.NumberFormat().format(n ?? 0); } catch { return `${n ?? 0}`; }
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
    left: 20px;
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.01em;
    background: rgba(var(--color-info-rgb, 98, 108, 113), 0.85);
    color: var(--color-background);
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

.club-title {
    margin: 0;
    font-size: clamp(24px, 3vw, 32px);
    line-height: 1.15;
}

.club-meta {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
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

.club-description h3 {
    margin: 0 0 12px;
    font-size: 18px;
}

.club-description p {
    margin: 0;
    line-height: 1.6;
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
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
}

.btn::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    transition: width 0.3s ease, height 0.3s ease;
}

.btn:active::before {
    width: 300px;
    height: 300px;
}

.btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn:active {
    transform: translateY(0);
    transition: transform 0.1s ease;
}

.btn-primary {
    border: none;
    background: var(--color-primary);
    color: var(--color-btn-primary-text);
    box-shadow: 0 10px 20px rgba(var(--color-teal-500-rgb, 33, 128, 141), 0.25);
}

.btn-dark {
    background: #111;
    color: #fff;
    border: 1px solid #111;
}

.btn-dark.following {
    background: #f8fafc;
    color: #64748b;
    border-color: #e2e8f0;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
}

.btn-dark:hover {
    background: var(--color-dark-hover);
}

.btn-outline {
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text);
}

.btn-outline:hover {
    background: var(--color-secondary);
}

.btn-outline.following {
    background: var(--color-primary);
    color: var(--color-btn-primary-text);
    border-color: var(--color-primary);
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
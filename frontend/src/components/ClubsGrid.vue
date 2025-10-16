<script>
import { mapGetters, mapActions, mapState } from 'vuex';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const FALLBACK_PLACEHOLDER = 'https://placehold.co/600x400?text=Club';

export default {
    name: 'ClubsGrid',

    data() {
        return {
            imageErrors: {},
        };
    },

    mounted() {
        this.$store.dispatch('clubs/loadClubs');
        this.$store.dispatch('clubs/loadFollowing');
    },

    computed: {
        ...mapState('clubs', ['loading', 'error']),
        ...mapGetters('clubs', ['filteredClubs', 'followersCount', 'isFollowing', 'categoryNameById']),
    },

    methods: {
        ...mapActions('clubs', ['toggleFollow']),
        viewClubEvents(clubId) {
           
            this.$router.push({ name: 'Home' });
        },
        sanitizeUsername(username) {
            if (!username) return 'club';
            return username
                .toString()
                .toLowerCase()
                .replace(/[^a-z0-9_-]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_+|_+$/g, '')
                || 'club';
        },
        clubImageSrc(club) {
            if (!club) return this.placeholderImage();
            const state = this.imageErrors[club.id];
            if (state === 'placeholder') {
                return this.placeholderImage();
            }
            if (state === 'fallback') {
                return this.fallbackImage(club);
            }

            const raw = club?.club_image;
            if (raw) {
                if (raw.startsWith('http://') || raw.startsWith('https://')) {
                    return raw;
                }
                const normalized = raw.replace('/uploads/club/club_', '/uploads/club/');
                return `${API_BASE_URL}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
            }

            return this.fallbackImage(club);
        },
        handleImageError(club, event) {
            if (!club || !club.id) return;
            const currentState = this.imageErrors[club.id];

            if (currentState === 'fallback' || !club.club_image) {
                this.imageErrors = { ...this.imageErrors, [club.id]: 'placeholder' };
                if (event?.target) {
                    event.target.src = this.placeholderImage();
                }
                return;
            }

            const fallbackSrc = this.fallbackImage(club);
            this.imageErrors = { ...this.imageErrors, [club.id]: 'fallback' };
            if (event?.target) {
                event.target.src = fallbackSrc;
            }
        },
        fallbackImage(club) {
            const sanitized = this.sanitizeUsername(club?.username);
            return `${API_BASE_URL}/uploads/club/${sanitized}.png`;
        },
        placeholderImage() {
            return FALLBACK_PLACEHOLDER;
        },
        resolveCategory(club) {
            
            if (club && club.club_category_id != null) {
                const name = this.categoryNameById(club.club_category_id);
                if (name) return name;
            }
           
            const raw = club?.club_category;
            if (raw != null) {
                const maybeId = Number(raw);
                if (!Number.isNaN(maybeId)) {
                    const byId = this.categoryNameById(maybeId);
                    if (byId) return byId;
                }
                if (typeof raw === 'string' && raw.trim().length > 0) return raw;
            }
            return 'Others';
        },
        formatNumber(n) {
            try { return new Intl.NumberFormat().format(n ?? 0); } catch { return `${n ?? 0}`; }
        }
    }
}
</script>

<template>
    <section class="clubs-grid">
        <div class="container">
            <div v-if="loading" class="no-results">
                <h3>Loading clubs…</h3>
            </div>
            <div v-else-if="error" class="no-results">
                <h3>Failed to load clubs</h3>
                <p>{{ error }}</p>
            </div>
            <div v-else-if="filteredClubs.length === 0" class="no-results">
                <h3>No clubs found</h3>
            </div>

            <div v-else class="cards-container">
                <div v-for="club in filteredClubs" :key="club.id" class="club-card">
                    <div class="club-image">
                        <img
                            :src="clubImageSrc(club)"
                            alt="Club image"
                            class="club-img"
                            :class="{ 'club-img--placeholder': imageErrors[club.id] === 'placeholder' }"
                            @error="handleImageError(club, $event)"
                        />
                        <div class="club-category">{{ resolveCategory(club) }}</div>
                    </div>

                    <div class="club-content">
                        <h3 class="club-title">{{ club.name || club.username }}</h3>
                        <div class="club-stats">
                            <span>{{ formatNumber(followersCount(club.id)) }} followers</span>
                        </div>
                        <p class="club-description">{{ club.club_description }}</p>

                        <div class="club-actions">
                            <button class="btn btn-outline-dark" @click.stop="viewClubEvents(club.id)">
                                View Events
                            </button>
                            <button
                                class="btn btn-dark"
                                :class="{ following: isFollowing(club.id) }"
                                @click.stop="toggleFollow(club.id)"
                            >
                                {{ isFollowing(club.id) ? 'Following' : 'Follow' }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
.clubs-grid { background-color: var(--color-background); }
.no-results { text-align: center; padding: var(--space-64) var(--space-24); color: var(--color-text-secondary); }
.no-results h3 { font-size: var(--font-size-2xl); color: var(--color-text); margin-bottom: var(--space-16); }
.cards-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 360px)); justify-content: center; gap: var(--space-24); width: 100%; }
.club-card { background-color: var(--color-surface); border-radius: var(--radius-lg); border: 1px solid var(--color-card-border); box-shadow: var(--shadow-sm); overflow: hidden; transition: transform var(--duration-normal) var(--ease-standard), box-shadow var(--duration-normal) var(--ease-standard), border-color var(--duration-normal) var(--ease-standard); display: flex; flex-direction: column; height: 100%; position: relative; opacity: 0; transform: translateY(12px); animation: card-enter 0.45s var(--ease-standard) forwards; }
.club-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--color-primary); transform: scaleX(0); transition: transform var(--duration-normal) var(--ease-standard); }
.club-card:hover { box-shadow: var(--shadow-md); transform: translateY(-4px); border-color: var(--color-primary); }
.club-card:hover::before { transform: scaleX(1); }
.club-image { position: relative; height: 200px; background: var(--color-bg-1); flex-shrink: 0; }
.club-img { width: 100%; height: 100%; object-fit: cover; object-position: center; display: block; }
.club-img--placeholder { object-fit: contain; background: linear-gradient(135deg, var(--color-bg-1) 0%, var(--color-bg-2) 100%); }
.club-category {
    position: absolute;
    top: var(--space-12);
    left: var(--space-12);
    background-color: var(--color-primary, #2563eb); 
    color: var(--color-white, #ffffff);
    padding: var(--space-4) var(--space-12);
    border-radius: var(--radius-full);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.15);
    z-index: 2;
}
.club-content { padding: var(--space-20); display: flex; flex-direction: column; gap: var(--space-12); flex: 1; }
.club-title { font-size: var(--font-size-xl); font-weight: var(--font-weight-bold); color: var(--color-text); margin: 0 0 var(--space-8) 0; }
.club-stats { color: var(--color-text-secondary); font-size: var(--font-size-sm); margin-bottom: var(--space-8); }
.club-description { font-size: var(--font-size-base); color: var(--color-text-secondary); line-height: var(--line-height-normal); margin: 0; display: -webkit-box; -webkit-line-clamp: 4; line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; flex: 1; }
.club-actions { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-12); margin-top: auto; }
.btn { padding: 10px 14px; border-radius: 12px; font-weight: 600; }
.btn-dark { background: #111; color: #fff; border: 1px solid #111; }
.btn-dark.following { background: transparent; color: #111; border-color: #111; }
.btn-outline-dark { background: transparent; color: #111; border: 1px solid #111; }

@keyframes card-enter {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
    .cards-container { grid-template-columns: 1fr; }
}
</style>
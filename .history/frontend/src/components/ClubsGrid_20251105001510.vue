<script>
import { mapGetters, mapActions, mapState } from 'vuex';
import ClubDetailModal from './ClubDetailModal.vue';
import FullImageModal from './FullImageModal.vue';
import Pagination from './Pagination.vue';
import { shareClubLink } from '../utils/shareClub';
import { getClubStats } from '../services/profileService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const FALLBACK_PLACEHOLDER = 'https://placehold.co/600x400?text=Club';

export default {
    name: 'ClubsGrid',
    components: {
        ClubDetailModal,
        FullImageModal,
        Pagination
    },

    data() {
        return {
            imageErrors: {},
            selectedClub: null,
            modalVisible: false,
            upcomingEvents: 0,
            totalEvents: 0,
            currentPage: 1,
            itemsPerPage: 6,
            showImageModal: false,
            selectedImage: '',
            selectedImageAlt: ''
        };
    },

    mounted() {
        this.$store.dispatch('clubs/loadClubs');
        this.$store.dispatch('clubs/loadFollowing');
    },

    computed: {
    ...mapState('clubs', ['loading', 'error', 'sortOption']),
        ...mapGetters('clubs', ['filteredClubs', 'followersCount', 'isFollowing', 'categoryNameById']),
        ...mapGetters('auth', ['isClub']),

        paginatedClubs() {
            const safePage = Math.min(Math.max(this.currentPage, 1), this.totalPages);
            const startIndex = (safePage - 1) * this.itemsPerPage;
            return this.filteredClubs.slice(startIndex, startIndex + this.itemsPerPage);
        },

        totalPages() {
            if (!this.filteredClubs.length) {
                return 1;
            }
            return Math.ceil(this.filteredClubs.length / this.itemsPerPage);
        }
    },

    methods: {
        ...mapActions('clubs', ['toggleFollow', 'updateSortOption']),
        handleSortChange(event) {
            const next = event?.target?.value || 'newest';
            this.currentPage = 1;
            this.updateSortOption(next);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        handlePageChange(page) {
            if (page < 1 || page > this.totalPages) {
                return;
            }
            this.currentPage = page;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        viewClubEvents(club) {
           
            this.$store.dispatch('updateSearch', club.name || club.username);
            this.$store.dispatch('updateEventStatus', 'upcoming');
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
                // Ensure the path starts with /uploads/club/
                const normalized = raw.startsWith('/uploads/club/') ? raw : `/uploads/club/${raw.replace(/^\/+/, '')}`;
                return `${API_BASE_URL}${normalized}`;
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
        },
        openClubModal(club) {
            this.selectedClub = club;
            this.modalVisible = true;
            this.fetchClubStats(club.id);
        },
        closeClubModal() {
            this.modalVisible = false;
            this.selectedClub = null;
        },
        handleViewEvents(club) {
            this.viewClubEvents(club);
            this.closeClubModal();
        },
        handleToggleFollow(clubId) {
            this.toggleFollow(clubId);
        },
        async handleShare() {
            if (!this.selectedClub) return;
            try {
                await shareClubLink(this.selectedClub);
                this.$store.dispatch('showToast', { message: 'Club link copied to clipboard!', type: 'success' });
            } catch (error) {
                console.error('Failed to share club:', error);
                this.$store.dispatch('showToast', { message: 'Failed to share club', type: 'error' });
            }
        },
        async fetchClubStats(clubId) {
            try {
                const response = await getClubStats(clubId);
                this.upcomingEvents = response.data.upcomingEvents;
                this.totalEvents = response.data.totalEvents;
            } catch (error) {
                console.error('Failed to fetch club stats:', error);
                this.upcomingEvents = 0;
                this.totalEvents = 0;
            }
        },

        openImageModal(club) {
            this.selectedImage = this.clubImageSrc(club);
            this.selectedImageAlt = club.name || 'Club image';
            this.showImageModal = true;
        },

        closeImageModal() {
            this.showImageModal = false;
            this.selectedImage = '';
            this.selectedImageAlt = '';
        }
    },
    watch: {
        filteredClubs() {
            this.currentPage = 1;
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
                <div v-for="club in paginatedClubs" :key="club.id" class="club-card" @click="openClubModal(club)">
                    <div class="club-image" @click.stop="openImageModal(club)">
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
                            <button class="btn btn-outline-dark" @click.stop="viewClubEvents(club)">
                                View Events
                            </button>
                            <button
                                class="btn btn-outline-dark"
                                @click.stop="toggleFollow(club.id)"
                                :disabled="isClub"
                            >
                                {{ isFollowing(club.id) ? 'Unfollow' : 'Follow' }}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <Pagination
                v-if="filteredClubs.length > 0"
                :currentPage="currentPage"
                :totalPages="totalPages"
                :totalEvents="filteredClubs.length"
                :eventsPerPage="itemsPerPage"
                item-label="clubs"
                @page-change="handlePageChange"
            />
        </div>

        <ClubDetailModal
            :club="selectedClub"
            :visible="modalVisible"
            :followers-count="selectedClub ? followersCount(selectedClub.id) : 0"
            :is-following="selectedClub ? isFollowing(selectedClub.id) : false"
            :club-category="selectedClub ? resolveCategory(selectedClub) : ''"
            :upcoming-events="upcomingEvents"
            :total-events="totalEvents"
            @close="closeClubModal"
            @view-events="handleViewEvents"
            @toggle-follow="handleToggleFollow"
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
.clubs-grid { background-color: var(--color-background); }
.no-results { text-align: center; padding: var(--space-64) var(--space-24); color: var(--color-text-secondary); }
.no-results h3 { font-size: var(--font-size-2xl); color: var(--color-text); margin-bottom: var(--space-16); }
.cards-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 360px)); justify-content: center; gap: var(--space-24); width: 100%; }
.club-card { background-color: var(--color-surface); border-radius: var(--radius-lg); border: 1px solid var(--color-card-border); box-shadow: var(--shadow-sm); overflow: hidden; transition: transform var(--duration-normal) var(--ease-standard), box-shadow var(--duration-normal) var(--ease-standard), border-color var(--duration-normal) var(--ease-standard); display: flex; flex-direction: column; height: 100%; position: relative; opacity: 0; transform: translateY(12px); animation: card-enter 0.45s var(--ease-standard) forwards; cursor: pointer; }
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
.btn { 
    padding: 10px 14px; 
    border-radius: 12px; 
    font-weight: 600;
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
.btn-dark { background: #111; color: #fff; border: 1px solid #111; }
.btn-dark.following { 
    background: #f8fafc; 
    color: #64748b; 
    border-color: #e2e8f0;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
}
.btn-outline-dark { 
    background: transparent; 
    color: #111; 
    border: 1px solid #111; 
}
.btn-outline-dark.following { 
    background: #f8fafc; 
    color: #64748b; 
    border-color: #e2e8f0;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
}

@keyframes card-enter {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
    .cards-container { grid-template-columns: 1fr; }
}
</style>
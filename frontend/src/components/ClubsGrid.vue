<script>
import { mapGetters, mapActions, mapState } from 'vuex';

export default {
    name: 'ClubsGrid',

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
                        <img v-if="club.club_image" :src="club.club_image" alt="Club image" class="club-img" />
                        <div v-else class="club-image-placeholder"></div>
                        <div class="club-category">{{ resolveCategory(club) }}</div>
                    </div>

                    <div class="club-content">
                        <h3 class="club-title">{{ club.username || club.name }}</h3>
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
.club-card { background-color: var(--color-surface); border-radius: var(--radius-lg); border: 1px solid var(--color-card-border); box-shadow: var(--shadow-sm); overflow: hidden; transition: all var(--duration-normal) var(--ease-standard); }
.club-card:hover { box-shadow: var(--shadow-lg); transform: translateY(-2px); }
.club-image { position: relative; height: 200px; background: var(--color-bg-1); }
.club-img { width: 100%; height: 100%; object-fit: cover; object-position: center; display: block; }
.club-image-placeholder { width: 100%; height: 100%; background: linear-gradient(135deg, var(--color-bg-1) 0%, var(--color-bg-2) 100%); display: flex; align-items: center; justify-content: center; }
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
.club-content { padding: var(--space-20); }
.club-title { font-size: var(--font-size-xl); font-weight: var(--font-weight-bold); color: var(--color-text); margin: 0 0 var(--space-8) 0; }
.club-stats { color: var(--color-text-secondary); font-size: var(--font-size-sm); margin-bottom: var(--space-8); }
.club-description { font-size: var(--font-size-base); color: var(--color-text-secondary); line-height: var(--line-height-normal); margin: 0 0 var(--space-16) 0; display: -webkit-box; -webkit-line-clamp: 4; line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
.club-actions { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-12); }
.btn { padding: 10px 14px; border-radius: 12px; font-weight: 600; }
.btn-dark { background: #111; color: #fff; border: 1px solid #111; }
.btn-dark.following { background: transparent; color: #111; border-color: #111; }
.btn-outline-dark { background: transparent; color: #111; border: 1px solid #111; }

@media (max-width: 768px) {
    .cards-container { grid-template-columns: 1fr; }
}
</style>
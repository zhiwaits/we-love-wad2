<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import ClubDetailModal from '../components/ClubDetailModal.vue';
import { getProfileById, getClubStats } from '../services/profileService';
import { shareClubLink } from '../utils/shareClub';

const route = useRoute();
const router = useRouter();
const store = useStore();

const club = ref(null);
const loading = ref(true);
const error = ref('');
const upcomingEvents = ref(0);
const totalEvents = ref(0);

const fetchClub = async (id) => {
    try {
        loading.value = true;
        error.value = '';
        const response = await getProfileById(id);
        if (response.data.account_type !== 'club') {
            throw new Error('Not a club profile');
        }
        club.value = response.data;
        
        // Fetch club stats
        const statsResponse = await getClubStats(id);
        upcomingEvents.value = statsResponse.data.upcomingEvents;
        totalEvents.value = statsResponse.data.totalEvents;
    } catch (err) {
        console.error(err);
        error.value = err?.response?.status === 404 ? 'Club not found' : 'Unable to load club details right now.';
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    const id = route.params.id;
    if (!id) {
        error.value = 'Missing club identifier.';
        loading.value = false;
        return;
    }
    fetchClub(id);
});

const handleClose = () => {
    router.push({ name: 'BrowseClubs' });
};

const handleViewEvents = (clubData) => {
    store.dispatch('updateSearch', clubData.name || clubData.username);
    store.dispatch('updateEventStatus', 'upcoming');
    router.push({ name: 'Home' });
};

const handleToggleFollow = (clubId) => {
    store.dispatch('clubs/toggleFollow', clubId);
};

const handleShare = async () => {
    if (!club.value) return;
    try {
        await shareClubLink(club.value);
        store.dispatch('showToast', {
            message: 'Club link copied to your clipboard.',
            type: 'success'
        });
    } catch (err) {
        console.error('Unable to share club', err);
        store.dispatch('showToast', {
            message: 'Unable to share this club. Please try again.',
            type: 'error'
        });
    }
};
</script>

<template>
    <div class="club-detail-page">
        <div v-if="loading" class="loading-state">Loading club…</div>
        <div v-else-if="error" class="error-state">
            <p>{{ error }}</p>
            <button type="button" class="btn btn-outline" @click="handleClose">Return to clubs</button>
        </div>
        <ClubDetailModal
            v-else
            :visible="true"
            :club="club"
            :followers-count="club ? store.getters['clubs/followersCount'](club.id) : 0"
            :is-following="club ? store.getters['clubs/isFollowing'](club.id) : false"
            :club-category="club ? store.getters['clubs/categoryNameById'](club.club_category_id) || 'Others' : ''"
            :upcoming-events="upcomingEvents"
            :total-events="totalEvents"
            @close="handleClose"
            @view-events="handleViewEvents"
            @toggle-follow="handleToggleFollow"
            @share="handleShare"
        />
    </div>
</template>

<style scoped>
.club-detail-page {
    min-height: 100vh;
    background: var(--color-background);
    color: var(--color-text);
    display: grid;
    place-items: center;
    padding: clamp(24px, 5vw, 48px);
}

.loading-state,
.error-state {
    color: var(--color-text);
    font-size: 18px;
    text-align: center;
    display: grid;
    gap: 16px;
}

.btn {
    border-radius: 12px;
    padding: 12px 20px;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text);
    transition: background 0.2s ease;
}

.btn:hover {
    background: var(--color-secondary);
}
</style>
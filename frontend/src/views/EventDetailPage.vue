<script setup>
import { onMounted, ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import EventDetailModal from '../components/EventDetailModal.vue';
import { getEventById } from '../services/eventService';
import { shareEventLink } from '../utils/shareEvent';

const route = useRoute();
const router = useRouter();
const store = useStore();

// Computed property for authentication
const isAuthenticated = computed(() => store.getters['auth/isAuthenticated']);
const currentUser = computed(() => store.getters['auth/currentUser']);

const event = ref(null);
const loading = ref(true);
const error = ref('');

const fetchEvent = async (id) => {
    try {
        loading.value = true;
        error.value = '';
        const response = await getEventById(id);
        event.value = response.data;
    } catch (err) {
        console.error(err);
        error.value = err?.response?.status === 404 ? 'Event not found' : 'Unable to load event details right now.';
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    const id = route.params.id;
    if (!id) {
        error.value = 'Missing event identifier.';
        loading.value = false;
        return;
    }
    fetchEvent(id);
});

const handleClose = () => {
    router.push({ name: 'Home' });
};

const handleTagClick = (tag) => {
    store.dispatch('toggleTag', tag);
    router.push({ name: 'Home' });
};

const handleShare = async () => {
    if (!event.value) return;
    try {
        await shareEventLink(event.value);
        store.dispatch('showToast', {
            message: 'Event link copied to your clipboard.',
            type: 'success'
        });
    } catch (err) {
        console.error('Unable to share event', err);
        store.dispatch('showToast', {
            message: 'Unable to share this event. Please try again.',
            type: 'error'
        });
    }
};

const handleLogout = async () => {
    try {
        await store.dispatch('auth/logout');
        router.push('/login');
    } catch (err) {
        console.error('Logout failed:', err);
        router.push('/login');
    }
};
</script>

<template>
    <div class="event-detail-page">
        <!-- Top Right Logout Button -->
        <div class="logout-container" v-if="isAuthenticated">
            <button class="logout-btn" @click="handleLogout" title="Sign Out">
                <span>Sign Out</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
            </button>
        </div>

        <div v-if="loading" class="loading-state">Loading event…</div>
        <div v-else-if="error" class="error-state">
            <p>{{ error }}</p>
            <button type="button" class="btn btn-outline" @click="handleClose">Return to events</button>
        </div>
        <EventDetailModal
            v-else
            :visible="true"
            :event="event"
            @close="handleClose"
            @tag-click="handleTagClick"
            @share="handleShare"
        />
    </div>
</template>

<style scoped>
.event-detail-page {
    min-height: 100vh;
    background: var(--color-background);
    color: var(--color-text);
    display: grid;
    place-items: center;
    padding: clamp(24px, 5vw, 48px);
    position: relative;
}

/* Logout Button Container */
.logout-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    display: block !important;
}

.logout-btn {
    display: flex !important;
    align-items: center;
    gap: 8px;
    padding: 12px 18px;
    background: linear-gradient(135deg, #ff0000 0%, #ff6600 100%) !important;
    color: #ffffff !important;
    border: 3px solid #ffffff !important;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 0 20px rgba(255, 0, 0, 0.8), 0 4px 12px rgba(0, 0, 0, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    visibility: visible !important;
    opacity: 1 !important;
}

.logout-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 0 30px rgba(255, 255, 255, 0.5), 0 6px 20px rgba(0, 0, 0, 0.6);
    background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
    border-color: #ffff00;
    color: #ffff00;
}

.logout-btn:active {
    transform: translateY(0);
}

.logout-btn svg {
    width: 18px;
    height: 18px;
    stroke: currentColor;
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

/* Responsive */
@media (max-width: 768px) {
    .logout-container {
        top: 10px;
        right: 10px;
    }

    .logout-btn {
        padding: 8px 12px;
        font-size: 12px;
        gap: 6px;
    }

    .logout-btn svg {
        width: 16px;
        height: 16px;
    }
}
</style>

<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useStore } from 'vuex';
import EventDetailModal from '../components/EventDetailModal.vue';
import { getEventById } from '../services/eventService';
import { shareEventLink } from '../utils/shareEvent';

const route = useRoute();
const router = useRouter();
const store = useStore();

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
</script>

<template>
    <div class="event-detail-page">
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

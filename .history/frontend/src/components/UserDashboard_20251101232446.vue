<script setup>
import { computed, onMounted, ref } from 'vue';
import { useStore } from 'vuex';
import StatCard from './StatCard.vue';
import EventDetailModal from './EventDetailModal.vue';
import UserCalendar from './UserCalendar.vue';
import { shareEventLink } from '../utils/shareEvent';

const store = useStore();

// NEW - Get user from auth module with fallback
const currentUser = computed(() => store.getters['auth/currentUser'] || { name: 'User', id: 1 });
const userStats = computed(() => store.state.userStats);
const categoryColorMap = computed(() => store.getters['categoryColorMap'] || {});

// Dashboard sections
const upcomingEvents = computed(() => store.getters.upcomingUserEvents);
const recommendedEvents = computed(() => store.getters.recommendedEvents);
const savedEvents = computed(() => store.getters.userSavedEvents);

const selectedEvent = ref(null);
const showEventModal = ref(false);

// Carousel state
const upcomingCarouselIndex = ref(0);
const savedCarouselIndex = ref(0);

// Reactive window width for responsive carousel
const windowWidth = ref(window.innerWidth);
const updateWindowWidth = () => {
  windowWidth.value = window.innerWidth;
};

// Items per view based on screen size
const itemsPerView = computed(() => {
  return windowWidth.value <= 768 ? 1 : windowWidth.value <= 1200 ? 2 : 3;
});

// Carousel navigation methods
const nextUpcoming = () => {
  const maxIndex = Math.max(0, upcomingEvents.value.length - itemsPerView.value);
  upcomingCarouselIndex.value = Math.min(upcomingCarouselIndex.value + 1, maxIndex);
};

const prevUpcoming = () => {
  upcomingCarouselIndex.value = Math.max(upcomingCarouselIndex.value - 1, 0);
};

const nextSaved = () => {
  const maxIndex = Math.max(0, savedEvents.value.length - itemsPerView.value);
  savedCarouselIndex.value = Math.min(savedCarouselIndex.value + 1, maxIndex);
};

const prevSaved = () => {
  savedCarouselIndex.value = Math.max(savedCarouselIndex.value - 1, 0);
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const FALLBACK_PLACEHOLDER = 'https://placehold.co/600x400?text=Event';

// Fetch data on mount
onMounted(async () => {
  const userId = currentUser.value.id;
  
  // Fetch all data
  await store.dispatch('fetchAllEvents');
  await store.dispatch('fetchUserStats', userId);
  await store.dispatch('fetchUserRSVPs', userId);
  
  // Enhanced Debug logging
  console.log('=== DASHBOARD MOUNT DEBUG ===');
  console.log('Current User ID:', userId);
  console.log('All Events Count:', store.state.allEvents.length);
  console.log('User RSVPs Count:', store.state.userRSVPs.length);
  
  // Show first few events
  console.log('Sample Events:', store.state.allEvents.slice(0, 3).map(e => ({
    id: e.id,
    title: e.title,
    date: e.date,
    datetime: e.datetime
  })));
  
  // Show RSVPs with event details
  console.log('RSVPs with Events:', store.state.userRSVPs.map(rsvp => {
    const event = store.state.allEvents.find(e => e.id === rsvp.event_id);
    return {
      rsvp_id: rsvp.id,
      event_id: rsvp.event_id,
      status: rsvp.status,
      event_title: event?.title,
      event_date: event?.datetime || event?.date
    };
  }));
  
  console.log('Upcoming User Events:', store.getters.upcomingUserEvents.map(e => ({
    id: e.id,
    title: e.title,
    date: e.datetime || e.date
  })));
  
  console.log('=== END DEBUG ===');
});

// Format date for display
const formatDate = (dateString) => {
  const date = new Date(dateString);
  const options = { weekday: 'short', day: 'numeric', month: 'short' };
  return date.toLocaleDateString('en-US', options);
};

// Format attendees display
const formatAttendees = (event) => {
  if (event.maxAttendees) {
    return `${event.attendees} / ${event.maxAttendees}`;
  }
  return `${event.attendees}`;
};

const eventImageSrc = (event) => {
  if (!event) return FALLBACK_PLACEHOLDER;
  const raw = event.image || event.image_url || event.imageUrl || event.cover;
  if (!raw) return FALLBACK_PLACEHOLDER;
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  const normalized = raw.replace('/uploads/event/event_', '/uploads/event/');
  return `${API_BASE_URL}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
};

const handleEventImageError = (ev) => {
  if (ev?.target) ev.target.src = FALLBACK_PLACEHOLDER;
};

const openEventModal = (event) => {
  selectedEvent.value = event;
  showEventModal.value = true;
};

const closeEventModal = () => {
  showEventModal.value = false;
  selectedEvent.value = null;
};

const handleShare = async () => {
  if (!selectedEvent.value) return;
  try {
    await shareEventLink(selectedEvent.value);
    store.dispatch('showToast', {
      message: 'Event link copied to your clipboard.',
      type: 'success'
    });
  } catch (error) {
    console.error('Unable to share event', error);
    store.dispatch('showToast', {
      message: 'Unable to share this event. Please try again.',
      type: 'error'
    });
  }
};

const handleTagClick = (tag) => {
  store.dispatch('toggleTag', tag);
};

const handleTagFromModal = (tag) => {
  handleTagClick(tag);
  closeEventModal();
};

// Carousel computed properties
const visibleUpcomingEvents = computed(() => {
  return upcomingEvents.value;
});

const visibleSavedEvents = computed(() => {
  return savedEvents.value;
});

// Carousel transform styles
const upcomingCarouselTransform = computed(() => {
  const translateX = -upcomingCarouselIndex.value * (100 / itemsPerView.value);
  return `translateX(${translateX}%)`;
});

const savedCarouselTransform = computed(() => {
  const translateX = -savedCarouselIndex.value * (100 / itemsPerView.value);
  return `translateX(${translateX}%)`;
});
</script>

<template>
  <div class="dashboard">
    <!-- Dashboard Header -->
    <div class="dashboard-header">
    <div class="container">
        <div class="header-content">
        <div>
            <h1 class="dashboard-title">Welcome back, {{ currentUser?.name || 'User' }}!</h1>
            <p class="dashboard-subtitle">Here's your personalized event overview</p>
        </div>
        <div class="header-actions">
            <router-link to="/" class="btn btn--outline">
            Browse Events
            </router-link>
        </div>
        </div>
    </div>
    </div>

    <div class="container">
      <!-- Stats Overview -->
      <section class="stats-section">
        <div class="stats-grid">
          <StatCard 
            icon="📅" 
            :value="upcomingEvents.length" 
            label="Upcoming RSVPs" 
            color="primary"
          />
          <StatCard 
            icon="✅" 
            :value="0" 
            label="Events Attended" 
            color="success"
          />
          <StatCard 
            icon="💾" 
            :value="userStats.savedCount" 
            label="Saved Events" 
            color="warning"
          />
          <StatCard 
            icon="👥" 
            :value="userStats.clubsFollowed" 
            label="Clubs Following" 
            color="info"
          />
        </div>
      </section>

      <!-- Calendar Section -->
      <section class="calendar-section">
        <UserCalendar />
      </section>

      <!-- Upcoming Events Section -->
      <section class="dashboard-section">
        <div class="section-header">
          <h2 class="section-title">My Upcoming Events <span class="section-count">({{ upcomingEvents.length }})</span></h2>
          <router-link to="/" class="section-link">Browse More →</router-link>
        </div>

        <!-- Empty State -->
        <div v-if="upcomingEvents.length === 0" class="empty-state">
          <p class="empty-message">You haven't RSVP'd to any upcoming events yet</p>
          <router-link to="/" class="btn btn--primary">Browse Events</router-link>
        </div>

        <!-- Events Carousel -->
        <div v-else class="carousel-container">
          <button 
            class="carousel-btn carousel-btn--prev" 
            @click="prevUpcoming"
            :disabled="upcomingCarouselIndex === 0"
            aria-label="Previous events"
          >
            ‹
          </button>
          
          <div class="carousel-wrapper">
            <div class="events-carousel" :style="{ transform: upcomingCarouselTransform }">
              <div
                v-for="event in visibleUpcomingEvents"
                :key="event.id"
                class="event-card"
                role="button"
                tabindex="0"
                @click="openEventModal(event)"
                @keyup.enter.prevent="openEventModal(event)"
                @keyup.space.prevent="openEventModal(event)"
              >
                <div class="event-image">
                  <img :src="eventImageSrc(event)" :alt="event.title" class="event-img" @error="handleEventImageError" />
                  <div class="event-price-tag" :class="{ 'price-free': event.price === 'FREE' }">
                    {{ event.price }}
                  </div>
                  <div class="rsvp-badge">✓ RSVP'd</div>
                </div>

                <div class="event-content">
                  <div class="event-header">
                    <span
                      class="event-category"
                      :style="categoryColorMap[event.category] ? { backgroundColor: categoryColorMap[event.category], color: '#fff' } : {}"
                    >{{ event.category }}</span>
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
                      <span>👥 {{ formatAttendees(event) }} attending</span>
                    </div>
                  </div>

                  <div class="event-tags">
                    <span
                      v-for="tag in event.tags"
                      :key="tag"
                      class="tag-badge"
                      @click.stop="handleTagClick(tag)"
                    >
                      #{{ tag }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <button 
            class="carousel-btn carousel-btn--next" 
            @click="nextUpcoming"
            :disabled="upcomingCarouselIndex >= upcomingEvents.length - 3"
            aria-label="Next events"
          >
            ›
          </button>
        </div>
      </section>

      <!-- Saved Events Section -->
      <section class="dashboard-section">
        <div class="section-header">
          <h2 class="section-title">Saved Events <span class="section-count">({{ savedEvents.length }})</span></h2>
          <router-link to="/" class="section-link">Browse More →</router-link>
        </div>

        <!-- Empty State -->
        <div v-if="savedEvents.length === 0" class="empty-state">
          <p class="empty-message">You haven't saved any events yet</p>
          <router-link to="/" class="btn btn--primary">Browse Events</router-link>
        </div>

        <!-- Events Carousel -->
        <div v-else class="carousel-container">
          <button 
            class="carousel-btn carousel-btn--prev" 
            @click="prevSaved"
            :disabled="savedCarouselIndex === 0"
            aria-label="Previous events"
          >
            ‹
          </button>
          
          <div class="carousel-wrapper">
            <div class="events-carousel" :style="{ transform: savedCarouselTransform }">
              <div
                v-for="event in visibleSavedEvents"
                :key="event.id"
                class="event-card"
                role="button"
                tabindex="0"
                @click="openEventModal(event)"
                @keyup.enter.prevent="openEventModal(event)"
                @keyup.space.prevent="openEventModal(event)"
              >
                <div class="event-image">
                  <img :src="eventImageSrc(event)" :alt="event.title" class="event-img" @error="handleEventImageError" />
                  <div class="event-price-tag" :class="{ 'price-free': event.price === 'FREE' }">
                    {{ event.price }}
                  </div>
                  <div class="saved-badge">💾 Saved</div>
                </div>

                <div class="event-content">
                  <div class="event-header">
                    <span
                      class="event-category"
                      :style="categoryColorMap[event.category] ? { backgroundColor: categoryColorMap[event.category], color: '#fff' } : {}"
                    >{{ event.category }}</span>
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
                  </div>

                  <div class="event-tags">
                    <span
                      v-for="tag in event.tags"
                      :key="tag"
                      class="tag-badge"
                      @click.stop="handleTagClick(tag)"
                    >
                      #{{ tag }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <button 
            class="carousel-btn carousel-btn--next" 
            @click="nextSaved"
            :disabled="savedCarouselIndex >= savedEvents.length - 3"
            aria-label="Next events"
          >
            ›
          </button>
        </div>
      </section>
    </div>

    <EventDetailModal
      :visible="showEventModal"
      :event="selectedEvent"
      @close="closeEventModal"
      @share="handleShare"
      @tag-click="handleTagFromModal"
    />
  </div>
</template>

<style scoped>
.dashboard {
  background-color: var(--color-background);
  min-height: 100vh;
}

/* Header - More subtle and integrated */
.dashboard-header {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: var(--space-32) 0;
  margin-bottom: var(--space-48);
}

.dashboard-title {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  margin: 0 0 var(--space-8) 0;
  color: var(--color-text);
}

.dashboard-subtitle {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  margin: 0;
  font-weight: var(--font-weight-normal);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-24);
}

.header-actions {
  display: flex;
  gap: var(--space-12);
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: flex-start;
  }
}

/* Stats Section - Cleaner cards */
.stats-section {
  margin-bottom: var(--space-56);
}

/* Calendar Section */
.calendar-section {
  margin-bottom: var(--space-56);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-20);
}

/* Dashboard Sections */
.dashboard-section {
  margin-bottom: var(--space-56);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-24);
  padding-bottom: var(--space-16);
  border-bottom: 2px solid var(--color-border);
}

.section-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin: 0;
  color: var(--color-text);
}

.section-count {
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-normal);
  font-size: var(--font-size-lg);
}

.section-link {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-sm);
  transition: all var(--duration-fast);
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.section-link:hover {
  color: var(--color-primary-hover);
  gap: var(--space-8);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: var(--space-48) var(--space-24);
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.empty-message {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-20);
}

/* Events Grid - Match Browse Events exactly */
.events-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-24);
}

/* Carousel Styles */
.carousel-container {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-16);
}

.carousel-wrapper {
  flex: 1;
  overflow: hidden;
  border-radius: var(--radius-lg);
  width: 100%;
}

.events-carousel {
  display: flex;
  gap: var(--space-24);
  transform: translateX(0);
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
  width: calc(100% * 3); /* Show 3 cards at a time */
}

.event-card {
  flex: 0 0 calc(100% / 3 - var(--space-24) * 2 / 3); /* Each card takes 1/3 of the width minus gap */
  min-width: 0; /* Allow flex items to shrink */
}

.carousel-btn {
  background: var(--color-surface);
  border: 2px solid var(--color-border);
  color: var(--color-text);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  z-index: 2;
}

.carousel-btn:hover:not(:disabled) {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-btn-primary-text);
  transform: scale(1.05);
}

.carousel-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.carousel-btn--prev {
  order: -1;
}

.carousel-btn--next {
  order: 1;
}

/* Responsive Design */
@media (max-width: 1200px) {
  .events-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .events-carousel {
    width: calc(100% * 2); /* Show 2 cards at a time on tablet */
  }
  
  .event-card {
    flex: 0 0 calc(100% / 2 - var(--space-24) * 1 / 2);
  }
}

@media (max-width: 768px) {
  .dashboard-header {
    padding: var(--space-24) 0;
  }

  .dashboard-title {
    font-size: var(--font-size-2xl);
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-16);
  }

  .events-grid {
    grid-template-columns: 1fr;
  }
  
  .events-carousel {
    width: calc(100% * 1); /* Show 1 card at a time on mobile */
  }
  
  .event-card {
    flex: 0 0 100%;
  }
  
  .carousel-container {
    gap: var(--space-8);
  }
  
  .carousel-btn {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .dashboard-title {
    font-size: var(--font-size-xl);
  }
}

/* Smooth entrance animations */
.stat-card {
  animation: fadeInUp 0.5s ease forwards;
}

.stat-card:nth-child(1) { animation-delay: 0.1s; }
.stat-card:nth-child(2) { animation-delay: 0.2s; }
.stat-card:nth-child(3) { animation-delay: 0.3s; }
.stat-card:nth-child(4) { animation-delay: 0.4s; }

.event-card {
  animation: fadeInUp 0.5s ease forwards;
  opacity: 0;
}

.event-card:nth-child(1) { animation-delay: 0.1s; }
.event-card:nth-child(2) { animation-delay: 0.2s; }
.event-card:nth-child(3) { animation-delay: 0.3s; }
.event-card:nth-child(4) { animation-delay: 0.4s; }
.event-card:nth-child(5) { animation-delay: 0.5s; }
.event-card:nth-child(6) { animation-delay: 0.6s; }

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

</style>
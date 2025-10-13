<script setup>
import { computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import StatCard from './StatCard.vue';

const store = useStore();

// User data
const currentUser = computed(() => store.state.currentUser);
const userStats = computed(() => store.state.userStats);

// Dashboard sections
const upcomingEvents = computed(() => store.getters.upcomingUserEvents);
const recommendedEvents = computed(() => store.getters.recommendedEvents);
const savedEvents = computed(() => store.getters.userSavedEvents);

// Fetch data on mount
onMounted(async () => {
  const userId = currentUser.value.id;
  
  // Fetch all data
  await store.dispatch('fetchAllEvents');
  await store.dispatch('fetchUserStats', userId);
  await store.dispatch('fetchUserRSVPs', userId);
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
</script>

<template>
  <div class="dashboard">
    <!-- Dashboard Header -->
    <div class="dashboard-header">
    <div class="container">
        <div class="header-content">
        <div>
            <h1 class="dashboard-title">Welcome back, {{ currentUser.name }}!</h1>
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
            :value="userStats.upcomingRSVPs" 
            label="Upcoming RSVPs" 
            color="primary"
          />
          <StatCard 
            icon="✅" 
            :value="userStats.totalAttended" 
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

      <!-- Upcoming Events Section -->
      <section class="dashboard-section">
        <div class="section-header">
          <h2 class="section-title">My Upcoming Events</h2>
          <router-link to="/" class="section-link">Browse More →</router-link>
        </div>

        <!-- Empty State -->
        <div v-if="upcomingEvents.length === 0" class="empty-state">
          <p class="empty-message">You haven't RSVP'd to any upcoming events yet</p>
          <router-link to="/" class="btn btn--primary">Browse Events</router-link>
        </div>

        <!-- Events Grid -->
        <div v-else class="events-grid">
          <div v-for="event in upcomingEvents" :key="event.id" class="event-card">
            <div class="event-image">
              <img v-if="event.image" :src="event.image" :alt="event.title" class="event-img" />
              <div v-else class="event-image-placeholder"></div>
              <div class="event-price-tag" :class="{ 'price-free': event.price === 'FREE' }">
                {{ event.price }}
              </div>
              <div class="rsvp-badge">✓ RSVP'd</div>
            </div>

            <div class="event-content">
              <div class="event-header">
                <span class="event-category">{{ event.category }}</span>
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
                <span v-for="tag in event.tags" :key="tag" class="tag-badge">
                  #{{ tag }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Recommended Events Section -->
      <section class="dashboard-section">
        <div class="section-header">
          <h2 class="section-title">Recommended for You</h2>
          <router-link to="/" class="section-link">See All →</router-link>
        </div>

        <div class="events-grid">
          <div v-for="event in recommendedEvents" :key="event.id" class="event-card">
            <div class="event-image">
              <img v-if="event.image" :src="event.image" :alt="event.title" class="event-img" />
              <div v-else class="event-image-placeholder"></div>
              <div class="event-price-tag" :class="{ 'price-free': event.price === 'FREE' }">
                {{ event.price }}
              </div>
            </div>

            <div class="event-content">
              <div class="event-header">
                <span class="event-category">{{ event.category }}</span>
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
                <span v-for="tag in event.tags" :key="tag" class="tag-badge">
                  #{{ tag }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
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

.event-card {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-card-border);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  transition: all var(--duration-normal) var(--ease-standard);
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

.event-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
  border-color: var(--color-primary);
}

.event-image {
  position: relative;
  height: 200px;
  background: var(--color-bg-1);
  flex-shrink: 0;
}

.event-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.event-image-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, var(--color-bg-1) 0%, var(--color-bg-2) 100%);
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
  box-shadow: var(--shadow-sm);
}

.price-free {
  background-color: var(--color-success) !important;
}

.rsvp-badge {
  position: absolute;
  top: var(--space-12);
  left: var(--space-12);
  background-color: var(--color-success);
  color: white;
  padding: var(--space-4) var(--space-12);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  box-shadow: var(--shadow-sm);
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.event-content {
  padding: var(--space-20);
  flex: 1;
  display: flex;
  flex-direction: column;
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
  margin: 0 0 var(--space-12) 0;
  line-height: var(--line-height-tight);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.event-details {
  margin-bottom: var(--space-12);
  flex: 1;
}

.event-details > div {
  margin-bottom: var(--space-8);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: 1.4;
}

.event-details > div:last-child {
  margin-bottom: 0;
}

.event-organiser span {
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-base);
  color: var(--color-text);
}

.event-datetime {
  font-weight: var(--font-weight-medium);
}

.event-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-8);
  margin-top: auto;
}

.tag-badge {
  background-color: var(--color-bg-1);
  color: var(--color-text-secondary);
  padding: var(--space-4) var(--space-8);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  transition: all 0.2s ease;
}

.tag-badge:hover {
  background-color: var(--color-bg-2);
}

/* Responsive Design */
@media (max-width: 1200px) {
  .events-grid {
    grid-template-columns: repeat(2, 1fr);
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

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-12);
  }

  .event-image {
    height: 180px;
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
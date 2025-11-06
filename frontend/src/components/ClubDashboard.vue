<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import StatCard from './StatCard.vue';
import FullImageModal from './FullImageModal.vue';
import ClubProfileModal from './ClubProfileModal.vue';
import ClubCalendar from './ClubCalendar.vue';
import ClubRSVPsModal from './ClubRSVPsModal.vue';
import ClubFollowersModal from './ClubFollowersModal.vue';
import ClubDetailModal from './ClubDetailModal.vue';
import ClubAnalyticsSection from './ClubAnalyticsSection.vue';
import { deleteRsvp } from '../services/rsvpService';

const store = useStore();
const router = useRouter();

const isMounted = ref(false);

onMounted(() => {
  isMounted.value = true;
});

onBeforeUnmount(() => {
  isMounted.value = false;
});

// NEW - Get user from auth module with fallback
const clubFollowers = computed(() => isMounted.value ? (store.state.clubFollowers || []) : []);
const clubRSVPs = computed(() => isMounted.value ? (store.state.clubRSVPs || []) : []);

// NEW - Get user from auth module with fallback
const currentUser = computed(() => isMounted.value ? (store.getters['auth/currentUser'] || { name: 'User', id: 1 }) : { name: 'User', id: 1 });
const categoryColorMap = computed(() => isMounted.value ? (store.getters['categoryColorMap'] || {}) : {});

// Dashboard sections
const upcomingEvents = computed(() => isMounted.value ? store.getters.upcomingUserEvents : []);
const recommendedEvents = computed(() => isMounted.value ? store.getters.recommendedEvents : []);
const savedEvents = computed(() => isMounted.value ? store.getters.userSavedEvents : []);

const showRsvpsModal = ref(false);
const showFollowersModal = ref(false);
const showProfileModal = ref(false);
const showPreviewModal = ref(false);
const rsvpActionKey = ref(null);

const analyticsTabs = [
  { id: 'event', label: 'Events' },
  { id: 'audience', label: 'Followers' },
  { id: 'engagement', label: 'Preferences' }
];
const activeAnalyticsTab = ref('event');
const analyticsLoading = ref(false);
const analyticsError = ref(null);

const createEmptyRange = () => ({
  startDate: null,
  endDate: null,
  newFollowers: 0,
  netChange: 0,
  averagePerDay: 0
});

const defaultFollowerAnalytics = Object.freeze({
  totalFollowers: 0,
  totalNewFollowers: 0,
  baselineFollowers: 0,
  timeline: [],
  ranges: {
    '30': createEmptyRange(),
    '180': createEmptyRange(),
    '365': createEmptyRange()
  },
  generatedAt: null
});

const defaultPreferenceAnalytics = Object.freeze({
  totalFollowers: 0,
  topCategories: [],
  topTags: [],
  maxCategoryCount: 0,
  maxTagCount: 0
});

const clampRatio = (value, min = 0, max = 1) => {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
};

const analyticsOwnerId = computed(() => {
  if (!isMounted.value) {
    return null;
  }
  const user = store.getters['auth/currentUser'];
  if (!user || user.id == null) {
    return null;
  }
  const numericId = Number(user.id);
  return Number.isFinite(numericId) ? numericId : null;
});

const analyticsPayload = computed(() => {
  if (!isMounted.value) {
    return null;
  }
  const analytics = store.getters.clubEventAnalytics;
  return analytics && typeof analytics === 'object' ? analytics : null;
});

const rawAnalyticsEvents = computed(() => {
  const analytics = analyticsPayload.value;
  return Array.isArray(analytics?.events) ? analytics.events : [];
});

const followerAnalytics = computed(() => {
  const analytics = analyticsPayload.value;
  const followers = analytics?.followers;
  if (followers && typeof followers === 'object') {
    return followers;
  }
  return defaultFollowerAnalytics;
});

const preferenceAnalytics = computed(() => {
  const analytics = analyticsPayload.value;
  const preferences = analytics?.preferences;
  if (preferences && typeof preferences === 'object') {
    return preferences;
  }
  return defaultPreferenceAnalytics;
});

const eventAnalytics = computed(() => {
  return rawAnalyticsEvents.value.map((event) => {
    const fillPercentRaw = Number(event.capacityFillPercentage);
    const hasFillPercent = Number.isFinite(fillPercentRaw);
    const fillRatioRaw = Number(event.capacityFillRatio);
    const resolvedFillRatio = Number.isFinite(fillRatioRaw)
      ? clampRatio(fillRatioRaw)
      : hasFillPercent
        ? clampRatio(fillPercentRaw / 100)
        : 0;
    const capacityFillWidth = Math.round(resolvedFillRatio * 100);

    let resolvedProgressPercent = Number(event.progressPercent);
    if (!Number.isFinite(resolvedProgressPercent)) {
      const ratio = Number(event.progressRatio);
      resolvedProgressPercent = Number.isFinite(ratio) ? Number((ratio * 100).toFixed(1)) : 0;
    }
    const normalizedProgress = Number.isFinite(resolvedProgressPercent) ? resolvedProgressPercent : 0;
    const progressPercentText = `${normalizedProgress.toFixed(1)}%`;

    const stageLabel = event.progressStageLabel
      ? event.progressStageLabel
      : event.progressStage
        ? `${event.progressStage.charAt(0).toUpperCase()}${event.progressStage.slice(1)} stage`
        : 'Stage unavailable';

    const isFull = resolvedFillRatio >= 0.999 || (hasFillPercent && fillPercentRaw >= 99.9);
    const insightLabel = isFull ? 'FULL' : event.insightLabel;
    const insightColor = isFull ? 'blue' : event.insightColor;

    const startDateSource = event.startDateTime || event.start_datetime || event.start_time || event.startTime || event.date || event.datetime;
    const startDateTimeText = formatDateTime(startDateSource);

    return {
      ...event,
      capacityFillPercentage: hasFillPercent ? Number(fillPercentRaw.toFixed(1)) : null,
      capacityFillPercentText: hasFillPercent ? `${fillPercentRaw.toFixed(1)}%` : 'Not available',
      capacityFillRatio: resolvedFillRatio,
      capacityFillWidth,
      progressPercent: Number(normalizedProgress.toFixed(1)),
      progressPercentText,
      progressStageLabel: stageLabel,
      insightLabel,
      insightColor,
      startDateTimeText
    };
  });
});

// Image modal state
const showImageModal = ref(false);
const selectedImage = ref('');
const selectedImageAlt = ref('');

const clubEventsMap = computed(() => {
  const map = new Map();
  const events = store.state.clubOwnedEvents || [];
  events.forEach((event) => {
    if (!event || event.id == null) {
      return;
    }
    const eventId = Number(event.id);
    if (Number.isNaN(eventId)) {
      return;
    }
    map.set(eventId, event);
  });
  return map;
});

const groupedClubRsvps = computed(() => {
  if (!Array.isArray(clubRSVPs.value) || clubRSVPs.value.length === 0) {
    return [];
  }
  const groupMap = new Map();

  clubRSVPs.value.forEach((rsvp) => {
    if (!rsvp) {
      return;
    }
    const eventId = Number(rsvp.event_id ?? rsvp.eventId);
    if (!Number.isFinite(eventId)) {
      return;
    }
    if (!groupMap.has(eventId)) {
      const event = clubEventsMap.value.get(eventId);
      const eventDate = event?.date || event?.datetime || rsvp.event_date || null;
      const venue = event?.venue || event?.location || null;
      groupMap.set(eventId, {
        eventId,
        eventTitle: event?.title || `Event #${eventId}`,
        eventDate,
        eventTime: event?.time || event?.start_time || event?.startTime || null,
        venue,
        rsvps: []
      });
    }
    const group = groupMap.get(eventId);
    group.rsvps.push(rsvp);
  });

  const sortedGroups = Array.from(groupMap.values()).sort((a, b) => {
    const dateA = a.eventDate ? new Date(a.eventDate) : null;
    const dateB = b.eventDate ? new Date(b.eventDate) : null;
    if (dateA && dateB) {
      return dateA - dateB;
    }
    if (dateA) {
      return -1;
    }
    if (dateB) {
      return 1;
    }
    return a.eventTitle.localeCompare(b.eventTitle);
  });

  sortedGroups.forEach((group) => {
    group.rsvps.sort((a, b) => {
      const createdA = a.created_at ? new Date(a.created_at) : null;
      const createdB = b.created_at ? new Date(b.created_at) : null;
      if (createdA && createdB) {
        return createdB - createdA;
      }
      return (a.attendee_name || '').localeCompare(b.attendee_name || '');
    });
  });

  return sortedGroups;
});

const upcomingRsvpCount = computed(() => {
  const groups = groupedClubRsvps.value;
  if (!Array.isArray(groups) || groups.length === 0) {
    return 0;
  }
  return groups.reduce((count, group) => {
    return count + (group.rsvps?.length || 0);
  }, 0);
});

const clubStats = computed(() => {
  const followerCount = store.state.clubStats?.followers;
  return {
    upcomingEvents: store.getters.upcomingClubEvents?.length || 0,
    totalEvents: store.getters.filteredClubEvents?.length || 0,
    currentRSVPs: upcomingRsvpCount.value,
    followers: typeof followerCount === 'number' ? followerCount : clubFollowers.value.length
  };
});

const currentClubCategory = computed(() => {
  const categoryId = currentUser.value?.club_category_id;
  if (!categoryId) return '';
  
  const categories = store.state.categories || [];
  const category = categories.find(cat => cat.id == categoryId);
  return category ? (category.name || '') : '';
});

const refreshClubRsvps = async () => {
  const ownerId = analyticsOwnerId.value;
  if (!Number.isFinite(ownerId)) {
    return;
  }
  await store.dispatch('fetchClubRSVPs', ownerId);
};

const refreshClubFollowers = async () => {
  const ownerId = analyticsOwnerId.value;
  if (!Number.isFinite(ownerId)) {
    return;
  }
  await store.dispatch('fetchClubFollowers', ownerId);
};

const loadClubAnalytics = async (ownerId) => {
  const numericOwnerId = Number(ownerId);
  if (!Number.isFinite(numericOwnerId)) {
    return;
  }

  analyticsLoading.value = true;
  analyticsError.value = null;

  try {
    await store.dispatch('fetchClubEventAnalytics', numericOwnerId);
  } catch (error) {
    console.error('Failed to load club analytics:', error);
    analyticsError.value = 'Failed to load event analytics.';
  } finally {
    analyticsLoading.value = false;
  }
};

const retryAnalytics = () => {
  if (analyticsOwnerId.value == null) {
    return;
  }
  loadClubAnalytics(analyticsOwnerId.value);
};

const formatDateTime = (value) => {
  if (!value) {
    return 'TBD';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'TBD';
  }
  return parsed.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

const navigateToClubEvents = async (status = 'both') => {
  await store.dispatch('resetClubEventFilters');
  await store.dispatch('updateClubEventStatus', status);
  router.push({ name: 'EditEvents', query: { status } });
};

const handleUpcomingEventsCardClick = () => {
  navigateToClubEvents('upcoming');
};

const handleTotalEventsCardClick = () => {
  navigateToClubEvents('both');
};

const handleRsvpsCardClick = async () => {
  await refreshClubRsvps();
  showRsvpsModal.value = true;
};

const handleFollowersCardClick = async () => {
  await refreshClubFollowers();
  showFollowersModal.value = true;
};

const closeRsvpsModal = () => {
  showRsvpsModal.value = false;
  rsvpActionKey.value = null;
};

const closeFollowersModal = () => {
  showFollowersModal.value = false;
};

const handleRemoveSingleRsvp = async ({ eventId, userId }) => {
  if (!eventId || !userId || rsvpActionKey.value) {
    return;
  }
  const key = `single:${eventId}:${userId}`;
  rsvpActionKey.value = key;
  try {
    await deleteRsvp(eventId, userId);
    await refreshClubRsvps();
    store.dispatch('showToast', { message: 'RSVP removed successfully.', type: 'success' });
  } catch (error) {
    console.error('Failed to remove RSVP:', error);
    store.dispatch('showToast', { message: 'Failed to remove RSVP. Please try again.', type: 'error' });
  } finally {
    rsvpActionKey.value = null;
  }
};

// Preview modal methods

const handleRemoveAllRsvps = async ({ eventId, rsvps }) => {
  if (!eventId || !Array.isArray(rsvps) || rsvps.length === 0 || rsvpActionKey.value) {
    return;
  }
  const key = `bulk:${eventId}`;
  rsvpActionKey.value = key;
  try {
    const uniqueUserIds = Array.from(
      new Set(
        rsvps
          .map((rsvp) => (rsvp?.user_id ?? rsvp?.userId))
          .filter((userId) => userId != null)
      )
    );
    await Promise.all(uniqueUserIds.map((userId) => deleteRsvp(eventId, userId)));
    await refreshClubRsvps();
    store.dispatch('showToast', { message: 'All RSVPs cleared for this event.', type: 'success' });
  } catch (error) {
    console.error('Failed to remove RSVPs:', error);
    store.dispatch('showToast', { message: 'Failed to clear RSVPs. Please try again.', type: 'error' });
  } finally {
    rsvpActionKey.value = null;
  }
};

watch(
  () => analyticsOwnerId.value,
  async (newOwnerId, oldOwnerId) => {
    if (Number.isFinite(newOwnerId)) {
      if (newOwnerId === oldOwnerId) {
        return;
      }
      await loadClubAnalytics(newOwnerId);
      try {
        await refreshClubRsvps();
      } catch (error) {
        console.error('Failed to refresh club RSVPs:', error);
      }
      try {
        await refreshClubFollowers();
      } catch (error) {
        console.error('Failed to refresh club followers:', error);
      }
      try {
        await store.dispatch('fetchClubStats', newOwnerId);
      } catch (error) {
        console.error('Failed to refresh club stats:', error);
      }
    } else if (Number.isFinite(oldOwnerId)) {
      store.commit('SET_CLUB_ANALYTICS', []);
    }
  },
  { immediate: true }
);

// Fetch data on mount
onMounted(async () => {
  // Fetch all data
  await store.dispatch('fetchAllEvents');
  await store.dispatch('fetchClubOwnedEvents', { force: true });
});

const handleProfileUpdated = () => {
  // Profile was updated successfully, modal will close automatically
  // We could refresh any dependent data here if needed
};

const closeImageModal = () => {
  showImageModal.value = false;
  selectedImage.value = '';
  selectedImageAlt.value = '';
};
</script>

<template>
  <div class="dashboard">
    <!-- Dashboard Header -->
    <div class="dashboard-header">
    <div class="container">
        <div class="header-content">
        <div>
            <h1 class="dashboard-title">Welcome back, {{ currentUser?.name || 'User' }}!</h1>
            <p class="dashboard-subtitle">Here's your club overview</p>
        </div>
        <div class="header-actions">
          <button 
            type="button" 
            class="btn btn-outline" 
            @click="showPreviewModal = true"
          >
            Preview Profile
          </button>
          <button 
            type="button" 
            class="btn btn-outline" 
            @click="showProfileModal = true"
          >
            Edit Profile
          </button>
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
            :value="clubStats.upcomingEvents" 
            label="Upcoming Events" 
            color="primary"
            clickable
            @click="handleUpcomingEventsCardClick"
          />
          <StatCard 
            icon="📊" 
            :value="clubStats.totalEvents" 
            label="Total Events" 
            color="success"
            clickable
            @click="handleTotalEventsCardClick"
          />
          <StatCard 
            icon="✔️" 
            :value="clubStats.currentRSVPs" 
            label="Current RSVPs" 
            color="warning"
            clickable
            @click="handleRsvpsCardClick"
          />
          <StatCard 
            icon="🤝" 
            :value="clubStats.followers" 
            label="Followers" 
            color="info"
            clickable
            @click="handleFollowersCardClick"
          />
        </div>
      </section>

      <!-- Calendar Section -->
      <section class="calendar-section">
        <ClubCalendar />
      </section>

      <ClubAnalyticsSection
        :tabs="analyticsTabs"
        :active-tab="activeAnalyticsTab"
        :event-analytics="eventAnalytics"
        :follower-analytics="followerAnalytics"
        :preference-analytics="preferenceAnalytics"
        :loading="analyticsLoading"
        :error="analyticsError"
        @update:activeTab="activeAnalyticsTab = $event"
        @retry="retryAnalytics"
      />
    </div>

    <ClubRSVPsModal
      :visible="showRsvpsModal"
      :groups="groupedClubRsvps"
      :busy-key="rsvpActionKey"
      @close="closeRsvpsModal"
      @remove-rsvp="handleRemoveSingleRsvp"
      @remove-event-rsvps="handleRemoveAllRsvps"
      @refresh="refreshClubRsvps"
    />

    <ClubFollowersModal
      :visible="showFollowersModal"
      :followers="clubFollowers"
      @close="closeFollowersModal"
      @refresh="refreshClubFollowers"
    />

    <FullImageModal
      :visible="showImageModal"
      :imageSrc="selectedImage"
      :altText="selectedImageAlt"
      @close="closeImageModal"
    />

    <ClubProfileModal
      :visible="showProfileModal"
      :currentUser="currentUser"
      @close="showProfileModal = false"
      @profile-updated="handleProfileUpdated"
    />

    <ClubDetailModal
      :visible="showPreviewModal"
      :club="currentUser"
      :followersCount="clubStats.followers"
      :upcomingEvents="clubStats.upcomingEvents"
      :totalEvents="clubStats.totalEvents"
      :clubCategory="currentClubCategory"
      :previewMode="true"
      @close="showPreviewModal = false"
      @view-events="() => {}"
      @toggle-follow="() => {}"
      @share="() => {}"
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-20);
}

/* Calendar Section */
.calendar-section {
  margin-bottom: var(--space-56);
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
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-normal);
  color: var(--color-text-secondary);
  margin-left: var(--space-8);
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

/* Profile Edit Form */
.profile-edit-form {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: var(--space-32);
}

.form-section {
  margin-bottom: var(--space-32);
  padding-bottom: var(--space-32);
  border-bottom: 1px solid var(--color-border);
}

.form-section:last-of-type {
  border-bottom: none;
  margin-bottom: var(--space-24);
  padding-bottom: 0;
}

.form-section-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
  margin: 0 0 var(--space-8) 0;
}

.form-section-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-16) 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-20);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.form-group--full {
  grid-column: 1 / -1;
}

.form-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}

.form-input,
.form-select,
.form-textarea {
  padding: var(--space-12) var(--space-16);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-background);
  color: var(--color-text);
  font-size: var(--font-size-base);
  transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
}

.form-input::placeholder,
.form-select::placeholder,
.form-textarea::placeholder {
  color: var(--color-text-secondary);
}

@media (prefers-color-scheme: dark) {
  .form-input::placeholder,
  .form-select::placeholder,
  .form-textarea::placeholder {
    color: #9ca3af;
  }
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb, 33, 128, 141), 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.form-textarea::placeholder {
  color: var(--color-text-secondary);
  opacity: 0.7;
}

@media (prefers-color-scheme: dark) {
  .form-textarea::placeholder {
    color: #9ca3af;
  }
}

.form-help {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-top: var(--space-4);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--space-24);
  padding-top: var(--space-24);
  border-top: 1px solid var(--color-border);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
  min-height: 56px;
  align-items: flex-start;
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

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-section {
    margin-bottom: var(--space-24);
    padding-bottom: var(--space-24);
  }

  .profile-info {
    flex-direction: column;
    text-align: center;
  }

  .avatar-img {
    width: 100px;
    height: 100px;
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

/* Empty State */
.empty-state {
  text-align: center;
  padding: var(--space-48) var(--space-24);
  background-color: var(--color-surface);
  border-radius: var(--border-radius-lg);
  border: 2px dashed var(--color-border);
}

.empty-message {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-24) 0;
}

</style>
<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import StatCard from './StatCard.vue';
import EventDetailModal from './EventDetailModal.vue';
import FullImageModal from './FullImageModal.vue';
import ClubDetailModal from './ClubDetailModal.vue';
import ClubCalendar from './ClubCalendar.vue';
import ClubRSVPsModal from './ClubRSVPsModal.vue';
import ClubFollowersModal from './ClubFollowersModal.vue';
import { shareEventLink } from '../utils/shareEvent';
import { updateClubProfile, getClubStats } from '../services/profileService';
import { getAllClubCategories } from '../services/clubCategoryService';
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

const selectedEvent = ref(null);
const showEventModal = ref(false);
const showRsvpsModal = ref(false);
const showFollowersModal = ref(false);
const rsvpActionKey = ref(null);

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

// Profile edit form data
const profileForm = ref({
  name: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  club_description: '',
  club_category_id: '',
  imageBase64: null,
  imageOriginalName: null
});
const clubCategories = ref([]);
const profileLoading = ref(false);

// Preview modal
const showPreviewModal = ref(false);
const previewUpcomingEvents = ref(0);
const previewTotalEvents = ref(0);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const FALLBACK_PLACEHOLDER = 'https://placehold.co/600x400?text=Event';

const refreshClubRsvps = async () => {
  const ownerId = currentUser.value?.id;
  if (!ownerId) {
    return;
  }
  await store.dispatch('fetchClubRSVPs', ownerId);
};

const refreshClubFollowers = async () => {
  const ownerId = currentUser.value?.id;
  if (!ownerId) {
    return;
  }
  await store.dispatch('fetchClubFollowers', ownerId);
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

// Fetch data on mount
onMounted(async () => {
  const userId = currentUser.value.id;
  
  // Fetch all data
  await store.dispatch('fetchAllEvents');
  await store.dispatch('fetchClubOwnedEvents', { force: true });
  await store.dispatch('fetchClubStats', userId);
  await refreshClubRsvps();
  await refreshClubFollowers();
  
  // Load club categories for the form
  await loadClubCategories();
  
  // Load current profile data
  await loadProfileData();
});

// Profile management methods
const loadClubCategories = async () => {
  try {
    const response = await getAllClubCategories();
    clubCategories.value = response.data || [];
  } catch (error) {
    console.error('Failed to load club categories:', error);
  }
};

const loadProfileData = async () => {
  try {
    // Profile data should already be in currentUser, but we can refresh if needed
    const user = currentUser.value;
    profileForm.value = {
      name: user.name || '',
      username: user.username || '',
      email: user.email || '',
      password: '',
      confirmPassword: '',
      club_description: user.club_description || '',
      club_category_id: user.club_category_id || '',
      imageBase64: null,
      imageOriginalName: null
    };
  } catch (error) {
    console.error('Failed to load profile data:', error);
  }
};

const handleImageUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    profileForm.value.imageBase64 = e.target.result;
    profileForm.value.imageOriginalName = file.name;
  };
  reader.readAsDataURL(file);
};

const validateForm = () => {
  if (profileForm.value.password && profileForm.value.password !== profileForm.value.confirmPassword) {
    store.dispatch('showToast', { message: 'Passwords do not match', type: 'error' });
    return false;
  }
  if (!profileForm.value.name || !profileForm.value.username || !profileForm.value.email) {
    store.dispatch('showToast', { message: 'Name, username and email are required', type: 'error' });
    return false;
  }
  return true;
};

const submitProfileUpdate = async () => {
  if (!validateForm()) return;

  profileLoading.value = true;
  try {
    const updateData = {
      name: profileForm.value.name,
      username: profileForm.value.username,
      email: profileForm.value.email,
      club_description: profileForm.value.club_description,
      club_category: profileForm.value.club_category_id
    };

    // Only include password if it's provided
    if (profileForm.value.password) {
      updateData.password = profileForm.value.password;
    }

    // Include image data if uploaded
    if (profileForm.value.imageBase64) {
      updateData.imageBase64 = profileForm.value.imageBase64;
      updateData.imageOriginalName = profileForm.value.imageOriginalName;
    }

    await updateClubProfile(currentUser.value.id, updateData);
    
    // Update the store with new data
    await store.dispatch('auth/checkAuth');
    
    store.dispatch('showToast', { message: 'Profile updated successfully!', type: 'success' });
  } catch (error) {
    console.error('Failed to update profile:', error);
    store.dispatch('showToast', { message: 'Failed to update profile', type: 'error' });
  } finally {
    profileLoading.value = false;
  }
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

// Preview modal methods
const openPreviewModal = async () => {
  try {
    const statsResponse = await getClubStats(currentUser.value.id);
    previewUpcomingEvents.value = statsResponse.data.upcomingEvents;
    previewTotalEvents.value = statsResponse.data.totalEvents;
  } catch (error) {
    console.error('Failed to fetch club stats for preview:', error);
    previewUpcomingEvents.value = 0;
    previewTotalEvents.value = 0;
  }
  showPreviewModal.value = true;
};

const closePreviewModal = () => {
  showPreviewModal.value = false;
};

// Create preview club object from form data
const previewClub = computed(() => {
  const selectedCategory = clubCategories.value.find(cat => cat.id == profileForm.value.club_category_id);
  return {
    id: currentUser.value.id,
    name: profileForm.value.name || currentUser.value.name,
    username: profileForm.value.username,
    email: profileForm.value.email,
    club_description: profileForm.value.club_description,
    club_image: profileForm.value.imageBase64 ? profileForm.value.imageBase64 : currentUser.value.club_image,
    club_category_id: profileForm.value.club_category_id
  };
});

const previewClubCategory = computed(() => {
  const selectedCategory = clubCategories.value.find(cat => cat.id == profileForm.value.club_category_id);
  return selectedCategory ? selectedCategory.name : '';
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
            <p class="dashboard-subtitle">Here's your club overview</p>
        </div>
        <div class="header-actions">
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

      <!-- Profile Edit Section -->
      <section class="dashboard-section">
        <div class="section-header">
          <h2 class="section-title">Club Profile</h2>
          <button 
            type="button" 
            class="btn btn-outline" 
            @click="openPreviewModal"
          >
            Preview
          </button>
        </div>

        <div class="profile-edit-form">
          <form @submit.prevent="submitProfileUpdate">
            <!-- Basic Information Section -->
            <div class="form-section">
              <h3 class="form-section-title">Basic Information</h3>
              <div class="form-grid">
                <div class="form-group">
                  <label for="name" class="form-label">Club Name</label>
                  <input
                    id="name"
                    v-model="profileForm.name"
                    type="text"
                    class="form-input"
                    required
                  />
                </div>

                <div class="form-group">
                  <label for="username" class="form-label">Username</label>
                  <input
                    id="username"
                    v-model="profileForm.username"
                    type="text"
                    class="form-input"
                    required
                  />
                </div>

                <div class="form-group form-group--full">
                  <label for="email" class="form-label">Email Address</label>
                  <input
                    id="email"
                    v-model="profileForm.email"
                    type="email"
                    class="form-input"
                    required
                  />
                </div>
              </div>
            </div>

            <!-- Security Section -->
            <div class="form-section">
              <h3 class="form-section-title">Change Password</h3>
              <p class="form-section-desc">Leave blank to keep your current password</p>
              <div class="form-grid">
                <div class="form-group">
                  <label for="password" class="form-label">New Password</label>
                  <input
                    id="password"
                    v-model="profileForm.password"
                    type="password"
                    class="form-input"
                  />
                </div>

                <div class="form-group">
                  <label for="confirmPassword" class="form-label">Confirm New Password</label>
                  <input
                    id="confirmPassword"
                    v-model="profileForm.confirmPassword"
                    type="password"
                    class="form-input"
                  />
                </div>
              </div>
            </div>

            <!-- Club Details Section -->
            <div class="form-section">
              <h3 class="form-section-title">Club Details</h3>
              <div class="form-grid">
                <div class="form-group form-group--full">
                  <label for="club_description" class="form-label">Club Description</label>
                  <textarea
                    id="club_description"
                    v-model="profileForm.club_description"
                    class="form-textarea"
                    rows="4"
                    placeholder="Tell people about your club..."
                    required
                  ></textarea>
                </div>

                <div class="form-group">
                  <label for="club_category_id" class="form-label">Club Category</label>
                  <select
                    id="club_category_id"
                    v-model="profileForm.club_category_id"
                    class="form-select"
                    required
                  >
                    <option value="">Select a category</option>
                    <option
                      v-for="category in clubCategories"
                      :key="category.id"
                      :value="category.id"
                    >
                      {{ category.name }}
                    </option>
                  </select>
                </div>

                <div class="form-group">
                  <label for="image" class="form-label">Club Image</label>
                  <input
                    id="image"
                    type="file"
                    accept="image/*"
                    class="form-input"
                    @change="handleImageUpload"
                  />
                  <small class="form-help">Leave blank to keep current image. Recommended: 1200x400px</small>
                </div>
              </div>
            </div>

            <!-- Form Actions -->
            <div class="form-actions">
              <button
                type="submit"
                class="btn btn-primary"
                :disabled="profileLoading"
              >
                {{ profileLoading ? 'Updating...' : 'Update Profile' }}
              </button>
            </div>
          </form>
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

    <ClubDetailModal
      :visible="showPreviewModal"
      :club="previewClub"
      :followersCount="clubStats.followers"
      :isFollowing="false"
      :clubCategory="previewClubCategory"
      :upcoming-events="previewUpcomingEvents"
      :total-events="previewTotalEvents"
      @close="closePreviewModal"
      @view-events="$emit('view-events', previewClub)"
      @share="$emit('share-club', previewClub)"
    />

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

</style>
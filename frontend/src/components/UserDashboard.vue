<script setup>
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import StatCard from './StatCard.vue';
import EventDetailModal from './EventDetailModal.vue';
import FullImageModal from './FullImageModal.vue';
import UserCalendar from './UserCalendar.vue';
import UserProfileModal from './UserProfileModal.vue';
import UserPreferencesModal from './UserPreferencesModal.vue';
import { shareEventLink } from '../utils/shareEvent';
import { getUserPreferences } from '../services/preferenceService';

const store = useStore();
const router = useRouter();

// NEW - Get user from auth module with fallback
const currentUser = computed(() => store.getters['auth/currentUser'] || { name: 'User', id: 1 });
const userStats = computed(() => store.state.userStats);
const categoryColorMap = computed(() => store.getters['categoryColorMap'] || {});

// Dashboard sections
const upcomingEvents = computed(() => store.getters.upcomingUserEvents);
const recommendedEvents = computed(() => store.getters.recommendedEvents);
const savedEvents = computed(() => store.getters.userSavedEvents);
const allEvents = computed(() => store.getters.allEvents);

// NEW - Past attended events (confirmed RSVPs that have passed)
const pastAttendedEvents = computed(() => {
  const allEvents = store.state.allEvents;
  const userRSVPs = store.state.userRSVPs;
  const pastEvents = allEvents.filter(event => {
    const eventDate = new Date(event.datetime || event.date);
    return eventDate < new Date();
  });
  return pastEvents.filter(event => {
    return userRSVPs.some(rsvp => Number(rsvp.event_id) === Number(event.id) && rsvp.status === 'confirmed');
  });
});

// NEW - Top 6 recommended events (upcoming only, highest preference scores, excluding saved and RSVP'd)
const topRecommendedEvents = computed(() => {
  const now = new Date();
  const savedEventIds = new Set(savedEvents.value.map(event => event.id));
  const rsvpdEventIds = new Set(upcomingEvents.value.map(event => event.id));
  
  // Get user preferences for scoring
  const userPrefs = store.state.userPreferences;
  const categories = store.state.categories || [];
  const availableTags = store.state.availableTags || [];
  
  // Build preference scorer (replicated from store logic)
  const buildPreferenceScorer = () => {
    const categoryPrefsSource = Array.isArray(userPrefs?.categoryPreferences) && userPrefs.categoryPreferences.length > 0
      ? userPrefs.categoryPreferences
      : [];
    
    const tagPreferencesSource = Array.isArray(userPrefs?.tagPreferences) && userPrefs.tagPreferences.length > 0
      ? userPrefs.tagPreferences
      : [];
    
    const hasAnyPrefs = categoryPrefsSource.length > 0 || tagPreferencesSource.length > 0;
    
    if (!hasAnyPrefs) return null;
    
    const categoryPrefs = categoryPrefsSource;
    const tagPreferences = tagPreferencesSource;
    
    const preferredCategories = new Set();
    const categoryIdToName = new Map();
    categories.forEach((category) => {
      if (!category) return;
      const id = Number(category.id);
      const name = (typeof category === 'string' ? category : category.name)?.toString().trim().toLowerCase();
      if (Number.isFinite(id) && name) {
        categoryIdToName.set(id, name);
      }
    });
    
    categoryPrefs.forEach((value) => {
      if (!value && value !== 0) return;
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized) {
          preferredCategories.add(normalized);
        }
      }
    });
    
    const tagIdToName = new Map();
    availableTags.forEach((tag) => {
      if (!tag) return;
      const id = Number(tag.id);
      if (Number.isFinite(id)) {
        const name = (tag.tag_name || tag.name || '').trim().toLowerCase();
        if (name) {
          tagIdToName.set(id, name);
        }
      }
    });
    
    const preferredTagNames = new Set();
    tagPreferences.forEach((value) => {
      if (!value && value !== 0) return;
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized) {
          preferredTagNames.add(normalized);
        }
      }
    });
    
    return (event) => {
      let score = 0;
      
      const category = event?.category?.toString().trim().toLowerCase();
      if (category && preferredCategories.has(category)) {
        score += 1;
      }
      
      const eventTags = Array.isArray(event?.tags)
        ? event.tags.map((tag) => tag?.toString().trim().toLowerCase()).filter(Boolean)
        : [];
      
      let preferredTagCounter = 0;
      eventTags.forEach((tagName) => {
        if (preferredTagNames.has(tagName)) {
          score += 0.3 + 0.1 * preferredTagCounter;
          preferredTagCounter += 1;
        }
      });
      
      return score;
    };
  };
  
  const preferenceScorer = buildPreferenceScorer();
  
  // Filter and score events
  const scoredEvents = allEvents.value
    .filter(event => {
      // Must be upcoming
      const eventDate = new Date(event.datetime || event.date);
      if (eventDate <= now) return false;
      
      // Must not be saved
      if (savedEventIds.has(event.id)) return false;
      
      // Must not be RSVP'd
      if (rsvpdEventIds.has(event.id)) return false;
      
      return true;
    })
    .map(event => {
      const score = preferenceScorer ? preferenceScorer(event) : 0;
      return { event, score };
    });
  
  // Sort by score descending and take top 6
  return scoredEvents
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(item => item.event);
});

const selectedEvent = ref(null);
const showEventModal = ref(false);
const upcomingSectionRef = ref(null);
const savedSectionRef = ref(null);
const historySectionRef = ref(null);
const recommendedSectionRef = ref(null);

const upcomingCarouselWrapper = ref(null);
const savedCarouselWrapper = ref(null);
const historyCarouselWrapper = ref(null);
const recommendedCarouselWrapper = ref(null);
const upcomingCarouselWidth = ref(0);
const savedCarouselWidth = ref(0);
const historyCarouselWidth = ref(0);
const recommendedCarouselWidth = ref(0);

const CAROUSEL_GAP = 24;
const MIN_CARD_WIDTH = 280;
const MAX_CARD_WIDTH = 360;

// Carousel state
const upcomingCarouselIndex = ref(0);
const savedCarouselIndex = ref(0);
const historyCarouselIndex = ref(0);
const recommendedCarouselIndex = ref(0);

// Image modal state
const showImageModal = ref(false);
const selectedImage = ref('');
const selectedImageAlt = ref('');

// Profile modal state
const showProfileModal = ref(false);

// Preferences modal state
const showPreferencesModal = ref(false);

// Tags popup modal state
const showTagsModal = ref(false);
const tagsModalEvent = ref(null);

// Preference editor modal state
const showPreferenceModal = ref(false);
const userPreferences = ref({ categories: [], tags: [] });

// Reactive window width for responsive carousel
const windowWidth = ref(window.innerWidth);
const updateCarouselWidths = () => {
  upcomingCarouselWidth.value = upcomingCarouselWrapper.value?.offsetWidth || 0;
  savedCarouselWidth.value = savedCarouselWrapper.value?.offsetWidth || 0;
  historyCarouselWidth.value = historyCarouselWrapper.value?.offsetWidth || 0;
  recommendedCarouselWidth.value = recommendedCarouselWrapper.value?.offsetWidth || 0;
};
const updateWindowWidth = () => {
  windowWidth.value = window.innerWidth;
  nextTick(updateCarouselWidths);
};

// Items per view based on screen size
const itemsPerView = computed(() => {
  return windowWidth.value <= 768 ? 1 : windowWidth.value <= 1200 ? 2 : 3;
});

const calculateCardWidth = (containerWidth) => {
  const items = itemsPerView.value || 1;
  const availableWidth = containerWidth || 0;
  if (!availableWidth) {
    return MAX_CARD_WIDTH;
  }
  const width = (availableWidth - (items - 1) * CAROUSEL_GAP) / items;
  return Math.max(MIN_CARD_WIDTH, Math.min(MAX_CARD_WIDTH, width));
};

const upcomingCardWidth = computed(() => calculateCardWidth(upcomingCarouselWidth.value));
const savedCardWidth = computed(() => calculateCardWidth(savedCarouselWidth.value));
const historyCardWidth = computed(() => calculateCardWidth(historyCarouselWidth.value));
const recommendedCardWidth = computed(() => calculateCardWidth(recommendedCarouselWidth.value));

const upcomingCardStyle = computed(() => ({
  flex: '0 0 auto',
  width: `${upcomingCardWidth.value}px`,
  minWidth: `${MIN_CARD_WIDTH}px`,
  maxWidth: `${MAX_CARD_WIDTH}px`
}));

const savedCardStyle = computed(() => ({
  flex: '0 0 auto',
  width: `${savedCardWidth.value}px`,
  minWidth: `${MIN_CARD_WIDTH}px`,
  maxWidth: `${MAX_CARD_WIDTH}px`
}));

const historyCardStyle = computed(() => ({
  flex: '0 0 auto',
  width: `${historyCardWidth.value}px`,
  minWidth: `${MIN_CARD_WIDTH}px`,
  maxWidth: `${MAX_CARD_WIDTH}px`
}));

const recommendedCardStyle = computed(() => ({
  flex: '0 0 auto',
  width: `${recommendedCardWidth.value}px`,
  minWidth: `${MIN_CARD_WIDTH}px`,
  maxWidth: `${MAX_CARD_WIDTH}px`
}));

const upcomingCarouselMaxIndex = computed(() => Math.max(0, upcomingEvents.value.length - itemsPerView.value));
const savedCarouselMaxIndex = computed(() => Math.max(0, savedEvents.value.length - itemsPerView.value));
const historyCarouselMaxIndex = computed(() => Math.max(0, pastAttendedEvents.value.length - itemsPerView.value));
const recommendedCarouselMaxIndex = computed(() => Math.max(0, topRecommendedEvents.value.length - itemsPerView.value));

// Carousel navigation methods
const nextUpcoming = () => {
  upcomingCarouselIndex.value = Math.min(upcomingCarouselIndex.value + 1, upcomingCarouselMaxIndex.value);
};

const prevUpcoming = () => {
  upcomingCarouselIndex.value = Math.max(upcomingCarouselIndex.value - 1, 0);
};

const nextSaved = () => {
  savedCarouselIndex.value = Math.min(savedCarouselIndex.value + 1, savedCarouselMaxIndex.value);
};

const prevSaved = () => {
  savedCarouselIndex.value = Math.max(savedCarouselIndex.value - 1, 0);
};

const nextHistory = () => {
  historyCarouselIndex.value = Math.min(historyCarouselIndex.value + 1, historyCarouselMaxIndex.value);
};

const prevHistory = () => {
  historyCarouselIndex.value = Math.max(historyCarouselIndex.value - 1, 0);
};

const nextRecommended = () => {
  recommendedCarouselIndex.value = Math.min(recommendedCarouselIndex.value + 1, recommendedCarouselMaxIndex.value);
};

const prevRecommended = () => {
  recommendedCarouselIndex.value = Math.max(recommendedCarouselIndex.value - 1, 0);
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const FALLBACK_PLACEHOLDER = 'https://placehold.co/600x400?text=Event';

// Fetch data on mount
onMounted(async () => {
  window.addEventListener('resize', updateWindowWidth);

  const userId = currentUser.value.id;

  // Fetch all data - use unfiltered events for dashboard
  await store.dispatch('fetchAllEventsUnfiltered');
  await store.dispatch('loadSavedEvents');
  await store.dispatch('fetchUserStats', userId);
  await store.dispatch('fetchUserRSVPs', userId);

  // Load user preferences
  try {
    const response = await getUserPreferences(userId);
    userPreferences.value = {
      categories: response.data.preferred_categories || [],
      tags: response.data.preferred_tags || []
    };
  } catch (error) {
    console.error('Failed to load user preferences:', error);
    userPreferences.value = { categories: [], tags: [] };
  }
  
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

  await nextTick();
  updateCarouselWidths();
});

// Cleanup
onBeforeUnmount(() => {
  window.removeEventListener('resize', updateWindowWidth);
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

const openImageModal = (event) => {
  selectedImage.value = eventImageSrc(event);
  selectedImageAlt.value = event.title || 'Event image';
  showImageModal.value = true;
};

const closeImageModal = () => {
  showImageModal.value = false;
  selectedImage.value = '';
  selectedImageAlt.value = '';
};

const openTagsModal = (event) => {
  tagsModalEvent.value = event;
  showTagsModal.value = true;
};

const closeTagsModal = () => {
  showTagsModal.value = false;
  tagsModalEvent.value = null;
};

const openEventModal = (event) => {
  selectedEvent.value = event;
  showEventModal.value = true;
};

const closeEventModal = () => {
  showEventModal.value = false;
  selectedEvent.value = null;
};

const openProfileModal = () => {
  showProfileModal.value = true;
};

const closeProfileModal = () => {
  showProfileModal.value = false;
};

const openPreferencesModal = () => {
  showPreferencesModal.value = true;
};

const closePreferencesModal = () => {
  showPreferencesModal.value = false;
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

const scrollToSection = (sectionRef) => {
  if (!sectionRef?.value) {
    return;
  }
  sectionRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const handleUpcomingCardClick = () => {
    scrollToSection(upcomingSectionRef);
};

const handleEventsAttendedClick = async () => {
  await store.dispatch('resetFilters');
  await store.dispatch('updateEventStatus', 'past');
  await store.dispatch('setStatusFilter', {
    rsvped: true,
    notRsvped: false,
    saved: false,
    notSaved: false
  });
  router.push({ name: 'Home', query: { status: 'past', highlight: 'attended' } });
};

const handleSavedEventsClick = () => {
  scrollToSection(savedSectionRef);
};

const handleClubsFollowingClick = async () => {
  await store.dispatch('clubs/resetClubFilters');
  await store.dispatch('clubs/updateClubCategoryFilter', 'all');
  await store.dispatch('clubs/setFollowStatus', 'followed');
  router.push({ name: 'BrowseClubs', query: { filter: 'followed' } });
};

const openPreferenceModal = () => {
  showPreferenceModal.value = true;
};

const closePreferenceModal = () => {
  showPreferenceModal.value = false;
};

const handlePreferencesSaved = async (preferences) => {
  userPreferences.value = preferences;
  store.dispatch('showToast', {
    message: 'Your preferences have been updated!',
    type: 'success'
  });
};

// Carousel computed properties
const visibleUpcomingEvents = computed(() => {
  return upcomingEvents.value;
});

const visibleSavedEvents = computed(() => {
  return savedEvents.value;
});

const visibleHistoryEvents = computed(() => {
  return pastAttendedEvents.value;
});

const visibleRecommendedEvents = computed(() => {
  return topRecommendedEvents.value;
});

// Carousel transform styles
const upcomingCarouselTransform = computed(() => {
  const step = upcomingCardWidth.value + CAROUSEL_GAP;
  return `translateX(-${upcomingCarouselIndex.value * step}px)`;
});

const savedCarouselTransform = computed(() => {
  const step = savedCardWidth.value + CAROUSEL_GAP;
  return `translateX(-${savedCarouselIndex.value * step}px)`;
});

const historyCarouselTransform = computed(() => {
  const step = historyCardWidth.value + CAROUSEL_GAP;
  return `translateX(-${historyCarouselIndex.value * step}px)`;
});

const recommendedCarouselTransform = computed(() => {
  const step = recommendedCardWidth.value + CAROUSEL_GAP;
  return `translateX(-${recommendedCarouselIndex.value * step}px)`;
});

// Tags display logic

// Calculate how many tags can fit in approximately 2 rows
const getVisibleTagsCount = (tags) => {
  if (!tags || tags.length === 0) return 0;

  // Container constraints - more lenient estimate
  const containerWidth = 320; // More generous estimate for event card content area

  let currentRowWidth = 0;
  let rowCount = 1;
  let visibleCount = 0;

  for (let i = 0; i < tags.length; i++) {
    // More accurate tag width: padding (16px) + text + gap (8px)
    const tagWidth = 16 + (tags[i].length * 6.5) + 8; // Slightly more lenient character width

    // Check if this tag fits in current row
    if (currentRowWidth + tagWidth <= containerWidth) {
      currentRowWidth += tagWidth;
      visibleCount++;
    } else {
      // Tag doesn't fit in current row
      if (rowCount >= 2) {
        // We've already used 2 rows, stop here
        break;
      } else {
        // Start new row
        rowCount++;
        currentRowWidth = tagWidth;
        visibleCount++;
      }
    }
  }

  return visibleCount;
}; // Show up to 8 tags before truncating

const getVisibleTags = (tags) => {
  if (!Array.isArray(tags)) return [];
  const maxVisible = getVisibleTagsCount(tags);
  return tags.slice(0, maxVisible);
};

const hasMoreTags = (tags) => {
  return Array.isArray(tags) && tags.length > getVisibleTagsCount(tags);
};

watch(itemsPerView, () => {
  upcomingCarouselIndex.value = Math.min(upcomingCarouselIndex.value, upcomingCarouselMaxIndex.value);
  savedCarouselIndex.value = Math.min(savedCarouselIndex.value, savedCarouselMaxIndex.value);
  historyCarouselIndex.value = Math.min(historyCarouselIndex.value, historyCarouselMaxIndex.value);
  recommendedCarouselIndex.value = Math.min(recommendedCarouselIndex.value, recommendedCarouselMaxIndex.value);
  nextTick(updateCarouselWidths);
});

watch(upcomingEvents, () => {
  upcomingCarouselIndex.value = Math.min(upcomingCarouselIndex.value, upcomingCarouselMaxIndex.value);
  nextTick(updateCarouselWidths);
});

watch(savedEvents, () => {
  savedCarouselIndex.value = Math.min(savedCarouselIndex.value, savedCarouselMaxIndex.value);
  nextTick(updateCarouselWidths);
});

watch(pastAttendedEvents, () => {
  historyCarouselIndex.value = Math.min(historyCarouselIndex.value, historyCarouselMaxIndex.value);
  nextTick(updateCarouselWidths);
});

watch(topRecommendedEvents, () => {
  recommendedCarouselIndex.value = Math.min(recommendedCarouselIndex.value, recommendedCarouselMaxIndex.value);
  nextTick(updateCarouselWidths);
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
          <button class="btn btn-outline" @click="openPreferencesModal">
            Update Preferences
          </button>
          <button class="btn btn-outline" @click="openProfileModal">
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
            :value="userStats.upcomingRSVPs ?? upcomingEvents.length" 
            label="Upcoming RSVPs" 
            color="primary"
            clickable
            @click="handleUpcomingCardClick"
          />
          <StatCard 
            icon="✅" 
            :value="userStats.totalAttended || 0" 
            label="Events Attended" 
            color="success"
            clickable
            @click="handleEventsAttendedClick"
          />
          <StatCard 
            icon="💾" 
            :value="userStats.savedCount" 
            label="Saved Events" 
            color="warning"
            clickable
            @click="handleSavedEventsClick"
          />
          <StatCard 
            icon="👥" 
            :value="userStats.clubsFollowed" 
            label="Clubs Following" 
            color="info"
            clickable
            @click="handleClubsFollowingClick"
          />
        </div>
      </section>

      <!-- Calendar Section -->
      <section class="calendar-section">
        <UserCalendar />
      </section>

  <!-- Upcoming Events Section -->
  <section class="dashboard-section" ref="upcomingSectionRef">
        <div class="section-header">
          <h2 class="section-title">My Upcoming Events <span class="section-count">({{ upcomingEvents.length }})</span></h2>
          
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
          
          <div class="carousel-wrapper" ref="upcomingCarouselWrapper">
            <div class="events-carousel" :style="{ transform: upcomingCarouselTransform }">
              <div
                v-for="event in visibleUpcomingEvents"
                :key="event.id"
                class="event-card"
                :style="upcomingCardStyle"
                role="button"
                tabindex="0"
                @click="openEventModal(event)"
                @keyup.enter.prevent="openEventModal(event)"
                @keyup.space.prevent="openEventModal(event)"
              >
                <div class="event-image" @click.stop="openImageModal(event)">
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
                      v-for="tag in getVisibleTags(event.tags)"
                      :key="tag"
                      class="tag-badge"
                      @click.stop="handleTagClick(tag)"
                    >
                      #{{ tag }}
                    </span>
                    <span
                      v-if="hasMoreTags(event.tags)"
                      class="tag-badge tag-more"
                      @click.stop="openTagsModal(event)"
                    >
                      ...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <button 
            class="carousel-btn carousel-btn--next" 
            @click="nextUpcoming"
            :disabled="upcomingCarouselIndex >= upcomingCarouselMaxIndex"
            aria-label="Next events"
          >
            ›
          </button>
        </div>
      </section>

  <!-- Saved Events Section -->
  <section class="dashboard-section" ref="savedSectionRef">
        <div class="section-header">
          <h2 class="section-title">Saved Events <span class="section-count">({{ savedEvents.length }})</span></h2>
         
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
          
          <div class="carousel-wrapper" ref="savedCarouselWrapper">
            <div class="events-carousel" :style="{ transform: savedCarouselTransform }">
              <div
                v-for="event in visibleSavedEvents"
                :key="event.id"
                class="event-card"
                :style="savedCardStyle"
                role="button"
                tabindex="0"
                @click="openEventModal(event)"
                @keyup.enter.prevent="openEventModal(event)"
                @keyup.space.prevent="openEventModal(event)"
              >
                <div class="event-image" @click.stop="openImageModal(event)">
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
                      v-for="tag in getVisibleTags(event.tags)"
                      :key="tag"
                      class="tag-badge"
                      @click.stop="handleTagClick(tag)"
                    >
                      #{{ tag }}
                    </span>
                    <span
                      v-if="hasMoreTags(event.tags)"
                      class="tag-badge tag-more"
                      @click.stop="openTagsModal(event)"
                    >
                      ...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <button 
            class="carousel-btn carousel-btn--next" 
            @click="nextSaved"
            :disabled="savedCarouselIndex >= savedCarouselMaxIndex"
            aria-label="Next events"
          >
            ›
          </button>
        </div>
      </section>

  <!-- History Section -->
  <section class="dashboard-section" ref="historySectionRef">
        <div class="section-header">
          <h2 class="section-title">Event History <span class="section-count">({{ pastAttendedEvents.length }})</span></h2>
        </div>

        <!-- Empty State -->
        <div v-if="pastAttendedEvents.length === 0" class="empty-state">
          <p class="empty-message">You haven't attended any events yet</p>
          <router-link to="/" class="btn btn--primary">Browse Events</router-link>
        </div>

        <!-- Events Carousel -->
        <div v-else class="carousel-container">
          <button 
            class="carousel-btn carousel-btn--prev" 
            @click="prevHistory"
            :disabled="historyCarouselIndex === 0"
            aria-label="Previous events"
          >
            ‹
          </button>
          
          <div class="carousel-wrapper" ref="historyCarouselWrapper">
            <div class="events-carousel" :style="{ transform: historyCarouselTransform }">
              <div
                v-for="event in visibleHistoryEvents"
                :key="event.id"
                class="event-card"
                :style="historyCardStyle"
                role="button"
                tabindex="0"
                @click="openEventModal(event)"
                @keyup.enter.prevent="openEventModal(event)"
                @keyup.space.prevent="openEventModal(event)"
              >
                <div class="event-image" @click.stop="openImageModal(event)">
                  <img :src="eventImageSrc(event)" :alt="event.title" class="event-img" @error="handleEventImageError" />
                  <div class="event-price-tag" :class="{ 'price-free': event.price === 'FREE' }">
                    {{ event.price }}
                  </div>
                  <div class="attended-badge">✓ Attended</div>
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
                      <span>👥 {{ formatAttendees(event) }} attended</span>
                    </div>
                  </div>

                  <div class="event-tags">
                    <span
                      v-for="tag in getVisibleTags(event.tags)"
                      :key="tag"
                      class="tag-badge"
                      @click.stop="handleTagClick(tag)"
                    >
                      #{{ tag }}
                    </span>
                    <span
                      v-if="hasMoreTags(event.tags)"
                      class="tag-badge tag-more"
                      @click.stop="openTagsModal(event)"
                    >
                      ...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <button 
            class="carousel-btn carousel-btn--next" 
            @click="nextHistory"
            :disabled="historyCarouselIndex >= historyCarouselMaxIndex"
            aria-label="Next events"
          >
            ›
          </button>
        </div>
      </section>

  <!-- Recommended Events Section -->
  <section class="dashboard-section" ref="recommendedSectionRef">
        <div class="section-header">
          <h2 class="section-title">Recommended for You <span class="section-count">({{ topRecommendedEvents.length }})</span></h2>
        </div>

        <!-- Empty State -->
        <div v-if="topRecommendedEvents.length === 0" class="empty-state">
          <p class="empty-message">No recommendations available yet</p>
          <router-link to="/preferences" class="btn btn--primary">Update Preferences</router-link>
        </div>

        <!-- Events Carousel -->
        <div v-else class="carousel-container">
          <button 
            class="carousel-btn carousel-btn--prev" 
            @click="prevRecommended"
            :disabled="recommendedCarouselIndex === 0"
            aria-label="Previous events"
          >
            ‹
          </button>
          
          <div class="carousel-wrapper" ref="recommendedCarouselWrapper">
            <div class="events-carousel" :style="{ transform: recommendedCarouselTransform }">
              <div
                v-for="event in visibleRecommendedEvents"
                :key="event.id"
                class="event-card"
                :style="recommendedCardStyle"
                role="button"
                tabindex="0"
                @click="openEventModal(event)"
                @keyup.enter.prevent="openEventModal(event)"
                @keyup.space.prevent="openEventModal(event)"
              >
                <div class="event-image" @click.stop="openImageModal(event)">
                  <img :src="eventImageSrc(event)" :alt="event.title" class="event-img" @error="handleEventImageError" />
                  <div class="event-price-tag" :class="{ 'price-free': event.price === 'FREE' }">
                    {{ event.price }}
                  </div>
                  <div class="recommended-badge">⭐ Recommended</div>
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
                      v-for="tag in getVisibleTags(event.tags)"
                      :key="tag"
                      class="tag-badge"
                      @click.stop="handleTagClick(tag)"
                    >
                      #{{ tag }}
                    </span>
                    <span
                      v-if="hasMoreTags(event.tags)"
                      class="tag-badge tag-more"
                      @click.stop="openTagsModal(event)"
                    >
                      ...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <button 
            class="carousel-btn carousel-btn--next" 
            @click="nextRecommended"
            :disabled="recommendedCarouselIndex >= recommendedCarouselMaxIndex"
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

    <FullImageModal
      :visible="showImageModal"
      :imageSrc="selectedImage"
      :altText="selectedImageAlt"
      @close="closeImageModal"
    />

    <!-- Tags Modal -->
    <div v-if="showTagsModal" class="modal-overlay" @click="closeTagsModal">
      <div class="modal-content tags-modal" @click.stop>
        <div class="modal-header">
          <h3>All Tags</h3>
          <button class="modal-close" @click="closeTagsModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="tags-list">
            <span
              v-for="tag in tagsModalEvent.tags"
              :key="tag"
              class="tag-badge"
              @click="handleTagClick(tag)"
            >
              #{{ tag }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <UserProfileModal
      :visible="showProfileModal"
      :currentUser="currentUser"
      @close="closeProfileModal"
      @profile-updated="closeProfileModal"
    />

    <UserPreferencesModal
      :visible="showPreferencesModal"
      :currentUser="currentUser"
      @close="closePreferencesModal"
      @preferences-updated="closePreferencesModal"
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

.event-card {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-card-border);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  transition: transform var(--duration-normal) var(--ease-standard),
    box-shadow var(--duration-normal) var(--ease-standard),
    border-color var(--duration-normal) var(--ease-standard);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

.event-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--color-primary);
  transform: scaleX(0);
  transition: transform var(--duration-normal) var(--ease-standard);
}

.event-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-4px);
  border-color: var(--color-primary);
}

.event-card:hover::before {
  transform: scaleX(1);
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
  display: block;
}

.event-image-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, var(--color-bg-1) 0%, var(--color-bg-2) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
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
}

.price-free {
  background-color: var(--color-success) !important;
  color: var(--color-white) !important;
}

.event-content {
  padding: var(--space-20);
  display: flex;
  flex-direction: column;
  gap: var(--space-12);
  flex: 1;
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

.event-status {
  background-color: var(--color-warning);
  color: var(--color-white);
  padding: var(--space-4) var(--space-8);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.event-title {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
  margin: 0 0 var(--space-6) 0;
  line-height: var(--line-height-tight);
}

.event-details {
  margin-bottom: var(--space-16);
}

.event-details > div {
  margin-bottom: var(--space-8);
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.event-details > div:last-child {
  margin-bottom: 0;
}

.event-datetime {
  font-weight: var(--font-weight-medium);
}

.event-organiser span {
  font-weight: var(--font-weight-semibold, 550);
  font-size: var(--font-size-base);
}

.event-description {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  line-height: var(--line-height-normal);
  margin: 0;
  display: -webkit-box;
  line-clamp: 3;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.event-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-8);
  min-height: 56px;
  align-items: flex-start;
}

.tag-badge {
  background-color: var(--color-bg-1, #f0f0f0);
  color: var(--color-text-secondary);
  padding: var(--space-4) var(--space-8);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  transition: all 0.2s ease;
  cursor: pointer;
  border: 1px solid transparent;
}

.tag-badge:hover {
  background-color: var(--color-bg-2, #e0e0e0);
  transform: translateY(-1px);
}

.tag-badge.tag-more {
  background-color: var(--color-bg-2, #e0e0e0);
  color: var(--color-text-secondary);
  cursor: pointer;
  font-weight: var(--font-weight-bold);
}

.tag-badge.tag-more:hover {
  background-color: var(--color-bg-1, #d0d0d0);
  transform: translateY(-1px);
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-20);
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--color-text-secondary);
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
}

.modal-close:hover {
  background-color: var(--color-bg-1);
  color: var(--color-text);
}

.modal-body {
  padding: var(--space-20);
}

.tags-modal .tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-8);
}

.tags-modal .tag-badge {
  margin: 0;
}

/* Category badge color fallbacks (ensure consistent palette) */
.badge-academic { background-color: #007bff; color: #fff; }
.badge-workshop { background-color: #28a745; color: #fff; }
.badge-performance { background-color: #dc3545; color: #fff; }
.badge-recreation { background-color: #ffc107; color: #222; }
.badge-career { background-color: #17a2b8; color: #fff; }
.badge-social { background-color: #6f42c1; color: #fff; }
.badge-sports { background-color: #fd7e14; color: #fff; }

/* RSVP and Saved Badges */
.rsvp-badge,
.saved-badge,
.attended-badge,
.recommended-badge {
  position: absolute;
  top: var(--space-12);
  left: var(--space-12);
  background-color: var(--color-primary);
  color: var(--color-white);
  padding: var(--space-4) var(--space-8);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  z-index: 2;
  box-shadow: var(--shadow-sm);
}

.saved-badge {
  background-color: var(--color-success);
}

.attended-badge {
  background-color: var(--color-info);
}

.recommended-badge {
  background-color: var(--color-warning);
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
  max-width: 1128px;
  margin: 0 auto;
}

.events-carousel {
  display: flex;
  gap: var(--space-24);
  transform: translateX(0);
  transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
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

/* Preference button styles */
.btn-preferences {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-preferences:hover {
  background: #2563eb;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-preferences .icon {
  font-size: 1.1rem;
}

@media (max-width: 768px) {
  .btn-preferences {
    padding: 0.625rem 1.25rem;
    font-size: 0.875rem;
  }
}

</style>
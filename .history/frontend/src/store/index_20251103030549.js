import auth from './modules/auth';
import { createStore } from 'vuex';
import { getAllEvents } from "../services/eventService.js";
import { getAllEventCategories } from '../services/eventCategoryService.js';
import { getAllEventVenues } from '../services/eventVenueService.js';
import { getAllTags } from '../services/tagService.js';
import { getAllEventTags } from '../services/eventTagService.js';
import { getSavedByUserId } from '../services/savedEventsService.js';
import clubs from './modules/clubs';

let toastTimer = null;


const COLOR_PALETTE = [
  '#1f77b4',
  '#ff7f0e',
  '#2ca02c',
  '#d62728',
  '#9467bd',
  '#8c564b',
  '#e377c2',
  '#7f7f7f',
  '#bcbd22',
  '#17becf',
  '#393b79', '#637939', '#8ca252', '#b5cf6b', '#6b6ecf', '#9c9ede', '#cedb9c', '#e7ba52', '#bd9e39', '#ad494a', '#a55194', '#6b6ecf', '#9c9ede', '#e7cb94'
];

function pickColorByName(name) {
  if (!name) return COLOR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[idx];
}

function assignPalette(items) {
  const paletteLen = COLOR_PALETTE.length;
  let nextIdx = 0;
  return items.map((it, i) => {
    const name = (it && typeof it === 'string') ? it : (it && it.name) ? it.name : '';
    const provided = it && typeof it === 'object' ? (it.color || it.color_hex || it.hex || it.hex_code || null) : null;
    const color = provided || COLOR_PALETTE[nextIdx % paletteLen];
    if (!provided) nextIdx++;
    return { name, color };
  });
}

const EVENTS_PER_PAGE = 6;

const buildEventTagMap = (eventTags = [], tags = []) => {
  const tagNameMap = {};
  tags.forEach((tag) => {
    if (!tag || tag.id == null) return;
    const rawName = tag.tag_name || tag.name || '';
    const name = typeof rawName === 'string' ? rawName.trim() : '';
    if (!name) return;
    tagNameMap[tag.id] = name;
  });

  const eventTagMap = {};
  eventTags.forEach((relation) => {
    if (!relation) return;
    const eventId = relation.event_id;
    const tagId = relation.tag_id;
    if (eventId == null || tagId == null) return;
    const tagName = tagNameMap[tagId];
    if (!tagName) return;
    const key = String(eventId);
    if (!eventTagMap[key]) {
      eventTagMap[key] = [];
    }
    eventTagMap[key].push(tagName);
  });

  return eventTagMap;
};

const normalizeEventRecord = (rawEvent = {}, eventTagMap = {}) => {
  const event = { ...rawEvent };

  if (event.id != null) {
    const numericId = Number(event.id);
    if (!Number.isNaN(numericId)) {
      event.id = numericId;
    }
  }

  if (event.ownerId != null) {
    const numericOwner = Number(event.ownerId);
    if (!Number.isNaN(numericOwner)) {
      event.ownerId = numericOwner;
    }
  } else if (event.owner_id != null) {
    const numericOwner = Number(event.owner_id);
    if (!Number.isNaN(numericOwner)) {
      event.ownerId = numericOwner;
    }
  }

  const eventKey = event.id != null ? String(event.id) : null;
  if (eventKey && eventTagMap[eventKey]) {
    event.tags = [...eventTagMap[eventKey]];
  } else {
    event.tags = Array.isArray(event.tags) ? event.tags : [];
  }

  if (event.priceValue != null) {
    const numeric = Number(event.priceValue);
    event.priceValue = Number.isNaN(numeric) ? null : numeric;
  }

  if (event.clubCategoryId != null) {
    const numericCategory = Number(event.clubCategoryId);
    event.clubCategoryId = Number.isNaN(numericCategory) ? null : numericCategory;
  }

  return event;
};

const normalizeEventsWithMetadata = (events = [], eventTagMap = {}) => {
  if (!Array.isArray(events)) {
    return [];
  }
  return events.map((event) => normalizeEventRecord(event, eventTagMap));
};

const getNumericOwnerId = (event) => {
  if (!event) return null;
  const candidates = [
    event.ownerId,
    event.owner_id,
    event.ownerID,
    event.owner?.id
  ];
  for (const candidate of candidates) {
    if (candidate == null) continue;
    const numeric = Number(candidate);
    if (!Number.isNaN(numeric)) {
      return numeric;
    }
  }
  return null;
};

const getClubEventSource = (state) => {
  if (Array.isArray(state.clubOwnedEvents) && state.clubOwnedEvents.length > 0) {
    return state.clubOwnedEvents;
  }
  return Array.isArray(state.allEvents) ? state.allEvents : [];
};

const createDefaultFilters = () => ({
  searchQuery: '',
  selectedCategories: [],
  selectedTags: [],
  priceFilter: 'all',
  priceRange: {
    min: null,
    max: null
  },
  dateFilter: 'all',
  specificDate: null,
  venueFilter: 'all',
  locationQuery: '',
  eventStatus: 'both',
  statusFilter: {
    rsvped: false,
    notRsvped: false,
    saved: false,
    notSaved: false
  },
  clubFilter: {
    categoryId: 'all',
    followedOnly: false
  }
});

const createDefaultClubEventFilters = () => ({
  searchQuery: '',
  selectedTags: [],
  priceFilter: 'all',
  dateFilter: 'all',
  venueFilter: 'all',
  locationQuery: '',
  eventStatus: 'both'
});

const createDefaultToast = () => ({
  message: '',
  type: 'info',
  visible: false
});

const getDefaultRootState = () => ({
  allEvents: [],
  clubOwnedEvents: [],
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalEvents: 0,
    eventsPerPage: EVENTS_PER_PAGE,
    hasNextPage: false,
    hasPreviousPage: false
  },
  userStats: {
    upcomingRSVPs: 0,
    totalAttended: 0,
    savedCount: 0,
    clubsFollowed: 0
  },
  clubStats: {
    upcomingEvents: 0,
    totalEvents: 0,
    currentRSVPs: 0,
    followers: 0
  },
  userRSVPs: [],
  savedEvents: [],
  clubRSVPs: [],
  clubFollowers: [],
  filters: createDefaultFilters(),
  clubEventFilters: createDefaultClubEventFilters(),
  categories: [],
  venues: [],
  availableTags: [],
  toast: createDefaultToast()
});

const clearToastTimer = () => {
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
};

export default createStore({

  state: {
    // All events from your EventsGrid
    allEvents: [],

    // Pagination state
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalEvents: 0,
      eventsPerPage: 1000,
      hasNextPage: false,
      hasPreviousPage: false
    },

    userStats: {
      upcomingRSVPs: 5,
      totalAttended: 12,
      savedCount: 3,
      clubsFollowed: 8
    },

    clubStats: {
      upcomingEvents: 0,
      totalEvents: 0,
      currentRSVPs: 0,
      followers: 0
    },

    userRSVPs: [], // Will hold full RSVP objects (with event_id, status, etc.)
    savedEvents: [4, 5], // Will hold event IDs user has saved

    clubRSVPs: [], // Will hold RSVPs for events owned by the club

    // Filters state
    filters: {
      searchQuery: '',
      selectedCategories: [],
      selectedTags: [],
      priceFilter: 'all', // 'all', 'free', 'paid'
      dateFilter: 'all', // 'all', 'today', 'this-week', 'this-month'
      venueFilter: 'all',
      locationQuery: '',
      eventStatus: 'upcoming'
    },

    // Club event filters (for managing club's own events)
    clubEventFilters: {
      searchQuery: '',
      selectedTags: [],
      priceFilter: 'all',
      dateFilter: 'all',
      venueFilter: 'all',
      locationQuery: '',
      eventStatus: 'both'
    },

    categories: [],
    venues: [],

    availableTags: [],

    toast: {
      message: '',
      type: 'info',
      visible: false
    }
  },

  getters: {

    currentUser: (state, getters, rootState) => rootState.auth.user,

    allEvents(state) {
      return state.allEvents;
    },
    // Get filtered events based on current filters
    filteredEvents: (state) => {
      const noFiltersActive =
        !state.filters.searchQuery &&
        state.filters.selectedCategories.length === 0 &&
        state.filters.selectedTags.length === 0 &&
        state.filters.priceFilter === 'all' &&
        state.filters.dateFilter === 'all' &&
        state.filters.venueFilter === 'all' &&
        !state.filters.locationQuery &&
        state.filters.eventStatus === 'both';

      if (noFiltersActive) {
        return state.allEvents;
      }

      let filtered = [...state.allEvents];

      // Search filter (searches in title, organiser, description)
      if (state.filters.searchQuery) {
        const query = state.filters.searchQuery.toLowerCase();
        filtered = filtered.filter(event =>
          event.title.toLowerCase().includes(query) ||
          event.organiser.toLowerCase().includes(query) ||
          event.description.toLowerCase().includes(query)
        );
      }

      // Category filter
      if (state.filters.selectedCategories.length > 0) {
        filtered = filtered.filter(event =>
          state.filters.selectedCategories.includes(event.category)
        );
      }

      // Tag filter
      if (state.filters.selectedTags.length > 0) {
        filtered = filtered.filter(event =>
          state.filters.selectedTags.some(tag => event.tags.includes(tag))
        );
      }

      // Price filter
      if (state.filters.priceFilter === 'free') {
        filtered = filtered.filter(event => event.price === 'FREE');
      } else if (state.filters.priceFilter === 'paid') {
        filtered = filtered.filter(event => event.price !== 'FREE');
      }

      // Date filter
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (state.filters.dateFilter === 'today') {
        filtered = filtered.filter(event => {
          const eventDate = new Date(event.date);
          eventDate.setHours(0, 0, 0, 0);
          return eventDate.getTime() === today.getTime();
        });
      } else if (state.filters.dateFilter === 'this-week') {
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        filtered = filtered.filter(event => {
          const eventDate = new Date(event.date);
          return eventDate >= today && eventDate <= weekFromNow;
        });
      } else if (state.filters.dateFilter === 'this-month') {
        filtered = filtered.filter(event => {
          const eventDate = new Date(event.date);
          return eventDate.getMonth() === today.getMonth() &&
            eventDate.getFullYear() === today.getFullYear();
        });
      }

      // Venue filter
      if (state.filters.venueFilter !== 'all') {
        filtered = filtered.filter(event =>
          event.venue === state.filters.venueFilter
        );
      }

      // Location search
      if (state.filters.locationQuery) {
        const locQuery = state.filters.locationQuery.toLowerCase();
        filtered = filtered.filter(event =>
          event.location.toLowerCase().includes(locQuery) ||
          event.venue.toLowerCase().includes(locQuery)
        );
      }

      // Event status filter
      const now = new Date();
      if (state.filters.eventStatus === 'upcoming') {
        filtered = filtered.filter(event => new Date(event.date) > now);
      } else if (state.filters.eventStatus === 'past') {
        filtered = filtered.filter(event => new Date(event.date) <= now);
      }

      return filtered;
    },

    // Get all unique tags
    allTags: (state) => {
      const tagSet = new Set();
      state.allEvents.forEach(event => {
        event.tags.forEach(tag => tagSet.add(tag));
      });
      return Array.from(tagSet).sort();
    },

    // Category names (for backwards-compatible v-for loops)
    categoryNames: (state) => {
      return Array.isArray(state.categories)
        ? state.categories.map(c => (typeof c === 'string' ? c : c.name)).filter(Boolean)
        : [];
    },

    // Map of category name -> color (if provided)
    categoryColorMap: (state) => {
      const map = {};
      if (!Array.isArray(state.categories)) return map;
      state.categories.forEach(c => {
        if (!c) return;
        const name = typeof c === 'string' ? c : c.name;
        let color = null;
        if (typeof c === 'string') color = pickColorByName(c);
        else color = c.color || pickColorByName(name);
        if (name) map[name] = color;
      });
      return map;
    },

    // Get unique venues
    allVenues: (state) => {
      if (state.venues && state.venues.length > 0) {
        return state.venues;
      }
      const venueSet = new Set();
      state.allEvents.forEach(event => {
        if (event.venue) {
          venueSet.add(event.venue);
        }
      });
      return Array.from(venueSet).sort();
    },

    // Check if an event is saved by the current user
    isEventSaved: (state) => (eventId) => {
      return state.savedEvents && state.savedEvents.includes(eventId);
    },

    // Get results count
    resultsCount: (state, getters) => {
      return getters.filteredEvents.length;
    },

    // Club Events - filtered by club owner and filters
    filteredClubEvents: (state, getters, rootState) => {
      const currentUser = rootState.auth.user;
      if (!currentUser || !currentUser.id) {
        return [];
      }

      const ownerId = Number(currentUser.id);
      if (!Number.isFinite(ownerId)) {
        return [];
      }

      const sourceEvents = getClubEventSource(state);
      let clubEvents = sourceEvents.filter(event => getNumericOwnerId(event) === ownerId);

      // Check if any filters are active
      const noFiltersActive =
        !state.clubEventFilters.searchQuery &&
        state.clubEventFilters.selectedTags.length === 0 &&
        state.clubEventFilters.priceFilter === 'all' &&
        state.clubEventFilters.dateFilter === 'all' &&
        state.clubEventFilters.venueFilter === 'all' &&
        !state.clubEventFilters.locationQuery &&
        state.clubEventFilters.eventStatus === 'both';

      if (noFiltersActive) {
        return clubEvents;
      }

      let filtered = [...clubEvents];

      // Search filter
      if (state.clubEventFilters.searchQuery) {
        const query = state.clubEventFilters.searchQuery.toLowerCase();
        filtered = filtered.filter(event =>
          event.title.toLowerCase().includes(query) ||
          event.description.toLowerCase().includes(query)
        );
      }

      // Tag filter
      if (state.clubEventFilters.selectedTags.length > 0) {
        filtered = filtered.filter(event => {
          if (!Array.isArray(event.tags) || event.tags.length === 0) {
            return false;
          }
          return state.clubEventFilters.selectedTags.some(tag => event.tags.includes(tag));
        });
      }

      // Price filter
      if (state.clubEventFilters.priceFilter === 'free') {
        filtered = filtered.filter(event => event.price === 'FREE');
      } else if (state.clubEventFilters.priceFilter === 'paid') {
        filtered = filtered.filter(event => event.price !== 'FREE');
      }

      // Date filter
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (state.clubEventFilters.dateFilter === 'today') {
        filtered = filtered.filter(event => {
          const eventDate = new Date(event.date);
          eventDate.setHours(0, 0, 0, 0);
          return eventDate.getTime() === today.getTime();
        });
      } else if (state.clubEventFilters.dateFilter === 'this-week') {
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        filtered = filtered.filter(event => {
          const eventDate = new Date(event.date);
          return eventDate >= today && eventDate <= weekFromNow;
        });
      } else if (state.clubEventFilters.dateFilter === 'this-month') {
        filtered = filtered.filter(event => {
          const eventDate = new Date(event.date);
          return eventDate.getMonth() === today.getMonth() &&
            eventDate.getFullYear() === today.getFullYear();
        });
      }

      // Venue filter
      if (state.clubEventFilters.venueFilter !== 'all') {
        filtered = filtered.filter(event =>
          event.venue === state.clubEventFilters.venueFilter
        );
      }

      // Location search
      if (state.clubEventFilters.locationQuery) {
        const locQuery = state.clubEventFilters.locationQuery.toLowerCase();
        filtered = filtered.filter(event =>
          event.location.toLowerCase().includes(locQuery) ||
          event.venue.toLowerCase().includes(locQuery)
        );
      }

      // Event status filter
      const now = new Date();
      if (state.clubEventFilters.eventStatus === 'upcoming') {
        filtered = filtered.filter(event => new Date(event.date) > now);
      } else if (state.clubEventFilters.eventStatus === 'past') {
        filtered = filtered.filter(event => new Date(event.date) <= now);
      }

      return filtered;
    },

    // Get all unique tags from club events
    allClubEventTags: (state, getters) => {
      const clubEvents = getters.filteredClubEvents || [];
      const tagSet = new Set();
      clubEvents.forEach(event => {
        if (event.tags) event.tags.forEach(tag => tagSet.add(tag));
      });
      return Array.from(tagSet).sort();
    },

    // Get unique venues from club events
    allClubEventVenues: (state, getters, rootState) => {
      const currentUser = rootState.auth.user;
      if (!currentUser || !currentUser.id) return state.venues || [];

      const ownerId = Number(currentUser.id);
      if (!Number.isFinite(ownerId)) return state.venues || [];

  const clubEvents = getClubEventSource(state).filter(event => getNumericOwnerId(event) === ownerId);
      const venueSet = new Set();
      clubEvents.forEach(event => {
        if (event.venue) venueSet.add(event.venue);
      });
      const clubVenues = Array.from(venueSet).sort();
      return clubVenues.length > 0 ? clubVenues : (state.venues || []);
    },

    // Club events results count
    clubEventsResultsCount: (state, getters) => {
      return getters.filteredClubEvents.length;
    },

    // Dashboard-specific getters
    upcomingUserEvents: (state) => {
      // Get the event IDs of confirmed RSVPs (show ALL confirmed, not just future)
      const confirmedRsvpEventIds = state.userRSVPs
        .filter(rsvp => rsvp.status === 'confirmed')
        .map(rsvp => rsvp.event_id);
      
      // Filter events where user has confirmed RSVP and sort by date
      return state.allEvents
        .filter(event => confirmedRsvpEventIds.includes(event.id))
        .sort((a, b) => {
          // Sort by datetime or date field, whichever is available
          const dateA = new Date(a.datetime || a.date);
          const dateB = new Date(b.datetime || b.date);
          return dateA - dateB;
        })
        .slice(0, 6); // Show max 6 events
    },

    recommendedEvents: (state) => {
      // Simple recommendation: filter out events user already RSVP'd to
      const rsvpedEventIds = state.userRSVPs.map(rsvp => rsvp.event_id);
      return state.allEvents
        .filter(event => !rsvpedEventIds.includes(event.id))
        .slice(0, 6); // Show 6 recommendations
    },

    userSavedEvents: (state) => {
      return state.allEvents
        .filter(event => state.savedEvents.includes(event.id));
    },

    // Get count of RSVPs for upcoming events owned by the current user (club)
    clubRsvpCount: (state, getters, rootState) => {
      const currentUser = rootState.auth.user;
      if (!currentUser || !currentUser.id) return 0;

      const ownerId = Number(currentUser.id);
      if (!Number.isFinite(ownerId)) return 0;

      const now = new Date();
      // Get upcoming events owned by this club
      const upcomingClubEvents = getClubEventSource(state).filter(event =>
        getNumericOwnerId(event) === ownerId && new Date(event.date) > now
      );

      // Count RSVPs for these events
      const rsvpCount = state.clubRSVPs.filter(rsvp =>
        upcomingClubEvents.some(event => event.id === rsvp.event_id)
      ).length;

      return rsvpCount;
    },

    // Get upcoming events owned by the current user (club)
    upcomingClubEvents: (state, getters, rootState) => {
      const currentUser = rootState.auth.user;
      if (!currentUser || !currentUser.id) return [];

      const ownerId = Number(currentUser.id);
      if (!Number.isFinite(ownerId)) return [];

      const now = new Date();
      return getClubEventSource(state).filter(event =>
        getNumericOwnerId(event) === ownerId && new Date(event.date) > now
      ).sort((a, b) => new Date(a.date) - new Date(b.date));
    },

    // Get total RSVP count for club events
    clubRsvpCount: (state) => {
      return Array.isArray(state.clubRSVPs) ? state.clubRSVPs.length : 0;
    },

    toast: (state) => state.toast
  },

  mutations: {

    RESET_ROOT_STATE(state) {
      clearToastTimer();
      Object.assign(state, getDefaultRootState());
    },

    setAllEvents(state, events) {
      state.allEvents = events;
    },

    setClubOwnedEvents(state, events) {
      state.clubOwnedEvents = Array.isArray(events) ? events : [];
    },

    SET_PAGINATION(state, paginationData) {
      state.pagination = {
        ...state.pagination,
        ...paginationData
      };
    },

    SET_CURRENT_PAGE(state, page) {
      state.pagination.currentPage = page;
    },

    SET_EVENT_CATEGORIES(state, categories) {
      if (!Array.isArray(categories)) {
        state.categories = [];
        return;
      }

      const normalized = categories.map(item => {
        if (!item) return null;
        if (typeof item === 'string') return item.trim();
        const name = (item.name || item.label || item?.Name || '').trim();
        const provided = item.color || item.color_hex || item.hex || item.hex_code || null;
        return { name, color: provided || null };
      }).filter(Boolean);

      normalized.sort((a, b) => {
        const na = typeof a === 'string' ? a : a.name || '';
        const nb = typeof b === 'string' ? b : b.name || '';
        return na.localeCompare(nb);
      });

      const assigned = assignPalette(normalized);
      state.categories = assigned.map(c => ({ name: c.name, color: c.color }));
    },

    SET_EVENT_VENUES(state, venues) {
      state.venues = venues;
    },

    SET_AVAILABLE_TAGS(state, tags) {
      state.availableTags = Array.isArray(tags) ? tags : [];
    },

    // Update search query
    SET_SEARCH_QUERY(state, query) {
      state.filters.searchQuery = query;
    },

    SET_USER_STATS(state, stats) {
      state.userStats = stats;
    },

    SET_CLUB_STATS(state, stats) {
      state.clubStats = stats;
    },

    SET_USER_RSVPS(state, rsvps) {
      state.userRSVPs = rsvps;
    },

    SET_CLUB_RSVPS(state, rsvps) {
      state.clubRSVPs = rsvps;
    },

    SET_CLUB_FOLLOWERS(state, followers) {
      state.clubFollowers = Array.isArray(followers) ? followers : [];
    },

    SET_SAVED_EVENTS(state, savedEventIds) {
      const normalized = Array.isArray(savedEventIds)
        ? savedEventIds
            .map((id) => Number(id))
            .filter((id) => !Number.isNaN(id))
        : [];
      state.savedEvents = normalized;
    },

    // Toggle category selection
    TOGGLE_CATEGORY(state, category) {
      const index = state.filters.selectedCategories.indexOf(category);
      if (index > -1) {
        state.filters.selectedCategories.splice(index, 1);
      } else {
        state.filters.selectedCategories.push(category);
      }
    },

    // Toggle tag selection
    TOGGLE_TAG(state, tag) {
      const index = state.filters.selectedTags.indexOf(tag);
      if (index > -1) {
        state.filters.selectedTags.splice(index, 1);
      } else {
        state.filters.selectedTags.push(tag);
      }
    },

    // Set price filter
    SET_PRICE_FILTER(state, priceFilter) {
      state.filters.priceFilter = priceFilter;
    },

    // Set date filter
    SET_DATE_FILTER(state, dateFilter) {
      state.filters.dateFilter = dateFilter;
    },

    // Set venue filter
    SET_VENUE_FILTER(state, venue) {
      state.filters.venueFilter = venue;
    },

    // Set location query
    SET_LOCATION_QUERY(state, query) {
      state.filters.locationQuery = query;
    },

    // Set event status
    SET_EVENT_STATUS(state, status) {
      state.filters.eventStatus = status;
    },

    // Reset all filters
    RESET_FILTERS(state) {
      state.filters = {
        searchQuery: '',
        selectedCategories: [],
        selectedTags: [],
        priceFilter: 'all',
        dateFilter: 'all',
        venueFilter: 'all',
        locationQuery: '',
        eventStatus: 'both'
      };
    },

    // Club Event Filter Mutations
    SET_CLUB_EVENT_SEARCH_QUERY(state, query) {
      state.clubEventFilters.searchQuery = query;
    },

    TOGGLE_CLUB_EVENT_TAG(state, tag) {
      const index = state.clubEventFilters.selectedTags.indexOf(tag);
      if (index > -1) {
        state.clubEventFilters.selectedTags.splice(index, 1);
      } else {
        state.clubEventFilters.selectedTags.push(tag);
      }
    },

    SET_CLUB_EVENT_PRICE_FILTER(state, priceFilter) {
      state.clubEventFilters.priceFilter = priceFilter;
    },

    SET_CLUB_EVENT_DATE_FILTER(state, dateFilter) {
      state.clubEventFilters.dateFilter = dateFilter;
    },

    SET_CLUB_EVENT_VENUE_FILTER(state, venue) {
      state.clubEventFilters.venueFilter = venue;
    },

    SET_CLUB_EVENT_LOCATION_QUERY(state, query) {
      state.clubEventFilters.locationQuery = query;
    },

    SET_CLUB_EVENT_STATUS(state, status) {
      state.clubEventFilters.eventStatus = status;
    },

    RESET_CLUB_EVENT_FILTERS(state) {
      state.clubEventFilters = createDefaultClubEventFilters();
    },

    SHOW_TOAST(state, { message, type }) {
      clearToastTimer();
      state.toast = {
        message,
        type,
        visible: true
      };
    },

    HIDE_TOAST(state) {
      clearToastTimer();
      state.toast = createDefaultToast();
    }
  },

  actions: {

    resetAppState({ commit }) {
      commit('RESET_ROOT_STATE');
      commit('clubs/RESET_STATE', null, { root: true });
    },

    async initializeAppData({ dispatch }, { force = false } = {}) {
      try {
        await Promise.all([
          dispatch('fetchEventCategories', { force }),
          dispatch('fetchEventVenues', { force }),
          dispatch('fetchAvailableTags', { force }),
          dispatch('fetchAllEvents', { force })
        ]);
      } catch (error) {
        console.error('initializeAppData - error:', error);
      }
    },

    async fetchEventCategories({ state, commit }, { force = false } = {}) {
      if (!force && state.categories.length > 0) {
        return;
      }
      try {
        const response = await getAllEventCategories();
        const raw = Array.isArray(response.data) ? response.data : [];
        // Normalize: if backend returns objects with name and color use them; if it returns strings, keep as strings
        const normalized = raw.map(item => {
          if (!item) return null;
          if (typeof item === 'string') return item.trim();
          // prefer explicit fields
          return {
            name: (item.name || item.label || '').trim(),
            color: item.color || item.color_hex || item.hex || item.hex_code || null
          };
        }).filter(Boolean);
        // Sort by name
        normalized.sort((a, b) => {
          const na = typeof a === 'string' ? a : a.name || '';
          const nb = typeof b === 'string' ? b : b.name || '';
          return na.localeCompare(nb);
        });
        commit('SET_EVENT_CATEGORIES', normalized);
      } catch (error) {
        console.error('Failed to load event categories', error);
        commit('SET_EVENT_CATEGORIES', []);
      }
    },

    async fetchEventVenues({ state, commit }, { force = false } = {}) {
      if (!force && state.venues.length > 0) {
        return;
      }
      try {
        const response = await getAllEventVenues();
        const venuesData = Array.isArray(response.data) ? response.data : [];
        commit('SET_EVENT_VENUES', venuesData);
      } catch (error) {
        console.warn('Failed to load event venues, continuing without them:', error.message);
        commit('SET_EVENT_VENUES', []);
      }
    },

  async fetchAvailableTags({ state, commit }, { force = false } = {}) {
      if (!force && Array.isArray(state.availableTags) && state.availableTags.length > 0) {
        return;
      }
      try {
        const response = await getAllTags();
        const tags = Array.isArray(response.data) ? response.data : [];
        const tagObjects = tags
          .map((item) => {
            if (!item) return null;
            if (typeof item === 'string') return { id: null, tag_name: item.trim() };
            return {
              id: item.id,
              tag_name: (item.tag_name || item.name || '').trim()
            };
          })
          .filter(Boolean);
        tagObjects.sort((a, b) => a.tag_name.localeCompare(b.tag_name));
        commit('SET_AVAILABLE_TAGS', tagObjects);
      } catch (error) {
        console.warn('Failed to load event tags, continuing without them:', error.message);
        commit('SET_AVAILABLE_TAGS', []);
      }
    },
    
    async fetchAllEvents({ commit, state }, options = {}) {
      const { page: requestedPage, force = false } = typeof options === 'number'
        ? { page: options, force: false }
        : (options || {});
      const page = requestedPage != null ? requestedPage : state.pagination.currentPage || 1;
      try {
        const [eventsResponse, eventTagsResponse, tagsResponse] = await Promise.all([
          getAllEvents(page, state.pagination.eventsPerPage),
          getAllEventTags(),
          getAllTags()
        ]);

        const { events, pagination } = eventsResponse.data;
        const eventTags = Array.isArray(eventTagsResponse.data) ? eventTagsResponse.data : [];
        const tags = Array.isArray(tagsResponse.data) ? tagsResponse.data : [];

        // Update pagination metadata
        commit('SET_PAGINATION', pagination);

        const eventTagMap = buildEventTagMap(eventTags, tags);
        const normalizedEvents = normalizeEventsWithMetadata(events, eventTagMap);

        // Create a map of event_id to array of tag_names
        const eventTagMap = {};
        eventTags.forEach(et => {
          if (!eventTagMap[et.event_id]) {
            eventTagMap[et.event_id] = [];
          }
          const tagName = tagMap[et.tag_id];
          if (tagName) {
            eventTagMap[et.event_id].push(tagName);
          }
        });

        // Assign tags to events
        events.forEach(event => {
          event.tags = eventTagMap[event.id] || [];
        });

        console.log('fetchAllEvents - events with tags:', events);
        commit('setAllEvents', events);
      } catch (error) {
        console.error('fetchAllEvents - error:', error);
      }
    },

    async fetchClubOwnedEvents({ state, commit, rootGetters }, { force = false } = {}) {
      const currentUser = rootGetters['auth/currentUser'];
      const role = currentUser?.role || currentUser?.account_type;
      const numericOwnerId = Number(currentUser?.id);

      if (role !== 'club' || !Number.isFinite(numericOwnerId)) {
        if (force) {
          commit('setClubOwnedEvents', []);
        }
        return;
      }

      if (!force && Array.isArray(state.clubOwnedEvents) && state.clubOwnedEvents.length > 0) {
        const hasOwnedEvents = state.clubOwnedEvents.some(event => getNumericOwnerId(event) === numericOwnerId);
        if (hasOwnedEvents) {
          return;
        }
      }

      try {
        const [eventTagsResponse, tagsResponse] = await Promise.all([
          getAllEventTags(),
          getAllTags()
        ]);

        const eventTagMap = buildEventTagMap(
          Array.isArray(eventTagsResponse.data) ? eventTagsResponse.data : [],
          Array.isArray(tagsResponse.data) ? tagsResponse.data : []
        );

        const PAGE_LIMIT = 50;
        const MAX_PAGES = 50;

        let aggregatedEvents = [];
        let currentPage = 1;
        let totalPages = 1;

        do {
          const { data } = await getAllEvents(currentPage, PAGE_LIMIT);
          const { events = [], pagination = {} } = data || {};
          aggregatedEvents = aggregatedEvents.concat(events);
          totalPages = pagination.totalPages || 1;
          const hasNext = Boolean(pagination.hasNextPage);
          currentPage += 1;
          if (!hasNext) {
            break;
          }
        } while (currentPage <= totalPages && currentPage <= MAX_PAGES);

        const normalizedEvents = normalizeEventsWithMetadata(aggregatedEvents, eventTagMap);
        const ownedEvents = normalizedEvents.filter(event => getNumericOwnerId(event) === numericOwnerId);

        commit('setClubOwnedEvents', ownedEvents);
      } catch (error) {
        console.error('fetchClubOwnedEvents - error:', error);
        if (force) {
          commit('setClubOwnedEvents', []);
        }
      }
    },

    async fetchUserStats({ commit }, userId) {
      try {
        const { getUserStats } = await import('../services/statsService');
        const response = await getUserStats(userId);
        commit('SET_USER_STATS', response.data);
      } catch (error) {
        console.error('Error fetching user stats:', error);
      }
    },

    async fetchClubStats({ commit }, clubId) {
      try {
        const { getClubStats } = await import('../services/statsService');
        const response = await getClubStats(clubId);
        commit('SET_CLUB_STATS', response.data);
      } catch (error) {
        console.error('Error fetching club stats:', error);
      }
    },

    async fetchClubRSVPs({ commit, state, dispatch, rootGetters }, clubId) {
      const ownerIdRaw = clubId ?? rootGetters['auth/currentUser']?.id;
      const ownerId = Number(ownerIdRaw);
      if (!Number.isFinite(ownerId)) {
        commit('SET_CLUB_RSVPS', []);
        return;
      }

      try {
        // Fetch club events first if not already loaded
        if (!Array.isArray(state.clubOwnedEvents) || state.clubOwnedEvents.length === 0) {
          await dispatch('fetchClubOwnedEvents', { force: true });
        }

        const ownedEvents = (state.clubOwnedEvents || []).filter((event) => getNumericOwnerId(event) === ownerId);

        if (ownedEvents.length === 0) {
          commit('SET_CLUB_RSVPS', []);
          return;
        }

        const { getRsvpsByEventId } = await import('../services/rsvpService');
        const aggregated = [];

        for (const event of ownedEvents) {
          if (!event || event.id == null) {
            continue;
          }
          try {
            const eventResponse = await getRsvpsByEventId(event.id);
            const eventRsvps = Array.isArray(eventResponse.data) ? eventResponse.data : [];
            const augmented = eventRsvps.map((rsvp) => ({
              ...rsvp,
              event_id: Number(event.id),
              event_title: event.title || '',
              event_date: event.date || event.datetime || null,
              event_time: event.time || event.start_time || event.startTime || null,
              venue: event.venue || event.location || null
            }));
            aggregated.push(...augmented);
          } catch (innerError) {
            console.error(`Error fetching RSVPs for event ${event.id}:`, innerError);
          }
        }

        commit('SET_CLUB_RSVPS', aggregated);
      } catch (error) {
        console.error('Error fetching club RSVPs:', error);
        commit('SET_CLUB_RSVPS', []);
      }
    },

    async fetchClubFollowers({ commit, rootGetters }, clubId) {
      const ownerIdRaw = clubId ?? rootGetters['auth/currentUser']?.id;
      const ownerId = Number(ownerIdRaw);
      if (!Number.isFinite(ownerId)) {
        commit('SET_CLUB_FOLLOWERS', []);
        return;
      }

      try {
        const { getFollowersByClubId } = await import('../services/followService');
        const response = await getFollowersByClubId(ownerId);
        const followers = Array.isArray(response.data) ? response.data : [];
        commit('SET_CLUB_FOLLOWERS', followers);
      } catch (error) {
        console.error('Error fetching club followers:', error);
        commit('SET_CLUB_FOLLOWERS', []);
      }
    },

    async fetchUserRSVPs({ commit }, userId) {
      try {
        const { getRsvpsByUserId } = await import('../services/rsvpService');
        const response = await getRsvpsByUserId(userId);
        // Store the full RSVP objects
        commit('SET_USER_RSVPS', response.data);
      } catch (error) {
        console.error('Error fetching user RSVPs:', error);
      }
    },

    async fetchClubRSVPs({ commit }, clubId) {
      try {
        const { getRsvpsForEventsByOwner } = await import('../services/rsvpService');
        const response = await getRsvpsForEventsByOwner(clubId);
        commit('SET_CLUB_RSVPS', response.data);
      } catch (error) {
        console.error('Error fetching club RSVPs:', error);
      }
    },

    async loadSavedEvents({ rootGetters, commit }) {
      const userId = rootGetters['auth/currentUser']?.id;
      if (!userId) return;
      try {
        const res = await getSavedByUserId(userId);
        const eventIds = (res.data || []).map(saved => saved.event_id);
        commit('SET_SAVED_EVENTS', eventIds);
      } catch (error) {
        console.error('Error loading saved events:', error);
      }
    },

    // Action to update search
    updateSearch({ commit }, query) {
      commit('SET_SEARCH_QUERY', query);
    },

    // Action to toggle category
    toggleCategory({ commit }, category) {
      commit('TOGGLE_CATEGORY', category);
    },

    // Action to toggle tag
    toggleTag({ commit }, tag) {
      commit('TOGGLE_TAG', tag);
    },

    // Action to update price filter
    updatePriceFilter({ commit }, filter) {
      commit('SET_PRICE_FILTER', filter);
    },

    // Action to update date filter
    updateDateFilter({ commit }, filter) {
      commit('SET_DATE_FILTER', filter);
    },

    // Action to update venue filter
    updateVenueFilter({ commit }, venue) {
      commit('SET_VENUE_FILTER', venue);
    },

    // Action to update location query
    updateLocationQuery({ commit }, query) {
      commit('SET_LOCATION_QUERY', query);
    },

    // Action to update event status
    updateEventStatus({ commit }, status) {
      commit('SET_EVENT_STATUS', status);
    },

    // Action to reset filters
    resetFilters({ commit }) {
      commit('RESET_FILTERS');
    },

    // Club Event Filter Actions
    updateClubEventSearch({ commit }, query) {
      commit('SET_CLUB_EVENT_SEARCH_QUERY', query);
    },

    toggleClubEventTag({ commit }, tag) {
      commit('TOGGLE_CLUB_EVENT_TAG', tag);
    },

    updateClubEventPriceFilter({ commit }, filter) {
      commit('SET_CLUB_EVENT_PRICE_FILTER', filter);
    },

    updateClubEventDateFilter({ commit }, filter) {
      commit('SET_CLUB_EVENT_DATE_FILTER', filter);
    },

    updateClubEventVenueFilter({ commit }, venue) {
      commit('SET_CLUB_EVENT_VENUE_FILTER', venue);
    },

    updateClubEventLocationQuery({ commit }, query) {
      commit('SET_CLUB_EVENT_LOCATION_QUERY', query);
    },

    updateClubEventStatus({ commit }, status) {
      commit('SET_CLUB_EVENT_STATUS', status);
    },

    resetClubEventFilters({ commit }) {
      commit('RESET_CLUB_EVENT_FILTERS');
    },

    showToast({ commit }, { message, type = 'info', duration = 3000 } = {}) {
      clearToastTimer();
      commit('SHOW_TOAST', { message, type });
      toastTimer = setTimeout(() => {
        commit('HIDE_TOAST');
      }, duration);
    },

    hideToast({ commit }) {
      clearToastTimer();
      commit('HIDE_TOAST');
    }
  },

  modules: {
    auth,
    clubs,
  }
});

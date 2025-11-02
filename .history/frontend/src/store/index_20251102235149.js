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

  state: getDefaultRootState(),

  getters: {

    currentUser: (state, getters, rootState) => rootState.auth.user,

    allEvents(state) {
      return state.allEvents;
    },
    // Get filtered events based on current filters
    filteredEvents: (state, getters, rootState) => {
      const filters = state.filters;
      const statusSelections = filters.statusFilter || {};
      const clubFilter = filters.clubFilter || { categoryId: 'all', followedOnly: false };
      const priceRange = filters.priceRange || { min: null, max: null };

      const priceRangeActive = priceRange.min != null || priceRange.max != null;
      const statusActive = Object.values(statusSelections).some(Boolean);
      const clubFilterActive = clubFilter.categoryId !== 'all' || clubFilter.followedOnly;
      const specificDateActive = filters.dateFilter === 'specific' && !!filters.specificDate;

      const noFiltersActive =
        !filters.searchQuery &&
        filters.selectedCategories.length === 0 &&
        filters.selectedTags.length === 0 &&
        !priceRangeActive &&
        filters.dateFilter === 'all' &&
        !specificDateActive &&
        filters.venueFilter === 'all' &&
        !filters.locationQuery &&
        filters.eventStatus === 'both' &&
        !statusActive &&
        !clubFilterActive;

      if (noFiltersActive) {
        return state.allEvents;
      }

      const parsePriceValue = (event) => {
        if (typeof event.priceValue === 'number' && !Number.isNaN(event.priceValue)) {
          return event.priceValue;
        }
        if (typeof event.price === 'string') {
          const trimmed = event.price.trim().toUpperCase();
          if (trimmed === 'FREE') {
            return 0;
          }
          const numeric = Number(event.price.replace(/[^0-9.]/g, ''));
          return Number.isNaN(numeric) ? null : numeric;
        }
        if (event.price != null) {
          const numeric = Number(event.price);
          return Number.isNaN(numeric) ? null : numeric;
        }
        return null;
      };

      const rsvpEventIds = new Set(
        (state.userRSVPs || [])
          .filter((rsvp) => rsvp && rsvp.event_id != null && (rsvp.status || '').toLowerCase() !== 'cancelled')
          .map((rsvp) => Number(rsvp.event_id))
      );

      const savedEventIds = new Set((state.savedEvents || []).map((id) => Number(id)));
      const followingClubIds = new Set((rootState?.clubs?.followingClubIds || []).map((id) => Number(id)));

      let filtered = [...state.allEvents];

      // Search filter (searches in title, organiser, description)
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        filtered = filtered.filter(event =>
          event.title.toLowerCase().includes(query) ||
          event.organiser.toLowerCase().includes(query) ||
          event.description.toLowerCase().includes(query)
        );
      }

      // Category filter
      if (filters.selectedCategories.length > 0) {
        filtered = filtered.filter(event =>
          filters.selectedCategories.includes(event.category)
        );
      }

      // Tag filter
      if (filters.selectedTags.length > 0) {
        filtered = filtered.filter(event =>
          filters.selectedTags.some(tag => event.tags.includes(tag))
        );
      }

      // Price filter
      if (filters.priceFilter === 'paid') {
        filtered = filtered.filter(event => {
          const value = parsePriceValue(event);
          return value != null && value > 0;
        });
      } else if (filters.priceFilter === 'free') {
        filtered = filtered.filter(event => {
          const value = parsePriceValue(event);
          return value === 0 || value == null;
        });
      } else if (filters.priceFilter === 'range' && priceRangeActive) {
        filtered = filtered.filter(event => {
          const value = parsePriceValue(event);
          if (value == null) {
            return false;
          }
          if (priceRange.min != null && value < Number(priceRange.min)) {
            return false;
          }
          if (priceRange.max != null && value > Number(priceRange.max)) {
            return false;
          }
          return true;
        });
      }

      // Date filter
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (filters.dateFilter === 'today') {
        filtered = filtered.filter(event => {
          const eventDate = new Date(event.date);
          eventDate.setHours(0, 0, 0, 0);
          return eventDate.getTime() === today.getTime();
        });
      } else if (filters.dateFilter === 'this-week') {
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        filtered = filtered.filter(event => {
          const eventDate = new Date(event.date);
          return eventDate >= today && eventDate <= weekFromNow;
        });
      } else if (filters.dateFilter === 'this-month') {
        filtered = filtered.filter(event => {
          const eventDate = new Date(event.date);
          return eventDate.getMonth() === today.getMonth() &&
            eventDate.getFullYear() === today.getFullYear();
        });
      } else if (filters.dateFilter === 'specific' && filters.specificDate) {
        const targetDate = new Date(filters.specificDate);
        targetDate.setHours(0, 0, 0, 0);
        filtered = filtered.filter(event => {
          const eventDate = new Date(event.date);
          eventDate.setHours(0, 0, 0, 0);
          return eventDate.getTime() === targetDate.getTime();
        });
      }

      // Venue filter
      if (filters.venueFilter !== 'all') {
        filtered = filtered.filter(event =>
          event.venue === filters.venueFilter
        );
      }

      // Location search
      if (filters.locationQuery) {
        const locQuery = filters.locationQuery.toLowerCase();
        filtered = filtered.filter(event =>
          event.location.toLowerCase().includes(locQuery) ||
          event.venue.toLowerCase().includes(locQuery)
        );
      }

      // RSVP / Saved status filter
      if (statusActive) {
        filtered = filtered.filter(event => {
          const eventId = Number(event.id);
          const isRsvped = rsvpEventIds.has(eventId);
          const isSaved = savedEventIds.has(eventId);

          let rsvpPass = true;
          if (statusSelections.rsvped && !statusSelections.notRsvped) {
            rsvpPass = isRsvped;
          } else if (!statusSelections.rsvped && statusSelections.notRsvped) {
            rsvpPass = !isRsvped;
          }

          let savedPass = true;
          if (statusSelections.saved && !statusSelections.notSaved) {
            savedPass = isSaved;
          } else if (!statusSelections.saved && statusSelections.notSaved) {
            savedPass = !isSaved;
          }

          return rsvpPass && savedPass;
        });
      }

      // Club-based filtering
      if (clubFilter.categoryId !== 'all') {
        filtered = filtered.filter(event => {
          const eventClubCategory = event.clubCategoryId != null ? Number(event.clubCategoryId) : null;
          return eventClubCategory === Number(clubFilter.categoryId);
        });
      }

      if (clubFilter.followedOnly) {
        filtered = filtered.filter(event => followingClubIds.has(Number(event.ownerId)));
      }

      // Event status filter (upcoming / past)
      const now = new Date();
      if (filters.eventStatus === 'upcoming') {
        filtered = filtered.filter(event => new Date(event.date) > now);
      } else if (filters.eventStatus === 'past') {
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

    // Get results count
    resultsCount: (state, getters) => {
      return getters.filteredEvents.length;
    },

    // Check if event is saved by user
    isEventSaved: (state) => (eventId) => {
      return state.savedEvents.includes(eventId);
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

      // First, filter events owned by this club
      let clubEvents = state.allEvents.filter(event => Number(event.ownerId) === ownerId);

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
        filtered = filtered.filter(event =>
          state.clubEventFilters.selectedTags.some(tag => event.tags.includes(tag))
        );
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

      const clubEvents = state.allEvents.filter(event => Number(event.ownerId) === ownerId);
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
      const upcomingClubEvents = state.allEvents.filter(event =>
        Number(event.ownerId) === ownerId && new Date(event.date) > now
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
      return state.allEvents.filter(event =>
        Number(event.ownerId) === ownerId && new Date(event.date) > now
      ).sort((a, b) => new Date(a.date) - new Date(b.date));
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
      state.userRSVPs = Array.isArray(rsvps) ? rsvps : [];
    },

    SET_CLUB_RSVPS(state, rsvps) {
      state.clubRSVPs = rsvps;
    },

    SET_SAVED_EVENTS(state, savedEventIds) {
      const normalized = Array.isArray(savedEventIds)
        ? savedEventIds
            .map((id) => Number(id))
            .filter((id) => !Number.isNaN(id))
        : [];
      state.savedEvents = normalized;
    },

    ADD_SAVED_EVENT(state, eventId) {
      const numericId = Number(eventId);
      if (Number.isNaN(numericId)) {
        return;
      }
      if (!state.savedEvents.includes(numericId)) {
        state.savedEvents.push(numericId);
      }
    },

    REMOVE_SAVED_EVENT(state, eventId) {
      const numericId = Number(eventId);
      state.savedEvents = state.savedEvents.filter(id => id !== numericId);
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

    // Update price range filter
    SET_PRICE_RANGE(state, range = {}) {
      const normalize = (value) => {
        if (value === '' || value === null || value === undefined) {
          return null;
        }
        const numeric = Number(value);
        if (Number.isNaN(numeric)) {
          return null;
        }
        return numeric < 0 ? 0 : numeric;
      };

      state.filters.priceRange = {
        min: normalize(range.min),
        max: normalize(range.max)
      };
    },

    // Set price filter mode
    SET_PRICE_FILTER(state, priceFilter) {
      state.filters.priceFilter = priceFilter;
      if (priceFilter !== 'range') {
        state.filters.priceRange = {
          min: null,
          max: null
        };
      }
    },

    // Set date filter
    SET_DATE_FILTER(state, dateFilter) {
      state.filters.dateFilter = dateFilter;
      if (dateFilter !== 'specific') {
        state.filters.specificDate = null;
      }
    },

    SET_SPECIFIC_DATE(state, date) {
      state.filters.specificDate = date || null;
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

    TOGGLE_STATUS_FILTER(state, option) {
      if (!state.filters.statusFilter || !(option in state.filters.statusFilter)) {
        return;
      }
      state.filters.statusFilter = {
        ...state.filters.statusFilter,
        [option]: !state.filters.statusFilter[option]
      };
    },

    SET_STATUS_FILTER(state, updates = {}) {
      state.filters.statusFilter = {
        ...state.filters.statusFilter,
        ...updates
      };
    },

    SET_CLUB_FILTER_CATEGORY(state, categoryId) {
      state.filters.clubFilter.categoryId = categoryId;
    },

    SET_CLUB_FILTER_FOLLOWED(state, followedOnly) {
      state.filters.clubFilter.followedOnly = !!followedOnly;
    },

    // Reset all filters
    RESET_FILTERS(state) {
      state.filters = createDefaultFilters();
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
        console.error('Failed to load event venues', error);
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
        console.error('Failed to load event tags', error);
        if (force) {
          commit('SET_AVAILABLE_TAGS', []);
        }
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
        const eventTags = eventTagsResponse.data;
        const tags = tagsResponse.data;

        // Update pagination metadata
        commit('SET_PAGINATION', pagination);

        // Create a map of tag_id to tag_name
        const tagMap = {};
        tags.forEach(tag => {
          tagMap[tag.id] = tag.tag_name;
        });

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

        // Assign tags and normalise numeric fields on events
        events.forEach(event => {
          if (event.id != null) {
            const numericId = Number(event.id);
            event.id = Number.isNaN(numericId) ? event.id : numericId;
          }
          if (event.ownerId != null) {
            const numericOwner = Number(event.ownerId);
            event.ownerId = Number.isNaN(numericOwner) ? event.ownerId : numericOwner;
          }

          event.tags = eventTagMap[event.id] || [];

          if (event.priceValue != null) {
            const numeric = Number(event.priceValue);
            event.priceValue = Number.isNaN(numeric) ? null : numeric;
          }

          if (event.clubCategoryId != null) {
            const numericCategory = Number(event.clubCategoryId);
            event.clubCategoryId = Number.isNaN(numericCategory) ? null : numericCategory;
          }
        });

        commit('setAllEvents', events);
        // Keep clubs module events in sync so club pages render immediately.
        commit('clubs/setEvents', events, { root: true });
      } catch (error) {
        console.error('fetchAllEvents - error:', error);
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

    async fetchUserRSVPs({ commit }, userId) {
      if (!userId) return;
      try {
        const { getRsvpsByUserId } = await import('../services/rsvpService');
        const response = await getRsvpsByUserId(userId);
        const rsvps = Array.isArray(response.data) ? response.data : [];
        commit('SET_USER_RSVPS', rsvps);
      } catch (error) {
        console.error('Error fetching user RSVPs:', error);
        commit('SET_USER_RSVPS', []);
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

    async toggleSaveEvent({ getters, commit, rootGetters, dispatch }, eventId) {
      const userId = rootGetters['auth/currentUser']?.id;
      if (!userId) return;
      const saved = getters.isEventSaved(eventId);
      try {
        if (saved) {
          await import('../services/savedEventsService').then(({ deleteSaved }) => 
            deleteSaved(eventId, userId)
          );
          commit('REMOVE_SAVED_EVENT', eventId);
        } else {
          await import('../services/savedEventsService').then(({ createSaved }) => 
            createSaved({ event_id: eventId, user_id: userId })
          );
          commit('ADD_SAVED_EVENT', eventId);
        }
        // Refresh user stats after save/unsave operation
        await dispatch('fetchUserStats', userId);
      } catch (error) {
        console.error('Error toggling save event:', error);
      }
    },

    // Update search query
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

    updatePriceRange({ commit }, range) {
      commit('SET_PRICE_RANGE', range);
    },

    updatePriceFilter({ commit }, priceFilter) {
      commit('SET_PRICE_FILTER', priceFilter);
    },

    updateDateFilter({ commit }, filter) {
      commit('SET_DATE_FILTER', filter);
    },

    setSpecificDate({ commit }, date) {
      commit('SET_SPECIFIC_DATE', date);
    },

    updateVenueFilter({ commit }, venue) {
      commit('SET_VENUE_FILTER', venue);
    },

    updateLocationQuery({ commit }, query) {
      commit('SET_LOCATION_QUERY', query);
    },

    updateEventStatus({ commit }, status) {
      commit('SET_EVENT_STATUS', status);
    },

    toggleStatusFilter({ commit }, option) {
      commit('TOGGLE_STATUS_FILTER', option);
    },

    setStatusFilter({ commit }, payload) {
      commit('SET_STATUS_FILTER', payload);
    },

    updateClubCategoryFilter({ commit }, categoryId) {
      commit('SET_CLUB_FILTER_CATEGORY', categoryId);
    },

    updateClubFollowedFilter({ commit }, followedOnly) {
      commit('SET_CLUB_FILTER_FOLLOWED', followedOnly);
    },

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

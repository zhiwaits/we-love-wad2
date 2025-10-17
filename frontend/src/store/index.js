import auth from './modules/auth';
import { createStore } from 'vuex';
import { getAllEvents } from "../services/eventService.js";
import { getAllEventCategories } from '../services/eventCategoryService.js';
import { getAllEventVenues } from '../services/eventVenueService.js';
import { getAllTags } from '../services/tagService.js';
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

export default createStore({

  state: {
    // All events from your EventsGrid
    allEvents: [],

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

    userRSVPs: [1, 2, 3], // Will hold event IDs user has RSVP'd to
    savedEvents: [4, 5], // Will hold event IDs user has saved

    // Filters state
    filters: {
      searchQuery: '',
      selectedCategories: [],
      selectedTags: [],
      priceFilter: 'all', // 'all', 'free', 'paid'
      dateFilter: 'all', // 'all', 'today', 'this-week', 'this-month'
      venueFilter: 'all',
      locationQuery: ''
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
        !state.filters.locationQuery;

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

    // Dashboard-specific getters
    upcomingUserEvents: (state) => {
      const now = new Date();
      // Filter events where user has RSVP'd and event is in the future
      return state.allEvents
        .filter(event => {
          const eventDate = new Date(event.date);
          return eventDate > now && state.userRSVPs.includes(event.id);
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 6); // Show max 6 upcoming events
    },

    recommendedEvents: (state) => {
      // Simple recommendation: filter out events user already RSVP'd to
      return state.allEvents
        .filter(event => !state.userRSVPs.includes(event.id))
        .slice(0, 6); // Show 6 recommendations
    },

    userSavedEvents: (state) => {
      return state.allEvents
        .filter(event => state.savedEvents.includes(event.id));
    },

    toast: (state) => state.toast
  },

  mutations: {

    setAllEvents(state, events) {
      state.allEvents = events;
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

    SET_USER_RSVPS(state, eventIds) {
      state.userRSVPs = eventIds;
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

    // Reset all filters
    RESET_FILTERS(state) {
      state.filters = {
        searchQuery: '',
        selectedCategories: [],
        selectedTags: [],
        priceFilter: 'all',
        dateFilter: 'all',
        venueFilter: 'all',
        locationQuery: ''
      };
    },

    SHOW_TOAST(state, { message, type }) {
      state.toast.message = message;
      state.toast.type = type;
      state.toast.visible = true;
    },

    HIDE_TOAST(state) {
      state.toast.visible = false;
      state.toast.message = '';
      state.toast.type = 'info';
    }
  },

  actions: {

    async fetchEventCategories({ state, commit }) {
      if (state.categories.length > 0) {
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

    async fetchEventVenues({ state, commit }) {
      if (state.venues.length > 0) {
        return;
      }
      try {
        const response = await getAllEventVenues();
        const names = Array.isArray(response.data)
          ? response.data.map((item) => item?.name?.trim()).filter(Boolean)
          : [];
        commit('SET_EVENT_VENUES', names.sort());
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
        const names = tags
          .map((item) => {
            if (!item) return null;
            if (typeof item === 'string') return item.trim();
            return (item.tag_name || item.name || '').trim();
          })
          .filter(Boolean);
        names.sort((a, b) => a.localeCompare(b));
        commit('SET_AVAILABLE_TAGS', names);
      } catch (error) {
        console.error('Failed to load event tags', error);
        if (force) {
          commit('SET_AVAILABLE_TAGS', []);
        }
      }
    },

    async fetchAllEvents({ commit }) {
      try {
        const response = await getAllEvents();
        commit('setAllEvents', response.data);
      } catch (error) {
        console.error(error);
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
      try {
        const { getRsvpsByUserId } = await import('../services/rsvpService');
        const response = await getRsvpsByUserId(userId);
        // Extract event IDs from RSVPs
        const eventIds = response.data.map(rsvp => rsvp.event_id);
        commit('SET_USER_RSVPS', eventIds);
      } catch (error) {
        console.error('Error fetching user RSVPs:', error);
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

    // Action to reset filters
    resetFilters({ commit }) {
      commit('RESET_FILTERS');
    },

    showToast({ commit }, { message, type = 'info', duration = 3000 } = {}) {
      if (toastTimer) clearTimeout(toastTimer);
      commit('SHOW_TOAST', { message, type });
      toastTimer = setTimeout(() => {
        commit('HIDE_TOAST');
        toastTimer = null;
      }, duration);
    },

    hideToast({ commit }) {
      if (toastTimer) {
        clearTimeout(toastTimer);
        toastTimer = null;
      }
      commit('HIDE_TOAST');
    }
  },

  modules: {
    auth,
    clubs,
  }
});

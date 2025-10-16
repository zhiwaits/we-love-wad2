import auth from './modules/auth'; 
import { createStore } from 'vuex';
import { getAllEvents } from "../services/eventService.js";
import clubs from './clubs';

let toastTimer = null;

export default createStore({
   modules: {
    auth,  // ← ADD THIS
  },

  state: {
    // All events from your EventsGrid
    allEvents: [],

    //currentUser: {
    //  id: 1,
    //  name: 'Aryan Singh',
    //  email: 'aryan.singh.2024@scis.smu.edu.sg'
    //},

    userStats: {
      upcomingRSVPs: 5,
      totalAttended: 12,
      savedCount: 3,
      clubsFollowed: 8
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

    // Available options for filters
    categories: ['Academic', 'Performance', 'Workshop', 'Recreation', 'Career', 'Social', 'Sports'],

    // All unique tags from events
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

    // Get unique venues
    allVenues: (state) => {
      const venueSet = new Set();
      state.allEvents.forEach(event => {
        venueSet.add(event.venue);
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

    // Update search query
    SET_SEARCH_QUERY(state, query) {
      state.filters.searchQuery = query;
    },

    SET_USER_STATS(state, stats) {
      state.userStats = stats;
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
    clubs
  }
});

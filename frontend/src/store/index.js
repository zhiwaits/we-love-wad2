import { createStore } from 'vuex';

export default createStore({
  state: {
    // All events from your EventsGrid
    allEvents: [
      {
        id: 1,
        title: "SCIS Major Talks AY25/26",
        organiser: 'Ellipsis',
        category: "Academic",
        tags: ["academic", "scis", "information-session"],
        price: "FREE",
        date: "2025-10-07",
        time: "10:00 AM - 2:30 PM",
        location: "Virtual - Zoom",
        venue: "Online",
        attendees: 342,
        maxAttendees: null,
        description: "Join us to learn more about the various majors and tracks offered in SCIS from the professors themselves - ALL SCIS students are welcome!",
        image: "/src/assets/dummy/major-talks.png"
      },
      {
        id: 2,
        title: "UN PASO 2025: AS YOU WISH",
        organiser: 'SMU Ardiente',
        category: "Performance",
        tags: ["performance", "dance", "cultural"],
        price: "$16",
        date: "2025-10-12",
        time: "2:00 PM",
        location: "SMU Arts & Culture Centre @ SOE/SCIS B1",
        venue: "SOE/SCIS",
        attendees: 150,
        maxAttendees: 200,
        description: "What happens when desire consumes us and greed unleashes chaos? Three friends make selfish choices that spiral into ruin — revealing a timeless truth: true richness lies not in what we crave, but in what we already hold. Witness this story told through the power of Latin Ballroom Dance",
        image: "/src/assets/dummy/un-paso.png"
      },
      {
        id: 3,
        title: "Build With AWS GenAI",
        organiser: 'SMUAI',
        category: "Workshop",
        tags: ["workshop", "tech", "ai", "aws"],
        price: "FREE",
        date: "2025-10-07",
        time: "6:30 PM - 8:30 PM",
        location: "ALC Classroom 3-1 @ Connex Lvl 3",
        venue: "Connex",
        attendees: 38,
        maxAttendees: 50,
        status: "Filling Fast",
        description: "Curious how to go from idea to working GenAI demo on AWS? Join us for a skills-first workshop where you'll build, test, and refine ML & Generative AI solutions.",
        image: "/src/assets/dummy/build-with-aws-genai.png"
      },
      {
        id: 4,
        title: "SMU-SMC Transcendence",
        organiser: 'SMU-SMC',
        category: "Workshop",
        tags: ["workshop", "professional-development", "career"],
        price: "FREE",
        date: "2025-10-17",
        time: "3:30 PM - 6:30 PM",
        location: "LKCSB SR2-3",
        venue: "LKCSB",
        attendees: 12,
        maxAttendees: 40,
        description: "This is just the beginning of the Transcendence series, and it's more than just a skills workshop, it's an opportunity to elevate your personal brand.",
        image: "/src/assets/dummy/smu-smuc-transcendence.png"
      },
      {
        id: 5,
        title: "Beginner Fishing",
        organiser: 'SMURF',
        category: "Recreation",
        tags: ["recreation", "outdoor", "sports"],
        price: "$10",
        date: "2025-10-11",
        time: "9:00 AM - 1:00 PM",
        location: "Bedok Jetty",
        venue: "Off-Campus",
        attendees: 29,
        maxAttendees: 32,
        description: "This session is perfect for those with little to no experience — we'll provide the basic gear and teach you the essentials of fishing.",
        image: "/src/assets/dummy/beginner-fishing.png"
      }
    ],
    
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
    availableTags: []
  },

  getters: {
    // Get filtered events based on current filters
    filteredEvents: (state) => {
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
    }
  },

  mutations: {
    // Update search query
    SET_SEARCH_QUERY(state, query) {
      state.filters.searchQuery = query;
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
    }
  },

  actions: {
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
    }
  }
});

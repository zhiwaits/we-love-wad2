<script>
import { mapState, mapGetters, mapActions } from 'vuex';

export default {
  name: 'SearchClubEvents',
  
  computed: {
    // Map state from Vuex store
    ...mapState(['clubEventFilters']),
    
    // Map getters from Vuex store
    ...mapGetters(['allClubEventTags', 'allClubEventVenues', 'clubEventsResultsCount']),
    
    // Two-way binding for search input
    searchQuery: {
      get() {
        return this.clubEventFilters.searchQuery;
      },
      set(value) {
        this.updateClubEventSearch(value);
      }
    },
    
    // Two-way binding for price filter
    priceFilter: {
      get() {
        return this.clubEventFilters.priceFilter;
      },
      set(value) {
        this.updateClubEventPriceFilter(value);
      }
    },
    
    // Two-way binding for date filter
    dateFilter: {
      get() {
        return this.clubEventFilters.dateFilter;
      },
      set(value) {
        this.updateClubEventDateFilter(value);
      }
    },
    
    // Two-way binding for venue filter
    venueFilter: {
      get() {
        return this.clubEventFilters.venueFilter;
      },
      set(value) {
        this.updateClubEventVenueFilter(value);
      }
    },
    
    // Two-way binding for location search
    locationQuery: {
      get() {
        return this.clubEventFilters.locationQuery;
      },
      set(value) {
        this.updateClubEventLocationQuery(value);
      }
    },

    // Two-way binding for event status
    eventStatus: {
      get() {
        return this.clubEventFilters.eventStatus;
      },
      set(value) {
        this.updateClubEventStatus(value);
      }
    },
    
    // Check if "show only free events" is checked
    showOnlyFree: {
      get() {
        return this.clubEventFilters.priceFilter === 'free';
      },
      set(value) {
        this.updateClubEventPriceFilter(value ? 'free' : 'all');
      }
    }
  },
  
  methods: {
    // Map actions from Vuex store
    ...mapActions([
      'updateClubEventSearch',
      'updateClubEventPriceFilter',
      'updateClubEventDateFilter',
      'updateClubEventVenueFilter',
      'updateClubEventLocationQuery',
      'updateClubEventStatus',
      'resetClubEventFilters'
    ]),
    
    // Clear all filters
    handleResetFilters() {
      this.resetClubEventFilters();
    }
  }
}
</script>

<template>
    <section class="search-filters">
        <div class="container">
            <!-- Search Bar -->
            <div class="search-bar">
                <input 
                    type="text" 
                    class="form-control search-input"
                    placeholder="Search your events by title or description..."
                    v-model="searchQuery"
                >
            </div>

            <!-- Filter Dropdowns -->
            <div class="filters-row">
                <!-- Event Status Filter -->
                <select class="form-control filter-select" v-model="eventStatus">
                    <option value="both">All Events</option>
                    <option value="upcoming">Upcoming Events</option>
                    <option value="past">Past Events</option>
                </select>

                <!-- Price Filter -->
                <select class="form-control filter-select" v-model="priceFilter">
                    <option value="all">All Prices</option>
                    <option value="free">Free</option>
                    <option value="paid">Paid</option>
                </select>

                <!-- Date Filter -->
                <select class="form-control filter-select" v-model="dateFilter">
                    <option value="all">Any Date</option>
                    <option value="today">Today</option>
                    <option value="this-week">This Week</option>
                    <option value="this-month">This Month</option>
                </select>

                <!-- Venue Filter -->
                <select class="form-control filter-select" v-model="venueFilter">
                    <option value="all">All Venues</option>
                    <option v-for="venue in allClubEventVenues" :key="venue" :value="venue">
                        {{ venue }}
                    </option>
                </select>

                <!-- Location Search -->
                <input 
                    type="text" 
                    class="form-control filter-select" 
                    placeholder="Enter location..."
                    v-model="locationQuery"
                >
            </div>

            <!-- Filter Options and Results -->
            <div class="filter-options">
                <div class="left-options">
                    <!-- Free Events Checkbox -->
                    <label class="checkbox-label">
                        <input type="checkbox" v-model="showOnlyFree">
                        <span class="checkbox-text">Show only free events</span>
                    </label>
                    
                    <!-- Reset Filters Button -->
                    <button 
                        class="btn btn-sm btn-outline-secondary reset-btn" 
                        @click="handleResetFilters"
                    >
                        Clear All Filters
                    </button>
                </div>
                
                <!-- Results Count -->
                <div class="results-count">
                    <strong>{{ clubEventsResultsCount }}</strong> event{{ clubEventsResultsCount !== 1 ? 's' : '' }} found
                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
.search-filters {
    background-color: var(--color-surface);
    padding: var(--space-32) 0;
    border-bottom: 1px solid var(--color-border);
}

.search-bar {
    margin-bottom: var(--space-24);
}

.search-input {
    width: 100%;
    font-size: var(--font-size-lg);
    padding: var(--space-16);
    border-radius: var(--radius-lg);
    border: 2px solid var(--color-border);
    transition: border-color 0.2s ease;
}

.search-input:focus {
    outline: none;
    border-color: var(--color-primary, #007bff);
    box-shadow: 0 0 0 0.2rem rgba(37, 99, 235, 0.25);
}

.filters-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-16);
    margin-bottom: var(--space-20);
}

.filter-select {
    padding: var(--space-12);
    border-radius: var(--radius-base);
    font-size: var(--font-size-base);
    border: 1px solid var(--color-border);
    transition: border-color 0.2s ease;
}

.filter-select:focus {
    outline: none;
    border-color: var(--color-primary, #007bff);
    box-shadow: 0 0 0 0.2rem rgba(37, 99, 235, 0.25);
}

.filter-options {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-16);
}

.left-options {
    display: flex;
    align-items: center;
    gap: var(--space-16);
    flex-wrap: wrap;
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    cursor: pointer;
    user-select: none;
}

.checkbox-label input[type="checkbox"] {
    margin: 0;
    cursor: pointer;
}

.checkbox-text {
    font-size: var(--font-size-base);
    color: var(--color-text);
}

.reset-btn {
    padding: var(--space-8) var(--space-16);
    border-radius: var(--radius-base);
    font-size: var(--font-size-sm);
    border: 1px solid var(--color-border);
    background-color: transparent;
    color: var(--color-text);
    cursor: pointer;
    transition: all 0.2s ease;
}

.reset-btn:hover {
    background-color: var(--color-bg-1);
    border-color: var(--color-text-secondary);
}

.results-count {
    font-size: var(--font-size-base);
    color: var(--color-text-secondary);
}

.results-count strong {
    color: var(--color-primary);
    font-weight: var(--font-weight-bold);
}
</style>

<script>
import { mapState, mapGetters, mapActions } from 'vuex';

export default {
  name: 'SearchClubEvents',
  
  data() {
    return {
      filtersCollapsed: true
    };
  },
  
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

    // Two-way binding for price range
    minPrice: {
      get() {
        const min = this.clubEventFilters.priceRange?.min;
        return min != null ? min : '';
      },
      set(value) {
        const max = this.clubEventFilters.priceRange?.max ?? null;
        this.updateClubEventPriceRange({
          min: value === '' || value == null ? null : value,
          max
        });
      }
    },

    maxPrice: {
      get() {
        const max = this.clubEventFilters.priceRange?.max;
        return max != null ? max : '';
      },
      set(value) {
        const min = this.clubEventFilters.priceRange?.min ?? null;
        this.updateClubEventPriceRange({
          min,
          max: value === '' || value == null ? null : value
        });
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

    // Two-way binding for specific date
    specificDate: {
      get() {
        return this.clubEventFilters.specificDate;
      },
      set(value) {
        this.setClubEventSpecificDate(value);
      }
    },

    dateRangeStart: {
      get() {
        return this.clubEventFilters.dateRange?.start || '';
      },
      set(value) {
        const normalized = value || null;
        let end = this.clubEventFilters.dateRange?.end || null;
        if (normalized && end && normalized > end) {
          end = normalized;
        }
        this.setClubEventDateRange({ start: normalized, end });
      }
    },

    dateRangeEnd: {
      get() {
        return this.clubEventFilters.dateRange?.end || '';
      },
      set(value) {
        let normalized = value || null;
        const start = this.clubEventFilters.dateRange?.start || null;
        if (start && normalized && normalized < start) {
          normalized = start;
        }
        this.setClubEventDateRange({ start, end: normalized });
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
    
    // Check if any filters are active
    hasActiveFilters() {
      const filters = this.clubEventFilters;
      const priceActive =
        filters.priceFilter !== 'all' ||
        (filters.priceFilter === 'range' && (filters.priceRange?.min != null || filters.priceRange?.max != null));
      const dateActive =
        filters.dateFilter !== 'all' ||
        (filters.dateFilter === 'specific' && filters.specificDate) ||
        (filters.dateFilter === 'range' && filters.dateRange?.start && filters.dateRange?.end);
      const venueActive = filters.venueFilter !== 'all';
      const locationActive = !!filters.locationQuery;
      const searchActive = !!filters.searchQuery;
      const eventStatusActive = filters.eventStatus !== 'both';

      return priceActive || dateActive || venueActive || locationActive || searchActive || eventStatusActive;
    }
  },
  
  methods: {
    // Map actions from Vuex store
    ...mapActions([
      'updateClubEventSearch',
      'updateClubEventPriceFilter',
      'updateClubEventPriceRange',
      'updateClubEventDateFilter',
      'setClubEventDateRange',
      'updateClubEventVenueFilter',
      'updateClubEventLocationQuery',
      'updateClubEventStatus',
      'resetClubEventFilters',
      'setClubEventSpecificDate'
    ]),
    
    // Clear all filters
    handleResetFilters() {
      this.resetClubEventFilters();
    },

    // Clear specific date and return to date options
    clearSpecificDate() {
      this.updateClubEventDateFilter('all');
      this.setClubEventSpecificDate(null);
    },

    clearDateRange() {
      this.updateClubEventDateFilter('all');
      this.setClubEventDateRange({ start: null, end: null });
    },

    // Clear price range and return to price options
    clearPriceRange() {
      this.updateClubEventPriceFilter('all');
      this.updateClubEventPriceRange({ min: null, max: null });
    },

    toggleFilters() {
      this.filtersCollapsed = !this.filtersCollapsed;
    }
  }
}
</script>

<template>
    <section class="search-filters">
        <div class="container">
            <!-- Search Bar -->
            <div class="search-bar">
                <div class="search-input-wrapper">
                    <input 
                        type="text" 
                        class="form-control search-input"
                        placeholder="Search your events by title or description..."
                        v-model="searchQuery"
                    >
                    <button 
                        class="filters-toggle-btn"
                        @click="toggleFilters"
                        title="{{ filtersCollapsed ? 'Show Filters' : 'Hide Filters' }}"
                    >
                        {{ filtersCollapsed ? '+' : '−' }}
                    </button>
                </div>
            </div>

            <!-- Filter Dropdowns -->
            <div class="filters-row" v-show="!filtersCollapsed">
                <!-- Event Status Filter -->
                <div class="filter-group">
                    <label class="filter-label" for="event-status-select">Timeline</label>
                    <select id="event-status-select" class="form-control filter-select" v-model="eventStatus">
                        <option value="both">All Events</option>
                        <option value="upcoming">Upcoming Events</option>
                        <option value="past">Past Events</option>
                    </select>
                </div>

                <!-- Date Filter -->
                <div class="filter-group">
                    <label class="filter-label" for="date-filter">Date</label>
          <div class="date-filter-container" v-if="!['specific', 'range'].includes(dateFilter)">
                        <select id="date-filter-select" class="form-control filter-select" v-model="dateFilter">
                            <option value="all">Any Date</option>
                            <option value="today">Today</option>
                            <option value="this-week">This Week</option>
                            <option value="this-month">This Month</option>
              <option value="range">Date Range</option>
                            <option value="specific">Specific Date</option>
                        </select>
                    </div>
          <div class="date-filter-container" v-else-if="dateFilter === 'range'">
            <div class="date-range-wrapper">
              <div class="date-range">
                <input
                  type="date"
                  class="form-control filter-select"
                  v-model="dateRangeStart"
                >
                <span class="date-range__divider">-</span>
                <input
                  type="date"
                  class="form-control filter-select"
                  v-model="dateRangeEnd"
                >
              </div>
              <button
                type="button"
                class="date-clear-btn"
                @click="clearDateRange"
                title="Return to date options"
              >
                ×
              </button>
            </div>
          </div>
                    <div class="date-filter-container" v-else>
                        <div class="date-input-wrapper">
                            <input
                                id="specific-date-input"
                                type="date"
                                class="form-control filter-select"
                                v-model="specificDate"
                            >
                            <button
                                type="button"
                                class="date-clear-btn"
                                @click="clearSpecificDate"
                                title="Return to date options"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Venue Filter -->
                <div class="filter-group">
                    <label class="filter-label" for="venue-filter-select">Venue</label>
                    <select id="venue-filter-select" class="form-control filter-select" v-model="venueFilter">
                        <option value="all">All Venues</option>
                        <option v-for="venue in allClubEventVenues" :key="venue" :value="venue">
                            {{ venue }}
                        </option>
                    </select>
                </div>

                <!-- Location Search -->
                <div class="filter-group">
                    <label class="filter-label" for="location-query-input">Location</label>
                    <input 
                        id="location-query-input"
                        type="text" 
                        class="form-control filter-select" 
                        placeholder="Enter location..."
                        v-model="locationQuery"
                    >
                </div>

                <!-- Price Filter -->
                <div class="filter-group">
                    <label class="filter-label" for="price-filter">Price</label>
                    <div class="price-filter-container" v-if="priceFilter !== 'range'">
                        <select id="price-filter-select" class="form-control filter-select" v-model="priceFilter">
                            <option value="all">All Prices</option>
                            <option value="free">Free</option>
                            <option value="paid">Paid</option>
                            <option value="range">Price Range</option>
                        </select>
                    </div>
                    <div class="price-filter-container" v-else>
                        <div class="price-range-wrapper">
                            <div class="price-range">
                                <input
                                    type="number"
                                    min="0"
                                    class="form-control filter-select"
                                    placeholder="Min"
                                    v-model.number="minPrice"
                                >
                                <span class="price-range__divider">-</span>
                                <input
                                    type="number"
                                    min="0"
                                    class="form-control filter-select"
                                    placeholder="Max"
                                    v-model.number="maxPrice"
                                >
                            </div>
                            <button
                                type="button"
                                class="price-clear-btn"
                                @click="clearPriceRange"
                                title="Return to price options"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Filter Options and Results -->
            <div class="filter-options">
                <div class="left-options">
                    <!-- Reset Filters Button -->
                    <button 
                        class="btn btn-sm btn-outline-secondary reset-btn" 
                        @click="handleResetFilters"
                        :disabled="!hasActiveFilters"
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
    position: relative;
}

.search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}

.search-input {
    width: 100%;
    font-size: var(--font-size-lg);
    padding: var(--space-16);
    padding-right: 3rem; /* Make room for the toggle button */
    border-radius: var(--radius-lg);
    border: 2px solid var(--color-border);
    transition: border-color 0.2s ease;
}

.search-input:focus {
    outline: none;
    border-color: var(--color-primary, #007bff);
    box-shadow: 0 0 0 0.2rem rgba(37, 99, 235, 0.25);
}

.filters-toggle-btn {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #6c757d;
    font-size: 1.5rem;
    font-weight: bold;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 50%;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
}

.filters-toggle-btn:hover {
    background-color: var(--color-bg-2, #e9ecef);
    color: var(--color-text);
}

.filters-toggle {
    margin-bottom: var(--space-16);
    text-align: center;
}

.filters-toggle-btn {
    color: var(--color-primary, #007bff);
    text-decoration: none;
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: color 0.2s ease;
}

.filters-toggle-btn:hover {
    color: var(--color-primary-hover, #0056b3);
}

.toggle-icon {
    font-size: var(--font-size-base);
    font-weight: bold;
    margin-right: var(--space-4);
}

.filters-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-16);
    margin-bottom: var(--space-20);
}

.filter-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
}

.filter-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
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

.date-filter-container {
    position: relative;
}

.date-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}

.date-input-wrapper .filter-select {
    flex: 1;
    padding-right: 2.5rem; /* Make room for the X button */
}

.date-range-wrapper {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    width: 100%;
}

.date-range {
    display: flex;
    align-items: center;
    gap: var(--space-8);
    flex: 1 1 auto;
    min-width: 0;
}

.date-range .filter-select {
    flex: 1 1 0;
    min-width: 0;
}

.date-range__divider {
    color: var(--color-text-secondary);
    font-weight: var(--font-weight-bold);
}

.date-range-wrapper .date-clear-btn {
    position: static;
    transform: none;
    width: auto;
    height: auto;
    padding: 0 var(--space-8);
    border-radius: var(--radius-base);
}

.date-range-wrapper .date-clear-btn:hover {
    background-color: var(--color-bg-2, #e9ecef);
}

.date-clear-btn {
    position: absolute;
    right: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--color-text-secondary);
    font-size: 1.2rem;
    font-weight: bold;
    cursor: pointer;
    padding: 0.2rem;
    border-radius: 50%;
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
}

.date-clear-btn:hover {
    background-color: var(--color-bg-2, #e9ecef);
    color: var(--color-text);
}

.price-filter-container {
    /* No longer needs position: relative since button is outside */
}

.price-range-wrapper {
    display: flex;
    align-items: center;
    gap: var(--space-8);
}

.price-range-wrapper .price-range {
    flex: 1;
}

.price-range {
    display: flex;
    align-items: center;
    gap: var(--space-12);
}

.price-range__divider {
    color: var(--color-text-secondary);
    font-weight: var(--font-weight-bold);
}

.price-clear-btn {
    background: none;
    border: none;
    color: var(--color-text-secondary);
    font-size: 1.2rem;
    font-weight: bold;
    cursor: pointer;
    padding: 0.2rem;
    border-radius: 50%;
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    flex-shrink: 0;
}

.price-clear-btn:hover {
    background-color: var(--color-bg-2, #e9ecef);
    color: var(--color-text);
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

.reset-btn:hover:not(:disabled) {
    background-color: var(--color-bg-1);
    border-color: var(--color-text-secondary);
}

.reset-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background-color: #f8f9fa;
}

.results-count {
    font-size: var(--font-size-base);
    color: var(--color-text-secondary);
}

.results-count strong {
    color: var(--color-primary);
    font-weight: var(--font-weight-bold);
}

.collapse-expand-filters {
    margin-top: var(--space-16);
    text-align: center;
}

.collapse-expand-filters .btn {
    padding: var(--space-8) var(--space-16);
    border-radius: var(--radius-base);
    font-size: var(--font-size-sm);
    background-color: var(--color-primary);
    color: #fff;
    cursor: pointer;
    transition: background-color 0.2s ease;
}

.collapse-expand-filters .btn:hover {
    background-color: var(--color-primary-dark);
}
</style>

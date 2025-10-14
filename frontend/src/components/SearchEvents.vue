<script>
import { mapState, mapGetters, mapActions } from 'vuex';

export default {
  name: 'Search',
  
  computed: {
    // Map state from Vuex store
    ...mapState(['filters', 'categories']),
    
    // Map getters from Vuex store
    ...mapGetters(['allTags', 'allVenues', 'resultsCount']),
    
    // Two-way binding for search input
    searchQuery: {
      get() {
        return this.filters.searchQuery;
      },
      set(value) {
        this.updateSearch(value);
      }
    },
    
    // Two-way binding for price filter
    priceFilter: {
      get() {
        return this.filters.priceFilter;
      },
      set(value) {
        this.updatePriceFilter(value);
      }
    },
    
    // Two-way binding for date filter
    dateFilter: {
      get() {
        return this.filters.dateFilter;
      },
      set(value) {
        this.updateDateFilter(value);
      }
    },
    
    // Two-way binding for venue filter
    venueFilter: {
      get() {
        return this.filters.venueFilter;
      },
      set(value) {
        this.updateVenueFilter(value);
      }
    },
    
    // Two-way binding for location search
    locationQuery: {
      get() {
        return this.filters.locationQuery;
      },
      set(value) {
        this.updateLocationQuery(value);
      }
    },
    
    // Check if "show only free events" is checked
    showOnlyFree: {
      get() {
        return this.filters.priceFilter === 'free';
      },
      set(value) {
        this.updatePriceFilter(value ? 'free' : 'all');
      }
    }
  },
  
  methods: {
    // Map actions from Vuex store
    ...mapActions([
      'updateSearch',
      'updatePriceFilter',
      'updateDateFilter',
      'updateVenueFilter',
      'updateLocationQuery',
      'resetFilters'
    ]),
    
    // Clear all filters
    handleResetFilters() {
      this.resetFilters();
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
                    placeholder="Search events by title, organizer, or description..."
                    v-model="searchQuery"
                >
            </div>

            <!-- Filter Dropdowns -->
            <div class="filters-row">
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
                    <option v-for="venue in allVenues" :key="venue" :value="venue">
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
                        v-if="searchQuery || priceFilter !== 'all' || dateFilter !== 'all' || venueFilter !== 'all' || locationQuery"
                    >
                        Clear All Filters
                    </button>
                </div>
                
                <!-- Results Count -->
                <div class="results-count">
                    <strong>{{ resultsCount }}</strong> event{{ resultsCount !== 1 ? 's' : '' }} found
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
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
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
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
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
    width: 18px;
    height: 18px;
}

.checkbox-text {
    font-size: var(--font-size-base);
    color: var(--color-text);
}

.reset-btn {
    padding: var(--space-8) var(--space-16);
    font-size: var(--font-size-sm);
    border-radius: var(--radius-base);
    cursor: pointer;
    transition: all 0.2s ease;
}

.reset-btn:hover {
    background-color: var(--color-secondary, #6c757d);
    color: white;
}

.results-count {
    font-size: var(--font-size-base);
    color: var(--color-text-secondary);
    font-weight: var(--font-weight-medium);
}

.results-count strong {
    color: var(--color-text);
    font-weight: var(--font-weight-bold);
}

/* Responsive Design */
@media (max-width: 768px) {
    .filters-row {
        grid-template-columns: 1fr;
    }
    
    .filter-options {
        flex-direction: column;
        align-items: flex-start;
    }
    
    .left-options {
        width: 100%;
        flex-direction: column;
        align-items: flex-start;
    }
}
</style>
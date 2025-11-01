<script>
import { mapState, mapGetters, mapActions } from 'vuex';

export default {
  name: 'Search',

  computed: {
    ...mapState(['filters', 'categories']),
    ...mapGetters(['allTags', 'allVenues', 'resultsCount']),
    ...mapGetters('clubs', {
      clubCategoryOptions: 'categoryOptions',
      followedClubIds: 'followingClubIds'
    }),

    searchQuery: {
      get() {
        return this.filters.searchQuery;
      },
      set(value) {
        this.updateSearch(value);
      }
    },

    eventStatus: {
      get() {
        return this.filters.eventStatus;
      },
      set(value) {
        this.updateEventStatus(value);
      }
    },

    dateFilter: {
      get() {
        return this.filters.dateFilter;
      },
      set(value) {
        this.updateDateFilter(value);
      }
    },

    specificDate: {
      get() {
        return this.filters.specificDate;
      },
      set(value) {
        this.setSpecificDate(value);
      }
    },

    venueFilter: {
      get() {
        return this.filters.venueFilter;
      },
      set(value) {
        this.updateVenueFilter(value);
      }
    },

    locationQuery: {
      get() {
        return this.filters.locationQuery;
      },
      set(value) {
        this.updateLocationQuery(value);
      }
    },

    minPrice: {
      get() {
        const min = this.filters.priceRange?.min;
        return min != null ? min : '';
      },
      set(value) {
        const max = this.filters.priceRange?.max ?? null;
        this.updatePriceRange({
          min: value === '' ? null : value,
          max
        });
      }
    },

    maxPrice: {
      get() {
        const max = this.filters.priceRange?.max;
        return max != null ? max : '';
      },
      set(value) {
        const min = this.filters.priceRange?.min ?? null;
        this.updatePriceRange({
          min,
          max: value === '' ? null : value
        });
      }
    },

    statusSelections() {
      return this.filters.statusFilter || {};
    },

    statusOptions() {
      return [
        { key: 'rsvped', label: "RSVP'd" },
        { key: 'notRsvped', label: 'Not RSVP\'d' },
        { key: 'saved', label: 'Saved' },
        { key: 'notSaved', label: 'Not Saved' }
      ];
    },

    clubCategory: {
      get() {
        return this.filters.clubFilter?.categoryId ?? 'all';
      },
      set(value) {
        this.updateClubCategoryFilter(value);
      }
    },

    followedOnly: {
      get() {
        return this.filters.clubFilter?.followedOnly ?? false;
      },
      set(value) {
        this.updateClubFollowedFilter(value);
      }
    },

    clubCategories() {
      return Array.isArray(this.clubCategoryOptions) ? this.clubCategoryOptions : [];
    },

    hasActiveFilters() {
      const filters = this.filters;
      const priceActive = filters.priceRange?.min != null || filters.priceRange?.max != null;
      const statusActive = Object.values(filters.statusFilter || {}).some(Boolean);
      const clubActive = (filters.clubFilter?.categoryId && filters.clubFilter.categoryId !== 'all') || !!filters.clubFilter?.followedOnly;
      const dateActive = filters.dateFilter !== 'all' || (filters.dateFilter === 'specific' && filters.specificDate);
      const eventStatusActive = filters.eventStatus !== 'both';
      const venueActive = filters.venueFilter !== 'all';
      const locationActive = !!filters.locationQuery;
      const categoriesActive = Array.isArray(filters.selectedCategories) && filters.selectedCategories.length > 0;
      const tagsActive = Array.isArray(filters.selectedTags) && filters.selectedTags.length > 0;
      const searchActive = !!filters.searchQuery;

      return priceActive || statusActive || clubActive || dateActive || eventStatusActive || venueActive || locationActive || categoriesActive || tagsActive || searchActive;
    },

    canFilterByFollowing() {
      const isAuthenticated = this.$store.getters['auth/isAuthenticated'];
      return isAuthenticated && Array.isArray(this.followedClubIds) && this.followedClubIds.length > 0;
    }
  },

  methods: {
    ...mapActions([
      'updateSearch',
      'updatePriceRange',
      'updateDateFilter',
      'setSpecificDate',
      'updateVenueFilter',
      'updateLocationQuery',
      'updateEventStatus',
      'resetFilters',
      'fetchEventCategories',
      'fetchEventVenues',
      'loadSavedEvents',
      'fetchUserRSVPs',
      'toggleStatusFilter',
      'updateClubCategoryFilter',
      'updateClubFollowedFilter'
    ]),
    ...mapActions('clubs', ['ensureCategories', 'loadFollowing']),

    handleResetFilters() {
      this.resetFilters();
    },

    handleStatusToggle(option) {
      this.toggleStatusFilter(option);
    },

    isStatusActive(option) {
      return !!this.statusSelections[option];
    },

    async initialiseFilters() {
      await this.ensureCategories();

      const user = this.$store.getters['auth/currentUser'];
      if (user?.id) {
        await Promise.allSettled([
          this.loadFollowing(),
          this.loadSavedEvents(),
          this.fetchUserRSVPs(user.id)
        ]);
      }
    }
  },

  async created() {
    this.fetchEventCategories();
    this.fetchEventVenues();
    await this.initialiseFilters();
  }
};
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
                        v-if="searchQuery || priceFilter !== 'all' || dateFilter !== 'all' || venueFilter !== 'all' || locationQuery || eventStatus !== 'both'"
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
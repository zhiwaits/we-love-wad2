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

    priceFilter: {
      get() {
        return this.filters.priceFilter;
      },
      set(value) {
        this.updatePriceFilter(value);
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
          min: value === '' || value == null ? null : value,
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
          max: value === '' || value == null ? null : value
        });
      }
    },

    clubCategory: {
      get() {
        return this.filters.clubFilter?.categoryId ?? 'all';
      },
      set(value) {
        this.updateClubCategoryFilter(value);
      }
    },

    clubCategories() {
      return Array.isArray(this.clubCategoryOptions) ? this.clubCategoryOptions : [];
    },

    hasActiveFilters() {
      const filters = this.filters;
      const priceActive = filters.priceRange?.min != null || filters.priceRange?.max != null;
      const clubCategorySelected = filters.clubFilter?.categoryId != null && filters.clubFilter.categoryId !== 'all';
      const dateActive = filters.dateFilter !== 'all' || (filters.dateFilter === 'specific' && filters.specificDate);
      const eventStatusActive = filters.eventStatus !== 'both';
      const venueActive = filters.venueFilter !== 'all';
      const locationActive = !!filters.locationQuery;
      const categoriesActive = Array.isArray(filters.selectedCategories) && filters.selectedCategories.length > 0;
      const tagsActive = Array.isArray(filters.selectedTags) && filters.selectedTags.length > 0;
      const searchActive = !!filters.searchQuery;

      return priceActive || clubCategorySelected || dateActive || eventStatusActive || venueActive || locationActive || categoriesActive || tagsActive || searchActive;
    }
  },

  methods: {
    ...mapActions([
      'updateSearch',
      'updatePriceRange',
      'updatePriceFilter',
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
      'updateClubCategoryFilter'
    ]),
    ...mapActions('clubs', ['ensureCategories', 'loadFollowing']),

    handleResetFilters() {
      this.resetFilters();
    },

    clearSpecificDate() {
      this.updateDateFilter('all');
      this.setSpecificDate(null);
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
      <div class="search-bar">
        <input
          type="text"
          class="form-control search-input"
          placeholder="Search events by title, organiser, or description..."
          v-model="searchQuery"
        >
      </div>

      <div class="filters-grid">
        <!-- First Row -->
        <div class="filter-group">
          <label class="filter-label" for="event-status-select">Timeline</label>
          <select id="event-status-select" class="form-control filter-select" v-model="eventStatus">
            <option value="both">All Events</option>
            <option value="upcoming">Upcoming Events</option>
            <option value="past">Past Events</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label" for="date-filter">Date</label>
          <div class="date-filter-container" v-if="dateFilter !== 'specific'">
            <select id="date-filter-select" class="form-control filter-select" v-model="dateFilter">
              <option value="all">Any Date</option>
              <option value="today">Today</option>
              <option value="this-week">This Week</option>
              <option value="this-month">This Month</option>
              <option value="specific">Specific Date</option>
            </select>
          </div>
          <div class="date-filter-container" v-else>
            <div class="date-input-wrapper">
              <input
                id="specific-date-input"
                type="date"
                class="form-control filter-input"
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

        <div class="filter-group">
          <label class="filter-label" for="venue-filter-select">Venue</label>
          <select id="venue-filter-select" class="form-control filter-select" v-model="venueFilter">
            <option value="all">All Venues</option>
            <option v-for="venue in allVenues" :key="venue.name || venue" :value="venue.name || venue">
              {{ venue.name || venue }}
            </option>
          </select>
        </div>

        <!-- Second Row -->
        <div class="filter-group">
          <label class="filter-label" for="location-query-input">Location</label>
          <input
            id="location-query-input"
            type="text"
            class="form-control filter-input"
            placeholder="Enter location..."
            v-model="locationQuery"
          >
        </div>

        <div class="filter-group">
          <label class="filter-label">Price Range ($)</label>
          <div class="price-range">
            <input
              type="number"
              min="0"
              class="form-control filter-input"
              placeholder="Min"
              v-model.number="minPrice"
            >
                        <span class="price-range__divider">-</span>
            <input
              type="number"
              min="0"
              class="form-control filter-input"
              placeholder="Max"
              v-model.number="maxPrice"
            >
          </div>
        </div>

        <div class="filter-group">
          <label class="filter-label" for="club-category-select">Club Category</label>
          <select id="club-category-select" class="form-control filter-select" v-model="clubCategory">
            <option value="all">All Categories</option>
            <option
              v-for="category in clubCategories"
              :key="category.id"
              :value="category.id"
            >
              {{ category.name }}
            </option>
          </select>
        </div>
      </div>

      <div class="filter-options">
        <div class="left-options">
          <button
            class="btn btn-sm btn-outline-secondary reset-btn"
            @click="handleResetFilters"
            v-if="hasActiveFilters"
          >
            Clear All Filters
          </button>
        </div>

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


.filters-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-16);
  margin-bottom: var(--space-24);
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

.filter-select,
.filter-input {
  padding: var(--space-12);
  border-radius: var(--radius-base);
  font-size: var(--font-size-base);
  border: 1px solid var(--color-border);
  transition: border-color 0.2s ease;
  background-color: var(--color-surface);
}

.filter-select:focus,
.filter-input:focus {
  outline: none;
  border-color: var(--color-primary, #007bff);
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
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

.date-filter-container {
  position: relative;
}

.date-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.date-input-wrapper .filter-input {
  flex: 1;
  padding-right: 2.5rem; /* Make room for the X button */
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

.checkbox-label--disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

.helper-text {
  display: inline-block;
  margin-left: var(--space-4);
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
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
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
      const clubCategorySelected = filters.clubFilter?.categoryId != null && filters.clubFilter.categoryId !== 'all';
      const clubFollowSelected = !!filters.clubFilter?.followedOnly;
      const clubActive = clubCategorySelected || clubFollowSelected;
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
      'updateClubCategoryFilter',
      'updateClubFollowedFilter'
    ]),
    ...mapActions('clubs', ['ensureCategories', 'loadFollowing']),

    handleResetFilters() {
      this.resetFilters();
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
        <div class="filter-group">
          <label class="filter-label" for="event-status-select">Timeline</label>
          <select id="event-status-select" class="form-control filter-select" v-model="eventStatus">
            <option value="both">All Events</option>
            <option value="upcoming">Upcoming Events</option>
            <option value="past">Past Events</option>
          </select>
        </div>

        <div class="filter-group">
          <label class="filter-label" for="date-filter-select">Date</label>
          <select id="date-filter-select" class="form-control filter-select" v-model="dateFilter">
            <option value="all">Any Date</option>
            <option value="today">Today</option>
            <option value="this-week">This Week</option>
            <option value="this-month">This Month</option>
            <option value="specific">Specific Date</option>
          </select>
        </div>

        <div class="filter-group" v-if="dateFilter === 'specific'">
          <label class="filter-label" for="specific-date-input">Choose a date</label>
          <input
            id="specific-date-input"
            type="date"
            class="form-control filter-input"
            v-model="specificDate"
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
          <label class="filter-label" for="venue-filter-select">Venue</label>
          <select id="venue-filter-select" class="form-control filter-select" v-model="venueFilter">
            <option value="all">All Venues</option>
            <option v-for="venue in allVenues" :key="venue" :value="venue">
              {{ venue }}
            </option>
          </select>
        </div>

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
      </div>

      <div class="filters-secondary">
        <div class="filter-group filter-group--chips">
          <span class="filter-label">Status</span>
          <div class="chip-group">
            <button
              v-for="option in statusOptions"
              :key="option.key"
              type="button"
              class="chip"
              :class="{ 'chip--active': isStatusActive(option.key) }"
              @click="handleStatusToggle(option.key)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div class="filter-group filter-group--clubs">
          <span class="filter-label">Clubs</span>
          <div class="club-controls">
            <select class="form-control filter-select" v-model="clubCategory">
              <option value="all">All Categories</option>
              <option
                v-for="category in clubCategories"
                :key="category.id"
                :value="category.id"
              >
                {{ category.name }}
              </option>
            </select>
            <label
              class="checkbox-label"
              :class="{ 'checkbox-label--disabled': !canFilterByFollowing }"
            >
              <input
                type="checkbox"
                :disabled="!canFilterByFollowing"
                v-model="followedOnly"
              >
              <span class="checkbox-text">
                Only clubs I follow
                <span v-if="!canFilterByFollowing" class="helper-text">(sign in & follow clubs)</span>
              </span>
            </label>
          </div>
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
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
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

.filters-secondary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-16);
  margin-bottom: var(--space-24);
}

.filter-group--chips .filter-label,
.filter-group--clubs .filter-label {
  font-size: var(--font-size-base);
  color: var(--color-text);
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-8);
}

.chip {
  padding: var(--space-8) var(--space-16);
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background-color: var(--color-surface);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  transition: all var(--duration-fast) var(--ease-standard);
}

.chip:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.chip--active {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-white);
}

.club-controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-12);
  align-items: center;
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

  .filters-secondary {
    grid-template-columns: 1fr;
  }
}
</style>
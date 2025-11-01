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

    canFilterByFollowing() {
      return this.$store.getters['auth/isAuthenticated'] && this.followedClubIds.length > 0;
    },

    hasActiveFilters() {
      return (
        this.filters.searchQuery ||
        this.filters.eventStatus.length > 0 ||
        this.filters.dateFilter !== 'all' ||
        this.filters.specificDate ||
        this.filters.venueFilter !== 'all' ||
        this.filters.locationQuery ||
        this.minPrice ||
        this.maxPrice ||
        this.clubCategory !== 'all' ||
        this.followedOnly
      );
    }
  },

  methods: {
    ...mapActions([
      'updateSearch',
      'updateEventStatus',
      'updateDateFilter',
      'setSpecificDate',
      'updateVenueFilter',
      'updateLocationQuery',
      'resetFilters'
    ]),
    ...mapActions('clubs', ['loadClubCategories']),

    async initialiseFilters() {
      await this.loadClubCategories();
      this.fetchEventVenues();
    },

    handleStatusToggle(status) {
      const currentStatuses = [...this.filters.eventStatus];
      const index = currentStatuses.indexOf(status);

      if (index > -1) {
        currentStatuses.splice(index, 1);
      } else {
        currentStatuses.push(status);
      }

      this.updateEventStatus(currentStatuses);
    },

    isStatusActive(status) {
      return this.filters.eventStatus.includes(status);
    },

    handleResetFilters() {
      this.resetFilters();
      this.minPrice = '';
      this.maxPrice = '';
      this.clubCategory = 'all';
      this.followedOnly = false;
    }
  },

  mounted() {
    this.initialiseFilters();
  },

  data() {
    return {
      minPrice: '',
      maxPrice: '',
      clubCategory: 'all',
      followedOnly: false,
      statusOptions: [
        { key: 'upcoming', label: 'Upcoming' },
        { key: 'ongoing', label: 'Ongoing' },
        { key: 'past', label: 'Past' }
      ]
    };
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
          placeholder="Search events..."
          v-model="searchQuery"
        />
      </div>

   
      <div class="filters-row">
        <select class="form-control filter-select" v-model="eventStatus">
          <option value="all">All Statuses</option>
          <option value="upcoming">Upcoming</option>
          <option value="ongoing">Ongoing</option>
          <option value="past">Past</option>
        </select>

        <select class="form-control filter-select" v-model="dateFilter">
          <option value="all">All Dates</option>
          <option value="today">Today</option>
          <option value="this-week">This Week</option>
          <option value="this-month">This Month</option>
          <option value="specific">Specific Date</option>
        </select>

        <input
          v-if="dateFilter === 'specific'"
          type="date"
          class="form-control filter-select"
          v-model="specificDate"
        />

        <div class="price-range">
          <input
            type="number"
            min="0"
            class="form-control filter-select"
            placeholder="Min Price"
            v-model.number="minPrice"
          />
          <span class="price-range__divider">-</span>
          <input
            type="number"
            min="0"
            class="form-control filter-select"
            placeholder="Max Price"
            v-model.number="maxPrice"
          />
        </div>

        <select class="form-control filter-select" v-model="venueFilter">
          <option value="all">All Venues</option>
          <option v-for="venue in allVenues" :key="venue" :value="venue">
            {{ venue }}
          </option>
        </select>

        <input
          type="text"
          class="form-control filter-select"
          placeholder="Enter location..."
          v-model="locationQuery"
        />

        <select class="form-control filter-select" v-model="clubCategory">
          <option value="all">All Categories</option>
          <option
            v-for="category in categories"
            :key="category.id"
            :value="category.id"
          >
            {{ category.name }}
          </option>
        </select>

        <label class="checkbox-inline">
          <input
            type="checkbox"
            :disabled="!canFilterByFollowing"
            v-model="followedOnly"
          />
          <span>Only clubs I follow</span>
        </label>
      </div>

    
      <div class="filter-options">
        <div class="left-options">
          <button class="btn btn-sm btn-outline-secondary reset-btn" @click="handleResetFilters"
            v-if="hasActiveFilters">
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
  background-color: var(--color-bg-1);
  padding: var(--space-32) 0;
}

.search-bar {
  margin-bottom: var(--space-24);
}

.search-input {
  width: 100%;
  font-size: var(--font-size-lg);
  padding: var(--space-12) var(--space-20);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  transition: border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard);
  background-color: var(--color-surface);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.15);
}

.filters-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-20);
}

.filter-select {
  flex: 1;
  min-width: 150px;
  padding: var(--space-12) var(--space-16);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  border: 1px solid var(--color-border);
  background-color: var(--color-surface);
  transition: border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard);
}

.filter-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.12);
}

.price-range {
  display: flex;
  align-items: center;
  gap: var(--space-12);
}

.price-range__divider {
  color: var(--color-text-secondary);
  font-size: var(--font-size-base);
}

.filter-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-16);
}

.reset-btn {
  border-radius: var(--radius-md);
  padding: var(--space-10) var(--space-20);
  font-size: var(--font-size-sm);
  transition: background-color var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard);
}

.reset-btn:hover {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-white);
}

.results-count {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
}

.results-count strong {
  color: var(--color-text);
  font-weight: var(--font-weight-semibold);
}

@media (max-width: 768px) {
  .search-bar {
    margin-bottom: var(--space-16);
  }

  .filters-row {
    flex-direction: column;
    gap: var(--space-16);
  }

  .filter-select {
    width: 100%;
  }

  .filter-options {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
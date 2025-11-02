<script>
import { mapState, mapGetters, mapActions } from 'vuex';

export default {
  name: 'SearchClubs',
  mounted() {
    this.$store.dispatch('clubs/ensureCategories');
    this.$store.dispatch('clubs/ensureEvents');
    // Check route query for filter
    if (this.$route.query.filter === 'followed') {
      this.setFollowStatus('followed');
    }
  },
  data() {
    return {
      filtersCollapsed: true
    };
  },
  computed: {
    ...mapState('clubs', ['filters']),
    ...mapGetters('clubs', ['categoryOptions', 'resultsCount']),

    
    searchQuery: {
      get() { return this.filters.searchQuery; },
      set(value) { this.updateClubSearch(value); }
    },


    categoryId: {
      get() { return this.filters.categoryId; },
      set(value) { this.updateClubCategoryFilter(value); }
    },

    followStatus: {
      get() { return this.filters.followStatus; },
      set(value) { this.setFollowStatus(value); }
    },

    hasActiveFilters() {
      return this.searchQuery || this.categoryId !== 'all' || this.followStatus !== 'all';
    }
  },
  methods: {
    ...mapActions('clubs', ['updateClubSearch', 'updateClubCategoryFilter', 'resetClubFilters', 'setFollowStatus']),
    handleResetFilters() {
      this.resetClubFilters();
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
    
      <div class="search-bar">
        <div class="search-input-wrapper">
          <input
            type="text"
            class="form-control search-input"
            placeholder="Search clubs by name..."
            v-model="searchQuery"
          />
          <button 
            class="filters-toggle-btn"
            @click="toggleFilters"
            title="{{ filtersCollapsed ? 'Show Filters' : 'Hide Filters' }}"
          >
            {{ filtersCollapsed ? '+' : '−' }}
          </button>
        </div>
      </div>

      <div class="filters-row" v-show="!filtersCollapsed">
        <select class="form-control filter-select" v-model="categoryId">
          <option value="all">All Categories</option>
          <option v-for="opt in categoryOptions" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
        </select>

        <select class="form-control filter-select" v-model="followStatus">
          <option value="all">All Clubs</option>
          <option value="followed">Followed Clubs</option>
          <option value="unfollowed">Unfollowed Clubs</option>
        </select>
      </div>

    
      <div class="filter-options">
        <div class="left-options">
          <button class="btn btn-sm btn-outline-secondary reset-btn" @click="handleResetFilters" :disabled="!hasActiveFilters">
            Clear Filters
          </button>
        </div>
        <div class="results-count">
          <strong>{{ resultsCount }}</strong> club{{ resultsCount !== 1 ? 's' : '' }} found
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.search-filters { background-color: var(--color-surface); padding: var(--space-32) 0; border-bottom: 1px solid var(--color-border); }
.search-bar { margin-bottom: var(--space-24); position: relative; }
.search-input-wrapper { position: relative; display: flex; align-items: center; }
.search-input { width: 100%; font-size: var(--font-size-lg); padding: var(--space-16); padding-right: 3rem; border-radius: var(--radius-lg); border: 2px solid var(--color-border); transition: border-color 0.2s ease; }
.filters-toggle-btn { position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); background: none; border: none; color: #6c757d; font-size: 1.5rem; font-weight: bold; cursor: pointer; padding: 0.25rem; border-radius: 50%; width: 2rem; height: 2rem; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; }
.filters-toggle-btn:hover { background-color: var(--color-bg-2, #e9ecef); color: var(--color-text); }
.filters-toggle { margin-bottom: var(--space-16); text-align: center; }
.filters-toggle-btn { color: var(--color-primary, #007bff); text-decoration: none; font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); cursor: pointer; transition: color 0.2s ease; }
.filters-toggle-btn:hover { color: var(--color-primary-hover, #0056b3); }
.toggle-icon { font-size: var(--font-size-base); font-weight: bold; margin-right: 4px; }
.filters-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-16); margin-bottom: var(--space-20); }
.filter-select { padding: var(--space-12); border-radius: var(--radius-base); font-size: var(--font-size-base); border: 1px solid var(--color-border); transition: border-color 0.2s ease; }
.filter-select:focus { outline: none; border-color: var(--color-primary, #007bff); box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25); }
.filter-options { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-16); }
.left-options { display: flex; align-items: center; gap: var(--space-16); flex-wrap: wrap; }
.checkbox-inline { display: flex; align-items: center; gap: 8px; }

.reset-btn { padding: var(--space-8) var(--space-16); font-size: var(--font-size-sm); border-radius: var(--radius-base); border: 1px solid var(--color-border); background-color: transparent; color: var(--color-text); cursor: pointer; transition: all 0.2s ease; }
.reset-btn:hover:not(:disabled) { background-color: var(--color-bg-1); border-color: var(--color-text-secondary); }
.reset-btn:disabled { opacity: 0.5; cursor: not-allowed; background-color: #f8f9fa; }
.results-count { font-size: var(--font-size-base); color: var(--color-text-secondary); font-weight: var(--font-weight-medium); }
.results-count strong { color: var(--color-text); font-weight: var(--font-weight-bold); }
@media (max-width: 768px) {
  .filters-row { grid-template-columns: 1fr; }
  .filter-options { flex-direction: column; align-items: flex-start; }
  .left-options { width: 100%; flex-direction: column; align-items: flex-start; }
}
</style>

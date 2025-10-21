<script>
import { mapState, mapGetters, mapActions } from 'vuex';

export default {
  name: 'SearchClubs',
  mounted() {
    this.$store.dispatch('clubs/ensureCategories');
    this.$store.dispatch('clubs/ensureEvents');
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

    onlyWithUpcoming: {
      get() { return this.filters.onlyWithUpcoming; },
      set(v) { this.setOnlyWithUpcoming(v); }
    },

    
  },
  methods: {
    ...mapActions('clubs', ['updateClubSearch', 'updateClubCategoryFilter', 'resetClubFilters', 'setOnlyWithUpcoming']),
    handleResetFilters() {
      this.resetClubFilters();
    },
    
  }
}
</script>

<template>
  <section class="search-filters">
    <div class="container">
    
      <div class="search-bar">
        <input
          type="text"
          class="form-control search-input"
          placeholder="Search clubs by name..."
          v-model="searchQuery"
        />
      </div>

   
      <div class="filters-row">
        <select class="form-control filter-select" v-model="categoryId">
          <option value="all">All Categories</option>
          <option v-for="opt in categoryOptions" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
        </select>

        

              <label class="checkbox-inline">
          <input type="checkbox" v-model="onlyWithUpcoming" />
          <span>Only clubs with upcoming events</span>
        </label>
      </div>

    
      <div class="filter-options">
        <div class="left-options">
          <button class="btn btn-sm btn-outline-secondary reset-btn" @click="handleResetFilters"
            v-if="searchQuery || categoryId !== 'all' || onlyWithUpcoming">
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
.search-bar { margin-bottom: var(--space-24); }
.search-input { width: 100%; font-size: var(--font-size-lg); padding: var(--space-16); border-radius: var(--radius-lg); border: 2px solid var(--color-border); transition: border-color 0.2s ease; }
.search-input:focus { outline: none; border-color: var(--color-primary, #007bff); box-shadow: 0 0 0 0.2rem rgba(0,123,255,0.25); }
.filters-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-16); margin-bottom: var(--space-20); }
.filter-select { padding: var(--space-12); border-radius: var(--radius-base); font-size: var(--font-size-base); border: 1px solid var(--color-border); transition: border-color 0.2s ease; }
.filter-select:focus { outline: none; border-color: var(--color-primary, #007bff); box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25); }
.filter-options { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-16); }
.left-options { display: flex; align-items: center; gap: var(--space-16); flex-wrap: wrap; }
.checkbox-inline { display: flex; align-items: center; gap: 8px; }

.reset-btn { padding: var(--space-8) var(--space-16); font-size: var(--font-size-sm); border-radius: var(--radius-base); transition: all 0.2s ease; }
.reset-btn:hover { background-color: var(--color-secondary, #6c757d); color: white; }
.results-count { font-size: var(--font-size-base); color: var(--color-text-secondary); font-weight: var(--font-weight-medium); }
.results-count strong { color: var(--color-text); font-weight: var(--font-weight-bold); }
@media (max-width: 768px) {
  .filters-row { grid-template-columns: 1fr; }
  .filter-options { flex-direction: column; align-items: flex-start; }
  .left-options { width: 100%; flex-direction: column; align-items: flex-start; }
}
</style>

<script>
import { mapState, mapGetters, mapActions } from 'vuex';

export default {
  name: 'FilterPanel',
  
  data() {
    return {
      showCategories: true,
      showTags: true,
      showStatus: true
    };
  },
  
  computed: {
    // categories list as simple names
    ...mapState(['filters']),
    ...mapGetters(['allTags', 'categoryNames', 'categoryColorMap']),
    
    // Check if a category is selected
    isCategorySelected() {
      return (category) => this.filters.selectedCategories.includes(category);
    },
    
    // Check if a tag is selected
    isTagSelected() {
      return (tag) => this.filters.selectedTags.includes(tag);
    },
    
    // Count selected filters
    selectedFiltersCount() {
      const statusCount = Object.values(this.statusSelections).filter(Boolean).length;
      return this.filters.selectedCategories.length + this.filters.selectedTags.length + statusCount;
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
    }
  },
  
  methods: {
    ...mapActions(['toggleCategory', 'toggleTag', 'resetFilters', 'fetchEventCategories', 'toggleStatusFilter']),
    
    // Handle category checkbox click
    handleCategoryToggle(category) {
      this.toggleCategory(category);
    },
    
    // Handle tag click
    handleTagClick(tag) {
      this.toggleTag(tag);
    },
    
    // Toggle category section
    toggleCategorySection() {
      this.showCategories = !this.showCategories;
    },
    
    // Toggle tag section
    toggleTagSection() {
      this.showTags = !this.showTags;
    },

    // Handle status toggle
    handleStatusToggle(option) {
      this.toggleStatusFilter(option);
    },

    // Check if status is active
    isStatusActive(option) {
      return !!this.statusSelections[option];
    },

    // Determine whether a hex color is light (returns true) for contrast
    isLightColor(hex) {
      if (!hex) return false;
      try {
        const cleaned = hex.replace('#','');
        const bigint = parseInt(cleaned.length === 3 ? cleaned.split('').map(c=>c+c).join('') : cleaned, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        // Perceived luminance
        const luminance = 0.299*r + 0.587*g + 0.114*b;
        return luminance > 186; // threshold
      } catch (e) {
        return false;
      }
    }
  },

  created() {
    this.fetchEventCategories();
  }
}
</script>

<template>
  <aside class="filter-panel">
    <div class="filter-panel-header">
      <h3>Filters</h3>
      <button 
        v-if="selectedFiltersCount > 0" 
        class="clear-btn"
        @click="resetFilters"
      >
        Clear All ({{ selectedFiltersCount }})
      </button>
    </div>

    <!-- Category Filter Section -->
    <div class="filter-section">
      <div class="filter-section-header" @click="toggleCategorySection">
        <h4>Categories</h4>
        <span class="toggle-icon">{{ showCategories ? '−' : '+' }}</span>
      </div>
      
      <div v-show="showCategories" class="filter-section-content">
        <label 
          v-for="category in categoryNames" 
          :key="category" 
          class="checkbox-label"
        >
          <input 
            type="checkbox" 
            :checked="isCategorySelected(category)"
            @change="handleCategoryToggle(category)"
          >
          <span class="checkbox-text">{{ category }}</span>
          <span class="category-badge" :class="`badge-${category.toLowerCase()}`" :style="categoryColorMap && categoryColorMap[category] ? { backgroundColor: categoryColorMap[category], color: (isLightColor(categoryColorMap[category]) ? '#222' : '#fff') } : {}">
            {{ category }}
          </span>
        </label>
      </div>
    </div>

    <!-- Tags Filter Section -->
    <div class="filter-section">
      <div class="filter-section-header" @click="toggleTagSection">
        <h4>Tags</h4>
        <span class="toggle-icon">{{ showTags ? '−' : '+' }}</span>
      </div>
      
      <div v-show="showTags" class="filter-section-content">
        <div class="tag-cloud">
          <button
            v-for="tag in allTags"
            :key="tag"
            class="tag-button"
            :class="{ 'tag-active': isTagSelected(tag) }"
            @click="handleTagClick(tag)"
          >
            #{{ tag }}
          </button>
        </div>
      </div>
    </div>

    <!-- Status Filter Section -->
    <div class="filter-section">
      <div class="filter-section-header">
        <h4>Status</h4>
      </div>
      
      <div v-show="showStatus" class="filter-section-content">
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
    </div>

    <!-- Active Filters Display -->
    <div v-if="selectedFiltersCount > 0" class="active-filters">
      <h4>Active Filters:</h4>
      
      <!-- Selected Categories -->
      <div v-if="filters.selectedCategories.length > 0" class="active-filter-group">
        <span class="filter-label">Categories:</span>
        <div class="active-filter-tags">
          <span 
            v-for="category in filters.selectedCategories" 
            :key="category"
            class="active-filter-tag"
          >
            {{ category }}
            <button class="remove-filter" @click="toggleCategory(category)">×</button>
          </span>
        </div>
      </div>
      
      <!-- Selected Tags -->
      <div v-if="filters.selectedTags.length > 0" class="active-filter-group">
        <span class="filter-label">Tags:</span>
        <div class="active-filter-tags">
          <span 
            v-for="tag in filters.selectedTags" 
            :key="tag"
            class="active-filter-tag"
          >
            #{{ tag }}
            <button class="remove-filter" @click="toggleTag(tag)">×</button>
          </span>
        </div>
      </div>

      <!-- Selected Status -->
      <div v-if="Object.keys(statusSelections).length > 0" class="active-filter-group">
        <span class="filter-label">Status:</span>
        <div class="active-filter-tags">
          <span 
            v-for="(active, key) in statusSelections" 
            v-if="active"
            :key="key"
            class="active-filter-tag"
          >
            {{ statusOptions.find(option => option.key === key).label }}
            <button class="remove-filter" @click="handleStatusToggle(key)">×</button>
          </span>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.filter-panel {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg, 8px);
  padding: var(--space-24, 24px);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.filter-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-24, 24px);
  padding-bottom: var(--space-16, 16px);
  border-bottom: 2px solid var(--color-border);
}

.filter-panel-header h3 {
  margin: 0;
  font-size: var(--font-size-xl, 1.25rem);
  color: var(--color-text);
  font-weight: var(--font-weight-bold, 700);
}

.clear-btn {
  background-color: var(--color-error);
  color: var(--color-btn-primary-text);
  border: none;
  padding: var(--space-8, 8px) var(--space-16, 16px);
  border-radius: var(--radius-base, 4px);
  font-size: var(--font-size-sm, 0.875rem);
  font-weight: var(--font-weight-medium, 500);
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.clear-btn:hover {
  background-color: var(--color-error);
  filter: brightness(0.9);
}

.filter-section {
  margin-bottom: var(--space-24, 24px);
}

.filter-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-12, 12px);
  background-color: var(--color-bg-1, #f8f9fa);
  border-radius: var(--radius-base, 4px);
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s ease;
}

.filter-section-header:hover {
  background-color: var(--color-bg-2, #e9ecef);
}

.filter-section-header h4 {
  margin: 0;
  font-size: var(--font-size-base, 1rem);
  color: var(--color-text);
  font-weight: var(--font-weight-semibold, 600);
}

.toggle-icon {
  font-size: var(--font-size-xl, 1.25rem);
  font-weight: bold;
  color: var(--color-text-secondary);
}

.filter-section-content {
  padding: var(--space-16, 16px) var(--space-8, 8px);
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-12, 12px);
  padding: var(--space-8, 8px) var(--space-4, 4px);
  cursor: pointer;
  border-radius: var(--radius-base, 4px);
  transition: background-color 0.2s ease;
}

.checkbox-label:hover {
  background-color: var(--color-bg-1, #f8f9fa);
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--color-primary, #007bff);
}

.checkbox-text {
  flex: 1;
  font-size: var(--font-size-base, 1rem);
  color: var(--color-text);
}

.category-badge {
  padding: var(--space-4, 4px) var(--space-8, 8px);
  border-radius: var(--radius-full, 999px);
  font-size: var(--font-size-xs, 0.75rem);
  font-weight: var(--font-weight-medium, 500);
  background-color: var(--color-secondary, #6c757d);
  color: white;
}

.badge-academic { background-color: #007bff; }
.badge-workshop { background-color: #28a745; }
.badge-performance { background-color: #dc3545; }
.badge-recreation { background-color: #ffc107; color: #333; }
.badge-career { background-color: #17a2b8; }
.badge-social { background-color: #6f42c1; }
.badge-sports { background-color: #fd7e14; }

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-8, 8px);
}

.tag-button {
  background-color: var(--color-bg-1, #f8f9fa);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  padding: var(--space-6, 6px) var(--space-12, 12px);
  border-radius: var(--radius-full, 999px);
  font-size: var(--font-size-sm, 0.875rem);
  font-weight: var(--font-weight-medium, 500);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tag-button:hover {
  background-color: var(--color-bg-2, #e9ecef);
  border-color: var(--color-primary);
  color: var(--color-primary);
  transform: translateY(-1px);
}

.tag-button.tag-active {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-btn-primary-text);
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-8, 8px);
}

.chip {
  padding: var(--space-8, 8px) var(--space-16, 16px);
  border-radius: var(--radius-full, 999px);
  border: 1px solid var(--color-border);
  background-color: var(--color-surface);
  font-size: var(--font-size-sm, 0.875rem);
  font-weight: var(--font-weight-medium, 500);
  color: var(--color-text-secondary);
  transition: all var(--duration-fast, 0.2s) var(--ease-standard, ease);
  cursor: pointer;
}

.chip:hover {
  border-color: var(--color-primary, #007bff);
  color: var(--color-primary, #007bff);
}

.chip--active {
  background-color: var(--color-primary, #007bff);
  border-color: var(--color-primary, #007bff);
  color: var(--color-white, #fff);
}

/* Responsive Design */
@media (max-width: 768px) {
  .filter-panel {
    padding: var(--space-16, 16px);
  }
  
  .filter-panel-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-12, 12px);
  }
  
  .clear-btn {
    width: 100%;
  }
}
</style>
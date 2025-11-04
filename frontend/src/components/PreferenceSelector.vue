<template>
  <div class="preference-selector">
    <div class="preference-header">
      <h3>{{ title }}</h3>
      <p class="preference-subtitle">{{ subtitle }}</p>
      <p class="preference-count" :class="{ 'count-error': !isValidCount }">
        {{ totalSelected }} / 10 selected (minimum 3 required)
      </p>
    </div>

    <!-- Categories Section -->
    <div class="preference-section">
      <h4 class="section-title">Event Categories</h4>
      <div class="categories-grid">
        <button
          v-for="category in availableCategories"
          :key="category"
          @click="toggleCategory(category)"
          :class="[
            'category-chip',
            { 'selected': isCategorySelected(category) }
          ]"
          :style="getCategoryStyle(category)"
        >
          {{ category }}
          <span v-if="isCategorySelected(category)" class="check-icon">✓</span>
        </button>
      </div>
    </div>

    <!-- Tags Section -->
    <div class="preference-section">
      <h4 class="section-title">Event Tags</h4>
      <div class="tag-search">
        <input
          v-model="tagSearchQuery"
          type="text"
          placeholder="Search for tags..."
          class="tag-input"
          @keyup.enter="addCustomTag"
        />
        <button
          @click="addCustomTag"
          class="add-tag-btn"
          :disabled="!tagSearchQuery.trim()"
        >
          Add
        </button>
      </div>

      <!-- Tag Suggestions (shows when searching or popular tags by default) -->
      <div v-if="displayTagSuggestions.length > 0" class="tag-suggestions">
        <p v-if="!tagSearchQuery" class="suggestions-label">Popular tags (click to add):</p>
        <button
          v-for="tag in displayTagSuggestions"
          :key="tag"
          @click="handleTagClick(tag)"
          class="tag-suggestion"
        >
          {{ tag }}
        </button>
      </div>

      <!-- Selected Tags -->
      <div v-if="selectedTags.length > 0" class="selected-tags">
        <span
          v-for="tag in selectedTags"
          :key="tag"
          class="tag-chip"
        >
          {{ tag }}
          <button @click="removeTag(tag)" class="remove-tag-btn">×</button>
        </span>
      </div>
      <p v-else class="no-tags-message">No tags selected. Click on any tag suggestion above to add it, or search for specific tags.</p>
    </div>

    <!-- Validation Message -->
    <div v-if="validationMessage" class="validation-message" :class="validationClass">
      {{ validationMessage }}
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'PreferenceSelector',

  props: {
    title: {
      type: String,
      default: 'Select Your Preferences'
    },
    subtitle: {
      type: String,
      default: 'Choose categories and tags that match your interests'
    },
    initialCategories: {
      type: Array,
      default: () => []
    },
    initialTags: {
      type: Array,
      default: () => []
    }
  },

  data() {
    return {
      selectedCategories: [...this.initialCategories],
      selectedTags: [...this.initialTags],
      tagSearchQuery: '',
      validationMessage: ''
    };
  },

  computed: {
    ...mapGetters(['categoryNames', 'categoryColorMap', 'allTags']),

    availableCategories() {
      return this.categoryNames || [];
    },

    totalSelected() {
      return this.selectedCategories.length + this.selectedTags.length;
    },

    isValidCount() {
      return this.totalSelected >= 3 && this.totalSelected <= 10;
    },

    validationClass() {
      return this.isValidCount ? 'success' : 'error';
    },

    filteredTagSuggestions() {
      const input = this.tagSearchQuery.trim().toLowerCase();

      const selectedSet = new Set(this.selectedTags.map(tag => tag.toLowerCase()));

      if (!input) {
        // Show popular/all available tags when not searching (up to 20)
        return this.allTags
          .filter(tag => {
            if (!tag) return false;
            const lower = tag.toLowerCase();
            return !selectedSet.has(lower);
          })
          .slice(0, 20);
      }

      // Filter by search query
      return this.allTags
        .filter(tag => {
          if (!tag) return false;
          const lower = tag.toLowerCase();
          if (selectedSet.has(lower)) return false;
          return lower.includes(input);
        })
        .slice(0, 20);
    },

    // Computed property to display tag suggestions
    displayTagSuggestions() {
      return this.filteredTagSuggestions;
    }
  },

  watch: {
    totalSelected() {
      this.validateSelection();
      this.$emit('update', {
        categories: this.selectedCategories,
        tags: this.selectedTags,
        isValid: this.isValidCount
      });
    }
  },

  methods: {
    isCategorySelected(category) {
      return this.selectedCategories.some(
        c => c.toLowerCase() === category.toLowerCase()
      );
    },

    toggleCategory(category) {
      const index = this.selectedCategories.findIndex(
        c => c.toLowerCase() === category.toLowerCase()
      );

      if (index > -1) {
        this.selectedCategories.splice(index, 1);
      } else {
        if (this.totalSelected >= 10) {
          this.validationMessage = 'Maximum 10 preferences allowed';
          setTimeout(() => { this.validationMessage = ''; }, 3000);
          return;
        }
        this.selectedCategories.push(category);
      }
    },

    getCategoryStyle(category) {
      const color = this.categoryColorMap[category];
      if (this.isCategorySelected(category) && color) {
        return {
          backgroundColor: color,
          color: '#fff',
          borderColor: color
        };
      }
      return {};
    },

    handleTagClick(tag) {
      if (!this.isTagSelected(tag)) {
        this.addTag(tag);
      }
      this.clearTagInput();
    },

    addTag(tag) {
      const trimmedTag = tag.trim().toLowerCase();
      if (!trimmedTag) return;

      if (this.isTagSelected(trimmedTag)) {
        this.validationMessage = 'Tag already selected';
        setTimeout(() => { this.validationMessage = ''; }, 3000);
        return;
      }

      if (this.totalSelected >= 10) {
        this.validationMessage = 'Maximum 10 preferences allowed';
        setTimeout(() => { this.validationMessage = ''; }, 3000);
        return;
      }

      this.selectedTags.push(trimmedTag);
    },

    addCustomTag() {
      if (!this.tagSearchQuery.trim()) return;
      this.addTag(this.tagSearchQuery);
      this.clearTagInput();
    },

    isTagSelected(tag) {
      return this.selectedTags.some(
        t => t.toLowerCase() === tag.toLowerCase()
      );
    },

    removeTag(tag) {
      const index = this.selectedTags.findIndex(
        t => t.toLowerCase() === tag.toLowerCase()
      );
      if (index > -1) {
        this.selectedTags.splice(index, 1);
      }
    },

    clearTagInput() {
      this.tagSearchQuery = '';
    },

    validateSelection() {
      if (this.totalSelected < 3) {
        this.validationMessage = 'Please select at least 3 preferences';
      } else if (this.totalSelected > 10) {
        this.validationMessage = 'Please select no more than 10 preferences';
      } else {
        this.validationMessage = '';
      }
    },

    getPreferences() {
      return {
        categories: this.selectedCategories,
        tags: this.selectedTags,
        isValid: this.isValidCount
      };
    },

    resetPreferences() {
      this.selectedCategories = [];
      this.selectedTags = [];
      this.validationMessage = '';
    }
  }
};
</script>

<style scoped>
.preference-selector {
  width: 100%;
}

.preference-header {
  margin-bottom: 2rem;
}

.preference-header h3 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #1a1a1a;
}

.preference-subtitle {
  color: #666;
  font-size: 0.95rem;
  margin-bottom: 0.75rem;
}

.preference-count {
  font-size: 0.9rem;
  font-weight: 500;
  color: #10b981;
  transition: color 0.3s;
}

.preference-count.count-error {
  color: #ef4444;
}

.preference-section {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #333;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.75rem;
}

.category-chip {
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  color: #374151;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.category-chip:hover {
  border-color: #9ca3af;
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.category-chip.selected {
  border-color: currentColor;
  font-weight: 600;
}

.check-icon {
  font-weight: bold;
}

.tag-search {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tag-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

.tag-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.add-tag-btn {
  padding: 0.75rem 1.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.add-tag-btn:hover:not(:disabled) {
  background: #2563eb;
}

.add-tag-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.tag-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
}

.suggestions-label {
  width: 100%;
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
}

.tag-suggestion {
  padding: 0.5rem 1rem;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.tag-suggestion:hover {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #3b82f6;
  color: white;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
}

.remove-tag-btn {
  background: none;
  border: none;
  color: white;
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;
}

.remove-tag-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.no-tags-message {
  color: #9ca3af;
  font-size: 0.9rem;
  font-style: italic;
  padding: 1rem;
  text-align: center;
  background: #f9fafb;
  border-radius: 8px;
}

.validation-message {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  margin-top: 1rem;
}

.validation-message.error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.validation-message.success {
  background: #d1fae5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}
</style>

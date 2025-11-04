<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useStore } from 'vuex';
import { getUserPreferences, updateUserPreferences } from '../services/profileService';
import { getAllClubCategories } from '../services/clubCategoryService';
import { getAllEventCategories } from '../services/eventCategoryService';
import { getAllTags } from '../services/tagService';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  currentUser: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['close', 'preferences-updated']);

const store = useStore();

// Form data
const selectedEventCategories = ref([]);
const selectedClubCategoryPreferences = ref([]);
const selectedTagIds = ref([]);

// Data
const categories = ref([]);
const eventCategories = ref([]);
const availableTags = ref([]);

// Loading states
const loading = ref(false);
const saving = ref(false);
const loadingData = ref(false);

// Search
const tagSearchQuery = ref('');

// Constants
const MAX_EVENT_CATEGORY_PREFS = 3;
const MAX_CLUB_CATEGORY_PREFS = 3;
const MAX_TAG_PREFS = 10;

// Computed properties
const eventCategoryLimitReached = computed(() => selectedEventCategories.value.length >= MAX_EVENT_CATEGORY_PREFS);
const clubCategoryLimitReached = computed(() => selectedClubCategoryPreferences.value.length >= MAX_CLUB_CATEGORY_PREFS);
const tagLimitReached = computed(() => selectedTagIds.value.length >= MAX_TAG_PREFS);

const selectedTagObjects = computed(() => availableTags.value.filter(tag => selectedTagIds.value.includes(tag.id)));
const selectedClubCategoryObjects = computed(() => {
  if (!Array.isArray(categories.value)) return [];
  const result = categories.value.filter((cat) => {
    const numeric = Number(cat?.id);
    const isSelected = Number.isFinite(numeric) && selectedClubCategoryPreferences.value.includes(numeric);
    console.log('Checking category:', cat?.name, 'id:', cat?.id, 'numeric:', numeric, 'isSelected:', isSelected);
    return isSelected;
  });
  console.log('Selected club category objects:', result);
  return result;
});

const eventCategoryOptions = computed(() => {
  if (!Array.isArray(eventCategories.value)) return [];
  const mapped = eventCategories.value.map((item) => {
    if (!item) return null;
    if (typeof item === 'string') {
      const name = item.trim();
      return { id: name, name };
    }
    const name = (item.name || item.label || item.category || '').trim();
    if (!name) return null;
    return { id: item.id ?? name, name };
  }).filter(Boolean);
  mapped.sort((a, b) => a.name.localeCompare(b.name));
  return mapped;
});

const clubCategoryOptions = computed(() => {
  if (!Array.isArray(categories.value)) return [];
  const mapped = categories.value.map((item) => {
    if (!item) return null;
    if (typeof item === 'string') {
      const name = item.trim();
      return { id: name, name };
    }
    const name = (item.name || item.label || '').trim();
    const numericId = Number(item.id ?? null);
    if (!name || !Number.isFinite(numericId)) return null;
    return { id: numericId, name };
  }).filter(Boolean);
  mapped.sort((a, b) => a.name.localeCompare(b.name));
  return mapped;
});

const tagOptions = computed(() => {
  if (!Array.isArray(availableTags.value)) return [];
  const mapped = availableTags.value.map((tag) => {
    if (!tag) return null;
    const id = Number(tag.id ?? tag.tag_id);
    const name = (tag.tag_name || tag.name || '').trim();
    if (!Number.isFinite(id) || !name) return null;
    return { id, name };
  }).filter(Boolean);
  mapped.sort((a, b) => a.name.localeCompare(b.name));

  // Filter by search query if provided
  const query = tagSearchQuery.value.trim().toLowerCase();
  if (!query) return mapped;
  return mapped.filter(tag => tag.name.toLowerCase().includes(query));
});

// Methods
const isEventCategorySelected = (name) => selectedEventCategories.value.includes(name);
const isClubCategorySelected = (id) => {
  const numeric = Number(id);
  if (!Number.isFinite(numeric)) return false;
  return selectedClubCategoryPreferences.value.includes(numeric);
};
const isTagSelected = (id) => {
  const numeric = Number(id);
  if (!Number.isFinite(numeric)) return false;
  return selectedTagIds.value.includes(numeric);
};

const toggleEventCategoryPreference = (name) => {
  if (!name) return;
  if (isEventCategorySelected(name)) {
    selectedEventCategories.value = selectedEventCategories.value.filter((item) => item !== name);
    return;
  }
  if (eventCategoryLimitReached.value) return;
  selectedEventCategories.value = [...selectedEventCategories.value, name];
};

const toggleClubCategoryPreference = (id) => {
  const numeric = Number(id);
  if (!Number.isFinite(numeric)) return;
  if (isClubCategorySelected(numeric)) {
    selectedClubCategoryPreferences.value = selectedClubCategoryPreferences.value.filter((item) => item !== numeric);
    return;
  }
  if (clubCategoryLimitReached.value) return;
  selectedClubCategoryPreferences.value = [...selectedClubCategoryPreferences.value, numeric];
};

const toggleTagPreference = (id) => {
  const numeric = Number(id);
  if (!Number.isFinite(numeric)) return;
  if (isTagSelected(numeric)) {
    selectedTagIds.value = selectedTagIds.value.filter((item) => item !== numeric);
    return;
  }
  if (tagLimitReached.value) return;
  selectedTagIds.value = [...selectedTagIds.value, numeric];
};

// Load data
const loadCategoriesAndTags = async () => {
  try {
    const [clubRes, eventRes, tagRes] = await Promise.all([
      getAllClubCategories(),
      getAllEventCategories(),
      getAllTags()
    ]);

    categories.value = Array.isArray(clubRes?.data) ? clubRes.data : [];
    eventCategories.value = Array.isArray(eventRes?.data) ? eventRes.data : [];
    availableTags.value = Array.isArray(tagRes?.data) ? tagRes.data : [];

    console.log('Loaded categories:', categories.value);
    console.log('Loaded event categories:', eventCategories.value);
  } catch (e) {
    categories.value = [];
    eventCategories.value = [];
    availableTags.value = [];
    console.error('Failed to load categories and tags:', e);
  }
};

const loadUserPreferences = async () => {
  if (!props.visible || !props.currentUser?.id) return;

  loadingData.value = true;
  try {
    const response = await getUserPreferences(props.currentUser.id);
    const prefs = response.data;

    console.log('Loaded user preferences:', prefs);
    console.log('Club category preferences:', prefs.clubCategoryPreferences);
    console.log('Available categories:', categories.value);

    selectedEventCategories.value = Array.isArray(prefs.categoryPreferences) ? prefs.categoryPreferences : [];
    selectedClubCategoryPreferences.value = Array.isArray(prefs.clubCategoryPreferences) ? prefs.clubCategoryPreferences : [];
    selectedTagIds.value = Array.isArray(prefs.tagPreferences) ? prefs.tagPreferences : [];

    console.log('Selected club category preferences after loading:', selectedClubCategoryPreferences.value);
  } catch (error) {
    console.error('Failed to load user preferences:', error);
    store.dispatch('showToast', { message: 'Failed to load preferences', type: 'error' });
  } finally {
    loadingData.value = false;
  }
};

// Watch for modal visibility
watch(() => props.visible, async (newVisible) => {
  if (newVisible) {
    // Load categories first, then preferences
    await loadCategoriesAndTags();
    // Small delay to ensure reactivity
    await nextTick();
    await loadUserPreferences();
  }
});

// Save preferences
const savePreferences = async () => {
  saving.value = true;
  try {
    const preferencesData = {
      categoryPreferences: selectedEventCategories.value,
      clubCategoryPreferences: selectedClubCategoryPreferences.value,
      tagPreferences: selectedTagIds.value
    };

    await updateUserPreferences(props.currentUser.id, preferencesData);

    store.dispatch('showToast', { message: 'Preferences updated successfully!', type: 'success' });
    emit('preferences-updated');
    emit('close');
  } catch (error) {
    console.error('Failed to update preferences:', error);
    store.dispatch('showToast', { message: 'Failed to update preferences', type: 'error' });
  } finally {
    saving.value = false;
  }
};

const closeModal = () => {
  emit('close');
};

// Initialize on mount
onMounted(async () => {
  // Don't load data here - the watch will handle it when visible becomes true
  if (props.visible) {
    await loadCategoriesAndTags();
    await loadUserPreferences();
  }
});
</script>

<template>
  <div v-if="visible" class="modal-overlay" @click="closeModal">
    <div class="modal-content preferences-modal" @click.stop>
      <div class="modal-header">
        <h3>Update Preferences</h3>
        <button class="modal-close" @click="closeModal">&times;</button>
      </div>

      <div class="modal-body">
        <div v-if="loadingData" class="loading-state">
          <p>Loading your preferences...</p>
        </div>

        <div v-else>
          <div class="form-notice">
            <p class="notice-text">
              Update your preferences to get better event recommendations. You can choose up to the suggested limits.
            </p>
          </div>

          <section class="preference-section">
            <header class="preference-header">
              <h3 class="preference-title">Event Categories</h3>
              <span class="preference-count">{{ selectedEventCategories.length }} / {{ MAX_EVENT_CATEGORY_PREFS }}</span>
            </header>
            <div class="preference-list">
              <label
                v-for="option in eventCategoryOptions"
                :key="option.name"
                class="preference-option"
              >
                <input
                  type="checkbox"
                  :value="option.name"
                  :checked="isEventCategorySelected(option.name)"
                  @change="toggleEventCategoryPreference(option.name)"
                  :disabled="!isEventCategorySelected(option.name) && eventCategoryLimitReached"
                />
                <span>{{ option.name }}</span>
              </label>
              <p v-if="eventCategoryOptions.length === 0" class="preference-empty">No event categories available yet.</p>
            </div>
            <div v-if="selectedEventCategories.length" class="chip-list">
              <span v-for="category in selectedEventCategories" :key="category" class="chip">{{ category }}</span>
            </div>
          </section>

          <section class="preference-section">
            <header class="preference-header">
              <h3 class="preference-title">Club Categories</h3>
              <span class="preference-count">{{ selectedClubCategoryPreferences.length }} / {{ MAX_CLUB_CATEGORY_PREFS }}</span>
            </header>
            <div class="preference-list">
              <label
                v-for="option in clubCategoryOptions"
                :key="option.id"
                class="preference-option"
              >
                <input
                  type="checkbox"
                  :value="option.id"
                  :checked="isClubCategorySelected(option.id)"
                  @change="toggleClubCategoryPreference(option.id)"
                  :disabled="!isClubCategorySelected(option.id) && clubCategoryLimitReached"
                />
                <span>{{ option.name }}</span>
              </label>
              <p v-if="clubCategoryOptions.length === 0" class="preference-empty">No club categories available yet.</p>
            </div>
            <div v-if="selectedClubCategoryObjects.length" class="chip-list">
              <span
                v-for="category in selectedClubCategoryObjects"
                :key="category.id"
                class="chip"
              >{{ category.name }}</span>
            </div>
          </section>

          <section class="preference-section">
            <header class="preference-header">
              <h3 class="preference-title">Event Tags</h3>
              <span class="preference-count">{{ selectedTagIds.length }} / {{ MAX_TAG_PREFS }}</span>
            </header>

            <div class="preference-search">
              <input
                type="text"
                v-model="tagSearchQuery"
                class="preference-search-input"
                placeholder="Search tags..."
                :disabled="saving"
              />
            </div>

            <div class="preference-list preference-list--scrollable">
              <label
                v-for="option in tagOptions"
                :key="option.id"
                class="preference-option"
              >
                <input
                  type="checkbox"
                  :value="option.id"
                  :checked="isTagSelected(option.id)"
                  @change="toggleTagPreference(option.id)"
                  :disabled="!isTagSelected(option.id) && tagLimitReached"
                />
                <span>{{ option.name }}</span>
              </label>
              <p v-if="tagOptions.length === 0 && tagSearchQuery.trim()" class="preference-empty">
                No tags match your search "{{ tagSearchQuery }}".
              </p>
              <p v-else-if="tagOptions.length === 0" class="preference-empty">No tags available yet.</p>
            </div>
            <div v-if="selectedTagObjects.length" class="chip-list">
              <span
                v-for="tag in selectedTagObjects"
                :key="tag.id"
                class="chip"
              >{{ tag.tag_name || tag.name }}</span>
            </div>
          </section>
        </div>

        <div class="form-actions">
          <button
            type="button"
            class="btn btn-outline"
            @click="closeModal"
            :disabled="saving"
          >
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-primary"
            @click="savePreferences"
            :disabled="saving"
          >
            <span v-if="!saving">Update Preferences</span>
            <span v-else class="loading-text">
              <span class="loading-spinner"></span>
              Updating...
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  max-width: 700px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.preferences-modal .modal-content {
  max-width: 800px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-20);
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--color-text-secondary);
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
}

.modal-close:hover {
  background-color: var(--color-bg-1);
  color: var(--color-text);
}

.modal-body {
  padding: var(--space-20);
}

.loading-state {
  text-align: center;
  padding: var(--space-40) 0;
}

.loading-state p {
  color: var(--color-text-secondary);
  margin: 0;
}

.form-notice {
  margin-bottom: var(--space-24);
  padding: var(--space-16);
  background-color: rgba(var(--color-info-rgb), 0.05);
  border-radius: var(--radius-base);
  border-left: 4px solid var(--color-info);
}

.notice-text {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.5;
}

.preference-section {
  margin-bottom: var(--space-24);
  padding: var(--space-16);
  background-color: var(--color-bg-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-base);
}

.preference-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-12);
}

.preference-title {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}

.preference-count {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.preference-search {
  margin-bottom: var(--space-12);
}

.preference-search-input {
  width: 100%;
  padding: var(--space-8) var(--space-12);
  font-size: var(--font-size-sm);
  line-height: 1.5;
  color: var(--color-text);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-base);
  transition: border-color var(--duration-fast) var(--ease-standard),
    box-shadow var(--duration-fast) var(--ease-standard);
}

.preference-search-input:focus {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: var(--focus-ring);
}

.preference-search-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: var(--color-secondary);
}

.preference-search-input::placeholder {
  color: var(--color-text-secondary);
  opacity: 0.6;
}

.preference-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, 160px);
  gap: var(--space-8);
  justify-content: flex-start;
  align-items: flex-start;
}

.preference-list--scrollable {
  height: 220px;
  overflow-y: auto;
  padding-right: var(--space-4);
}

.preference-option {
  display: flex;
  align-items: center;
  gap: var(--space-8);
  padding: var(--space-8);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-base);
  background-color: var(--color-surface);
  transition: border-color var(--duration-fast) var(--ease-standard),
    box-shadow var(--duration-fast) var(--ease-standard);
  width: 160px;
  flex-shrink: 0;
  cursor: pointer;
}

.preference-option:hover {
  border-color: var(--color-primary);
  box-shadow: var(--shadow-xs);
}

.preference-option input[type="checkbox"] {
  flex-shrink: 0;
  margin: 0;
}

.preference-option span {
  font-size: var(--font-size-sm);
  color: var(--color-text);
  line-height: 1.4;
}

.preference-empty {
  grid-column: 1 / -1;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: var(--space-8) 0 0;
  text-align: center;
}

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-8);
  margin-top: var(--space-12);
}

.chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--space-12);
  height: 28px;
  border-radius: 14px;
  background-color: var(--color-bg-2);
  font-size: var(--font-size-xs);
  color: var(--color-text);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-12);
  margin-top: var(--space-24);
  padding-top: var(--space-24);
  border-top: 1px solid var(--color-border);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-8);
}

.loading-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    max-height: 95vh;
  }

  .preference-list {
    grid-template-columns: repeat(auto-fill, 140px);
  }

  .preference-option {
    width: 140px;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
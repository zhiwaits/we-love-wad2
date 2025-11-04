<template>
  <div v-if="isVisible" class="modal-backdrop" @click.self="handleClose">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Edit Your Preferences</h2>
        <button class="close-btn" @click="handleClose" aria-label="Close">×</button>
      </div>

      <div class="modal-body">
        <PreferenceSelector
          ref="preferenceSelector"
          title="What are you interested in?"
          subtitle="Select at least 3 categories or tags (maximum 10)"
          :initial-categories="localCategories"
          :initial-tags="localTags"
          @update="handlePreferenceUpdate"
        />
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="handleClose" :disabled="isSaving">
          Cancel
        </button>
        <button
          class="btn btn-primary"
          @click="handleSave"
          :disabled="!selectedPreferences.isValid || isSaving"
        >
          <span v-if="!isSaving">Save Preferences</span>
          <span v-else>
            <span class="loading-spinner"></span>
            Saving...
          </span>
        </button>
      </div>

      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
      <div v-if="successMessage" class="success-message">
        {{ successMessage }}
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch } from 'vue';
import PreferenceSelector from './PreferenceSelector.vue';
import { updateUserPreferences } from '../services/preferenceService';

export default {
  name: 'PreferenceEditorModal',
  components: {
    PreferenceSelector
  },

  props: {
    isVisible: {
      type: Boolean,
      default: false
    },
    userId: {
      type: [String, Number],
      required: true
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

  emits: ['close', 'saved'],

  setup(props, { emit }) {
    const localCategories = ref([...props.initialCategories]);
    const localTags = ref([...props.initialTags]);
    const selectedPreferences = ref({
      categories: [...props.initialCategories],
      tags: [...props.initialTags],
      isValid: false
    });
    const isSaving = ref(false);
    const errorMessage = ref('');
    const successMessage = ref('');
    const preferenceSelector = ref(null);

    watch(() => props.isVisible, (newVal) => {
      if (newVal) {
        // Reset when modal opens
        localCategories.value = [...props.initialCategories];
        localTags.value = [...props.initialTags];
        selectedPreferences.value = {
          categories: [...props.initialCategories],
          tags: [...props.initialTags],
          isValid: (props.initialCategories.length + props.initialTags.length) >= 3 &&
                   (props.initialCategories.length + props.initialTags.length) <= 10
        };
        errorMessage.value = '';
        successMessage.value = '';
      }
    });

    const handlePreferenceUpdate = (preferences) => {
      selectedPreferences.value = preferences;
    };

    const handleSave = async () => {
      if (!selectedPreferences.value.isValid) {
        errorMessage.value = 'Please select between 3 and 10 preferences';
        return;
      }

      isSaving.value = true;
      errorMessage.value = '';
      successMessage.value = '';

      try {
        await updateUserPreferences(props.userId, {
          preferred_categories: selectedPreferences.value.categories,
          preferred_tags: selectedPreferences.value.tags
        });

        successMessage.value = 'Preferences saved successfully!';
        setTimeout(() => {
          emit('saved', selectedPreferences.value);
          emit('close');
        }, 1000);
      } catch (error) {
        console.error('Failed to save preferences:', error);
        errorMessage.value = error.response?.data?.error || 'Failed to save preferences. Please try again.';
      } finally {
        isSaving.value = false;
      }
    };

    const handleClose = () => {
      if (!isSaving.value) {
        emit('close');
      }
    };

    return {
      localCategories,
      localTags,
      selectedPreferences,
      isSaving,
      errorMessage,
      successMessage,
      preferenceSelector,
      handlePreferenceUpdate,
      handleSave,
      handleClose
    };
  }
};
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #1a1a1a;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  line-height: 1;
  color: #6b7280;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.modal-body {
  padding: 2rem;
  overflow-y: auto;
  flex: 1;
}

.modal-footer {
  padding: 1.5rem 2rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);
}

.btn-secondary {
  background: #e5e7eb;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background: #d1d5db;
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

.error-message {
  padding: 1rem 2rem;
  background: #fee2e2;
  color: #991b1b;
  border-top: 1px solid #fecaca;
  font-size: 0.9rem;
}

.success-message {
  padding: 1rem 2rem;
  background: #d1fae5;
  color: #065f46;
  border-top: 1px solid #a7f3d0;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .modal-content {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }

  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 1.25rem;
  }

  .modal-footer {
    flex-direction: column;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>

<script setup>
import { computed, ref, watch } from 'vue';
import { useStore } from 'vuex';
import { updateClubProfile } from '../services/profileService';
import { getAllClubCategories } from '../services/clubCategoryService';
import { getCurrentUser } from '../services/authService';

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

const emit = defineEmits(['close', 'profile-updated']);

const store = useStore();

// Profile edit form data
const profileForm = ref({
  name: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  club_description: '',
  club_category_id: '',
  imageBase64: null,
  imageOriginalName: null
});

const clubCategories = ref([]);
const profileLoading = ref(false);
const freshUserData = ref(null);
const categoriesLoading = ref(false);
const categoriesError = ref(null);

// Computed property for image preview
const currentImageSrc = computed(() => {
  if (profileForm.value.imageBase64) {
    // New uploaded image (base64)
    return profileForm.value.imageBase64;
  }
  // Existing image from fresh user data (URL path)
  const user = freshUserData.value;
  const imagePath = user?.club_image;
  if (imagePath) {
    // Convert relative path to full URL
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    return `${baseUrl}${imagePath}`;
  }
  return null;
});

// Load club categories with error handling
const loadClubCategories = async () => {
  if (categoriesLoading.value) return; // Prevent multiple simultaneous requests

  categoriesLoading.value = true;
  categoriesError.value = null;

  try {
    console.log('Loading club categories...');
    const response = await getAllClubCategories();
    const categories = response.data || [];

    // Validate the response structure
    if (Array.isArray(categories) && categories.every(cat => cat.id && cat.name)) {
      clubCategories.value = categories;
      console.log('Successfully loaded club categories:', categories.length, 'categories');
    } else {
      throw new Error('Invalid categories data structure');
    }
  } catch (error) {
    console.error('Failed to load club categories:', error);
    categoriesError.value = error.message || 'Failed to load categories';
    store.dispatch('showToast', {
      message: 'Failed to load club categories. Please try again.',
      type: 'error'
    });
  } finally {
    categoriesLoading.value = false;
  }
};

// Load user profile data when modal opens (categories should already be loaded)
const loadUserData = async () => {
  console.log('loadUserData called, visible:', props.visible);
  if (!props.visible) return;

  try {
    // Use the currentUser prop data instead of making an API call
    const userData = props.currentUser;
    console.log('Using currentUser prop data:', userData);
    console.log('userData.club_category_id:', userData.club_category_id);
    console.log('userData.club_image:', userData.club_image);
    console.log('userData.club_description:', userData.club_description);

    freshUserData.value = userData;

    // Find the category name for debugging
    const userCategoryId = userData.club_category_id || userData.club_category;
    console.log('User category ID:', userCategoryId);
    const userCategory = clubCategories.value.find(cat => cat.id == userCategoryId);
    console.log('User category object:', userCategory);

    // Load current profile data with user data from props
    console.log('User club_category_id:', userData?.club_category_id);
    console.log('User club_image:', userData?.club_image);

    profileForm.value = {
      name: userData?.name || '',
      username: userData?.username || '',
      email: userData?.email || '',
      password: '',
      confirmPassword: '',
      club_description: userData?.club_description || '',
      club_category_id: String(userData?.club_category_id || userData?.club_category || ''),
      imageBase64: null, // Don't set this from existing data - it's for new uploads only
      imageOriginalName: null
    };

    console.log('Profile form after setting:', profileForm.value);
  } catch (error) {
    console.error('Failed to load profile data:', error);
    store.dispatch('showToast', { message: 'Failed to load profile data', type: 'error' });
  }
};

// Watch for modal visibility to load data
watch(() => props.visible, async (newVisible) => {
  console.log('Modal visibility changed:', newVisible);
  if (newVisible) {
    // Always refresh categories when modal opens to ensure latest data
    await loadClubCategories();
    // Now load the rest of the data (which will use the fresh categories)
    await loadUserData();
  }
});

// Watch for currentUser prop changes to update form
watch(() => props.currentUser, (newUser) => {
  if (newUser && props.visible) {
    console.log('Current user prop changed:', newUser);
    freshUserData.value = newUser;
    profileForm.value = {
      name: newUser?.name || '',
      username: newUser?.username || '',
      email: newUser?.email || '',
      password: '',
      confirmPassword: '',
      club_description: newUser?.club_description || '',
      club_category_id: String(newUser?.club_category_id || newUser?.club_category || ''),
      imageBase64: null, // Don't set this from existing data - it's for new uploads only
      imageOriginalName: null
    };
  }
}, { deep: true });

// Computed property to check if categories are available
const hasCategories = computed(() => clubCategories.value.length > 0);

// Computed property for category loading state
const isCategoriesLoading = computed(() => categoriesLoading.value);

// Method to refresh categories (can be called externally if needed)
const refreshCategories = async () => {
  await loadClubCategories();
};

const handleImageUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    profileForm.value.imageBase64 = e.target.result;
    profileForm.value.imageOriginalName = file.name;
  };
  reader.readAsDataURL(file);
};

const validateForm = () => {
  if (profileForm.value.password && profileForm.value.password !== profileForm.value.confirmPassword) {
    store.dispatch('showToast', { message: 'Passwords do not match', type: 'error' });
    return false;
  }
  if (!profileForm.value.name || !profileForm.value.username || !profileForm.value.email) {
    store.dispatch('showToast', { message: 'Name, username and email are required', type: 'error' });
    return false;
  }
  return true;
};

const submitProfileUpdate = async () => {
  if (!validateForm()) return;

  profileLoading.value = true;
  try {
    const updateData = {
      name: profileForm.value.name,
      username: profileForm.value.username,
      email: profileForm.value.email,
      club_description: profileForm.value.club_description,
      club_category_id: profileForm.value.club_category_id
    };

    // Only include password if it's provided
    if (profileForm.value.password) {
      updateData.password = profileForm.value.password;
    }

    // Include image data if uploaded
    if (profileForm.value.imageBase64) {
      updateData.imageBase64 = profileForm.value.imageBase64;
      updateData.imageOriginalName = profileForm.value.imageOriginalName;
    }

    await updateClubProfile(props.currentUser.id, updateData);

    // Update the store with new data
    await store.dispatch('auth/checkAuth');

    store.dispatch('showToast', { message: 'Profile updated successfully!', type: 'success' });
    emit('profile-updated');
    emit('close');
  } catch (error) {
    console.error('Failed to update profile:', error);
    store.dispatch('showToast', { message: 'Failed to update profile', type: 'error' });
  } finally {
    profileLoading.value = false;
  }
};

const closeModal = () => {
  emit('close');
};

// Expose methods for parent components
defineExpose({
  refreshCategories,
  loadUserData
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
        <div class="modal-container">
          <div class="modal-header">
            <h2 class="modal-title">Edit Club Profile</h2>
            <button type="button" class="modal-close" @click="$emit('close')" aria-label="Close">
              ×
            </button>
          </div>

          <div class="modal-body">
            <form @submit.prevent="submitProfileUpdate" class="profile-edit-form">
              <!-- Basic Information Section -->
              <div class="form-section">
                <h3 class="form-section-title">Basic Information</h3>
                <div class="form-grid">
                  <div class="form-group">
                    <label for="name" class="form-label">Club Name</label>
                    <input
                      id="name"
                      v-model="profileForm.name"
                      type="text"
                      class="form-input"
                      required
                    />
                  </div>

                  <div class="form-group">
                    <label for="username" class="form-label">Username</label>
                    <input
                      id="username"
                      v-model="profileForm.username"
                      type="text"
                      class="form-input"
                      required
                    />
                  </div>

                  <div class="form-group form-group--full">
                    <label for="email" class="form-label">Email Address</label>
                    <input
                      id="email"
                      v-model="profileForm.email"
                      type="email"
                      class="form-input"
                      required
                    />
                  </div>
                </div>
              </div>

              <!-- Security Section -->
              <div class="form-section">
                <h3 class="form-section-title">Change Password</h3>
                <p class="form-section-desc">Leave blank to keep your current password</p>
                <div class="form-grid">
                  <div class="form-group">
                    <label for="password" class="form-label">New Password</label>
                    <input
                      id="password"
                      v-model="profileForm.password"
                      type="password"
                      class="form-input"
                    />
                  </div>

                  <div class="form-group">
                    <label for="confirmPassword" class="form-label">Confirm New Password</label>
                    <input
                      id="confirmPassword"
                      v-model="profileForm.confirmPassword"
                      type="password"
                      class="form-input"
                    />
                  </div>
                </div>
              </div>

              <!-- Club Details Section -->
              <div class="form-section">
                <h3 class="form-section-title">Club Details</h3>
                <div class="form-grid">
                  <div class="form-group form-group--full">
                    <label for="club_description" class="form-label">Club Description</label>
                    <textarea
                      id="club_description"
                      v-model="profileForm.club_description"
                      class="form-textarea"
                      rows="4"
                      placeholder="Tell people about your club..."
                      required
                    ></textarea>
                  </div>

                  <div class="form-group">
                    <label for="club_category_id" class="form-label">Club Category</label>
                    <select
                      id="club_category_id"
                      v-model="profileForm.club_category_id"
                      class="form-select"
                      :disabled="isCategoriesLoading"
                      required
                    >
                      <option value="">
                        {{ isCategoriesLoading ? 'Loading categories...' : 'Select a category' }}
                      </option>
                      <option
                        v-for="category in clubCategories"
                        :key="category.id"
                        :value="String(category.id)"
                      >
                        {{ category.name }}
                      </option>
                    </select>
                    <small v-if="categoriesError" class="form-error">
                      Error loading categories: {{ categoriesError }}
                      <button type="button" @click="refreshCategories" class="retry-btn">Retry</button>
                    </small>
                  </div>

                  <div class="form-group">
                    <label for="image" class="form-label">Club Image</label>
                    <!-- Current Image Preview -->
                    <div v-if="currentImageSrc" class="image-preview">
                      <img :src="currentImageSrc" alt="Current club image" class="preview-image" />
                      <p class="preview-label">Current Image</p>
                    </div>
                    <input
                      id="image"
                      type="file"
                      accept="image/*"
                      class="form-input"
                      @change="handleImageUpload"
                    />
                    <small class="form-help">Upload a new image to replace the current one. Recommended: 1200x400px</small>
                  </div>
                </div>
              </div>
            </form>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-outline" @click="$emit('close')">
              Cancel
            </button>
            <button type="button" class="btn btn-primary" @click="submitProfileUpdate" :disabled="profileLoading">
              {{ profileLoading ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Modal overlay and container */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: var(--space-20);
  backdrop-filter: blur(2px);
}

.modal-container {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-xl);
}

/* Modal header */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-24) var(--space-28);
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-surface);
}

.modal-title {
  margin: 0;
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
}

.modal-close {
  background: transparent;
  border: none;
  font-size: 32px;
  line-height: 1;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  transition: all var(--duration-fast);
}

.modal-close:hover {
  background-color: var(--color-bg-1);
  color: var(--color-text);
}

/* Modal body */
.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-28);
  background-color: var(--color-background);
}

/* Profile Edit Form */
.profile-edit-form {
  background-color: transparent;
  border-radius: 0;
  border: none;
  padding: 0;
}

.form-section {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-24);
  margin-bottom: var(--space-24);
}

.form-section:last-child {
  margin-bottom: 0;
}

.form-section-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
  margin: 0 0 var(--space-8) 0;
}

.form-section-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-20) 0;
  line-height: 1.5;
}

/* Form grid */
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-20);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.form-group--full {
  grid-column: 1 / -1;
}

.form-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}

/* Form inputs */
.form-input,
.form-select,
.form-textarea {
  padding: var(--space-12) var(--space-16);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-2);
  color: var(--color-text);
  font-size: var(--font-size-base);
  font-family: inherit;
  transition: all var(--duration-fast);
}

.form-input:hover,
.form-select:hover,
.form-textarea:hover {
  border-color: var(--color-primary);
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  background-color: var(--color-surface);
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb, 33, 128, 141), 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
  line-height: 1.5;
}

.form-help {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-top: var(--space-4);
  line-height: 1.4;
}

/* Preferences panel styling */
.preferences-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-24);
  margin-bottom: var(--space-24);
}

.preferences-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-12);
}

.preferences-title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
}

.preferences-desc {
  margin: 0 0 var(--space-20) 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

.preferences-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-20);
  background: transparent;
}

.preferences-group {
  background: var(--color-bg-1);
  padding: var(--space-16);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.group-label {
  color: var(--color-text);
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-12);
  display: block;
}

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-8);
}

/* Chip styling matching site design */
:deep(.category-chip),
:deep(.tag-chip),
:deep(.preferences-chip) {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: var(--space-6);
  padding: 8px 14px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background: var(--color-bg-2);
  color: var(--color-text);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  user-select: none;
  transition: all var(--duration-fast);
}

:deep(.category-chip input[type="checkbox"]),
:deep(.tag-chip input[type="checkbox"]),
:deep(.preferences-chip input[type="checkbox"]) {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}

:deep(.category-chip:hover),
:deep(.tag-chip:hover),
:deep(.preferences-chip:hover) {
  color: var(--color-primary);
  border-color: var(--color-primary);
  background-color: rgba(var(--color-primary-rgb, 33, 128, 141), 0.12);
  transform: translateY(-1px);
}

:deep(.category-chip:has(> input:checked)),
:deep(.tag-chip:has(> input:checked)),
:deep(.preferences-chip:has(> input:checked)) {
  color: var(--color-white);
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  font-weight: var(--font-weight-semibold);
  box-shadow: 0 2px 8px rgba(var(--color-primary-rgb, 33, 128, 141), 0.3);
}

/* Modal footer */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-12);
  padding: var(--space-20) var(--space-28);
  border-top: 1px solid var(--color-border);
  background-color: var(--color-surface);
}

/* Dark mode adjustments */
@media (prefers-color-scheme: dark) {
  .modal-overlay {
    background-color: rgba(0, 0, 0, 0.75);
  }

  .modal-container {
    border-color: rgba(255, 255, 255, 0.1);
  }

  .form-section,
  .preferences-panel {
    background-color: var(--color-surface);
    border-color: var(--color-border);
  }

  .preferences-group {
    background: color-mix(in srgb, var(--color-surface) 80%, transparent);
    border-color: rgba(255, 255, 255, 0.08);
  }

  :deep(.category-chip),
  :deep(.tag-chip),
  :deep(.preferences-chip) {
    background: color-mix(in srgb, var(--color-surface) 90%, transparent);
    border-color: rgba(255, 255, 255, 0.16);
  }

  :deep(.category-chip:hover),
  :deep(.tag-chip:hover),
  :deep(.preferences-chip:hover) {
    background-color: rgba(var(--color-primary-rgb, 33, 128, 141), 0.20);
  }

  :deep(.category-chip:has(> input:checked)),
  :deep(.tag-chip:has(> input:checked)),
  :deep(.preferences-chip:has(> input:checked)) {
    background-color: var(--color-primary);
    color: var(--color-white);
  }
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity var(--duration-normal);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform var(--duration-normal), opacity var(--duration-normal);
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95);
  opacity: 0;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .modal-container {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }

  .modal-header,
  .modal-body,
  .modal-footer {
    padding-left: var(--space-20);
    padding-right: var(--space-20);
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .preferences-grid {
    grid-template-columns: 1fr;
  }
}
</style>
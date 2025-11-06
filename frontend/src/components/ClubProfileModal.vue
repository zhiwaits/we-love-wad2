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
    // Fetch fresh user data from backend (this should include all profile fields)
    const userResponse = await getCurrentUser();
    console.log('Raw userResponse:', userResponse);
    console.log('userResponse.data:', userResponse.data);
    const userData = userResponse.data.user || userResponse.data;
    console.log('userData:', userData);
    console.log('userData.club_category_id:', userData.club_category_id);
    console.log('userData.club_image:', userData.club_image);
    console.log('userData.club_description:', userData.club_description);

    freshUserData.value = userData;

    // Find the category name for debugging
    const userCategoryId = userData.club_category_id || userData.club_category;
    console.log('User category ID:', userCategoryId);
    const userCategory = clubCategories.value.find(cat => cat.id == userCategoryId);
    console.log('User category object:', userCategory);

    // Load current profile data with fresh user data
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
  <div v-if="visible" class="modal-overlay" @click="closeModal">
    <div class="modal-content profile-modal" @click.stop>
      <div class="modal-header">
        <h3>Edit Club Profile</h3>
        <button class="modal-close" @click="closeModal">&times;</button>
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

          <!-- Form Actions -->
          <div class="form-actions">
            <button
              type="button"
              class="btn btn-outline"
              @click="closeModal"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn-primary"
              :disabled="profileLoading"
            >
              {{ profileLoading ? 'Updating...' : 'Update Profile' }}
            </button>
          </div>
        </form>
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
  max-width: 800px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.profile-modal .modal-content {
  max-width: 900px;
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

/* Profile Edit Form */
.profile-edit-form {
  background-color: transparent;
  border-radius: 0;
  border: none;
  padding: 0;
}

.form-section {
  margin-bottom: var(--space-32);
  padding-bottom: var(--space-32);
  border-bottom: 1px solid var(--color-border);
}

.form-section:last-of-type {
  border-bottom: none;
  margin-bottom: var(--space-24);
  padding-bottom: 0;
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
  margin: 0 0 var(--space-16) 0;
}

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

.form-input,
.form-select,
.form-textarea {
  padding: var(--space-12) var(--space-16);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-background);
  color: var(--color-text);
  font-size: var(--font-size-base);
  transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
}

.form-input::placeholder,
.form-select::placeholder,
.form-textarea::placeholder {
  color: var(--color-text-secondary);
}

@media (prefers-color-scheme: dark) {
  .form-input::placeholder,
  .form-select::placeholder,
  .form-textarea::placeholder {
    color: #9ca3af;
  }
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb, 33, 128, 141), 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.form-textarea::placeholder {
  color: var(--color-text-secondary);
  opacity: 0.7;
}

@media (prefers-color-scheme: dark) {
  .form-textarea::placeholder {
    color: #9ca3af;
  }
}

.form-help {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin-top: var(--space-4);
}

.form-error {
  font-size: var(--font-size-xs);
  color: var(--color-error, #e74c3c);
  margin-top: var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-8);
}

.retry-btn {
  background: none;
  border: 1px solid var(--color-error, #e74c3c);
  color: var(--color-error, #e74c3c);
  padding: var(--space-4) var(--space-8);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-btn:hover {
  background-color: var(--color-error, #e74c3c);
  color: white;
}

.image-preview {
  margin-bottom: var(--space-12);
  text-align: center;
}

.preview-image {
  max-width: 200px;
  max-height: 150px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  object-fit: cover;
}

.preview-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: var(--space-8) 0 0 0;
  font-weight: var(--font-weight-medium);
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

@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    max-height: 95vh;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-section {
    margin-bottom: var(--space-24);
    padding-bottom: var(--space-24);
  }

  .form-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
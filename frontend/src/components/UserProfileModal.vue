<script setup>
import { ref, watch } from 'vue';
import { useStore } from 'vuex';
import { updateUserProfile } from '../services/profileService';
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
  confirmPassword: ''
});

const profileLoading = ref(false);

// Load user profile data when modal opens
const loadUserData = async () => {
  console.log('loadUserData called, visible:', props.visible);
  if (!props.visible) return;

  try {
    // Fetch fresh user data from backend
    const userResponse = await getCurrentUser();
    console.log('Raw userResponse:', userResponse);
    console.log('userResponse.data:', userResponse.data);
    const userData = userResponse.data.user || userResponse.data;
    console.log('userData:', userData);

    // Load current profile data with fresh user data
    profileForm.value = {
      name: userData?.name || '',
      username: userData?.username || '',
      email: userData?.email || '',
      password: '',
      confirmPassword: ''
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
    await loadUserData();
  }
});

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
      email: profileForm.value.email
    };

    // Only include password if it's provided
    if (profileForm.value.password) {
      updateData.password = profileForm.value.password;
    }

    await updateUserProfile(props.currentUser.id, updateData);

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
  loadUserData
});
</script>

<template>
  <div v-if="visible" class="modal-overlay" @click="closeModal">
    <div class="modal-content profile-modal" @click.stop>
      <div class="modal-header">
        <h3>Edit Profile</h3>
        <button class="modal-close" @click="closeModal">&times;</button>
      </div>

      <div class="modal-body">
        <form @submit.prevent="submitProfileUpdate" class="profile-edit-form">
          <!-- Basic Information Section -->
          <div class="form-section">
            <h3 class="form-section-title">Basic Information</h3>
            <div class="form-grid">
              <div class="form-group">
                <label for="name" class="form-label">Full Name</label>
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
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.profile-modal .modal-content {
  max-width: 700px;
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
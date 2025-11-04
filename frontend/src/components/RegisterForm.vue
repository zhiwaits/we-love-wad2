<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { getAllClubCategories } from '../services/clubCategoryService';
import { checkAvailability } from '../services/authService';
import { getAllEventCategories } from '../services/eventCategoryService';
import { getAllTags } from '../services/tagService';

const store = useStore();
const router = useRouter();

// Form data
const name = ref('');
const username = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const role = ref('user');
const clubDescription = ref('');
const clubCategoryId = ref('');
const categories = ref([]);
const imageFile = ref(null);
const imagePreview = ref('');
const currentStep = ref(1);
const primaryButtonClass = 'btn btn--primary btn--full-width';
const outlineButtonClass = `${primaryButtonClass} btn--outline`;

// Preference selection (step 3 for users)
const selectedEventCategories = ref([]);
const selectedClubCategoryPreferences = ref([]);
const selectedTagIds = ref([]);

// Data for preferences
const eventCategories = ref([]);
const availableTags = ref([]);

// Constants for preferences
const MAX_EVENT_CATEGORY_PREFS = 3;
const MAX_CLUB_CATEGORY_PREFS = 3;
const MAX_TAG_PREFS = 10;

// Search for tags
const tagSearchQuery = ref('');

// Local error state
const localError = ref('');
const isCheckingAvailability = ref(false);
const availabilityChecked = ref(false);

// Loading and error from store
const isLoading = computed(() => store.getters['auth/isLoading']);
const authError = computed(() => store.getters['auth/authError']);
const isClub = computed(() => role.value === 'club');
const isProcessing = computed(() => isLoading.value || isCheckingAvailability.value);

// Combined error message
const errorMessage = computed(() => localError.value || authError.value);

// Emit event to parent to switch to login
const emit = defineEmits(['switch-to-login']);


const passwordsMatch = computed(() => {
  if (!confirmPassword.value) return true; 
  return password.value === confirmPassword.value;
});

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateStepOne() {
  if (!name.value.trim()) return 'Name is required';
  if (!username.value.trim()) return 'Username is required';
  if (!email.value.trim()) return 'Email is required';
  if (!emailRegex.test(email.value.trim())) return 'Please enter a valid email address';
  if (!password.value.trim()) return 'Password is required';
  if (!confirmPassword.value.trim()) return 'Please confirm your password';
  if (!passwordsMatch.value) return 'Passwords do not match';
  if (!role.value) return 'Please select a role';
  return '';
}

function validateStepTwo() {
  if (role.value !== 'club') return '';
  if (!clubDescription.value.trim()) return 'Club description is required';
  if (!clubCategoryId.value) return 'Club category is required';
  return '';
}

const stepOneError = computed(() => validateStepOne());
const stepTwoError = computed(() => validateStepTwo());

const isFormValid = computed(() => !stepOneError.value && !stepTwoError.value);

// Computed properties for preferences
const eventCategoryLimitReached = computed(() => selectedEventCategories.value.length >= MAX_EVENT_CATEGORY_PREFS);
const clubCategoryLimitReached = computed(() => selectedClubCategoryPreferences.value.length >= MAX_CLUB_CATEGORY_PREFS);
const tagLimitReached = computed(() => selectedTagIds.value.length >= MAX_TAG_PREFS);

const selectedTagObjects = computed(() => availableTags.value.filter(tag => selectedTagIds.value.includes(tag.id)));
const selectedClubCategoryObjects = computed(() => {
  if (!Array.isArray(categories.value)) return [];
  return categories.value.filter((cat) => {
    const numeric = Number(cat?.id);
    return Number.isFinite(numeric) && selectedClubCategoryPreferences.value.includes(numeric);
  });
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

watch(role, (newRole, oldRole) => {
  if (newRole === oldRole) return;
  currentStep.value = 1;
  availabilityChecked.value = false;
  localError.value = '';
  if (newRole !== 'club') {
    clubDescription.value = '';
    clubCategoryId.value = '';
    imageFile.value = null;
    imagePreview.value = '';
  }
});

watch([email, username], () => {
  availabilityChecked.value = false;
  localError.value = '';
});

watch(currentStep, (newStep, oldStep) => {
  if (newStep === oldStep) return;
  localError.value = '';
  store.dispatch('auth/clearError');
});
onMounted(async () => {
  try {
    const [clubRes, eventRes, tagRes] = await Promise.all([
      getAllClubCategories(),
      getAllEventCategories(),
      getAllTags()
    ]);

    categories.value = Array.isArray(clubRes?.data) ? clubRes.data : [];
    eventCategories.value = Array.isArray(eventRes?.data) ? eventRes.data : [];
    availableTags.value = Array.isArray(tagRes?.data) ? tagRes.data : [];
  } catch (e) {
    categories.value = [];
    eventCategories.value = [];
    availableTags.value = [];
    console.error('Failed to load categories and tags:', e);
  }
});

const onImageChange = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  imageFile.value = file;
  const reader = new FileReader();
  reader.onload = () => {
    imagePreview.value = reader.result;
  };
  reader.readAsDataURL(file);
};

// Preference handling methods
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


const handleRegister = async () => {
  localError.value = '';
  store.dispatch('auth/clearError');

  // For step 2 (club details or user preferences), validate and submit
  if (currentStep.value === 2) {
    if (isClub.value) {
      const stepTwoValidationError = stepTwoError.value;
      if (stepTwoValidationError) {
        localError.value = stepTwoValidationError;
        return;
      }
    }

    // Final availability check before submission
    const ensureAvailability = async () => {
      if (availabilityChecked.value) return true;
      isCheckingAvailability.value = true;
      try {
        const data = await checkAvailability({
          email: email.value.trim(),
          username: username.value.trim(),
        });

        if (data.emailTaken) {
          localError.value = 'Email is already registered';
          return false;
        }

        if (data.usernameTaken) {
          localError.value = 'Username is already taken';
          return false;
        }

        availabilityChecked.value = true;
        return true;
      } catch (error) {
        localError.value = error.message || 'Unable to verify email and username';
        return false;
      } finally {
        isCheckingAvailability.value = false;
      }
    };

    const availabilityOk = await ensureAvailability();
    if (!availabilityOk) {
      return;
    }

    try {
      const registrationData = {
        name: name.value.trim(),
        username: username.value.trim(),
        email: email.value.trim(),
        password: password.value,
        role: role.value,
        clubDetails: {
          club_description: clubDescription.value.trim(),
          club_category_id: clubCategoryId.value || null,
          imageBase64: imagePreview.value || null,
          imageOriginalName: imageFile.value?.name || null,
        },
        preferences: {
          categoryPreferences: selectedEventCategories.value,
          clubCategoryPreferences: selectedClubCategoryPreferences.value,
          tagPreferences: selectedTagIds.value,
        },
      };

      await store.dispatch('auth/register', registrationData);

      router.push('/');
    } catch (error) {
      console.error('Registration failed:', error);
    }
  }
};

const goToPreviousStep = () => {
  localError.value = '';
  store.dispatch('auth/clearError');
  currentStep.value = 1;
};


const handleKeyPress = (event) => {
  if (event.key !== 'Enter' || isProcessing.value) return;
  event.preventDefault();
  handleRegister();
};

const nextStep = async () => {
  localError.value = '';
  store.dispatch('auth/clearError');

  if (!name.value.trim()) {
    localError.value = 'Name is required';
    return;
  }

  const ensureAvailability = async () => {
    if (availabilityChecked.value) return true;
    isCheckingAvailability.value = true;
    try {
      const data = await checkAvailability({
        email: email.value.trim(),
        username: username.value.trim(),
      });

      if (data.emailTaken) {
        localError.value = 'Email is already registered';
        return false;
      }

      if (data.usernameTaken) {
        localError.value = 'Username is already taken';
        return false;
      }

      availabilityChecked.value = true;
      return true;
    } catch (error) {
      localError.value = error.message || 'Unable to verify email and username';
      return false;
    } finally {
      isCheckingAvailability.value = false;
    }
  };

  const stepOneValidationError = stepOneError.value;
  if (stepOneValidationError) {
    localError.value = stepOneValidationError;
    return;
  }

  const availabilityOk = await ensureAvailability();
  if (!availabilityOk) {
    return;
  }

  // Advance to next step
  if (isClub.value) {
    currentStep.value = 2; // Club details step
  } else {
    currentStep.value = 2; // User preferences step
  }
};

const skipPreferences = async () => {
  localError.value = '';
  store.dispatch('auth/clearError');

  try {
    const registrationData = {
      name: name.value.trim(),
      username: username.value.trim(),
      email: email.value.trim(),
      password: password.value,
      role: role.value,
      clubDetails: {
        club_description: clubDescription.value.trim(),
        club_category_id: clubCategoryId.value || null,
        imageBase64: imagePreview.value || null,
        imageOriginalName: imageFile.value?.name || null,
      },
      preferences: {
        categoryPreferences: [],
        clubCategoryPreferences: [],
        tagPreferences: [],
      },
    };

    await store.dispatch('auth/register', registrationData);

    router.push('/');
  } catch (error) {
    console.error('Registration failed:', error);
  }
};
</script>

<template>
  <div class="register-form">
    <div class="form-header">
      <h2 class="form-title">Create Account</h2>
      <p class="form-subtitle">Join SMU Events Hub to discover amazing campus events</p>
    </div>

    <!-- Error Message -->
    <div v-if="errorMessage" class="error-banner">
      <span class="error-icon">⚠️</span>
      <span class="error-text">{{ errorMessage }}</span>
    </div>

    <form @submit.prevent="handleRegister" class="form">

      <div v-if="currentStep === 1">
        <!-- Role Selection -->
        <div class="form-group">
          <label class="form-label">I am a...</label>
          <div class="role-selector">
            <label class="role-option" :class="{ 'role-option--active': role === 'user' }">
              <input
                type="radio"
                name="role"
                value="user"
                v-model="role"
                :disabled="isProcessing"
              />
              <div class="role-content">
                <span class="role-icon">👤</span>
                <div class="role-text">
                  <span class="role-title">Student</span>
                  <span class="role-description">Browse and RSVP to events</span>
                </div>
              </div>
            </label>

            <label class="role-option" :class="{ 'role-option--active': role === 'club' }">
              <input
                type="radio"
                name="role"
                value="club"
                v-model="role"
                :disabled="isProcessing"
              />
              <div class="role-content">
                <span class="role-icon">🎭</span>
                <div class="role-text">
                  <span class="role-title">Club / Organization</span>
                  <span class="role-description">Create and manage events</span>
                </div>
              </div>
            </label>
          </div>
        </div>

        <!-- Name Input -->
        <div class="form-group">
          <label for="name" class="form-label">
            {{ role === 'club' ? 'Club / Organization Name' : 'Full Name' }}
          </label>
          <input
            id="name"
            v-model="name"
            type="text"
            class="form-control"
            :placeholder="role === 'club' ? 'SMU Dance Club' : 'John Doe'"
            :disabled="isProcessing"
            @keypress="handleKeyPress"
          />
        </div>

        <!-- Username Input -->
        <div class="form-group">
          <label for="username" class="form-label">Username</label>
          <input
            id="username"
            v-model="username"
            type="text"
            class="form-control"
            placeholder="Choose a unique username"
            :disabled="isProcessing"
            @keypress="handleKeyPress"
            autocomplete="username"
          />
        </div>

        <!-- Email Input -->
        <div class="form-group">
          <label for="email" class="form-label">Email Address</label>
          <input
            id="email"
            v-model="email"
            type="email"
            class="form-control"
            placeholder="your.email@smu.edu.sg"
            :disabled="isProcessing"
            @keypress="handleKeyPress"
          />
        </div>

        <!-- Password Input -->
        <div class="form-group">
          <label for="password" class="form-label">Password</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="form-control"
            placeholder="Enter a password"
            :disabled="isProcessing"
            @keypress="handleKeyPress"
          />
        </div>

        <!-- Confirm Password Input -->
        <div class="form-group">
          <label for="confirmPassword" class="form-label">Confirm Password</label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            class="form-control"
            :class="{ 'form-control--error': !passwordsMatch && confirmPassword.length > 0 }"
            placeholder="Re-enter your password"
            :disabled="isProcessing"
            @keypress="handleKeyPress"
          />
          <p v-if="!passwordsMatch && confirmPassword.length > 0" class="field-error">
            Passwords do not match
          </p>
        </div>
      </div>

      <div v-if="isClub && currentStep === 2">
        <div class="form-notice" style="margin-bottom: 16px;">
          <p class="notice-text">Tell us more about your club to help students discover your events.</p>
        </div>

        <div class="form-group">
          <label class="form-label" for="clubdesc">Club Description</label>
          <textarea id="clubdesc" class="form-control" rows="3" v-model="clubDescription" placeholder="Describe your club"></textarea>
        </div>

        <div class="form-group">
          <label class="form-label" for="clubcat">Club Category</label>
          <select id="clubcat" class="form-control" v-model="clubCategoryId">
            <option value="" disabled>Select category</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="clubimg">Club Image</label>
          <input id="clubimg" type="file" accept="image/*" class="form-control" @change="onImageChange" :disabled="isProcessing" />
          <div v-if="imagePreview" style="margin-top:8px;">
            <img :src="imagePreview" alt="Preview" style="max-width: 200px; border-radius: 8px;" />
          </div>
        </div>
      </div>

      <!-- User Preferences Step (Step 2 for users) -->
      <div v-if="!isClub && currentStep === 2">

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
              :disabled="isProcessing"
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
        <!-- Club Step 2: Back and Submit -->
        <template v-if="isClub && currentStep === 2">
          <button
            type="button"
            :class="outlineButtonClass"
            @click="goToPreviousStep"
            :disabled="isProcessing"
          >
            Back to Account Setup
          </button>
          <button
            type="button"
            :class="primaryButtonClass"
            :disabled="!isFormValid || isProcessing"
            @click="handleRegister"
          >
            <span v-if="!isLoading">Create Club Account</span>
            <span v-else class="loading-text">
              <span class="loading-spinner"></span>
              Creating account...
            </span>
          </button>
        </template>

        <!-- User Step 2 (Preferences): Back, Skip, and Continue/Submit -->
        <template v-else-if="!isClub && currentStep === 2">
          <button
            type="button"
            :class="outlineButtonClass"
            @click="goToPreviousStep"
            :disabled="isProcessing"
          >
            Back to Account Setup
          </button>
          <button
            type="button"
            :class="outlineButtonClass"
            @click="skipPreferences"
            :disabled="isProcessing"
          >
            Skip & Create Account
          </button>
          <button
            type="button"
            :class="primaryButtonClass"
            :disabled="isProcessing"
            @click="handleRegister"
          >
            <span v-if="!isLoading">Create Student Account</span>
            <span v-else class="loading-text">
              <span class="loading-spinner"></span>
              Creating account...
            </span>
          </button>
        </template>

        <!-- Step 1: Next button for both club and user -->
        <template v-else>
          <button
            type="button"
            :class="primaryButtonClass"
            :disabled="!!stepOneError || isProcessing"
            @click="nextStep"
          >
            Next
          </button>
        </template>
      </div>
    </form>

    <!-- Switch to Login -->
    <div class="form-switch">
      <p class="switch-text">
        Already have an account?
        <button 
          type="button" 
          class="switch-link" 
          @click="emit('switch-to-login')"
          :disabled="isProcessing"
        >
          Sign In
        </button>
      </p>
    </div>
  </div>
</template>

<style scoped>
.register-form {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
}

.form-header {
  text-align: center;
  margin-bottom: var(--space-32);
}

.form-title {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
  margin: 0 0 var(--space-8) 0;
}

.form-subtitle {
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  margin: 0;
  line-height: var(--line-height-normal);
}

/* Error Banner */
.error-banner {
  display: flex;
  align-items: center;
  gap: var(--space-12);
  padding: var(--space-12) var(--space-16);
  background-color: rgba(var(--color-error-rgb), 0.1);
  border: 1px solid rgba(var(--color-error-rgb), 0.3);
  border-radius: var(--radius-base);
  margin-bottom: var(--space-24);
  animation: slideDown 0.3s ease;
}

.error-icon {
  font-size: var(--font-size-lg);
  flex-shrink: 0;
}

.error-text {
  font-size: var(--font-size-sm);
  color: var(--color-error);
  font-weight: var(--font-weight-medium);
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

/* Form */
.form {
  margin-bottom: var(--space-24);
}

.form-group {
  margin-bottom: var(--space-20);
}

.form-label {
  display: block;
  margin-bottom: var(--space-8);
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-sm);
  color: var(--color-text);
}

.form-control {
  display: block;
  width: 100%;
  padding: var(--space-12) var(--space-16);
  font-size: var(--font-size-base);
  line-height: 1.5;
  color: var(--color-text);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-base);
  transition: border-color var(--duration-fast) var(--ease-standard),
  box-shadow var(--duration-fast) var(--ease-standard);
}

.form-control:focus {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: var(--focus-ring);
}

.form-control:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: var(--color-secondary);
}

.form-control::placeholder {
  color: var(--color-text-secondary);
  opacity: 0.6;
}

.form-control--error {
  border-color: var(--color-error);
}

.form-control--error:focus {
  border-color: var(--color-error);
  box-shadow: 0 0 0 3px rgba(var(--color-error-rgb), 0.2);
}

.field-error {
  margin: var(--space-6) 0 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-error);
  font-weight: var(--font-weight-medium);
}

/* Role Selector */
.role-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-12);
}

.role-option {
  position: relative;
  cursor: pointer;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-base);
  padding: var(--space-16);
  background-color: var(--color-surface);
  transition: all var(--duration-fast) var(--ease-standard);
}

.role-option:hover {
  border-color: var(--color-primary);
  background-color: rgba(var(--color-primary-rgb, var(--color-teal-500-rgb)), 0.05);
}

.role-option--active {
  border-color: var(--color-primary);
  background-color: rgba(var(--color-primary-rgb, var(--color-teal-500-rgb)), 0.1);
  box-shadow: var(--focus-ring);
}

.role-option input[type="radio"] {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.role-content {
  display: flex;
  align-items: center;
  gap: var(--space-12);
}

.role-icon {
  font-size: var(--font-size-3xl);
  flex-shrink: 0;
}

.role-text {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.role-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
  line-height: 1.2;
}

.role-description {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  line-height: 1.3;
}

/* Form Notice */
.form-notice {
  margin-bottom: var(--space-20);
  padding: var(--space-12);
  background-color: rgba(var(--color-info-rgb), 0.05);
  border-radius: var(--radius-base);
}

.notice-text {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.5;
}

.notice-link {
  color: var(--color-primary);
  text-decoration: none;
  font-weight: var(--font-weight-medium);
}

.notice-link:hover {
  text-decoration: underline;
}

/* Loading State */
.loading-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-8);
}

.form-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-12);
}

.form-actions .btn--primary {
  border: 1px solid var(--color-primary);
  box-shadow: var(--shadow-sm);
  transition: transform var(--duration-fast) var(--ease-standard),
    box-shadow var(--duration-fast) var(--ease-standard),
    background var(--duration-fast) var(--ease-standard);
}

.form-actions .btn--primary:disabled {
  border-color: var(--color-border);
  box-shadow: none;
}

.form-actions .btn--primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn--outline {
  background-color: transparent;
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
}

.btn--outline:hover:not(:disabled) {
  background-color: rgba(var(--color-primary-rgb, var(--color-teal-500-rgb)), 0.08);
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

/* Switch to Login */
.form-switch {
  text-align: center;
  padding-top: var(--space-24);
  border-top: 1px solid var(--color-border);
}

.switch-text {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  margin: 0;
}

.switch-link {
  background: none;
  border: none;
  color: var(--color-primary);
  font-weight: var(--font-weight-medium);
  font-size: var(--font-size-sm);
  cursor: pointer;
  padding: 0;
  text-decoration: none;
  transition: color var(--duration-fast) var(--ease-standard);
}

.switch-link:hover:not(:disabled) {
  color: var(--color-primary-hover);
  text-decoration: underline;
}

.switch-link:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Preferences Styles */
.notice-subtext {
  margin-top: 8px;
  font-size: 0.85rem;
  color: #666;
}

.preference-section {
  margin-bottom: var(--space-24);
  padding: var(--space-16);
  background-color: var(--color-bg-1, #f9f9f9);
  border: 1px solid var(--color-border, #e0e0e0);
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
  transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
}

.preference-search-input:focus {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb, 33, 128, 141), 0.1);
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
  transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
  width: 160px;
  flex-shrink: 0;
  cursor: pointer;
}

.preference-option:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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
  background-color: var(--color-bg-2, #e0e0e0);
  font-size: var(--font-size-xs);
  color: var(--color-text);
}

/* Responsive */
@media (max-width: 768px) {
  .register-form {
    max-width: 100%;
  }

  .form-title {
    font-size: var(--font-size-2xl);
  }

  .role-selector {
    grid-template-columns: 1fr;
  }

  .preference-list {
    grid-template-columns: repeat(auto-fill, 140px);
  }

  .preference-option {
    width: 140px;
  }
}

@media (max-width: 480px) {
  .role-content {
    flex-direction: column;
    text-align: center;
  }

  .role-icon {
    font-size: var(--font-size-2xl);
  }
}
</style>
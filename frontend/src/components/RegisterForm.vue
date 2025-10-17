<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { getAllClubCategories } from '../services/clubCategoryService';
import { checkAvailability } from '../services/authService';

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
    const res = await getAllClubCategories();
    categories.value = res.data || [];
  } catch (e) {
    categories.value = [];
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


const handleRegister = async () => {
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
    currentStep.value = 1;
    return;
  }

  const availabilityOk = await ensureAvailability();
  if (!availabilityOk) {
    currentStep.value = 1;
    return;
  }

  if (isClub.value && currentStep.value === 1) {
    currentStep.value = 2;
    return;
  }

  const stepTwoValidationError = stepTwoError.value;
  if (stepTwoValidationError) {
    localError.value = stepTwoValidationError;
    currentStep.value = 2;
    return;
  }

  const availabilityBeforeSubmit = await ensureAvailability();
  if (!availabilityBeforeSubmit) {
    currentStep.value = isClub.value ? 1 : currentStep.value;
    return;
  }

  try {
    await store.dispatch('auth/register', {
      name: name.value.trim(),
      username: username.value.trim(),
      email: email.value.trim(),
      password: password.value,
      role: role.value,
      club_description: clubDescription.value.trim(),
      club_category_id: clubCategoryId.value || null,
      imageBase64: imagePreview.value || null,
      imageOriginalName: imageFile.value?.name || null,
    });


    router.push('/');
  } catch (error) {

    console.error('Registration failed:', error);
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

      <div v-if="!isClub || currentStep === 1">
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
          <p class="notice-text">Provide your club details below.</p>
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



      <div class="form-actions">
        <template v-if="isClub && currentStep === 2">
          <button
            type="button"
            :class="outlineButtonClass"
            @click="goToPreviousStep"
            :disabled="isProcessing"
          >
            Back
          </button>
          <button
            type="submit"
            :class="primaryButtonClass"
            :disabled="!isFormValid || isProcessing"
          >
            <span v-if="!isLoading">Create Account</span>
            <span v-else class="loading-text">
              <span class="loading-spinner"></span>
              Creating account...
            </span>
          </button>
        </template>

        <template v-else>
          <button
            v-if="isClub && currentStep === 1"
            type="submit"
            :class="primaryButtonClass"
            :disabled="!!stepOneError || isProcessing"
          >
            Next
          </button>
          <button
            v-else
            type="submit"
            :class="primaryButtonClass"
            :disabled="!isFormValid || isProcessing"
          >
            <span v-if="!isLoading">Create Account</span>
            <span v-else class="loading-text">
              <span class="loading-spinner"></span>
              Creating account...
            </span>
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

.step-indicator {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--space-24);
  padding: var(--space-8) var(--space-12);
  background-color: rgba(var(--color-primary-rgb, var(--color-teal-500-rgb)), 0.05);
  border-radius: var(--radius-base);
}

.step-indicator__item {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.step-indicator__item--active {
  color: var(--color-primary);
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
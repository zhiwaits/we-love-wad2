<script setup>
import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';

const store = useStore();
const router = useRouter();

// Form data
const name = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const role = ref('user'); // Default to 'user'

// Local error state
const localError = ref('');

// Loading and error from store
const isLoading = computed(() => store.getters['auth/isLoading']);
const authError = computed(() => store.getters['auth/authError']);

// Combined error message
const errorMessage = computed(() => localError.value || authError.value);

// Emit event to parent to switch to login
const emit = defineEmits(['switch-to-login']);

// Password strength calculation
const passwordStrength = computed(() => {
  const pwd = password.value;
  if (!pwd) return { level: 0, text: '', color: '' };

  let strength = 0;
  if (pwd.length >= 8) strength++;
  if (pwd.length >= 12) strength++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
  if (/\d/.test(pwd)) strength++;
  if (/[^a-zA-Z0-9]/.test(pwd)) strength++;

  if (strength <= 2) {
    return { level: strength, text: 'Weak', color: 'var(--color-error)' };
  } else if (strength <= 3) {
    return { level: strength, text: 'Fair', color: 'var(--color-warning)' };
  } else {
    return { level: strength, text: 'Strong', color: 'var(--color-success)' };
  }
});

// Show password strength indicator
const showPasswordStrength = computed(() => {
  return password.value.length > 0;
});

// Password match validation
const passwordsMatch = computed(() => {
  if (!confirmPassword.value) return true; // Don't show error if not touched yet
  return password.value === confirmPassword.value;
});

// Form validation
const isFormValid = computed(() => {
  return (
    name.value.trim() !== '' &&
    email.value.trim() !== '' &&
    password.value.trim() !== '' &&
    confirmPassword.value.trim() !== '' &&
    passwordsMatch.value &&
    role.value !== ''
  );
});

// Handle registration
const handleRegister = async () => {
  // Clear previous errors
  localError.value = '';
  store.dispatch('auth/clearError');

  // Validation
  if (!name.value.trim()) {
    localError.value = 'Name is required';
    return;
  }

  if (!email.value.trim()) {
    localError.value = 'Email is required';
    return;
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.value)) {
    localError.value = 'Please enter a valid email address';
    return;
  }

  if (!password.value.trim()) {
    localError.value = 'Password is required';
    return;
  }

  if (password.value.length < 6) {
    localError.value = 'Password must be at least 6 characters';
    return;
  }

  if (!passwordsMatch.value) {
    localError.value = 'Passwords do not match';
    return;
  }

  if (!role.value) {
    localError.value = 'Please select a role';
    return;
  }

  try {
    await store.dispatch('auth/register', {
      name: name.value.trim(),
      email: email.value.trim(),
      password: password.value,
      role: role.value,
    });

    // Success! Redirect to dashboard
    router.push('/');
  } catch (error) {
    // Error is already in store
    console.error('Registration failed:', error);
  }
};

// Handle Enter key
const handleKeyPress = (event) => {
  if (event.key === 'Enter' && isFormValid.value) {
    handleRegister();
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
              :disabled="isLoading"
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
              :disabled="isLoading"
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
          :disabled="isLoading"
          @keypress="handleKeyPress"
          autocomplete="name"
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
          :disabled="isLoading"
          @keypress="handleKeyPress"
          autocomplete="email"
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
          placeholder="Create a strong password"
          :disabled="isLoading"
          @keypress="handleKeyPress"
          autocomplete="new-password"
        />
        
        <!-- Password Strength Indicator -->
        <div v-if="showPasswordStrength" class="password-strength">
          <div class="strength-bar">
            <div 
              class="strength-bar-fill" 
              :style="{ 
                width: `${(passwordStrength.level / 5) * 100}%`,
                backgroundColor: passwordStrength.color
              }"
            ></div>
          </div>
          <span class="strength-text" :style="{ color: passwordStrength.color }">
            {{ passwordStrength.text }}
          </span>
        </div>
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
          :disabled="isLoading"
          @keypress="handleKeyPress"
          autocomplete="new-password"
        />
        <p v-if="!passwordsMatch && confirmPassword.length > 0" class="field-error">
          Passwords do not match
        </p>
      </div>

      <!-- Terms and Conditions -->
      <div class="form-notice">
        <p class="notice-text">
          By creating an account, you agree to our 
          <a href="#" class="notice-link">Terms of Service</a> and 
          <a href="#" class="notice-link">Privacy Policy</a>
        </p>
      </div>

      <!-- Register Button -->
      <button
        type="submit"
        class="btn btn--primary btn--full-width"
        :disabled="!isFormValid || isLoading"
      >
        <span v-if="!isLoading">Create Account</span>
        <span v-else class="loading-text">
          <span class="loading-spinner"></span>
          Creating account...
        </span>
      </button>
    </form>

    <!-- Switch to Login -->
    <div class="form-switch">
      <p class="switch-text">
        Already have an account?
        <button 
          type="button" 
          class="switch-link" 
          @click="emit('switch-to-login')"
          :disabled="isLoading"
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

/* Password Strength */
.password-strength {
  margin-top: var(--space-8);
  display: flex;
  align-items: center;
  gap: var(--space-12);
}

.strength-bar {
  flex: 1;
  height: 4px;
  background-color: var(--color-secondary);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.strength-bar-fill {
  height: 100%;
  transition: width var(--duration-normal) var(--ease-standard),
              background-color var(--duration-normal) var(--ease-standard);
  border-radius: var(--radius-full);
}

.strength-text {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  flex-shrink: 0;
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
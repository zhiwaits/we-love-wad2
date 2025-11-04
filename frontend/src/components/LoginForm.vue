<script setup>
import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';

const store = useStore();
const router = useRouter();

// Form data
const email = ref('');
const password = ref('');

// Local error state (separate from store error)
const localError = ref('');

// Loading and error from store
const isLoading = computed(() => store.getters['auth/isLoading']);
const authError = computed(() => store.getters['auth/authError']);

// Combined error message
const errorMessage = computed(() => localError.value || authError.value);

// Emit event to parent to switch to register
const emit = defineEmits(['switch-to-register']);

// Form validation
const isFormValid = computed(() => {
  return email.value.trim() !== '' && password.value.trim() !== '';
});

// Handle login
const handleLogin = async () => {
  // Clear previous errors
  localError.value = '';
  store.dispatch('auth/clearError');

  // Basic validation
  if (!email.value.trim()) {
    localError.value = 'Email is required';
    return;
  }

  if (!password.value.trim()) {
    localError.value = 'Password is required';
    return;
  }

  try {
    await store.dispatch('auth/login', {
      email: email.value.trim(),
      password: password.value,
    });

    // Success! Redirect to dashboard
    router.push('/');
  } catch (error) {
    // Error is already in store, will show via errorMessage computed
    console.error('Login failed:', error);
  }
};

// Handle Enter key
const handleKeyPress = (event) => {
  if (event.key === 'Enter' && isFormValid.value) {
    handleLogin();
  }
};
</script>

<template>
  <div class="login-form">
    <div class="form-header">
      <h2 class="form-title">Welcome Back</h2>
      <p class="form-subtitle">Sign in to your account to continue</p>
    </div>

    <!-- Error Message -->
    <div v-if="errorMessage" class="error-banner">
      <span class="error-icon">⚠️</span>
      <span class="error-text">{{ errorMessage }}</span>
    </div>

    <!-- Quick Test Accounts (only in mock mode) -->
    <div class="test-accounts">
      <p class="test-accounts-title">Quick Test:</p>
      <div class="test-accounts-grid">
        <button 
          class="test-account-btn" 
          @click="email = 'user@smu.edu.sg'; password = 'test'"
        >
          👤 Student Account
        </button>
        <button 
          class="test-account-btn" 
          @click="email = 'club@smu.edu.sg'; password = 'test'"
        >
          🎭 Club Account
        </button>
      </div>
    </div>

    <form @submit.prevent="handleLogin" class="form">
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
          placeholder="Enter your password"
          :disabled="isLoading"
          @keypress="handleKeyPress"
          autocomplete="current-password"
        />
      </div>

      <!-- Login Button -->
      <button
        type="submit"
        class="btn btn--primary btn--full-width"
        :disabled="!isFormValid || isLoading"
        style="
            display: block !important;
            width: 100%;
            padding: 12px 16px;
            background: #218085 !important;
            color: #fcfcf9 !important;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            margin-top: 20px;
        "
        >
        <span v-if="!isLoading">Sign In</span>
        <span v-else class="loading-text">
            <span class="loading-spinner"></span>
            Signing in...
        </span>
        </button>
    </form>

    <!-- Switch to Register -->
    <div class="form-switch">
      <p class="switch-text">
        Don't have an account?
        <button 
          type="button" 
          class="switch-link" 
          @click="emit('switch-to-register')"
          :disabled="isLoading"
        >
          Create Account
        </button>
      </p>
    </div>
  </div>
</template>

<style scoped>
.login-form {
  width: 100%;
  max-width: 420px;
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

/* Test Accounts */
.test-accounts {
  background-color: rgba(var(--color-info-rgb), 0.08);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-base);
  padding: var(--space-16);
  margin-bottom: var(--space-24);
}

.test-accounts-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-12) 0;
}

.test-accounts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-8);
}

.test-account-btn {
  padding: var(--space-8) var(--space-12);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-base);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-standard);
}

.test-account-btn:hover {
  background-color: var(--color-secondary);
  border-color: var(--color-primary);
  transform: translateY(-1px);
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

.form-footer {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--space-20);
}

.forgot-link {
  font-size: var(--font-size-sm);
  color: var(--color-primary);
  text-decoration: none;
  font-weight: var(--font-weight-medium);
  transition: color var(--duration-fast) var(--ease-standard);
}

.forgot-link:hover {
  color: var(--color-primary-hover);
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

/* Switch to Register */
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
@media (max-width: 480px) {
  .login-form {
    max-width: 100%;
  }

  .form-title {
    font-size: var(--font-size-2xl);
  }

  .test-accounts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
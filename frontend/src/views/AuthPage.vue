<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useStore } from 'vuex';
import LoginForm from '../components/LoginForm.vue';
import RegisterForm from '../components/RegisterForm.vue';

const router = useRouter();
const route = useRoute();
const store = useStore();

// Active view: 'login' or 'register'
const activeView = ref('login');

// Check if user is already authenticated
onMounted(() => {
  if (store.getters['auth/isAuthenticated']) {
    // Already logged in, redirect to dashboard
    router.push('/dashboard');
  }

  // Set initial view based on route
  if (route.name === 'Register') {
    activeView.value = 'register';
  }
});

// Switch between login and register
const switchToLogin = () => {
  activeView.value = 'login';
  router.push('/login');
};

const switchToRegister = () => {
  activeView.value = 'register';
  router.push('/register');
};
</script>

<template>
  <div class="auth-page">
    <div class="auth-container">
      <!-- Left Side: Branding -->
      <div class="auth-branding">
        <div class="branding-content">
          <div class="logo-section">
            <h1 class="logo">SMU Events Hub</h1>
            <p class="tagline">Discover, Connect, Experience</p>
          </div>

          <div class="features-list">
            <div class="feature-item">
              <span class="feature-icon">🎉</span>
              <div class="feature-text">
                <h3>Discover Events</h3>
                <p>Find exciting campus events tailored to your interests</p>
              </div>
            </div>

            <div class="feature-item">
              <span class="feature-icon">🎫</span>
              <div class="feature-text">
                <h3>Easy RSVP</h3>
                <p>Reserve your spot with just one click</p>
              </div>
            </div>

            <div class="feature-item">
              <span class="feature-icon">📅</span>
              <div class="feature-text">
                <h3>Stay Organized</h3>
                <p>Track all your upcoming events in one place</p>
              </div>
            </div>

            <div class="feature-item">
              <span class="feature-icon">🎭</span>
              <div class="feature-text">
                <h3>For Clubs Too</h3>
                <p>Create and manage events for your organization</p>
              </div>
            </div>
          </div>

          <div class="branding-footer">
            <p class="footer-text">Join the SMU community today</p>
          </div>
        </div>
      </div>

      <!-- Right Side: Auth Forms -->
      <div class="auth-forms">
        <div class="forms-container">
          <!-- Tab Switcher -->
          <div class="tab-switcher">
            <button
              class="tab-button"
              :class="{ 'tab-button--active': activeView === 'login' }"
              @click="switchToLogin"
            >
              Sign In
            </button>
            <button
              class="tab-button"
              :class="{ 'tab-button--active': activeView === 'register' }"
              @click="switchToRegister"
            >
              Create Account
            </button>
            <div 
              class="tab-indicator" 
              :class="{ 'tab-indicator--right': activeView === 'register' }"
            ></div>
          </div>

          <!-- Forms with transition -->
          <div class="form-wrapper">
            <Transition name="fade" mode="out-in">
              <LoginForm 
                v-if="activeView === 'login'" 
                key="login"
                @switch-to-register="switchToRegister"
              />
              <RegisterForm 
                v-else 
                key="register"
                @switch-to-login="switchToLogin"
              />
            </Transition>
          </div>

          <!-- Back to Home Link -->
          <div class="back-link">
            <router-link to="/" class="link">
              ← Back to Home
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  background-color: var(--color-background);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-24);
}

.auth-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  max-width: 1200px;
  width: 100%;
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  min-height: 700px;
}

/* Left Side: Branding */
.auth-branding {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-active) 100%);
  color: var(--color-white);
  padding: var(--space-48) var(--space-32);
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.auth-branding::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
  animation: pulse 15s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

.branding-content {
  position: relative;
  z-index: 1;
}

.logo-section {
  margin-bottom: var(--space-48);
}

.logo {
  font-size: var(--font-size-4xl);
  font-weight: var(--font-weight-bold);
  margin: 0 0 var(--space-12) 0;
  color: var(--color-white);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.tagline {
  font-size: var(--font-size-lg);
  margin: 0;
  opacity: 0.95;
}

.features-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-24);
  margin-bottom: var(--space-48);
}

.feature-item {
  display: flex;
  gap: var(--space-16);
  align-items: flex-start;
}

.feature-icon {
  font-size: var(--font-size-3xl);
  flex-shrink: 0;
}

.feature-text h3 {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin: 0 0 var(--space-4) 0;
  color: var(--color-white);
}

.feature-text p {
  font-size: var(--font-size-sm);
  margin: 0;
  opacity: 0.9;
  line-height: 1.5;
}

.branding-footer {
  padding-top: var(--space-24);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.footer-text {
  font-size: var(--font-size-base);
  margin: 0;
  opacity: 0.9;
  font-weight: var(--font-weight-medium);
}

/* Right Side: Forms */
.auth-forms {
  padding: var(--space-48) var(--space-32);
  display: flex;
  flex-direction: column;
  justify-content: center;
  background-color: var(--color-surface);
}

.forms-container {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
}

/* Tab Switcher */
.tab-switcher {
  display: flex;
  position: relative;
  background-color: var(--color-secondary);
  border-radius: var(--radius-base);
  padding: var(--space-4);
  margin-bottom: var(--space-32);
}

.tab-button {
  flex: 1;
  padding: var(--space-12) var(--space-16);
  background: none;
  border: none;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color var(--duration-fast) var(--ease-standard);
  position: relative;
  z-index: 2;
  border-radius: var(--radius-sm);
}

.tab-button--active {
  color: var(--color-text);
}

.tab-indicator {
  position: absolute;
  top: var(--space-4);
  left: var(--space-4);
  width: calc(50% - var(--space-4));
  height: calc(100% - var(--space-8));
  background-color: var(--color-surface);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-sm);
  transition: transform var(--duration-normal) var(--ease-standard);
  z-index: 1;
}

.tab-indicator--right {
  transform: translateX(100%);
}

/* Form Wrapper */
.form-wrapper {
  min-height: 500px;
}

/* Form Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--duration-fast) var(--ease-standard),
              transform var(--duration-fast) var(--ease-standard);
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Back Link */
.back-link {
  text-align: center;
  margin-top: var(--space-32);
  padding-top: var(--space-24);
  border-top: 1px solid var(--color-border);
}

.link {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
  font-weight: var(--font-weight-medium);
  transition: color var(--duration-fast) var(--ease-standard);
}

.link:hover {
  color: var(--color-primary);
}

/* Responsive Design */
@media (max-width: 1024px) {
  .auth-container {
    grid-template-columns: 1fr;
  }

  .auth-branding {
    display: none;
  }

  .auth-forms {
    padding: var(--space-32) var(--space-24);
  }
}

@media (max-width: 768px) {
  .auth-page {
    padding: var(--space-16);
  }

  .auth-container {
    border-radius: var(--radius-base);
    min-height: auto;
  }

  .auth-forms {
    padding: var(--space-24) var(--space-16);
  }

  .forms-container {
    max-width: 100%;
  }

  .form-wrapper {
    min-height: auto;
  }
}

@media (max-width: 480px) {
  .auth-page {
    padding: 0;
  }

  .auth-container {
    border-radius: 0;
    box-shadow: none;
  }

  .tab-switcher {
    margin-bottom: var(--space-24);
  }

  .tab-button {
    font-size: var(--font-size-sm);
    padding: var(--space-10) var(--space-12);
  }
}
</style>
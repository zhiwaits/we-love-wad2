<template>
  <div class="confirm-rsvp-container">
    <div class="confirmation-card">
      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <h2>Verifying Your RSVP...</h2>
        <p>Please wait while we confirm your registration.</p>
      </div>

      <!-- Success State -->
      <div v-else-if="messageType === 'success'" class="success-state">
        <div class="success-icon">✓</div>
        <h2>RSVP Confirmed!</h2>
        <p class="confirmation-message">{{ message }}</p>
        <p class="details">
          You will receive a reminder email 24 hours before the event.
        </p>
        <button @click="redirectHome" class="btn btn-primary">
          Return to Home
        </button>
      </div>

      <!-- Error State -->
      <div v-else-if="messageType === 'error'" class="error-state">
        <div class="error-icon">✗</div>
        <h2>Confirmation Failed</h2>
        <p class="error-message">{{ message }}</p>
        <div class="error-details">
          <p>The confirmation link may be invalid, expired, or already used. Please try joining the event again.</p>
        </div>
        <button @click="redirectHome" class="btn btn-outline">
          Return to Home
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { confirmRsvp } from '@/services/rsvpService';
import { mapState, mapActions } from 'vuex';

export default {
  name: 'ConfirmRsvp',
  
  data() {
    return {
      loading: true,
      message: '',
      messageType: ''
    };
  },

  computed: {
    ...mapState('auth', ['user'])
  },

  async created() {
    await this.verifyRsvp();
  },

  methods: {
    ...mapActions(['fetchUserRSVPs']),

    async verifyRsvp() {
      try {
        const token = this.$route.params.token;

        if (!token) {
          this.message = 'No confirmation token provided.';
          this.messageType = 'error';
          this.loading = false;
          return;
        }

        // Call the backend to confirm the RSVP
        const response = await confirmRsvp(token);

        if (response.data && response.data.message) {
          this.message = 'Your RSVP has been confirmed! Redirecting to home...';
          this.messageType = 'success';

          // Refresh user's RSVPs in the store if user is logged in
          if (this.user && this.user.id) {
            try {
              await this.fetchUserRSVPs(this.user.id);
            } catch (err) {
              console.error('Error refreshing RSVPs:', err);
            }
          }

          // Auto-redirect after 3 seconds
          setTimeout(() => {
            this.redirectHome();
          }, 3000);
        }
      } catch (error) {
        console.error('Error confirming RSVP:', error);
        this.message = error.response?.data?.error || 'Invalid or expired confirmation token. Please try joining the event again.';
        this.messageType = 'error';
      } finally {
        this.loading = false;
      }
    },

    redirectHome() {
      // If user is authenticated, redirect to home; otherwise to login
      if (this.user && this.user.id) {
        this.$router.push({ name: 'Home' });
      } else {
        this.$router.push({ name: 'Login' });
      }
    }
  }
};
</script>

<style scoped>
.confirm-rsvp-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.confirmation-card {
  background: white;
  border-radius: 12px;
  padding: 60px 40px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  text-align: center;
}

/* Loading State */
.loading-state {
  animation: fadeIn 0.3s ease-in;
}

.spinner {
  width: 50px;
  height: 50px;
  margin: 0 auto 20px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-state h2 {
  color: #333;
  font-size: 24px;
  margin: 20px 0 10px;
  font-weight: 600;
}

.loading-state p {
  color: #666;
  font-size: 16px;
  margin: 0;
}

/* Success State */
.success-state {
  animation: fadeIn 0.3s ease-in;
}

.success-icon {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: bold;
  margin: 0 auto 20px;
}

.success-state h2 {
  color: #333;
  font-size: 28px;
  margin: 20px 0 15px;
  font-weight: 600;
}

.confirmation-message {
  color: #666;
  font-size: 16px;
  margin: 15px 0;
  line-height: 1.6;
}

.details {
  color: #999;
  font-size: 14px;
  margin: 10px 0 30px;
  line-height: 1.5;
}

/* Error State */
.error-state {
  animation: fadeIn 0.3s ease-in;
}

.error-icon {
  width: 80px;
  height: 80px;
  background: #ff6b6b;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  font-weight: bold;
  margin: 0 auto 20px;
}

.error-state h2 {
  color: #ff6b6b;
  font-size: 28px;
  margin: 20px 0 15px;
  font-weight: 600;
}

.error-message {
  color: #333;
  font-size: 16px;
  margin: 15px 0;
  font-weight: 500;
}

.error-details {
  background: #f8f9fa;
  border-left: 4px solid #ff6b6b;
  padding: 15px;
  border-radius: 6px;
  margin: 20px 0 30px;
  text-align: left;
}

.error-details p {
  color: #666;
  font-size: 14px;
  margin: 8px 0;
  line-height: 1.5;
}

.error-details p:first-child {
  margin-top: 0;
}

.error-details p:last-child {
  margin-bottom: 0;
}

/* Button Styles */
.btn {
  padding: 12px 30px;
  font-size: 16px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
}

.btn-outline {
  background: white;
  color: #667eea;
  border: 2px solid #667eea;
}

.btn-outline:hover {
  background: #f0f3ff;
}

/* Animation */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive */
@media (max-width: 600px) {
  .confirmation-card {
    padding: 40px 20px;
  }

  .success-icon,
  .error-icon {
    width: 60px;
    height: 60px;
    font-size: 36px;
  }

  .success-state h2,
  .error-state h2,
  .loading-state h2 {
    font-size: 22px;
  }

  .btn {
    width: 100%;
    padding: 14px 20px;
    font-size: 14px;
  }
}
</style>
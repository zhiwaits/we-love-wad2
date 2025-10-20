<template>
    <transition name="modal-fade">
        <div v-if="visible && event" class="modal-overlay" @click.self="emitClose" role="dialog" aria-modal="true"
            :aria-label="`Details for ${event.title}`">
            <div class="modal-panel">
                <button class="modal-close" type="button" @click="emitClose" aria-label="Close event details">
                    <span aria-hidden="true">×</span>
                </button>

                <div class="modal-media" v-if="event.image">
                    <img :src="event.image" :alt="`${event.title} hero`" />
                    <div class="modal-chip category" v-if="event.category">{{ event.category }}</div>
                    <div class="modal-chip price" :class="{ free: event.price === 'FREE' }" v-if="event.price">
                        {{ event.price }}
                    </div>
                </div>

                <div class="modal-body">
                    <header class="modal-header">
                        <h2 class="event-title">{{ event.title }}</h2>
                        <p class="event-organiser" v-if="event.organiser">
                            By {{ event.organiser }}
                        </p>
                    </header>

                    <section class="event-meta">
                        <div class="meta-item" v-if="event.date">
                            <span class="icon">📅</span>
                            <div>
                                <span class="meta-label">Date</span>
                                <span>{{ formatDateLong(event.date) }}</span>
                            </div>
                        </div>
                        <div class="meta-item" v-if="event.time">
                            <span class="icon">⏰</span>
                            <div>
                                <span class="meta-label">Time</span>
                                <span>{{ event.time }}</span>
                            </div>
                        </div>
                        <div class="meta-item" v-if="event.venue || event.location">
                            <span class="icon">📍</span>
                            <div>
                                <span class="meta-label">Venue</span>
                                <span>{{ event.venue || event.location }}</span>
                                <span v-if="event.location && event.venue && event.venue !== event.location"
                                    class="meta-secondary">
                                    {{ event.location }}
                                </span>
                            </div>
                        </div>
                        <div class="meta-item" v-if="event.attendees != null">
                            <span class="icon">👥</span>
                            <div>
                                <span class="meta-label">Attendance</span>
                                <span>
                                    <strong>{{ event.attendees }}</strong>
                                    <template v-if="event.maxAttendees"> / {{ event.maxAttendees }}</template>
                                    attending
                                </span>
                                <span v-if="spotsRemaining !== null" class="meta-secondary">
                                    {{ spotsRemaining }} spots left
                                </span>
                                <span v-else class="meta-secondary">No maximum capacity</span>
                            </div>
                        </div>
                    </section>

                    <!-- Travel Time Section -->
                    <section class="travel-time-section" v-if="loadingTravelTime || travelTime || locationError">
                        <div v-if="loadingTravelTime" class="travel-loading">
                            <div class="spinner"></div>
                            <span>Calculating travel time from your location...</span>
                        </div>
                        
                        <div v-else-if="travelTime" class="travel-info">
                            <div class="travel-header">
                                <span class="icon">🚗</span>
                                <span>Travel Information</span>
                            </div>
                            <div class="travel-details">
                                <div class="travel-item">
                                    <span class="travel-label">Estimated Time</span>
                                    <span class="travel-value">{{ travelTime.duration }}</span>
                                </div>
                                <div class="travel-item">
                                    <span class="travel-label">Distance</span>
                                    <span class="travel-value">{{ travelTime.distance }}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div v-else-if="locationError" class="travel-error">
                            <span class="icon">⚠️</span>
                            <span>{{ locationError }}</span>
                        </div>
                    </section>

                    <section class="event-status" v-if="statusVariant">
                        <span class="status-pill" :class="statusVariant">
                            {{ statusText }}
                        </span>
                    </section>

                    <section class="event-description" v-if="event.description">
                        <h3>About this event</h3>
                        <p>{{ event.description }}</p>
                    </section>

                    <section class="event-tags" v-if="event.tags && event.tags.length">
                        <h3>Tags</h3>
                        <div class="tag-list">
                            <button v-for="tag in event.tags" :key="tag" type="button" class="tag-pill"
                                @click="$emit('tag-click', tag)">
                                #{{ tag }}
                            </button>
                        </div>
                    </section>

                    <!-- Success/Error Messages -->
                    <div v-if="successMessage" class="alert alert-success">
                        <span class="icon">✓</span>
                        {{ successMessage }}
                    </div>
                    
                    <div v-if="errorMessage" class="alert alert-error">
                        <span class="icon">✕</span>
                        {{ errorMessage }}
                    </div>

                    <footer class="modal-actions">
                        <button 
                            type="button" 
                            class="btn btn-primary"
                            @click="handleReserve"
                            :disabled="isReserving"
                        >
                            <span v-if="isReserving">Reserving...</span>
                            <span v-else>Join Event</span>
                        </button>
                        <div class="secondary-actions">
                            <button type="button" class="btn btn-outline">Save</button>
                            <button type="button" class="btn btn-outline">Share</button>
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    </transition>
</template>

<script>
import { createRsvp } from '../services/rsvpService.js';

export default {
    name: 'EventDetailModal',
    props: {
        event: {
            type: Object,
            default: null
        },
        visible: {
            type: Boolean,
            default: false
        }
    },
    emits: ['close', 'tag-click'],
    
    data() {
        return {
            isReserving: false,
            loadingTravelTime: false,
            travelTime: null,
            locationError: null,
            successMessage: '',
            errorMessage: '',
            userLocation: null,
            currentUserId: 1 // TODO: Get from Vuex auth state
        };
    },
    
    computed: {
        spotsRemaining() {
            if (this.event?.maxAttendees == null) return null;
            const remaining = this.event.maxAttendees - (this.event.attendees || 0);
            return remaining >= 0 ? remaining : 0;
        },
        remainingPercent() {
            if (this.event?.maxAttendees == null || this.event.maxAttendees === 0) return null;
            const percent = (this.spotsRemaining / this.event.maxAttendees) * 100;
            return Math.max(0, Math.min(100, Math.round(percent)));
        },
        statusText() {
            if (this.remainingPercent === null) return '';
            const suffix = `${this.remainingPercent}% spots remaining`;
            if (this.remainingPercent <= 10) return `Almost Full · ${suffix}`;
            if (this.remainingPercent <= 30) return `Filling Fast · ${suffix}`;
            if (this.remainingPercent <= 60) return `Seats Available · ${suffix}`;
            return `Plenty of Spots · ${suffix}`;
        },
        statusVariant() {
            if (this.remainingPercent === null) return null;
            if (this.remainingPercent <= 10) return 'danger';
            if (this.remainingPercent <= 30) return 'warning';
            if (this.remainingPercent <= 60) return 'info';
            return 'success';
        }
    },
    
    watch: {
        visible(val) {
            document.body.classList.toggle('modal-open', val);
            if (val && this.event) {
                this.resetMessages();
                this.fetchLocationAndTravelTime();
            }
        }
    },
    
    mounted() {
        if (this.visible) {
            document.body.classList.add('modal-open');
        }
        window.addEventListener('keyup', this.handleEsc, { passive: true });
    },
    
    beforeUnmount() {
        document.body.classList.remove('modal-open');
        window.removeEventListener('keyup', this.handleEsc);
    },
    
    methods: {
        emitClose() {
            this.$emit('close');
        },
        
        handleEsc(event) {
            if (event.key === 'Escape' && this.visible) {
                this.emitClose();
            }
        },
        
        formatDateLong(isoDate) {
            if (!isoDate) return '';
            try {
                return new Date(isoDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            } catch (e) {
                return isoDate;
            }
        },
        
        resetMessages() {
            this.successMessage = '';
            this.errorMessage = '';
            this.locationError = null;
            this.travelTime = null;
        },
        
        async getUserLocation() {
            return new Promise((resolve, reject) => {
                if ('geolocation' in navigator) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            resolve({
                                lat: position.coords.latitude,
                                lng: position.coords.longitude
                            });
                        },
                        (error) => {
                            let errorMsg = 'Unable to get your location';
                            switch(error.code) {
                                case error.PERMISSION_DENIED:
                                    errorMsg = 'Location permission denied';
                                    break;
                                case error.POSITION_UNAVAILABLE:
                                    errorMsg = 'Location information unavailable';
                                    break;
                                case error.TIMEOUT:
                                    errorMsg = 'Location request timed out';
                                    break;
                            }
                            reject(errorMsg);
                        },
                        {
                            enableHighAccuracy: true,
                            timeout: 5000,
                            maximumAge: 0
                        }
                    );
                } else {
                    reject('Geolocation not supported by your browser');
                }
            });
        },
        
        async calculateTravelTime(userLat, userLng, eventLat, eventLng) {
            try {
                const response = await fetch('http://localhost:3000/api/travel-time', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        origin: { lat: userLat, lng: userLng },
                        destination: { lat: eventLat, lng: eventLng }
                    })
                });
                
                if (!response.ok) {
                    throw new Error('Failed to calculate travel time');
                }
                
                const data = await response.json();
                return data;
            } catch (error) {
                console.error('Error calculating travel time:', error);
                return null;
            }
        },
        
        async fetchLocationAndTravelTime() {
            this.loadingTravelTime = true;
            
            try {
                this.userLocation = await this.getUserLocation();
                
                // Check if event has coordinates
                if (this.event.latitude && this.event.longitude) {
                    const result = await this.calculateTravelTime(
                        this.userLocation.lat,
                        this.userLocation.lng,
                        this.event.latitude,
                        this.event.longitude
                    );
                    
                    if (result) {
                        this.travelTime = result;
                    } else {
                        this.locationError = 'Could not calculate travel time';
                    }
                } else {
                    // If no coordinates, skip silently (don't show error)
                    this.locationError = null;
                }
            } catch (error) {
                this.locationError = error;
            } finally {
                this.loadingTravelTime = false;
            }
        },
        
        // Add this to the <script> section of EventDetailModal.vue

        async handleReserve() {
            this.isReserving = true;
            this.errorMessage = '';
            this.successMessage = '';
            
            try {
                // TODO: Get actual userId from Vuex auth state or localStorage
                // For now, let's check if we have a valid userId
                const userId = this.currentUserId || this.$store.state.user?.id || localStorage.getItem('userId');
                
                if (!userId) {
                    this.errorMessage = 'Please log in to reserve an event';
                    this.isReserving = false;
                    return;
                }
                
                const rsvpData = {
                    eventId: this.event.id,
                    userId: parseInt(userId), // Ensure it's a number
                    status: 'confirmed'
                };
                
                console.log('Attempting to create RSVP with data:', rsvpData);
                
                const response = await createRsvp(rsvpData);
                
                if (response.status === 200 || response.status === 201) {
                    this.successMessage = 'Successfully reserved your spot!';
                    
                    // Refresh events in store
                    this.$store.dispatch('fetchAllEvents');
                    
                    // Close modal after 2 seconds
                    setTimeout(() => {
                        this.emitClose();
                    }, 2000);
                }
            } catch (error) {
                console.error('Reservation failed:', error);
                
                // Better error handling
                if (error.response) {
                    // Server responded with error
                    const errorMsg = error.response.data?.error || error.response.data?.message;
                    this.errorMessage = errorMsg || 'Failed to reserve event. Please try again.';
                } else if (error.request) {
                    // Request made but no response
                    this.errorMessage = 'Unable to connect to server. Please check your connection.';
                } else {
                    // Something else happened
                    this.errorMessage = error.message || 'An unexpected error occurred';
                }
            } finally {
                this.isReserving = false;
            }
        }
    }
};
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(17, 24, 39, 0.55);
    display: flex;
    justify-content: center;
    align-items: center;
    padding: clamp(16px, 5vw, 48px);
    z-index: 1000;
    backdrop-filter: blur(4px);
}

.modal-panel {
    position: relative;
    display: flex;
    flex-direction: column;
    max-width: min(720px, 90vw);
    width: 100%;
    max-height: min(92vh, 880px);
    background: var(--color-surface);
    color: var(--color-text);
    border-radius: 24px;
    box-shadow: 0 24px 48px rgba(15, 23, 42, 0.2);
    overflow: hidden;
}

.modal-close {
    position: absolute;
    top: 16px;
    right: 16px;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: rgba(0, 0, 0, 0.05);
    color: var(--color-text);
    font-size: 24px;
    cursor: pointer;
    display: grid;
    place-items: center;
    transition: background 0.2s ease;
    z-index: 10;
}

.modal-close:hover {
    background: rgba(0, 0, 0, 0.12);
}

.modal-media {
    position: relative;
    width: 100%;
    height: clamp(200px, 32vh, 240px);
    overflow: hidden;
    border-radius: 24px 24px 0 0;
    flex-shrink: 0;
}

.modal-media img {
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    margin: 0;
    border-radius: inherit;
}

.modal-chip {
    position: absolute;
    top: 20px;
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.01em;
}

.modal-chip.category {
    left: 20px;
    background: rgba(var(--color-info-rgb, 98, 108, 113), 0.85);
    color: var(--color-background);
}

.modal-chip.price {
    right: 20px;
    background: rgba(var(--color-warning-rgb, 168, 75, 47), 0.92);
    color: var(--color-background);
}

.modal-chip.price.free {
    background: rgba(var(--color-success-rgb, 33, 128, 141), 0.92);
}

.modal-body {
    padding: clamp(20px, 3vw, 32px);
    display: flex;
    flex-direction: column;
    gap: 20px;
    flex: 1;
    overflow-y: auto;
}

.modal-header {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.event-title {
    margin: 0;
    font-size: clamp(24px, 3vw, 32px);
    line-height: 1.15;
}

.event-organiser {
    margin: 0;
    font-size: 15px;
    color: var(--color-text-secondary);
    display: flex;
    gap: 8px;
    align-items: center;
}

.icon {
    font-size: 18px;
}

.event-meta {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px 20px;
}

.meta-item {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    background: rgba(var(--color-slate-500-rgb, 98, 108, 113), 0.08);
    border-radius: 16px;
    padding: 14px 16px;
}

.meta-label {
    display: block;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-secondary);
}

.meta-secondary {
    display: block;
    font-size: 13px;
    color: var(--color-text-secondary);
}

/* Travel Time Styles */
.travel-time-section {
    background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
    border-radius: 16px;
    padding: 16px;
}

.travel-loading {
    display: flex;
    align-items: center;
    gap: 12px;
    color: #3b82f6;
    font-size: 14px;
}

.spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(59, 130, 246, 0.3);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.travel-info {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.travel-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    font-size: 15px;
    color: var(--color-text);
}

.travel-details {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
}

.travel-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.travel-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(0, 0, 0, 0.6);
}

.travel-value {
    font-size: 16px;
    font-weight: 700;
    color: #1e40af;
}

.travel-error {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #fef2f2;
    color: #dc2626;
    padding: 12px;
    border-radius: 12px;
    font-size: 13px;
}

/* Alert Messages */
.alert {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    border-radius: 12px;
    font-weight: 500;
    font-size: 14px;
}

.alert-success {
    background: #d1fae5;
    color: #059669;
}

.alert-error {
    background: #fee2e2;
    color: #dc2626;
}

.event-status {
    display: flex;
    justify-content: flex-start;
}

.status-pill {
    padding: 6px 14px;
    border-radius: 999px;
    font-weight: 600;
    font-size: 13px;
    background: rgba(var(--color-info-rgb, 98, 108, 113), 0.18);
    color: var(--color-info, var(--color-text));
}

.status-pill.success {
    background: rgba(var(--color-success-rgb, 33, 128, 141), 0.18);
    color: var(--color-success);
}

.status-pill.warning {
    background: rgba(var(--color-warning-rgb, 168, 75, 47), 0.18);
    color: var(--color-warning);
}

.status-pill.danger {
    background: rgba(var(--color-error-rgb, 192, 21, 47), 0.18);
    color: var(--color-error);
}

.event-description h3,
.event-tags h3 {
    margin: 0 0 12px;
    font-size: 18px;
}

.event-description p {
    margin: 0;
    line-height: 1.6;
}

.tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.tag-pill {
    border: 1px solid var(--color-border);
    border-radius: 999px;
    padding: 6px 12px;
    background: transparent;
    color: var(--color-text-secondary);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.tag-pill:hover {
    background: var(--color-secondary);
    color: var(--color-text);
}

.modal-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
}

.btn {
    border-radius: 12px;
    padding: 12px 20px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn-primary {
    border: none;
    background: var(--color-primary);
    color: var(--color-btn-primary-text);
    box-shadow: 0 10px 20px rgba(var(--color-teal-500-rgb, 33, 128, 141), 0.25);
}

.btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 14px 24px rgba(var(--color-teal-500-rgb, 33, 128, 141), 0.28);
}

.btn-primary:disabled {
    background: #9ca3af;
    cursor: not-allowed;
    opacity: 0.6;
}

.btn-outline {
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text);
}

.btn-outline:hover {
    background: var(--color-secondary);
}

.secondary-actions {
    display: flex;
    gap: 10px;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
    transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
    opacity: 0;
}

@media (max-width: 640px) {
    .modal-panel {
        border-radius: 16px;
    }

    .modal-body {
        padding: 24px;
    }

    .modal-actions {
        flex-direction: column;
        align-items: stretch;
    }

    .secondary-actions {
        width: 100%;
        justify-content: center;
    }

    .btn {
        width: 100%;
    }
    
    .travel-details {
        grid-template-columns: 1fr;
    }
}
</style>

<template>
    <transition name="modal-fade">
        <div v-if="visible && event" class="modal-overlay" @click.self="emitClose" role="dialog" aria-modal="true"
            :aria-label="`Details for ${event.title}`">
            <div class="modal-panel">
                <!-- Close button removed as modal closes on background click -->

                <div class="modal-media" v-if="event">
                    <img :src="eventImageSrc(event)" :alt="`${event.title} hero`" @error="handleImageError" />
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

                    <section class="event-status" v-if="statusVariant">
                        <span class="status-pill" :class="statusVariant">
                            {{ statusText }}
                        </span>
                    </section>

                    <!-- NEW: Google Maps Section -->
                    <section class="event-map" v-if="hasValidCoordinates">
                        <h3>Location & Travel Time</h3>
                        
                        <!-- Travel Time Display -->
                        <div v-if="travelInfo.duration" class="travel-info">
                            <span class="travel-icon">🚗</span>
                            <span class="travel-text">
                                <strong>{{ travelInfo.duration }}</strong> 
                                <span class="travel-distance">({{ travelInfo.distance }})</span>
                                from your location
                            </span>
                        </div>
                        <div v-else-if="travelInfo.loading" class="travel-info loading">
                            Calculating travel time...
                        </div>
                        <div v-else-if="travelInfo.error" class="travel-info error">
                            {{ travelInfo.error }}
                        </div>

                        <!-- Map Container -->
                        <div ref="mapContainer" class="map-container"></div>
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

                    <footer class="modal-actions">
                        <!-- UPDATED: Join Event Button with Club Restriction -->
                        <button 
                            type="button" 
                            class="btn btn-primary" 
                            @click="handleJoinEvent"
                            :disabled="isJoining || hasJoined || isPending || isClub"
                            :class="{ 'btn-disabled': isClub }"
                        >
                            <span v-if="isClub">Clubs Cannot RSVP</span>
                            <span v-else-if="isJoining">Joining...</span>
                            <span v-else-if="hasJoined">✓ Joined</span>
                            <span v-else-if="isPending">Pending Confirmation</span>
                            <span v-else>Join Event</span>
                        </button>
                        
                        <!-- Error/Success Messages -->
                        <div v-if="rsvpMessage" class="rsvp-message" :class="rsvpMessageType">
                            {{ rsvpMessage }}
                        </div>

                        <div class="secondary-actions">
                            <button type="button" class="btn btn-outline" @click="handleToggleSave" :disabled="isClub">
                                {{ isEventSaved ? 'Unsave' : 'Save' }}
                            </button>
                            <button type="button" class="btn btn-outline" @click="$emit('share')">Share</button>
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    </transition>
</template>
<script>
import { createRsvp, getRsvpsByEventId } from '@/services/rsvpService';
import { mapState, mapMutations, mapGetters } from 'vuex';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const FALLBACK_PLACEHOLDER = 'https://placehold.co/900x400?text=Event';
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
    emits: ['close', 'tag-click', 'rsvp-created', 'share'],
    
    data() {
        return {
            // RSVP State
            isJoining: false,
            isPending: false,
            rsvpMessage: '',
            rsvpMessageType: '',
            
            // Map State
            map: null,
            marker: null,
            userLocation: null,
            travelInfo: {
                duration: null,
                distance: null,
                loading: false,
                error: null
            },

            // Attendee Management State
            attendees: [],
            attendeesLoading: false,
            attendeesError: '',
            attendeesExpanded: false,
            attendeesLoadedFor: null
        };
    },

    computed: {
        ...mapState(['userRSVPs']), // Use your existing state
        ...mapGetters('auth', ['isClub', 'currentUser']),
        hasJoined() {
            if (!this.event || !this.userRSVPs) return false;
            const rsvp = this.userRSVPs.find(r => r.event_id === this.event.id);
            return rsvp && rsvp.status === 'confirmed';
        },
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
        },

        hasValidCoordinates() {
            const hasCoords = this.event?.latitude != null && 
                   this.event?.altitude != null &&
                   this.event.venue !== 'Virtual';

            console.log('🗺️ hasValidCoordinates check:');
            console.log('  - event:', this.event);
            console.log('  - latitude:', this.event?.latitude);
            console.log('  - altitude:', this.event?.altitude);
            console.log('  - venue:', this.event?.venue);
            console.log('  - result:', hasCoords);
            
            return hasCoords;
        },

        isEventSaved() {
            return this.$store.getters.isEventSaved(this.event?.id);
        },

        isEventOwner() {
            if (!this.event || !this.currentUser?.id) return false;
            const possibleOwnerIds = [
                this.event.owner_id,
                this.event.ownerId,
                this.event.ownerID,
                this.event.owner?.id,
                this.event.club_id,
                this.event.clubId,
                this.event.organiser_id,
                this.event.organiserId
            ].filter(id => id != null);

            if (possibleOwnerIds.length === 0) return false;

            const currentId = String(this.currentUser.id);
            return possibleOwnerIds.some(id => String(id) === currentId);
        },

        shouldShowAttendeesSection() {
            return this.isClub && this.isEventOwner;
        }
    },

    watch: {
        visible(val) {
            document.body.classList.toggle('modal-open', val);
            if (val) {
                if (this.hasValidCoordinates) {
                    this.$nextTick(() => {
                        this.initMap();
                    });
                }
                this.ensureAttendeesLoaded();
            } else {
                this.resetAttendeesState();
            }
        },

        event(newEvent, oldEvent) {
            if (!newEvent) {
                this.resetAttendeesState();
                return;
            }

            const newId = newEvent?.id ?? newEvent?.event_id;
            const oldId = oldEvent?.id ?? oldEvent?.event_id;

            if (!oldEvent || String(newId) !== String(oldId)) {
                this.resetAttendeesState();
            }

            if (this.visible) {
                const rsvp = this.userRSVPs.find(r => r.event_id === newEvent.id);
                if (rsvp) {
                    this.isPending = rsvp.status === 'pending';
                }
                this.rsvpMessage = '';
                
                if (this.hasValidCoordinates) {
                    this.$nextTick(() => {
                        this.initMap();
                    });
                }
            }

            this.ensureAttendeesLoaded();
        },

        userRSVPs: {
            handler() {
                // Update pending status when RSVPs data changes
                if (this.event && this.visible) {
                    const rsvp = this.userRSVPs.find(r => r.event_id === this.event.id);
                    if (rsvp) {
                        this.isPending = rsvp.status === 'pending';
                    } else {
                        this.isPending = false;
                    }
                }
            },
            deep: true
        }
    },

    mounted() {
        if (this.visible && this.event) {
            document.body.classList.add('modal-open');
            const rsvp = this.userRSVPs.find(r => r.event_id === this.event.id);
            if (rsvp) {
                this.isPending = rsvp.status === 'pending';
            }
        }
        window.addEventListener('keyup', this.handleEsc, { passive: true });
        this.loadGoogleMapsScript();
    },

    beforeUnmount() {
        document.body.classList.remove('modal-open');
        window.removeEventListener('keyup', this.handleEsc);
    },

    methods: {
        ...mapMutations(['SET_USER_RSVPS']),
        
        emitClose() {
            this.$emit('close');
        },

        handleEsc(event) {
            if (event.key === 'Escape' && this.visible) {
                this.emitClose();
            }
        },

        eventImageSrc(event) {
            if (!event) return FALLBACK_PLACEHOLDER;
            const raw = event.image || event.image_url || event.imageUrl || event.cover;
            if (!raw) return FALLBACK_PLACEHOLDER;
            if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
            const normalized = raw.replace('/uploads/event/event_', '/uploads/event/');
            return `${API_BASE_URL}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
        },

        handleImageError(ev) {
            if (ev && ev.target) ev.target.src = FALLBACK_PLACEHOLDER;
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

        // Handle Join Event Button Click
        async handleJoinEvent() {
            if (this.isJoining || this.hasJoined || this.isPending) return;

            // Check if user is logged in
            if (!this.currentUser || !this.currentUser.id) {
                this.rsvpMessage = 'Please log in to join events';
                this.rsvpMessageType = 'error';
                setTimeout(() => {
                    this.rsvpMessage = '';
                }, 3000);
                return;
            }

            this.isJoining = true;
            this.rsvpMessage = '';

            try {
                const rsvpData = {
                    event_id: this.event.id,
                    user_id: this.currentUser.id,
                };

                await createRsvp(rsvpData);
                
                this.isPending = true;
                this.rsvpMessage = 'Confirmation email sent! Please check your inbox.';
                this.rsvpMessageType = 'success';

            } catch (error) {
                console.error('Error creating RSVP:', error);
                this.rsvpMessage = error.response?.data?.error || 'Failed to join event. Please try again.';
                this.rsvpMessageType = 'error';
            } finally {
                this.isJoining = false;
            }
        },

        // Load Google Maps Script
        // Load Google Maps Script with better error handling
loadGoogleMapsScript() {
    if (window.google && window.google.maps) {
        console.log('✅ Google Maps already loaded');
        return Promise.resolve();
    }

    console.log('🔄 Loading Google Maps script...');
    
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        
        // Replace with your actual API key
        const apiKey = 'AIzaSyD9_8oOwKCEvgntkep-QfxBBxFMCBAqrzM';  // TODO: Replace this!
        
        if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
            console.error('❌ Google Maps API key not configured!');
            reject(new Error('Google Maps API key not configured'));
            return;
        }
        
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
            console.log('✅ Google Maps script loaded successfully');
            resolve();
        };
        
        script.onerror = (error) => {
            console.error('❌ Failed to load Google Maps script:', error);
            reject(error);
        };
        
        document.head.appendChild(script);
    });
},

// Initialize Google Map with better debugging
async initMap() {
    console.log('🗺️ initMap called');
    console.log('Has valid coordinates?', this.hasValidCoordinates);
    console.log('Event:', this.event);
    console.log('Latitude:', this.event?.latitude);
    console.log('Altitude:', this.event?.altitude);
    console.log('Venue:', this.event?.venue);
    
    if (!this.hasValidCoordinates) {
        console.warn('⚠️ Invalid coordinates or Virtual event, skipping map');
        return;
    }
    
    if (!this.$refs.mapContainer) {
        console.warn('⚠️ Map container ref not found');
        return;
    }

    try {
        await this.loadGoogleMapsScript();

        const eventLocation = {
            lat: parseFloat(this.event.latitude),
            lng: parseFloat(this.event.altitude)
        };
        
        console.log('📍 Event location:', eventLocation);

        this.map = new window.google.maps.Map(this.$refs.mapContainer, {
            center: eventLocation,
            zoom: 16,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false
        });
        
        console.log('✅ Map created:', this.map);

        this.marker = new window.google.maps.Marker({
            position: eventLocation,
            map: this.map,
            title: this.event.title,
            animation: window.google.maps.Animation.DROP
        });
        
        console.log('✅ Marker added:', this.marker);

        // Get user location and calculate travel time
        this.getUserLocationAndCalculateTravel(eventLocation);

    } catch (error) {
        console.error('❌ Error initializing map:', error);
        this.travelInfo.error = 'Unable to load map';
    }
},

// Get User Location with better error handling
getUserLocationAndCalculateTravel(destination) {
    console.log('📍 Getting user location...');
    
    if (!navigator.geolocation) {
        console.error('❌ Geolocation not supported');
        this.travelInfo.error = 'Geolocation not supported';
        return;
    }

    this.travelInfo.loading = true;

    navigator.geolocation.getCurrentPosition(
        (position) => {
            console.log('✅ User location obtained:', position.coords);
            this.userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            this.calculateTravelTime(this.userLocation, destination);
        },
        (error) => {
            console.error('❌ Error getting location:', error);
            this.travelInfo.loading = false;
            
            // More specific error messages
            if (error.code === 1) {
                this.travelInfo.error = 'Location access denied. Please enable location permissions.';
            } else if (error.code === 2) {
                this.travelInfo.error = 'Location unavailable';
            } else if (error.code === 3) {
                this.travelInfo.error = 'Location request timeout';
            } else {
                this.travelInfo.error = 'Unable to get your location';
            }
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
},

// Calculate Travel Time with debugging
calculateTravelTime(origin, destination) {
    console.log('🚗 Calculating travel time...');
    console.log('From:', origin);
    console.log('To:', destination);
    
    if (!window.google?.maps?.DistanceMatrixService) {
        console.error('❌ Distance Matrix Service not available');
        this.travelInfo.loading = false;
        this.travelInfo.error = 'Distance calculation unavailable';
        return;
    }
    
    const service = new window.google.maps.DistanceMatrixService();

    service.getDistanceMatrix(
        {
            origins: [origin],
            destinations: [destination],
            travelMode: window.google.maps.TravelMode.DRIVING,
            unitSystem: window.google.maps.UnitSystem.METRIC
        },
        (response, status) => {
            console.log('Distance Matrix Response:', { response, status });
            this.travelInfo.loading = false;

            if (status === 'OK' && response.rows[0]?.elements[0]?.status === 'OK') {
                const result = response.rows[0].elements[0];
                this.travelInfo.duration = result.duration.text;
                this.travelInfo.distance = result.distance.text;
                this.travelInfo.error = null;
                console.log('✅ Travel time calculated:', this.travelInfo);
            } else {
                console.error('❌ Distance Matrix Error:', status, response);
                this.travelInfo.error = 'Unable to calculate travel time';
            }
        }
    );

},

handleToggleSave() {
    if (!this.event?.id) return;
    this.$store.dispatch('toggleSaveEvent', this.event.id);
}

    }
    
};
    


</script>


<style scoped>
/* Existing styles remain the same... */

/* NEW: Map Section Styles */
.event-map {
    margin: 20px 0;
}

.event-map h3 {
    margin: 0 0 12px;
    font-size: 18px;
}

.map-container {
    width: 100%;
    height: 250px;
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid var(--color-border);
    margin-top: 12px;
}

.travel-info {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: rgba(var(--color-info-rgb, 98, 108, 113), 0.08);
    border-radius: 12px;
    font-size: 14px;
    margin-bottom: 12px;
}

.travel-info.loading {
    background: rgba(var(--color-slate-500-rgb, 98, 108, 113), 0.08);
    color: var(--color-text-secondary);
}

.travel-info.error {
    background: rgba(var(--color-error-rgb, 192, 21, 47), 0.08);
    color: var(--color-error);
}

.travel-icon {
    font-size: 20px;
}

.travel-text {
    flex: 1;
}

.travel-distance {
    color: var(--color-text-secondary);
    font-size: 13px;
}

/* NEW: RSVP Message Styles */
.rsvp-message {
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 14px;
    margin-top: 8px;
    width: 100%;
    text-align: center;
}

.rsvp-message.success {
    background: rgba(var(--color-success-rgb, 33, 128, 141), 0.15);
    color: var(--color-success);
}

.rsvp-message.error {
    background: rgba(var(--color-error-rgb, 192, 21, 47), 0.15);
    color: var(--color-error);
}

/* Updated Button Styles */
.btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
}

.btn-primary:disabled:hover {
    box-shadow: 0 10px 20px rgba(var(--color-teal-500-rgb, 33, 128, 141), 0.25);
}

/* Existing styles... */
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

.btn-primary:disabled,
.btn-primary.btn-disabled {
    background: rgba(var(--color-slate-500-rgb, 98, 108, 113), 0.3);
    color: var(--color-text-secondary);
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
}

.btn-primary:disabled:hover,
.btn-primary.btn-disabled:hover {
    transform: none;
    box-shadow: none;
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

    .map-container {
        height: 200px;
    }
}
</style>

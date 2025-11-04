<template>
    <transition name="modal-fade">
        <div v-if="visible && event" class="modal-overlay" @click.self="handleCancelClick" role="dialog"
            aria-modal="true" aria-label="Edit Event">
            <div class="modal-panel">
                <div class="modal-header">
                    <h2>Edit Event</h2>
                    <p>Update the details of your event</p>
                </div>

                <div class="modal-body">
                    <form @submit.prevent="handleSubmit">
                        <div v-if="error" class="alert alert--error">{{ error }}</div>
                        <div v-if="success" class="alert alert--success">{{ success }}</div>

                        <!-- Event Title -->
                        <div class="form-group">
                            <label for="edit-title">Event Title <span class="required">*</span></label>
                            <input id="edit-title" type="text" v-model="form.title" placeholder="e.g., Vivace"
                                required />
                        </div>

                        <!-- Event Description -->
                        <div class="form-group">
                            <label for="edit-description">Event Description <span class="required">*</span></label>
                            <textarea id="edit-description" rows="4" v-model="form.description"
                                placeholder="Provide a description of your event..." required></textarea>
                            <div class="field-hint">{{ descriptionLength }} characters</div>
                        </div>

                        <!-- Date & Time Grid -->
                        <div class="grid grid--two">
                            <div class="form-group">
                                <label for="edit-start">Start Date &amp; Time <span class="required">*</span></label>
                                <input id="edit-start" type="datetime-local" v-model="form.start" required />
                            </div>

                            <div class="form-group">
                                <label for="edit-end">End Date &amp; Time <span class="optional">(Optional)</span></label>
                                <input id="edit-end" type="datetime-local" v-model="form.end" />
                            </div>
                        </div>

                        <!-- Location & Venue Grid -->
                        <div class="grid grid--two">
                            <div class="form-group">
                                <label for="edit-location">Location <span class="required">*</span></label>
                                <input id="edit-location" type="text" v-model="form.location"
                                    placeholder="e.g., T-Junction" required />
                            </div>

                            <div class="form-group">
                                <label for="edit-venue">Venue <span class="required">*</span></label>
                                <select id="edit-venue" v-model="form.venue" required>
                                    <option disabled value="">Select a venue</option>
                                    <option v-for="venue in venues" :key="getVenueKey(venue)" :value="getVenueValue(venue)">{{ getVenueDisplay(venue) }}</option>
                                </select>
                            </div>
                        </div>

                        <!-- Map Location Toggle -->
                        <div class="form-group">
                            <label class="checkbox-label">
                                <input type="checkbox" v-model="showMapPicker" />
                                <span class="checkmark"></span>
                                Add map location
                            </label>
                        </div>

                        <!-- Location Picker with Map -->
                        <div v-if="showMapPicker" class="map-section">
                            <LocationPicker
                                :initialLat="form.latitude || 1.3521"
                                :initialLng="form.altitude || 103.8198"
                                @location-selected="handleLocationSelected"
                            />
                        </div>

                        <!-- Capacity & Category Grid -->
                        <div class="grid grid--two">
                            <div class="form-group">
                                <label for="edit-capacity">Capacity <span class="optional">(Optional)</span></label>
                                <input id="edit-capacity" type="number" min="0" v-model="form.capacity"
                                    placeholder="e.g., 500" />
                            </div>

                            <div class="form-group">
                                <label for="edit-category">Category <span class="required">*</span></label>
                                <select id="edit-category" v-model="form.category" required>
                                    <option disabled value="">Select a category</option>
                                    <option v-for="category in categories" :key="category" :value="category">{{
                                        category }}</option>
                                </select>
                            </div>
                        </div>

                        <!-- Tags -->
                        <div class="form-group">
                            <label for="edit-tags">Event Tags <span class="optional">(Optional, max {{ MAX_TAGS
                                    }})</span></label>
                            <div class="tag-input-wrapper">
                                <input id="edit-tags" type="text" v-model="tagInput" :placeholder="isTagLimitReached ? 'Tag limit reached' : 'Type a tag and press Enter'"
                                    @keydown="handleTagKeydown" @input="tagFeedback = ''"
                                    :disabled="isTagLimitReached" />
                                <button type="button" class="btn-add-tag" @click="handleTagSubmit"
                                    :disabled="isTagLimitReached || !tagInput.trim()">
                                    Add
                                </button>
                            </div>
                            <div v-if="filteredTagSuggestions.length" class="tag-suggestions">
                                <span class="tag-suggestions__label">Suggestions:</span>
                                <button v-for="suggestion in filteredTagSuggestions" :key="suggestion" type="button"
                                    class="tag-suggestion" @click="useTagSuggestion(suggestion)">
                                    {{ suggestion }}
                                </button>
                            </div>
                            <div v-if="selectedTags.length" class="tag-list">
                                <span v-for="tag in selectedTags" :key="tag" class="tag-chip">
                                    {{ tag }}
                                    <button type="button" class="tag-chip__remove" @click="removeTag(tag)"
                                        aria-label="Remove tag">
                                        &times;
                                    </button>
                                </span>
                            </div>
                            <div class="field-hint">Add up to {{ MAX_TAGS }} tags to help students find your event.</div>
                            <div v-if="tagFeedback" class="field-error">{{ tagFeedback }}</div>
                        </div>

                        <!-- Price & Image Grid -->
                        <div class="grid grid--two">
                            <div class="form-group">
                                <label for="edit-price">Price <span class="required">*</span></label>
                                <div class="currency-input">
                                    <span>$</span>
                                    <input id="edit-price" type="number" min="0" step="0.01" v-model="form.price"
                                        required />
                                </div>
                                <div class="field-hint">Enter 0 for free events</div>
                            </div>

                            <div class="form-group">
                                <label for="edit-image">Event Image <span class="optional">(Optional)</span></label>
                                <input id="edit-image" type="file" accept="image/*" @change="onFileChange" />
                                <div v-if="imagePreview" style="margin-top:8px;">
                                    <img :src="imagePreview" alt="Preview"
                                        style="max-width: 240px; border-radius: 8px;" />
                                </div>
                                <div class="field-hint">Leave empty to keep current image</div>
                            </div>
                        </div>

                        <!-- Form Actions -->
                        <footer class="form-actions">
                            <button type="button" class="btn btn-danger" @click="handleDeleteClick"
                                :disabled="submitting">
                                <span v-if="!submitting">Delete Event</span>
                                <span v-else class="loading">Deleting...</span>
                            </button>
                            <div class="form-actions-right">
                                <button type="button" class="btn btn-secondary" @click="handleCancelClick"
                                    :disabled="submitting">
                                    Cancel
                                </button>
                                <button type="submit" class="btn btn-primary" :disabled="!isValid || submitting">
                                    <span v-if="!submitting">Save Changes</span>
                                    <span v-else class="loading">Saving...</span>
                                </button>
                            </div>
                        </footer>
                    </form>
                </div>
            </div>
        </div>
    </transition>
</template>

<script>
import { mapGetters } from 'vuex';
import { updateEvent, getEventById, deleteEvent } from '../services/eventService';
import { createEventTag, deleteEventTag, getEventTagsByEventId } from '../services/eventTagService';
import { createTag, getAllTags } from '../services/tagService';
import LocationPicker from './LocationPicker.vue';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const MAX_TAGS = 10;

export default {
    name: 'EditEventModal',
    components: {
        LocationPicker
    },
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
    emits: ['close', 'updated'],
    data() {
        return {
            MAX_TAGS,
            form: {
                title: '',
                description: '',
                start: '',
                end: '',
                location: '',
                venue: '',
                capacity: '',
                category: '',
                price: '0',
                tags: [],
                latitude: null,
                altitude: null
            },
            originalForm: null,
            imageFile: null,
            imagePreview: '',
            originalImageUrl: '',
            submitting: false,
            error: '',
            success: '',
            tagInput: '',
            tagFeedback: '',
            confirmedAttendeeCount: 0,
            showMapPicker: false
        };
    },
    computed: {
        ...mapGetters(['categoryNames', 'categoryColorMap']),
        ...mapGetters('auth', ['currentUser']),

        venues() {
            const rawVenues = this.$store.state.venues || [];
            // Filter out undefined/null/empty values and ensure proper structure
            return rawVenues.filter(venue => venue != null && venue !== '').map(venue => {
                // Ensure venue has a name property or is a string
                if (typeof venue === 'string') return venue;
                if (venue && typeof venue === 'object' && venue.name) return venue;
                return null;
            }).filter(Boolean);
        },
        categories() {
            return this.categoryNames || [];
        },
        availableTags() {
            return (this.$store.state.availableTags || []).map(t => t.tag_name);
        },
        selectedTags() {
            return Array.isArray(this.form.tags) ? this.form.tags : [];
        },
        isTagLimitReached() {
            return this.selectedTags.length >= MAX_TAGS;
        },
        filteredTagSuggestions() {
            const input = this.tagInput.trim().toLowerCase();
            const existing = new Set(this.selectedTags.map((tag) => tag.toLowerCase()));
            const pool = this.availableTags.filter((tag) => {
                if (!tag) return false;
                const lower = tag.toLowerCase();
                if (existing.has(lower)) return false;
                if (!input) return false;
                return lower.includes(input);
            });
            return pool.slice(0, 8);
        },
        descriptionLength() {
            return this.form.description.length;
        },
        isValid() {
            const f = this.form;
            return (
                f.title.trim() &&
                f.description.trim() &&
                f.start &&
                f.location.trim() &&
                f.category &&
                f.venue &&
                f.price !== ''
            );
        },
        hasChanges() {
            if (!this.originalForm) return false;
            return JSON.stringify(this.form) !== JSON.stringify(this.originalForm) || this.imageFile !== null;
        }
    },
    watch: {
        visible(val) {
            document.body.classList.toggle('modal-open', val);
            if (val && this.event) {
                this.loadEventData();
            }
        },
        event(newEvent) {
            if (newEvent && this.visible) {
                this.loadEventData();
            }
        },
        'form.venue'(newVenue) {
            if (newVenue) {
                this.handleVenueSelected(newVenue);
            }
        }
    },
    mounted() {
        if (this.visible) {
            document.body.classList.add('modal-open');
            if (this.event) {
                this.loadEventData();
            }
        }
        window.addEventListener('keyup', this.handleEsc, { passive: true });
        this.ensureMetadata();
    },
    beforeUnmount() {
        document.body.classList.remove('modal-open');
        window.removeEventListener('keyup', this.handleEsc);
    },
    methods: {
        async loadEventData() {
            if (!this.event || !this.event.id) return;

            try {
                // Ensure metadata is loaded first
                await this.ensureMetadata();

                // Fetch fresh event data from backend
                const response = await getEventById(this.event.id);
                const eventData = response.data;

                // Fetch tags for this event
                const eventTagsResponse = await getEventTagsByEventId(this.event.id);
                const tagsResponse = await getAllTags();
                const eventTags = eventTagsResponse.data;
                const tags = tagsResponse.data;

                // Create tag map
                const tagMap = {};
                tags.forEach(tag => {
                    tagMap[tag.id] = tag.tag_name;
                });

                // Get tag names for this event
                const tagNames = eventTags.map(et => tagMap[et.tag_id]).filter(Boolean);
                eventData.tags = tagNames;

                // Parse time from formatted string like '8:00 AM' or '8:00 AM - 10:00 AM'
                const parseTime = (timeStr) => {
                    if (!timeStr) return { hours: 0, minutes: 0 };
                    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
                    if (!match) return { hours: 0, minutes: 0 };
                    let hours = parseInt(match[1]);
                    const minutes = parseInt(match[2]);
                    const ampm = match[3].toUpperCase();
                    if (ampm === 'PM' && hours !== 12) hours += 12;
                    if (ampm === 'AM' && hours === 12) hours = 0;
                    return { hours, minutes };
                };

                // Combine date and time for start datetime
                const timeParts = eventData.time ? eventData.time.split(' - ') : [];
                const startTimeStr = timeParts[0]?.trim() || '';
                const endTimeStr = timeParts[1]?.trim() || '';
                
                const { hours: startHours, minutes: startMinutes } = parseTime(startTimeStr);
                const startDate = new Date(eventData.date);
                startDate.setHours(startHours, startMinutes, 0, 0);
                const startDateTime = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}T${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`;

                // Combine date and time for end datetime if end time exists
                let endDateTime = '';
                if (endTimeStr) {
                    const { hours: endHours, minutes: endMinutes } = parseTime(endTimeStr);
                    const endDate = new Date(eventData.date);
                    endDate.setHours(endHours, endMinutes, 0, 0);
                    endDateTime = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}T${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
                }

                // Parse price from formatted string
                const parsePrice = (priceStr) => {
                    if (!priceStr || priceStr === 'FREE') return '0';
                    return priceStr.replace('$', '').trim();
                };

                const confirmedAttendeesRaw =
                    eventData.attendees ??
                    eventData.confirmed_attendees ??
                    eventData.confirmedAttendees ??
                    this.event?.attendees ??
                    0;
                const confirmedAttendees = Number(confirmedAttendeesRaw);
                this.confirmedAttendeeCount = Number.isFinite(confirmedAttendees) && confirmedAttendees > 0
                    ? confirmedAttendees
                    : 0;

                this.form = {
                    title: eventData.title || '',
                    description: eventData.description || '',
                    start: startDateTime,
                    end: endDateTime, // Now properly parsed from database if available
                    location: eventData.location || '',
                    venue: eventData.venue || '',
                    capacity: eventData.maxAttendees != null ? String(eventData.maxAttendees) : '',
                    category: eventData.category || '',
                    price: parsePrice(eventData.price),
                    tags: Array.isArray(eventData.tags) ? [...eventData.tags] : [],
                    latitude: eventData.latitude || 1.3521,
                    altitude: eventData.altitude || 103.8198
                };

                // Store original form state
                this.originalForm = JSON.parse(JSON.stringify(this.form));

                // Set map picker visibility based on whether event has coordinates
                this.showMapPicker = !!(eventData.latitude && eventData.altitude);

                // Set image preview
                this.originalImageUrl = eventData.image || '';
                if (this.originalImageUrl) {
                    this.imagePreview = this.eventImageSrc(eventData);
                }

                this.imageFile = null;
                this.error = '';
                this.success = '';
            } catch (err) {
                console.error('Failed to load event data:', err);
                this.error = 'Failed to load event data';
            }
        },

        eventImageSrc(event) {
            if (!event) return '';
            const raw = event.image || event.image_url || event.imageUrl || event.cover;
            if (!raw) return '';
            if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
            const normalized = raw.replace('/uploads/event/event_', '/uploads/event/');
            return `${API_BASE_URL}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
        },

        async ensureMetadata() {
            const hasCategories = Array.isArray(this.$store.state.categories) && this.$store.state.categories.length > 0;
            const hasVenues = Array.isArray(this.$store.state.venues) && this.$store.state.venues.length > 0;
            const tasks = [];
            if (!hasCategories) {
                tasks.push(this.$store.dispatch('fetchEventCategories'));
            }
            if (!hasVenues) {
                tasks.push(this.$store.dispatch('fetchEventVenues'));
            }
            tasks.push(this.$store.dispatch('fetchAvailableTags'));
            try {
                await Promise.all(tasks);
            } catch (err) {
                console.error('Failed to load metadata:', err);
            }
        },

        handleEsc(event) {
            if (event.key === 'Escape' && this.visible) {
                this.handleCancelClick();
            }
        },

        async handleCancelClick() {
            if (this.hasChanges) {
                const confirmed = window.confirm('You have unsaved changes. Are you sure you want to discard them?');
                if (!confirmed) return;
            }
            this.emitClose();
        },

        async handleDeleteClick() {
            const confirmed = window.confirm(
                `Are you sure you want to delete "${this.form.title}"? This action cannot be undone and will also remove all RSVPs and saved events for this event.`
            );
            if (!confirmed) return;

            this.error = '';
            this.success = '';
            this.submitting = true;

            try {
                await deleteEvent(this.event.id);
                this.success = 'Event deleted successfully!';
                
                // Refresh the events list
                await Promise.all([
                    this.$store.dispatch('fetchAllEvents'),
                    this.$store.dispatch('fetchClubOwnedEvents', { force: true }).catch(() => {})
                ]);
                
                setTimeout(() => {
                    this.$emit('deleted');
                    this.emitClose();
                }, 1000);
            } catch (err) {
                console.error('Delete event failed:', err);
                this.error = err?.response?.data?.error || err?.message || 'Failed to delete event. Please try again.';
            } finally {
                this.submitting = false;
            }
        },

        emitClose() {
            this.$emit('close');
            this.resetForm();
        },

        resetForm() {
            this.form = {
                title: '',
                description: '',
                start: '',
                end: '',
                location: '',
                venue: '',
                capacity: '',
                category: '',
                price: '0',
                tags: [],
                latitude: null,
                altitude: null
            };
            this.originalForm = null;
            this.imageFile = null;
            this.imagePreview = '';
            this.originalImageUrl = '';
            this.error = '';
            this.success = '';
            this.tagInput = '';
            this.tagFeedback = '';
            this.confirmedAttendeeCount = 0;
            this.showMapPicker = false;
        },

        onFileChange(e) {
            const file = e?.target?.files?.[0];
            this.imageFile = file || null;
            if (!file) {
                if (this.originalImageUrl) {
                    this.imagePreview = this.eventImageSrc(this.event);
                } else {
                    this.imagePreview = '';
                }
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                this.imagePreview = reader.result;
            };
            reader.readAsDataURL(file);
        },

        normalizeTagValue(raw) {
            if (typeof raw !== 'string') return '';
            return raw.trim().replace(/\s+/g, ' ').slice(0, 40);
        },

        addTag(raw) {
            const normalized = this.normalizeTagValue(raw);
            if (!normalized) {
                this.tagFeedback = 'Tag cannot be empty';
                return false;
            }
            if (!Array.isArray(this.form.tags)) {
                this.form.tags = [];
            }
            const lower = normalized.toLowerCase();
            if (this.form.tags.some((tag) => tag.toLowerCase() === lower)) {
                this.tagFeedback = 'Tag already added';
                return false;
            }
            if (this.form.tags.length >= MAX_TAGS) {
                this.tagFeedback = `Maximum ${MAX_TAGS} tags allowed`;
                return false;
            }
            this.form.tags.push(normalized);
            this.tagInput = '';
            this.tagFeedback = '';
            return true;
        },

        removeTag(tagToRemove) {
            if (!Array.isArray(this.form.tags)) return;
            this.form.tags = this.form.tags.filter((tag) => tag !== tagToRemove);
            this.tagFeedback = '';
        },

        handleTagSubmit() {
            if (!this.tagInput.trim()) return;
            this.addTag(this.tagInput);
        },

        handleTagKeydown(event) {
            if (event.key === 'Enter' || event.key === ',') {
                event.preventDefault();
                this.handleTagSubmit();
            } else if (event.key === 'Backspace' && !this.tagInput && this.selectedTags.length) {
                event.preventDefault();
                this.removeTag(this.selectedTags[this.selectedTags.length - 1]);
            }
        },

        useTagSuggestion(tag) {
            this.addTag(tag);
        },

        handleLocationSelected(locationData) {
            // Only update if this is a user action (not initialization)
            // If isUserAction is false/missing, skip the update to prevent auto-submit
            console.log('[EditEventModal] handleLocationSelected called:', {
                isUserAction: locationData.isUserAction,
                latitude: locationData.latitude,
                altitude: locationData.altitude
            });
            
            if (locationData.isUserAction === false) {
                console.log('[EditEventModal] Skipping - not a user action');
                return;
            }
            
            console.log('[EditEventModal] Updating form coordinates');
            this.form.latitude = locationData.latitude;
            this.form.altitude = locationData.altitude;
            console.log('[EditEventModal] New form state:', {
                latitude: this.form.latitude,
                altitude: this.form.altitude,
                hasChanges: this.hasChanges
            });
        },

        handleVenueSelected(selectedVenue) {
            // Find the venue data from store
            const eventVenues = this.$store.state.venues || [];
            // Handle both string venue names and full venue objects
            const venue = eventVenues.find(v => {
                const venueName = typeof v === 'string' ? v : (v?.name || '');
                return venueName === selectedVenue;
            });
            
            if (venue) {
                // If venue is an object with coordinates
                if (typeof venue === 'object' && venue?.latitude && venue?.altitude) {
                    this.form.latitude = parseFloat(venue.latitude);
                    this.form.altitude = parseFloat(venue.altitude);
                    if (!this.form.location.trim()) {
                        this.form.location = venue?.name || '';
                    }
                }
                // If venue is just a name string, just set the location if it's empty
                else if (typeof venue === 'string') {
                    if (!this.form.location.trim()) {
                        this.form.location = venue;
                    }
                }
            }
        },

        getVenueKey(venue) {
            if (!venue) return 'undefined';
            if (typeof venue === 'string') return venue;
            return venue.name || venue.id || 'unknown';
        },

        getVenueValue(venue) {
            if (!venue) return '';
            if (typeof venue === 'string') return venue;
            return venue.name || '';
        },

        getVenueDisplay(venue) {
            if (!venue) return 'Unknown Venue';
            if (typeof venue === 'string') return venue;
            return venue.name || 'Unknown Venue';
        },

        toIsoString(value) {
            if (!value) return null;
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return null;
            return date.toISOString();
        },

        formatLocation() {
            const { location, venue } = this.form;
            if (!venue || venue === 'Other Venue') return location.trim();
            return `${location.trim()}`;
        },

        updateEventInStore(eventId, updatedEventData) {
            // The backend now returns properly shaped data, so we can use it directly
            // Update allEvents in store
            if (this.$store.state.allEvents) {
                const eventIndex = this.$store.state.allEvents.findIndex(event => event.id === eventId);
                if (eventIndex !== -1) {
                    this.$store.state.allEvents.splice(eventIndex, 1, updatedEventData);
                }
            }

            // Update clubOwnedEvents in store
            if (this.$store.state.clubOwnedEvents) {
                const eventIndex = this.$store.state.clubOwnedEvents.findIndex(event => event.id === eventId);
                if (eventIndex !== -1) {
                    this.$store.state.clubOwnedEvents.splice(eventIndex, 1, updatedEventData);
                }
            }
        },

        formatTimeForDisplay(startDateTime, endDateTime) {
            const startDate = new Date(startDateTime);
            const startTimeStr = startDate.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });

            if (endDateTime) {
                const endDate = new Date(endDateTime);
                const endTimeStr = endDate.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                });
                return `${startTimeStr} - ${endTimeStr}`;
            }

            return startTimeStr;
        },

        readFileAsDataURL(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        },

        async handleSubmit() {
            console.log('[EditEventModal] handleSubmit called');
            console.log('[EditEventModal] handleSubmit - Stack trace:');
            console.trace();
            if (!this.isValid) {
                console.log('[EditEventModal] Form invalid, returning');
                return;
            }

            const rawCapacity = this.form.capacity;
            const desiredCapacity = rawCapacity === '' || rawCapacity === null || typeof rawCapacity === 'undefined'
                ? null
                : Number(rawCapacity);

            if (desiredCapacity !== null && (!Number.isFinite(desiredCapacity) || desiredCapacity < 0)) {
                this.error = 'Capacity must be a non-negative number or left blank.';
                this.success = '';
                return;
            }

            if (desiredCapacity !== null && desiredCapacity < this.confirmedAttendeeCount) {
                this.error = `Capacity cannot be lower than the ${this.confirmedAttendeeCount} confirmed attendees already registered.`;
                this.success = '';
                return;
            }

            this.error = '';
            this.success = '';
            this.submitting = true;

            try {
                // Diff tags
                const originalTags = Array.isArray(this.originalForm?.tags) ? this.originalForm.tags : [];
                const newTags = this.selectedTags.slice(0, MAX_TAGS);
                const eventId = this.event.id;

                // Find added and removed tags
                const addedTags = newTags.filter(tag => !originalTags.includes(tag));
                const removedTags = originalTags.filter(tag => !newTags.includes(tag));

                // Get all available tags from store (with their IDs)
                const allTagObjs = this.$store.state.availableTags || [];
                // Fallback: if availableTags not present, use availableTags and ignore IDs

                // Helper to get tag_id by tag name
                const getTagId = (tagName) => {
                    if (!Array.isArray(allTagObjs)) return null;
                    const found = allTagObjs.find(t => t.tag_name === tagName);
                    return found?.id || null;
                };

                // Add new tags
                for (const tag of addedTags) {
                    let tagId = getTagId(tag);
                    if (!tagId) {
                        // Create new tag
                        try {
                            const createResponse = await createTag({ tag_name: tag });
                            tagId = createResponse.data.id;
                            // Update local store
                            this.$store.commit('SET_AVAILABLE_TAGS', [...allTagObjs, { id: tagId, tag_name: tag }]);
                        } catch (createErr) {
                            console.error('Failed to create tag:', tag, createErr);
                            continue;
                        }
                    }
                    if (tagId) {
                        await createEventTag(eventId, tagId);
                    }
                }
                // Remove old tags
                for (const tag of removedTags) {
                    const tagId = getTagId(tag);
                    if (tagId) {
                        await deleteEventTag(eventId, tagId);
                    }
                }

                // Update other event fields
                const payload = {
                    title: this.form.title.trim(),
                    description: this.form.description.trim(),
                    datetime: this.toIsoString(this.form.start),
                    enddatetime: this.toIsoString(this.form.end),
                    location: this.formatLocation(),
                    category: this.form.category,
                    capacity: desiredCapacity,
                    price: this.form.price ? Number(this.form.price) : 0,
                    owner_id: this.currentUser.id,
                    venue: this.form.venue,
                    image_url: this.originalImageUrl, // Keep existing image URL
                    latitude: this.showMapPicker ? this.form.latitude : null,
                    altitude: this.showMapPicker ? this.form.altitude : null
                };

                // Update event and capture response
                let updatedEventData;
                if (this.imageFile) {
                    const imageBase64 = await this.readFileAsDataURL(this.imageFile);
                    const body = {
                        ...payload,
                        imageBase64: imageBase64,
                        imageOriginalName: this.imageFile.name
                    };
                    const response = await updateEvent(eventId, body);
                    updatedEventData = response.data;
                    
                    // Add a small delay to ensure the image file is fully written to disk
                    await new Promise(resolve => setTimeout(resolve, 500));
                } else {
                    const response = await updateEvent(eventId, payload);
                    updatedEventData = response.data;
                }

                // Update store with the actual updated event data from backend
                this.updateEventInStore(eventId, updatedEventData);

                // Instead of fetching all events, fetch the specific updated event to ensure we have the latest data
                try {
                    const freshEventResponse = await getEventById(eventId);
                    const freshEventData = freshEventResponse.data;
                    
                    // Update the store again with the fresh data from getEventById
                    this.updateEventInStore(eventId, freshEventData);
                } catch (error) {
                    console.warn('Failed to fetch fresh event data:', error);
                }

                this.success = 'Event updated successfully!';
                setTimeout(() => {
                    this.$emit('updated');
                    this.emitClose();
                }, 1000);
            } catch (err) {
                console.error('Update event failed:', err);
                this.error = err?.response?.data?.error || err?.message || 'Failed to update event. Please try again.';
            } finally {
                this.submitting = false;
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
    overflow-y: auto;
}

.modal-panel {
    position: relative;
    display: flex;
    flex-direction: column;
    max-width: min(800px, 90vw);
    width: 100%;
    max-height: min(92vh, 920px);
    background: var(--color-surface);
    color: var(--color-text);
    border-radius: 24px;
    box-shadow: 0 24px 48px rgba(15, 23, 42, 0.2);
    overflow: hidden;
    margin: auto;
}

.modal-header {
    padding: clamp(24px, 3vw, 32px);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.modal-header h2 {
    margin: 0;
    font-size: clamp(24px, 3vw, 28px);
    font-weight: var(--font-weight-bold);
    color: var(--color-text);
}

.modal-header p {
    margin: 8px 0 0 0;
    color: var(--color-text-secondary);
    font-size: 14px;
}

.modal-body {
    padding: clamp(20px, 3vw, 32px);
    overflow-y: auto;
    flex: 1;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 20px;
}

label {
    font-weight: var(--font-weight-medium);
    color: var(--color-text);
    font-size: 14px;
}

.required {
    color: var(--color-error);
}

.optional {
    color: var(--color-text-secondary);
    font-weight: var(--font-weight-normal);
}

input,
textarea,
select {
    width: 100%;
    border-radius: 12px;
    border: 1px solid var(--color-border);
    padding: 12px 16px;
    font-size: 14px;
    background: var(--color-background);
    color: var(--color-text);
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    font-family: inherit;
}

input:focus,
textarea:focus,
select:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    background: var(--color-surface);
    color: var(--color-text);
}

textarea {
    resize: vertical;
    min-height: 100px;
}

.field-hint {
    font-size: 12px;
    color: var(--color-text-secondary);
}

.field-error {
    font-size: 12px;
    color: var(--color-error);
}

.grid {
    display: grid;
    gap: 16px;
}

.grid--two {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.currency-input {
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid var(--color-border);
    border-radius: 12px;
    background: var(--color-background);
    padding: 0 12px;
}

.currency-input span {
    color: var(--color-text-secondary);
    font-weight: var(--font-weight-medium);
}

.currency-input input {
    border: none;
    padding: 12px 0;
    background: transparent;
}

.currency-input input:focus {
    box-shadow: none;
}

.tag-input-wrapper {
    display: flex;
    align-items: center;
    gap: 8px;
}

.tag-input-wrapper input {
    flex: 1;
}

.btn-add-tag {
    border: none;
    border-radius: 12px;
    padding: 10px 16px;
    background: var(--color-primary);
    color: #fff;
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition: background 0.2s ease;
    font-size: 13px;
}

.btn-add-tag:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-add-tag:not(:disabled):hover {
    background: var(--color-primary-hover);
}

.tag-suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin-top: 8px;
}

.tag-suggestions__label {
    font-size: 12px;
    color: var(--color-text-secondary);
}

.tag-suggestion {
    border: 1px solid var(--color-border);
    background: #fff;
    border-radius: 999px;
    padding: 4px 10px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.tag-suggestion:hover {
    border-color: var(--color-primary);
    background: rgba(37, 99, 235, 0.08);
}

.tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
}

.tag-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: var(--color-secondary);
    color: var(--color-text);
    border-radius: 999px;
    padding: 4px 10px;
    font-size: 12px;
}

.tag-chip__remove {
    background: transparent;
    border: none;
    color: inherit;
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
    padding: 0;
}

.tag-chip__remove:hover {
    color: var(--color-error);
}

.form-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid var(--color-border);
}

.form-actions-right {
    display: flex;
    gap: 12px;
}

.btn {
    border-radius: 12px;
    padding: 12px 24px;
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    font-size: 14px;
    border: none;
}

.btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn-primary {
    background: var(--color-primary);
    color: #fff;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
}

.btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(37, 99, 235, 0.3);
}

.btn-secondary {
    background: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-text);
}

.btn-secondary:hover:not(:disabled) {
    background: var(--color-secondary);
}

.btn-danger {
    background: var(--color-error);
    color: #fff;
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);
}

.btn-danger:hover:not(:disabled) {
    background: #dc2626;
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(220, 38, 38, 0.3);
}

.alert {
    padding: 12px 16px;
    border-radius: 12px;
    font-size: 14px;
    margin-bottom: 16px;
}

.alert--error {
    background: rgba(220, 38, 38, 0.1);
    color: #991b1b;
    border: 1px solid rgba(220, 38, 38, 0.3);
}

.alert--success {
    background: rgba(16, 185, 129, 0.1);
    color: #047857;
    border: 1px solid rgba(16, 185, 129, 0.3);
}

.loading {
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
    transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
    opacity: 0;
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    font-weight: normal;
    font-size: 14px;
    color: var(--color-text);
    margin-bottom: 8px;
}

.checkbox-label input[type="checkbox"] {
    width: 18px;
    height: 18px;
    margin: 0;
    cursor: pointer;
    accent-color: var(--color-primary);
}

.map-section {
    margin-top: 16px;
    padding: 20px;
    background: var(--color-background);
    border-radius: 12px;
    border: 1px solid var(--color-border);
}

@media (max-width: 640px) {
    .modal-panel {
        border-radius: 16px;
        max-height: 95vh;
    }

    .grid--two {
        grid-template-columns: 1fr;
    }

    .form-actions {
        flex-direction: column;
    }

    .btn {
        width: 100%;
    }
}
</style>

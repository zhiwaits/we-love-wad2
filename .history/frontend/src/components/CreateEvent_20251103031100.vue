<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { createEvent } from '../services/eventService';
import LocationPicker from './LocationPicker.vue';

const store = useStore();
const router = useRouter();

const MAX_TAGS = 10;

const DEFAULT_LAT = 1.3521;
const DEFAULT_LNG = 103.8198;

const form = ref({
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
});
const imageFile = ref(null);
const imagePreview = ref('');
const locationPickerRef = ref(null);
const useMapLocation = ref(true);
const savedMapCoordinates = ref({ lat: DEFAULT_LAT, lng: DEFAULT_LNG });
const showMapPicker = ref(false);

const submitting = ref(false);
const error = ref('');
const success = ref('');
const tagInput = ref('');
const tagFeedback = ref('');

const venues = computed(() => store.state.venues);
const categories = computed(() => store.getters['categoryNames'] || []);
const categoryColorMap = computed(() => store.getters['categoryColorMap'] || {});
const availableTags = computed(() => (store.state.availableTags || []).map(t => t.tag_name));
const selectedTags = computed(() => Array.isArray(form.value.tags) ? form.value.tags : []);
const isTagLimitReached = computed(() => selectedTags.value.length >= MAX_TAGS);
const filteredTagSuggestions = computed(() => {
	const input = tagInput.value.trim().toLowerCase();
	const existing = new Set(selectedTags.value.map((tag) => tag.toLowerCase()));
	const pool = availableTags.value.filter((tag) => {
		if (!tag) return false;
		const lower = tag.toLowerCase();
		if (existing.has(lower)) return false;
		if (!input) return false;
		return lower.includes(input);
	});
	return pool.slice(0, 8);
});

const currentUser = computed(() => store.getters['auth/currentUser']);
const ownerId = computed(() => currentUser.value?.id || null);
const isClub = computed(() => {
	const role = currentUser.value?.role || currentUser.value?.account_type;
	return role === 'club';
});

const descriptionLength = computed(() => form.value.description.length);

const isValid = computed(() => {
	if (!isClub.value || !ownerId.value) return false;
	const f = form.value;
	return (
		f.title.trim() &&
		f.description.trim() &&
		f.start &&
		f.location.trim() &&
		f.category &&
		f.venue &&
		f.price !== '' &&
		!!imageFile.value
	);
});

const formatLocation = () => {
	const { location, venue } = form.value;
	if (!venue || venue === 'Other Venue') return location.trim();
	return `${location.trim()}`;
};

const toIsoString = (value) => {
	if (!value) return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return date.toISOString();
};

const resetMessages = () => {
	error.value = '';
	success.value = '';
};

const resetForm = () => {
	form.value = {
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
	useMapLocation.value = true;
	savedMapCoordinates.value = { lat: DEFAULT_LAT, lng: DEFAULT_LNG };
	imageFile.value = null;
	imagePreview.value = '';
	tagInput.value = '';
	tagFeedback.value = '';
};

const ensureMetadata = async () => {
	const hasCategories = Array.isArray(store.state.categories) && store.state.categories.length > 0;
	const hasVenues = Array.isArray(store.state.venues) && store.state.venues.length > 0;
	const tasks = [];
	if (!hasCategories) {
		tasks.push(store.dispatch('fetchEventCategories'));
	}
	if (!hasVenues) {
		tasks.push(store.dispatch('fetchEventVenues'));
	}
	tasks.push(store.dispatch('fetchAvailableTags'));
	try {
		await Promise.all(tasks);
	} catch (err) {
		console.error('Failed to load event metadata', err);
	}
};

onMounted(() => {
	ensureMetadata();
});

const onFileChange = (e) => {
		const file = e?.target?.files?.[0];
		imageFile.value = file || null;
		if (!file) {
			imagePreview.value = '';
			return;
		}
		const reader = new FileReader();
		reader.onload = () => {
			imagePreview.value = reader.result;
		};
		reader.readAsDataURL(file);
};

const readFileAsDataURL = (file) => {
  return new Promise((resolve, reject) => {
    try {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = (e) => reject(e);
      r.readAsDataURL(file);
    } catch (e) {
      reject(e);
    }
  });
};

const normalizeTagValue = (raw) => {
	if (typeof raw !== 'string') return '';
	return raw.trim().replace(/\s+/g, ' ').slice(0, 40);
};

const addTag = (raw) => {
	const normalized = normalizeTagValue(raw);
	if (!normalized) {
		tagFeedback.value = 'Tag cannot be empty.';
		return false;
	}
	if (!Array.isArray(form.value.tags)) {
		form.value.tags = [];
	}
	const lower = normalized.toLowerCase();
	if (form.value.tags.some((tag) => tag.toLowerCase() === lower)) {
		tagFeedback.value = 'Tag already added.';
		return false;
	}
	if (form.value.tags.length >= MAX_TAGS) {
		tagFeedback.value = `You can add up to ${MAX_TAGS} tags.`;
		return false;
	}
	form.value.tags.push(normalized);
	tagInput.value = '';
	tagFeedback.value = '';
	return true;
};

const removeTag = (tagToRemove) => {
	if (!Array.isArray(form.value.tags)) return;
	form.value.tags = form.value.tags.filter((tag) => tag !== tagToRemove);
	tagFeedback.value = '';
};

const handleTagSubmit = () => {
	if (!tagInput.value.trim()) return;
	addTag(tagInput.value);
};

const handleTagKeydown = (event) => {
	if (event.key === 'Enter' || event.key === ',') {
		event.preventDefault();
		handleTagSubmit();
	} else if (event.key === 'Tab') {
		if (tagInput.value.trim()) {
			event.preventDefault();
			handleTagSubmit();
		}
	} else if (event.key === 'Backspace' && !tagInput.value && selectedTags.value.length) {
		event.preventDefault();
		form.value.tags = selectedTags.value.slice(0, -1);
		tagFeedback.value = '';
	}
};

const useTagSuggestion = (tag) => {
	addTag(tag);
};

const handleLocationSelected = (locationData) => {
	form.value.latitude = locationData.latitude;
	form.value.altitude = locationData.altitude;
};

const handleVenueSelected = (selectedVenue) => {
	// Find the venue data from store
	const eventVenues = store.state.venues || [];
	// Handle both string venue names and full venue objects
	const venue = eventVenues.find(v => {
		const venueName = typeof v === 'string' ? v : v.name;
		return venueName === selectedVenue;
	});
	
	if (venue) {
		// If venue is an object with coordinates
		if (typeof venue === 'object' && venue.latitude && venue.altitude) {
			form.value.latitude = parseFloat(venue.latitude);
			form.value.altitude = parseFloat(venue.altitude);
			form.value.location = venue.name;
		}
		// If venue is just a name string, just set the location
		else if (typeof venue === 'string') {
			form.value.location = venue;
		}
	}
};

// Watch venue changes and auto-populate coordinates
watch(() => form.value.venue, (newVenue) => {
	if (newVenue) {
		handleVenueSelected(newVenue);
	}
});

watch(useMapLocation, async (enabled) => {
	if (!enabled) {
		const currentLat = Number(form.value.latitude);
		const currentLng = Number(form.value.longitude);
		if (Number.isFinite(currentLat) && Number.isFinite(currentLng)) {
			savedMapCoordinates.value = { lat: currentLat, lng: currentLng };
		}
		form.value.latitude = null;
		form.value.longitude = null;
	} else {
		const lat = Number(savedMapCoordinates.value?.lat);
		const lng = Number(savedMapCoordinates.value?.lng);
		form.value.latitude = Number.isFinite(lat) ? lat : DEFAULT_LAT;
		form.value.longitude = Number.isFinite(lng) ? lng : DEFAULT_LNG;
		await nextTick();
	}
});

const handleSubmit = async () => {
	if (!isValid.value) return;
	resetMessages();
	submitting.value = true;

	try {

		if (!imageFile.value) {
			error.value = 'Event image is required.';
			submitting.value = false;
			return;
		}

    if (imageFile.value && !imagePreview.value) {
      try {
        imagePreview.value = await readFileAsDataURL(imageFile.value);
      } catch {}
    }

		const latitude = useMapLocation.value ? Number(form.value.latitude) : null;
		const longitude = useMapLocation.value ? Number(form.value.longitude) : null;

		const payload = {
			title: form.value.title.trim(),
			description: form.value.description.trim(),
			datetime: toIsoString(form.value.start),
			enddatetime: toIsoString(form.value.end),
			location: formatLocation(),
			category: form.value.category,
			capacity: form.value.capacity ? Number(form.value.capacity) : null,
			price: form.value.price ? Number(form.value.price) : 0,
			owner_id: ownerId.value,
			venue: form.value.venue,
			latitude: form.value.latitude,
			altitude: form.value.altitude
		};
		const tagsPayload = selectedTags.value.slice(0, MAX_TAGS);

				const body = {
					...payload,
					tags: tagsPayload,
					imageBase64: imagePreview.value || null,
					imageOriginalName: imageFile.value?.name || null
				};

			await createEvent(body);
				success.value = 'Event created successfully!';
				await Promise.all([
					store.dispatch('fetchAllEvents', { force: true }).catch(() => {}),
					store.dispatch('fetchClubOwnedEvents', { force: true }).catch(() => {}),
					store.dispatch('clubs/ensureEvents', { force: true }, { root: true }).catch(() => {})
				]);
		if (ownerId.value) {
			store.dispatch('fetchClubStats', ownerId.value, { root: true }).catch(() => {});
		}
		resetForm();
		store.dispatch('fetchAvailableTags', { force: true }).catch(() => {});
		store.dispatch('showToast', {
			message: 'Event created successfully! Redirecting to manage events.',
			type: 'success'
		}).catch(() => {});
				await router.push({ name: 'EditEvents' });
	} catch (err) {
		error.value = err?.response?.data?.error || err?.message || 'Failed to create event. Please try again.';
	} finally {
		submitting.value = false;
	}
};
</script>

<template>
	<div class="container mb-5">
		<div class="create-event">
			<header class="page-header">
				<h1>Create New Event</h1>
				<p>Fill in the details below to create and publish your event</p>
			</header>

			<div class="card">
				<div class="card-header">
					<h2>Event Details</h2>
					<p>Provide comprehensive information about your event</p>
				</div>

				<form class="form" @submit.prevent="handleSubmit">
					<div v-if="error" class="alert alert--error">{{ error }}</div>
					<div v-if="success" class="alert alert--success">{{ success }}</div>

					<div class="form-group">
						<label for="event-title">Event Title <span>*</span></label>
						<input id="event-title" type="text" v-model="form.title" placeholder="e.g., Vivace" />
					</div>

					<div class="form-group">
						<label for="event-description">Event Description <span>*</span></label>
						<textarea id="event-description" rows="4" v-model="form.description"
							placeholder="Provide a description of your event..."></textarea>
						<div class="field-hint">{{ descriptionLength }} characters</div>
					</div>

					<div class="grid grid--two">
						<div class="form-group">
							<label for="event-start">Start Date &amp; Time <span>*</span></label>
							<input id="event-start" type="datetime-local" v-model="form.start" lang="en-GB" />
						</div>

						<div class="form-group">
							<label for="event-end">End Date &amp; Time <span class="hint">(Optional)</span></label>
							<input id="event-end" type="datetime-local" v-model="form.end" lang="en-GB" />
						</div>
					</div>

					<div class="grid grid--two">
						<div class="form-group">
							<label for="event-location">Location <span>*</span></label>
							<input id="event-location" type="text" v-model="form.location"
								placeholder="e.g., T-Junction" />
						</div>

						<div class="form-group">
							<label for="event-venue">Venue <span>*</span></label>
							<select id="event-venue" v-model="form.venue">
								<option disabled value="">Select a venue</option>
								<option v-for="venue in venues" :key="venue.id || venue.name" :value="venue.name">{{ venue.name }}</option>
							</select>
						</div>
					</div>

					<!-- Map Location Toggle -->
					<div class="form-group">
						<label class="checkbox-label">
							<input type="checkbox" v-model="showMapPicker" />
							<span class="checkmark"></span>
							Use interactive map for precise location (optional)
						</label>
						<div class="field-hint">Enable this if you need to set exact coordinates for your event location.</div>
					</div>

				<!-- Location Picker with Map -->
				<div v-if="showMapPicker" class="map-section">
					<LocationPicker
						ref="locationPickerRef"
						:initialLat="form.latitude || 1.3521"
						:initialLng="form.altitude || 103.8198"
						@location-selected="handleLocationSelected"
					/>
				</div>					<div class="grid grid--two">
						<div class="form-group">
							<label for="event-capacity">Capacity <span class="hint">(Optional)</span></label>
							<input id="event-capacity" type="number" min="0" v-model="form.capacity"
								placeholder="e.g., 500" />
						</div>

						<div class="form-group">
							<label for="event-category">Category <span>*</span></label>
							<div class="category-select">
								<select id="event-category" v-model="form.category">
									<option disabled value="">Select a category</option>
									<option v-for="category in categories" :key="category" :value="category">{{ category }}</option>
								</select>
							</div>
						</div>
					</div>

					<div class="form-group">
						<label for="event-tags">Event Tags <span class="hint">(Optional, max {{ MAX_TAGS }})</span></label>
						<div class="tag-input-wrapper">
							<input
								id="event-tags"
								type="text"
								v-model="tagInput"
								:placeholder="isTagLimitReached ? 'Tag limit reached' : 'Type a tag and press Enter'"
								@keydown="handleTagKeydown"
								@input="tagFeedback = ''"
								:disabled="isTagLimitReached"
							/>
							<button
								type="button"
								class="btn-add-tag"
								@click="handleTagSubmit"
								:disabled="isTagLimitReached || !tagInput.trim()"
							>
								Add
							</button>
						</div>
						<div v-if="filteredTagSuggestions.length" class="tag-suggestions">
							<span class="tag-suggestions__label">Suggestions:</span>
							<button
								v-for="suggestion in filteredTagSuggestions"
								:key="suggestion"
								type="button"
								class="tag-suggestion"
								@click="useTagSuggestion(suggestion)"
							>
								{{ suggestion }}
							</button>
						</div>
						<div v-if="selectedTags.length" class="tag-list">
							<span v-for="tag in selectedTags" :key="tag" class="tag-chip">
								{{ tag }}
								<button type="button" class="tag-chip__remove" @click="removeTag(tag)" aria-label="Remove tag">
									&times;
								</button>
							</span>
						</div>
						<div class="field-hint">Add up to {{ MAX_TAGS }} tags to help students find your event.</div>
						<div v-if="tagFeedback" class="field-error">{{ tagFeedback }}</div>
					</div>

					<div class="grid grid--two">
						<div class="form-group">
							<label for="event-price">Price <span>*</span></label>
							<div class="currency-input">
								<span>$</span>
								<input id="event-price" type="number" min="0" step="0.01" v-model="form.price" />
							</div>
							<div class="field-hint">Enter 0 for free events</div>
						</div>

						<div class="form-group">
							<label for="event-image">Event Image <span>*</span></label>
														<input id="event-image" type="file" accept="image/*" @change="onFileChange" />
														<div v-if="imagePreview" style="margin-top:8px;">
															<img :src="imagePreview" alt="Preview" style="max-width: 240px; border-radius: 8px;" />
														</div>
														<div class="field-hint">PNG/JPEG recommended.</div>
						</div>
					</div>

					<footer class="form-actions">
						<button type="button" class="btn btn--secondary" @click="router.back" :disabled="submitting">
							Cancel
						</button>
						<button type="submit" class="btn btn--primary" :disabled="!isValid || submitting">
							<span v-if="!submitting">Create Event</span>
							<span v-else class="loading">Creating...</span>
						</button>
					</footer>
				</form>
			</div>
		</div>
	</div>

</template>

<style scoped>
.create-event {
	display: flex;
	flex-direction: column;
	gap: var(--space-24, 24px);
}

.page-header h1 {
	font-size: clamp(2rem, 3vw, 2.5rem);
	font-weight: var(--font-weight-bold);
	margin: 0;
	color: var(--color-text);
}

.page-header p {
	margin: var(--space-8, 8px) 0 0 0;
	color: var(--color-text-secondary);
	font-size: 1rem;
}

.card {
	background: var(--color-surface, #fff);
	border-radius: var(--radius-lg, 16px);
	border: 1px solid var(--color-card-border, #ececec);
	box-shadow: var(--shadow-sm);
	overflow: hidden;
}

.card-header {
	padding: clamp(20px, 3vw, 32px);
	border-bottom: 1px solid var(--color-card-border, #ececec);
}

.card-header h2 {
	margin: 0;
	font-size: 1.5rem;
	font-weight: var(--font-weight-semibold);
}

.card-header p {
	margin: var(--space-8, 8px) 0 0 0;
	color: var(--color-text-secondary);
}

.form {
	display: flex;
	flex-direction: column;
	gap: var(--space-24, 24px);
	padding: clamp(20px, 3vw, 32px);
}

.form-group {
	display: flex;
	flex-direction: column;
	gap: var(--space-8, 8px);
}

label {
	font-weight: var(--font-weight-medium);
	color: var(--color-text);
	font-size: 0.95rem;
}

label span {
	color: var(--color-error, #d14343);
	margin-left: 4px;
}

label .hint {
	color: var(--color-text-secondary);
	font-weight: var(--font-weight-normal);
}

input,
textarea,
select {
	width: 100%;
	border-radius: 12px;
	border: 1px solid var(--color-border, #d9d9d9);
	padding: 12px 16px;
	font-size: 1rem;
	background: var(--color-background, #f9fafb);
	color: var(--color-text, #1a1f36);
	transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

input:focus,
textarea:focus,
select:focus {
	outline: none;
	border-color: var(--color-primary, #2563eb);
	box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
	background: var(--color-surface, #fff);
	color: var(--color-text);
}

textarea {
	resize: vertical;
	min-height: 120px;
}

.field-hint {
	font-size: 0.85rem;
	color: var(--color-text-secondary);
}

.grid {
	display: grid;
	gap: var(--space-20, 20px);
}

.grid--two {
	grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.map-toggle {
	display: flex;
	flex-direction: column;
	gap: var(--space-8, 8px);
}

.map-toggle__label {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	font-weight: var(--font-weight-medium);
	color: var(--color-text);
}

.map-toggle__label input {
	width: 18px;
	height: 18px;
	margin: 0;
}

.currency-input {
	display: flex;
	align-items: center;
	gap: 8px;
	border: 1px solid var(--color-border, #d9d9d9);
	border-radius: 12px;
	background: var(--color-background, #f9fafb);
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

.form-actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--space-12, 12px);
	margin-top: var(--space-8, 8px);
}

.btn {
	border-radius: 999px;
	padding: 12px 24px;
	font-size: 1rem;
	font-weight: var(--font-weight-semibold);
	cursor: pointer;
	border: none;
	transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.btn:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.btn--primary {
	background: var(--color-primary, #2563eb);
	color: #fff;
	box-shadow: var(--shadow-sm);
}

.btn--primary:hover:not(:disabled) {
	transform: translateY(-1px);
	box-shadow: var(--shadow-md);
}

.btn--secondary {
	background: transparent;
	border: 1px solid var(--color-border, #d9d9d9);
	color: var(--color-text);
}

.alert {
	padding: 12px 16px;
	border-radius: 12px;
	font-size: 0.95rem;
}

.alert--error {
	background: rgba(209, 67, 67, 0.12);
	color: #a61b1b;
	border: 1px solid rgba(209, 67, 67, 0.35);
}

.alert--success {
	background: rgba(16, 185, 129, 0.12);
	color: #047857;
	border: 1px solid rgba(16, 185, 129, 0.3);
}

.loading {
	display: inline-flex;
	align-items: center;
	gap: 6px;
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
	padding: 10px 18px;
	background: var(--color-primary, #2563eb);
	color: #fff;
	font-weight: var(--font-weight-medium);
	cursor: pointer;
	transition: background 0.2s ease, box-shadow 0.2s ease;
}

.btn-add-tag:disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.btn-add-tag:not(:disabled):hover {
	background: #1e4fd6;
	box-shadow: var(--shadow-sm);
}

.tag-suggestions {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	align-items: center;
}

.tag-suggestions__label {
	font-size: 0.85rem;
	color: var(--color-text-secondary);
}

.tag-suggestion {
	border: 1px solid var(--color-border, #d9d9d9);
	background: #fff;
	border-radius: 999px;
	padding: 6px 12px;
	font-size: 0.85rem;
	cursor: pointer;
	transition: background 0.2s ease, border-color 0.2s ease;
}

.tag-suggestion:hover {
	border-color: var(--color-primary, #2563eb);
	background: rgba(37, 99, 235, 0.08);
}

.tag-list {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.tag-chip {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	background: var(--color-background, #f2f4f7);
	color: var(--color-text, #1a1f36);
	border-radius: 999px;
	padding: 6px 12px;
	font-size: 0.85rem;
}

.tag-chip__remove {
	background: transparent;
	border: none;
	color: inherit;
	font-size: 1rem;
	line-height: 1;
	cursor: pointer;
	padding: 0;
}

.tag-chip__remove:hover {
	color: var(--color-error, #d14343);
}

.field-error {
	font-size: 0.85rem;
	color: var(--color-error, #d14343);
}

@media (max-width: 640px) {
	.form-actions {
		flex-direction: column;
		align-items: stretch;
	}

	.btn {
		width: 100%;
		text-align: center;
	}
}

/* Category badge colors (match EventsFilterPanel) */
.selected-category {
	display: inline-block;
	margin-left: 8px;
	padding: 6px 10px;
	border-radius: 999px;
	color: var(--color-btn-primary-text, #fff);
	font-weight: var(--font-weight-medium, 500);
	font-size: 0.9rem;
}

.badge-academic { background-color: #007bff; }
.badge-workshop { background-color: #28a745; }
.badge-performance { background-color: #dc3545; }
.badge-recreation { background-color: #ffc107; color: #333; }
.badge-career { background-color: #17a2b8; }
.badge-social { background-color: #6f42c1; }
.badge-sports { background-color: #fd7e14; }
</style>

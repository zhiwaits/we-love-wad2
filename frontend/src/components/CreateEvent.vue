<script setup>
import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { onMounted } from 'vue';
import { createEvent } from '../services/eventService';

const store = useStore();
const router = useRouter();

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
	imageUrl: ''
});

const submitting = ref(false);
const error = ref('');
const success = ref('');

const venues = computed(() => store.state.venues);
const categories = computed(() => store.state.categories);

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
		f.price !== ''
	);
});

const formatLocation = () => {
	const { location, venue } = form.value;
	if (!venue || venue === 'Other Venue') return location.trim();
	return `${location.trim()} (${venue})`;
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
		imageUrl: ''
	};
};

const ensureMetadata = async () => {
	const hasCategories = Array.isArray(store.state.categories) && store.state.categories.length > 0;
	const hasVenues = Array.isArray(store.state.venues) && store.state.venues.length > 0;
	if (hasCategories && hasVenues) return;
	try {
		await Promise.all([
			store.dispatch('fetchEventCategories'),
			store.dispatch('fetchEventVenues')
		]);
	} catch (err) {
		console.error('Failed to load event metadata', err);
	}
};

onMounted(() => {
	ensureMetadata();
});

const handleSubmit = async () => {
	if (!isValid.value) return;
	resetMessages();
	submitting.value = true;

	try {
		const payload = {
			title: form.value.title.trim(),
			description: form.value.description.trim(),
			datetime: toIsoString(form.value.start),
			enddatetime: toIsoString(form.value.end),
			location: formatLocation(),
			category: form.value.category,
			capacity: form.value.capacity ? Number(form.value.capacity) : null,
			price: form.value.price ? Number(form.value.price) : 0,
			image_url: form.value.imageUrl ? form.value.imageUrl.trim() : null,
			owner_id: ownerId.value,
			venue: form.value.venue
		};

		await createEvent(payload);
		success.value = 'Event created successfully!';
		resetForm();

		setTimeout(() => {
			router.push('/clubs');
		}, 1200);
	} catch (err) {
		error.value = err?.response?.data?.error || err?.message || 'Failed to create event. Please try again.';
	} finally {
		submitting.value = false;
	}
};
</script>

<template>
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
					<input id="event-title" type="text" v-model="form.title" placeholder="e.g., Tech Innovation Conference 2025" />
				</div>

				<div class="form-group">
					<label for="event-description">Event Description <span>*</span></label>
					<textarea
						id="event-description"
						rows="4"
						v-model="form.description"
						placeholder="Provide a detailed description of your event..."
					></textarea>
					<div class="field-hint">{{ descriptionLength }} characters</div>
				</div>

				<div class="grid grid--two">
					<div class="form-group">
						<label for="event-start">Start Date &amp; Time <span>*</span></label>
						<input id="event-start" type="datetime-local" v-model="form.start" />
					</div>

					<div class="form-group">
						<label for="event-end">End Date &amp; Time <span class="hint">(Optional)</span></label>
						<input id="event-end" type="datetime-local" v-model="form.end" />
					</div>
				</div>

				<div class="grid grid--two">
					<div class="form-group">
						<label for="event-location">Location <span>*</span></label>
						<input id="event-location" type="text" v-model="form.location" placeholder="e.g., 81 Victoria St, SMU" />
					</div>

					<div class="form-group">
						<label for="event-venue">Venue <span>*</span></label>
						<select id="event-venue" v-model="form.venue">
							<option disabled value="">Select a venue</option>
							<option v-for="venue in venues" :key="venue" :value="venue">{{ venue }}</option>
						</select>
					</div>
				</div>

				<div class="grid grid--two">
					<div class="form-group">
						<label for="event-capacity">Capacity <span class="hint">(Optional)</span></label>
						<input id="event-capacity" type="number" min="0" v-model="form.capacity" placeholder="e.g., 500" />
					</div>

					<div class="form-group">
						<label for="event-category">Category <span>*</span></label>
						<select id="event-category" v-model="form.category">
							<option disabled value="">Select a category</option>
							<option v-for="category in categories" :key="category" :value="category">{{ category }}</option>
						</select>
					</div>
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
						<label for="event-image">Cover Image URL <span class="hint">(Optional)</span></label>
						<input id="event-image" type="url" v-model="form.imageUrl" placeholder="https://example.com/event.png" />
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
	background: #fff;
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
</style>

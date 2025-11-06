import axios, { API_BASE_URL } from './config';

const BASE_URL = API_BASE_URL;

export const getAllEvents = (page = 1, limit = 'all', filters = {}) => {
	const params = new URLSearchParams();

	if (limit === 'all' || limit == null) {
		params.append('limit', 'all');
	} else {
		params.append('limit', limit);
		params.append('page', page || 1);
	}

	// Add filter parameters
	if (filters.searchQuery) params.append('search', filters.searchQuery);
	if (filters.selectedCategories && filters.selectedCategories.length > 0) {
		params.append('categories', filters.selectedCategories.join(','));
	}
	if (filters.eventStatus && filters.eventStatus !== 'both') {
		params.append('eventStatus', filters.eventStatus);
	}
	if (filters.priceFilter && filters.priceFilter !== 'all') {
		params.append('priceFilter', filters.priceFilter);
		if ((filters.priceFilter === 'custom' || filters.priceFilter === 'range') && filters.priceRange) {
			if (filters.priceRange.min !== null) params.append('minPrice', filters.priceRange.min);
			if (filters.priceRange.max !== null) params.append('maxPrice', filters.priceRange.max);
		}
	}
	if (filters.venueFilter && filters.venueFilter !== 'all') {
		params.append('venueFilter', filters.venueFilter);
	}
	if (filters.locationQuery) {
		params.append('locationQuery', filters.locationQuery);
	}
	if (filters.clubFilter && filters.clubFilter.categoryId && filters.clubFilter.categoryId !== 'all') {
		params.append('clubCategoryId', filters.clubFilter.categoryId);
	}
	if (filters.specificDate) {
		params.append('specificDate', filters.specificDate);
	} else if (filters.dateRange && filters.dateRange.start && filters.dateRange.end) {
		params.append('dateRangeStart', filters.dateRange.start);
		params.append('dateRangeEnd', filters.dateRange.end);
	}

	return axios.get(`${BASE_URL}/events?${params.toString()}`);
};

export const getEventById = (eventId) => axios.get(`${BASE_URL}/events/${eventId}`);

export const getRecommendedEvents = (userId) => {
	return axios.get(`${BASE_URL}/events/recommended/${userId}`);
};

export const createEvent = (eventData) => {
	return axios.post(`${BASE_URL}/events`, eventData);
};

export const updateEvent = (id, eventData) => axios.put(`${BASE_URL}/events/${id}`, eventData);
export const deleteEvent = (id, options = {}) => axios.delete(`${BASE_URL}/events/${id}`, {
	data: {
		cancellationReason: options.cancellationReason ?? ''
	}
});

export const getClubEventAnalytics = (clubId) => {
	return axios.get(`${BASE_URL}/events/club/${clubId}/analytics`);
};

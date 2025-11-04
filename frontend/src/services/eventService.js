import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

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
	if (filters.dateFilter && filters.dateFilter !== 'all') {
		if (filters.dateFilter === 'specific' && filters.specificDate) {
			params.append('specificDate', filters.specificDate);
		} else if (filters.dateFilter === 'range' && filters.dateRange) {
			if (filters.dateRange.start) params.append('dateRangeStart', filters.dateRange.start);
			if (filters.dateRange.end) params.append('dateRangeEnd', filters.dateRange.end);
		}
	}

	return axios.get(`${BASE_URL}/events?${params.toString()}`);
};

export const getEventById = (eventId) => axios.get(`${BASE_URL}/events/${eventId}`);

export const createEvent = (eventData) => {
	return axios.post(`${BASE_URL}/events`, eventData);
};

export const updateEvent = (id, eventData) => axios.put(`${BASE_URL}/events/${id}`, eventData);
export const deleteEvent = (id) => axios.delete(`${BASE_URL}/events/${id}`);
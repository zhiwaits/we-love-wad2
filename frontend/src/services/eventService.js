import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const getAllEvents = (page = 1, limit = 6) => {
	const params = new URLSearchParams();
	if (page) params.append('page', page);
	if (limit) params.append('limit', limit);
	return axios.get(`${BASE_URL}/events?${params.toString()}`);
};

export const getEventById = (eventId) => axios.get(`${BASE_URL}/events/${eventId}`);

export const createEvent = (eventData) => {
	return axios.post(`${BASE_URL}/events`, eventData);
};

export const updateEvent = (id, eventData) => axios.put(`${BASE_URL}/events/${id}`, eventData);
export const deleteEvent = (id) => axios.delete(`${BASE_URL}/events/${id}`);
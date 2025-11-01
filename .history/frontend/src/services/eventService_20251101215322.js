import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

export const getAllEvents = () => axios.get(`${BASE_URL}/events`);
export const getEventById = (eventId) => axios.get(`${BASE_URL}/events/${eventId}`);
export const createEvent = (eventData) => axios.post(`${BASE_URL}/events`, eventData);
export const updateEvent = (id, eventData) => axios.put(`${BASE_URL}/events/${id}`, { eventData });
export const deleteEvent = (id) => axios.delete(`${BASE_URL}/events/${id}`);
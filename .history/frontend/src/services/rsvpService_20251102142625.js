import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const getAllRsvps = () => axios.get(`${BASE_URL}/rsvps`);
export const getRsvpsByEventId = (id) => axios.get(`${BASE_URL}/rsvps/event/${id}`);
export const getRsvpsByUserId = (id) => axios.get(`${BASE_URL}/rsvps/user/${id}`);
export const getRsvpsForEventsByOwner = (id) => axios.get(`${BASE_URL}/rsvps/owner/${id}`);
export const createRsvp = (rsvpData) => axios.post(`${BASE_URL}/rsvps`, rsvpData);
export const updateRsvp = (id, profileData) => axios.put(`${BASE_URL}/rsvps/${id}`, { profileData });
export const deleteRsvp = (eventId, userId) => axios.delete(`${BASE_URL}/rsvps/${eventId}/${userId}`);
export const confirmRsvp = (token) => axios.get(`${BASE_URL}/rsvps/confirm/${token}`);
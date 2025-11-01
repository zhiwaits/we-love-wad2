import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const getAllSaved = () => axios.get(`${BASE_URL}/savedEvents`);
export const getSavedByUserId = (userId) => axios.get(`${BASE_URL}/savedEvents/user/${userId}`);
export const getSavedByEventId = (eventId) => axios.get(`${BASE_URL}/savedEvents/event/${eventId}`);
export const createSaved = (savedData) => axios.post(`${BASE_URL}/savedEvents`, savedData);
export const deleteSaved = (eventId, userId) => axios.delete(`${BASE_URL}/savedEvents/${eventId}/${userId}`);
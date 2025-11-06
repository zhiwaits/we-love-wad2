import axios, { API_BASE_URL } from './config';

const BASE_URL = API_BASE_URL;

export const getAllSaved = () => axios.get(`${BASE_URL}/savedEvents`);
export const getSavedByUserId = (userId) => axios.get(`${BASE_URL}/savedEvents/user/${userId}`);
export const getSavedByEventId = (eventId) => axios.get(`${BASE_URL}/savedEvents/event/${eventId}`);
export const createSaved = (savedData) => axios.post(`${BASE_URL}/savedEvents`, savedData);
export const deleteSaved = (eventId, userId) => axios.delete(`${BASE_URL}/savedEvents/${eventId}/${userId}`);
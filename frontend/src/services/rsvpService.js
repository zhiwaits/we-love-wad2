import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

export const getAllRsvps = () => axios.get(`${BASE_URL}/rsvps`);
export const getRsvpsByEventId = (id) => axios.get(`${BASE_URL}/rsvps/user/${id}`);
export const getRsvpsByUserId = (id) => axios.get(`${BASE_URL}/rsvps/event/${id}`);
export const createRsvp = (rsvpData) => axios.post(`${BASE_URL}/rsvps`, rsvpData);
export const updateRsvp = (id, profileData) => axios.put(`${BASE_URL}/rsvps/${id}`, { profileData });
export const deleteRsvp = (id) => axios.delete(`${BASE_URL}/rsvps/${id}`);
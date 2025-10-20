import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

export const getAllEventTags = () => axios.get(`${BASE_URL}/eventTags`);
export const getEventTagsByEventId = (eventId) => axios.get(`${BASE_URL}/eventTags/event/${eventId}`);
export const getEventTagsByEventTag = (tag) => axios.get(`${BASE_URL}/eventTags/tag/${tag}`);
export const createEventTag = (eventData) => axios.post(`${BASE_URL}/eventTags`, eventData);
export const deleteEventTag = (event_id, tag_id) => axios.delete(`${BASE_URL}/eventTags/${event_id}/${tag_id}`);
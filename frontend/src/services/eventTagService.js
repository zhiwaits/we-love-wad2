import axios from 'axios';

const BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3000';

export const getAllEventTags = () => axios.get(`${BASE_URL}/event-tags`);
export const getEventTagsByEventId = (eventId) => axios.get(`${BASE_URL}/event-tags/${eventId}`);
export const getEventTagsByEventTag = (tagId) => axios.get(`${BASE_URL}/event-tags/tag/${tagId}`);
export const createEventTag = (event_id, tag_id) => axios.post(`${BASE_URL}/event-tags`, { event_id, tag_id });
export const deleteEventTag = (event_id, tag_id) => axios.delete(`${BASE_URL}/event-tags/${event_id}/${tag_id}`);
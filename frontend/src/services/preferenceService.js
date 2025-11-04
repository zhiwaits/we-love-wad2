import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const getUserPreferences = (userId) => {
	return axios.get(`${BASE_URL}/profiles/${userId}/preferences`);
};

export const updateUserPreferences = (userId, preferences) => {
	return axios.put(`${BASE_URL}/profiles/${userId}/preferences`, preferences);
};

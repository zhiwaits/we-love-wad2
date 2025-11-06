import axios, { API_BASE_URL } from './config';

const BASE_URL = API_BASE_URL;

export const getUserPreferences = (userId) => {
	return axios.get(`${BASE_URL}/profiles/${userId}/preferences`);
};

export const updateUserPreferences = (userId, preferences) => {
	return axios.put(`${BASE_URL}/profiles/${userId}/preferences`, preferences);
};

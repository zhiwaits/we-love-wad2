import axios, { API_BASE_URL } from './config';

export const getUserStats = (userId) => axios.get(`${API_BASE_URL}/stats/user/${userId}`);
export const getClubStats = (clubId) => axios.get(`${API_BASE_URL}/stats/club/${clubId}`);
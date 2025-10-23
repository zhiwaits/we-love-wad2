import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const getUserStats = (userId) => axios.get(`${API_BASE_URL}/stats/user/${userId}`);
export const getClubStats = (clubId) => axios.get(`${API_BASE_URL}/stats/club/${clubId}`);
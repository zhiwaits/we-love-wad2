import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

export const getAllProfiles = () => axios.get(`${BASE_URL}/profiles`);
export const getProfileById = (id) => axios.get(`${BASE_URL}/profiles/${id}`);
export const createUserProfile = (data) => axios.post(`${BASE_URL}/profiles/user`, data);
export const createClubProfile = (data) => axios.post(`${BASE_URL}/profiles/club`, data);
export const updateProfile = (id, data) => axios.put(`${BASE_URL}/profiles/${id}`, data);
export const updateUserProfile = (id, data) => axios.put(`${BASE_URL}/profiles/user/${id}`, data);
export const updateClubProfile = (id, data) => axios.put(`${BASE_URL}/profiles/club/${id}`, data);
export const deleteProfile = (id) => axios.delete(`${BASE_URL}/profiles/${id}`);
export const getClubProfiles = () => axios.get(`${BASE_URL}/profiles/club`);
export const getClubStats = (id) => axios.get(`${BASE_URL}/profiles/club/${id}/stats`);
export const getUserPreferences = (id) => axios.get(`${BASE_URL}/profiles/${id}/preferences`);
export const updateUserPreferences = (id, data) => axios.put(`${BASE_URL}/profiles/user/${id}/preferences`, data);
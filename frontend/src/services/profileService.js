import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

export const getAllProfiles = () => axios.get(`${BASE_URL}/profiles`);
export const getProfileById = (id) => axios.get(`${BASE_URL}/profiles/${id}`);
export const createProfiles = (profileData) => axios.post(`${BASE_URL}/profiles`, profileData);
export const updateProfile = (id, profileData) => axios.put(`${BASE_URL}/profiles/${id}`, { profileData });
export const deleteProfile = (id) => axios.delete(`${BASE_URL}/profiles/${id}`);
// Fetch only club profiles (account_type = 'club')
export const getClubProfiles = () => axios.get(`${BASE_URL}/profiles/club`);
import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

export const getAllProfiles = () => axios.get(`${BASE_URL}/profiles`);
export const getProfileById = (id) => axios.get(`${BASE_URL}/profiles/${id}`);
export const createUserProfile = (data) => axios.post(`${BASE_URL}/profiles/user`, data);
export const createClubProfile = (data) => axios.post(`${BASE_URL}/profiles/club`, data);
export const updateProfile = (id, data) => axios.put(`${BASE_URL}/profiles/${id}`, data);
export const deleteProfile = (id) => axios.delete(`${BASE_URL}/profiles/${id}`);
export const getClubProfiles = () => axios.get(`${BASE_URL}/profiles/club`);
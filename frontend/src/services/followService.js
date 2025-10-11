import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

export const getAllFollows = () => axios.get(`${BASE_URL}/follows`);
export const getFollowsByUserId = (userId) => axios.get(`${BASE_URL}/follows/user/${userId}`);
export const getFollowersByClubId = (clubId) => axios.get(`${BASE_URL}/follows/club/${clubId}`);
export const createFollow = (followData) => axios.post(`${BASE_URL}/follows`, followData);
export const deleteFollow = (id) => axios.delete(`${BASE_URL}/follows/${id}`);
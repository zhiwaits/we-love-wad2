import axios, { API_BASE_URL } from './config';

const BASE_URL = API_BASE_URL;

export const getAllFollows = () => axios.get(`${BASE_URL}/follows`);
export const getFollowsByUserId = (userId) => axios.get(`${BASE_URL}/follows/user/${userId}`);
export const getFollowersByClubId = (clubId) => axios.get(`${BASE_URL}/follows/club/${clubId}`);
export const createFollow = (followData) => axios.post(`${BASE_URL}/follows`, followData);
export const deleteFollow = (id) => axios.delete(`${BASE_URL}/follows/${id}`);
export const deleteFollowByIds = (followerId, clubId) => axios.delete(`${BASE_URL}/follows/${followerId}/${clubId}`);
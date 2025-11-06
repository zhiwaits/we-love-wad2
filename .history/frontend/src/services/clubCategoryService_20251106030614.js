import axios, { API_BASE_URL } from './config';

const BASE_URL = API_BASE_URL;

export const getAllClubCategories = () => axios.get(`${BASE_URL}/clubCategories`);
export const getClubCategoryById = (id) => axios.get(`${BASE_URL}/clubCategories/id/${id}`);
export const getClubCategoryByName = (name) => axios.get(`${BASE_URL}/clubCategories/name/${encodeURIComponent(name)}`);
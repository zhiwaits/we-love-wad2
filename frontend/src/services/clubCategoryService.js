import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const getAllClubCategories = () => axios.get(`${BASE_URL}/clubCategories`);
export const getClubCategoryById = (id) => axios.get(`${BASE_URL}/clubCategories/id/${id}`);
export const getClubCategoryByName = (name) => axios.get(`${BASE_URL}/clubCategories/name/${encodeURIComponent(name)}`);
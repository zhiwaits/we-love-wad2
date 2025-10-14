import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

export const getAllClubCategories = () => axios.get(`${BASE_URL}/clubCategories`);
export const getClubCategoryById = (id) => axios.get(`${BASE_URL}/clubCategories/id/${id}`);
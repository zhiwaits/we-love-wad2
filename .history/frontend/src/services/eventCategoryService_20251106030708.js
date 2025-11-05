import axios, { API_BASE_URL } from './config';

const BASE_URL = API_BASE_URL;

export const  getAllEventCategories = () => axios.get(`${BASE_URL}/eventCategories`);

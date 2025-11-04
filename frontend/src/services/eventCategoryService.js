import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const  getAllEventCategories = () => axios.get(`${BASE_URL}/eventCategories`);

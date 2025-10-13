import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

export const getUserStats = (userId) => axios.get(`${BASE_URL}/stats/user/${userId}`);
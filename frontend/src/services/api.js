
import axios from 'axios';
const backendURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: backendURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default {
  getHelloWorld() {
    return apiClient.get('/');
  },
};

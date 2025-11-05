
import axios from 'axios';
const backendURL = import.meta.env.BACKENDURL
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

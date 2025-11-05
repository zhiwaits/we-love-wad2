import axios, { API_BASE_URL } from './config';

export default {
  getHelloWorld() {
    return axios.get('/');
  },
  baseURL: API_BASE_URL,
};

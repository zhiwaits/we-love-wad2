// Centralized configuration for API access across the frontend.
// Determines the best backend base URL to use depending on the runtime environment.
import axios from 'axios';

const LOCAL_FALLBACK = 'http://localhost:3000';
const KNOWN_VERCEL_BACKENDS = [
  'https://we-love-wad2.vercel.app',
  'https://we-love-wad2-git-main-zhiweis-projects-e735ca14.vercel.app',
  'https://we-love-wad2-d8qxex7tm-zhiweis-projects-e735ca14.vercel.app'
];

const envBaseUrl = (import.meta.env?.VITE_API_BASE_URL || '').trim();
const runtimeWindow = typeof window !== 'undefined' ? window : undefined;
const runtimeInjectedBaseUrl = runtimeWindow?.__APP_API_BASE_URL__?.toString()?.trim?.() || '';
const isLocalhost = runtimeWindow?.location ? /^(localhost|127\.0\.0\.1)$/i.test(runtimeWindow.location.hostname) : false;

const API_BASE_URL =
  envBaseUrl ||
  runtimeInjectedBaseUrl ||
  (isLocalhost ? LOCAL_FALLBACK : KNOWN_VERCEL_BACKENDS[0]);

axios.defaults.baseURL = API_BASE_URL;
axios.defaults.withCredentials = true;
if (!axios.defaults.headers.common['Content-Type']) {
  axios.defaults.headers.common['Content-Type'] = 'application/json';
}

export { API_BASE_URL };
export default axios;

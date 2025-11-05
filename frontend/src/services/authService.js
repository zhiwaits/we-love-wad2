
import axios from 'axios';

const BASE_URL = process.env.VUE_APP_API_BASE_URL || 'http://localhost:3000';

// ============================================
// MOCK DATA - Remove when backend is ready
// ============================================
const MOCK_MODE = false; // Set to true only if backend is unavailable

const mockUsers = [
  {
    id: 1,
    email: 'user@smu.edu.sg',
    name: 'Test User',
    username: 'testuser',
    role: 'user',
  },
  {
    id: 2,
    email: 'club@smu.edu.sg',
    name: 'SMU Dance Club',
    username: 'smudanceclub',
    role: 'club',
  },
];



export const register = async (email, password, name, username, role, options = {}) => {
  try {

    if (role === 'club') {
      const payload = {
        name,
        username,
        email,
        password,
        club_description: options.club_description,
        club_category_id: options.club_category_id,
        imageBase64: options.imageBase64,
        imageOriginalName: options.imageOriginalName,
      };
      const response = await axios.post(`${BASE_URL}/profiles/club`, payload);
      return { data: { user: response.data, token: `mock-token-${response.data.id}-${Date.now()}` } };
    }

    const payload = {
      name,
      username,
      email,
      password,
      category_preferences: Array.isArray(options.categoryPreferences) ? options.categoryPreferences : [],
      club_category_preferences: Array.isArray(options.clubCategoryPreferences) ? options.clubCategoryPreferences : [],
      tag_preferences: Array.isArray(options.tagPreferences) ? options.tagPreferences : []
    };
    const response = await axios.post(`${BASE_URL}/profiles/user`, payload);
    return { data: { user: response.data, token: `mock-token-${response.data.id}-${Date.now()}` } };
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message || 'Registration failed');
  }
};

export const checkAvailability = async ({ email, username }) => {
  try {
    if (MOCK_MODE) {
      const emailTaken = !!(email && mockUsers.find((user) => user.email.toLowerCase() === email.toLowerCase()));
      const usernameTaken = !!(username && mockUsers.find((user) => user.username?.toLowerCase?.() === username.toLowerCase()));
      return { emailTaken, usernameTaken };
    }

    const response = await axios.get(`${BASE_URL}/profiles/availability`, {
      params: { email, username },
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to verify availability');
  }
};

export const login = async (email, password) => {
  try {
    const response = await axios.post(`${BASE_URL}/login`, { email, password });
    const { token } = response.data ?? {};
    if (token) {
      localStorage.setItem('token', token);
    }
    return { data: response.data };
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message || 'Login failed');
  }
};


export const logout = async () => {
  try {
    const token = localStorage.getItem('token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await axios.post(`${BASE_URL}/logout`, {}, { headers });
    localStorage.removeItem('token');
    return { data: response.data };
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message || 'Logout failed');
  }
};


export const getCurrentUser = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await axios.get(`${BASE_URL}/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return { data: response.data };
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to get user');
  }
};

export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};
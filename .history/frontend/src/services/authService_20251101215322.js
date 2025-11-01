// frontend/src/services/authService.js
import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

// ============================================
// MOCK DATA - Remove when backend is ready
// ============================================
const MOCK_MODE = true; // Set to false when backend is ready

const mockUsers = [
  {
    id: 1,
    email: 'user@smu.edu.sg',
    name: 'Test User',
    role: 'user',
  },
  {
    id: 2,
    email: 'club@smu.edu.sg',
    name: 'SMU Dance Club',
    role: 'club',
  },
];

// Mock delay to simulate network request
const mockDelay = (ms = 800) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================
// MOCK FUNCTIONS
// ============================================
const mockRegister = async (email, password, name, role) => {
  await mockDelay();
  
  // Check if email already exists
  if (mockUsers.find(u => u.email === email)) {
    throw new Error('Email already exists');
  }
  
  // Create new user
  const newUser = {
    id: mockUsers.length + 1,
    email,
    name,
    role,
  };
  
  mockUsers.push(newUser);
  
  return {
    success: true,
    data: {
      user: newUser,
      token: `mock-token-${newUser.id}-${Date.now()}`,
    },
  };
};

const mockLogin = async (email, password) => {
  await mockDelay();
  
  // Find user
  const user = mockUsers.find(u => u.email === email);
  
  if (!user) {
    throw new Error('Invalid email or password');
  }
  
  // In real implementation, check password hash
  // For mock, accept any password
  
  return {
    success: true,
    data: {
      user,
      token: `mock-token-${user.id}-${Date.now()}`,
    },
  };
};

const mockLogout = async () => {
  await mockDelay(300);
  return {
    success: true,
    message: 'Logged out successfully',
  };
};

const mockGetCurrentUser = async (token) => {
  await mockDelay(500);
  
  // Extract user id from mock token
  const userId = parseInt(token.split('-')[2]);
  const user = mockUsers.find(u => u.id === userId);
  
  if (!user) {
    throw new Error('Invalid token');
  }
  
  return {
    success: true,
    data: { user },
  };
};

// ============================================
// REAL API FUNCTIONS (for when backend is ready)
// ============================================
const realRegister = async (email, password, name, role, options = {}) => {
  // Route to profiles endpoints based on role
  if (role === 'club') {
    const payload = {
      username: name,
      email,
      password,
      club_description: options.club_description,
      club_category_id: options.club_category_id,
      imageBase64: options.imageBase64,
      imageOriginalName: options.imageOriginalName,
    };
    const response = await axios.post(`${BASE_URL}/profiles/club`, payload);
    return { data: { user: response.data, token: `mock-token-${response.data.id}-${Date.now()}` } };
  } else {
    const payload = { username: name, email, password };
    const response = await axios.post(`${BASE_URL}/profiles/user`, payload);
    return { data: { user: response.data, token: `mock-token-${response.data.id}-${Date.now()}` } };
  }
};

const realLogin = async (email, password) => {
  const response = await axios.post(`${BASE_URL}/auth/login`, {
    email,
    password,
  });
  return response.data;
};

const realLogout = async () => {
  const token = localStorage.getItem('token');
  const response = await axios.post(
    `${BASE_URL}/auth/logout`,
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

const realGetCurrentUser = async () => {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

// ============================================
// EXPORTED FUNCTIONS (automatically switch between mock and real)
// ============================================

/**
 * Register a new user
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @param {string} name - User's full name
 * @param {string} role - User role ('user' or 'club')
 * @returns {Promise} Response with user data and token
 */
export const register = async (email, password, name, role, options) => {
  try {
    // Always use backend for registration now
    return await realRegister(email, password, name, role, options);
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message || 'Registration failed');
  }
};

/**
 * Login existing user
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise} Response with user data and token
 */
export const login = async (email, password) => {
  try {
    if (MOCK_MODE) {
      return await mockLogin(email, password);
    }
    return await realLogin(email, password);
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message || 'Login failed');
  }
};

/**
 * Logout current user
 * @returns {Promise} Success message
 */
export const logout = async () => {
  try {
    if (MOCK_MODE) {
      return await mockLogout();
    }
    return await realLogout();
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message || 'Logout failed');
  }
};

/**
 * Get current authenticated user
 * @returns {Promise} User data
 */
export const getCurrentUser = async () => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No token found');
    }
    
    if (MOCK_MODE) {
      return await mockGetCurrentUser(token);
    }
    return await realGetCurrentUser();
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message || 'Failed to get user');
  }
};

/**
 * Check if user is authenticated
 * @returns {boolean} True if token exists
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};
// frontend/src/store/modules/auth.js
import * as authService from '../../services/authService';

const state = {
  user: null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

const getters = {
  currentUser: (state) => state.user,
  isAuthenticated: (state) => state.isAuthenticated,
  isLoading: (state) => state.loading,
  authError: (state) => state.error,
  userRole: (state) => state.user?.role || null,
  isClub: (state) => state.user?.role === 'club',
  isRegularUser: (state) => state.user?.role === 'user',
  isAdmin: (state) => state.user?.role === 'admin',
};

const mutations = {
  SET_USER(state, user) {
    state.user = user;
    state.isAuthenticated = !!user;
  },
  
  SET_TOKEN(state, token) {
    state.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  },
  
  SET_LOADING(state, loading) {
    state.loading = loading;
  },
  
  SET_ERROR(state, error) {
    state.error = error;
  },
  
  CLEAR_ERROR(state) {
    state.error = null;
  },
  
  LOGOUT(state) {
    state.user = null;
    state.token = null;
    state.isAuthenticated = false;
    state.error = null;
    localStorage.removeItem('token');
  },
};

const actions = {
  /**
   * Register a new user
   */
  async register({ commit }, { email, password, name, username, role, club_description, club_category_id, imageBase64, imageOriginalName }) {
    commit('SET_LOADING', true);
    commit('CLEAR_ERROR');
    
    try {
  const response = await authService.register(email, password, name, username, role, { club_description, club_category_id, imageBase64, imageOriginalName });
      
  const { user, token } = response.data;
  const normalizedUser = { ...user, role: user?.role || user?.account_type };
      
  commit('SET_USER', normalizedUser);
      commit('SET_TOKEN', token);
      commit('SET_LOADING', false);
      
      return { success: true, user };
    } catch (error) {
      commit('SET_ERROR', error.message);
      commit('SET_LOADING', false);
      throw error;
    }
  },
  
  /**
   * Login existing user
   */
  async login({ commit }, { email, password }) {
    commit('SET_LOADING', true);
    commit('CLEAR_ERROR');
    
    try {
      const response = await authService.login(email, password);
      
  const { user, token } = response.data;
  const normalizedUser = { ...user, role: user?.role || user?.account_type };
      
  commit('SET_USER', normalizedUser);
      commit('SET_TOKEN', token);
      commit('SET_LOADING', false);
      
      return { success: true, user };
    } catch (error) {
      commit('SET_ERROR', error.message);
      commit('SET_LOADING', false);
      throw error;
    }
  },
  
  /**
   * Logout current user
   */
  async logout({ commit }) {
    commit('SET_LOADING', true);
    
    try {
      await authService.logout();
      commit('LOGOUT');
      commit('SET_LOADING', false);
      
      return { success: true };
    } catch (error) {
      // Even if API call fails, clear local auth state
      commit('LOGOUT');
      commit('SET_LOADING', false);
      throw error;
    }
  },
  
  /**
   * Check authentication status (restore session)
   * Call this when app loads
   */
  async checkAuth({ commit, state, dispatch }) {
    // If no token, user is not authenticated
    if (!state.token) {
      commit('LOGOUT');
      return { success: false };
    }
    
    commit('SET_LOADING', true);
    
    try {
      const response = await authService.getCurrentUser();
  const { user } = response.data;
  const normalizedUser = { ...user, role: user?.role || user?.account_type };
      
  commit('SET_USER', normalizedUser);
      commit('SET_LOADING', false);
      
      // Load user's saved events
      try {
        await dispatch('loadSavedEvents', null, { root: true });
      } catch (error) {
        console.error('Failed to load saved events:', error);
      }
      
      return { success: true, user };
    } catch (error) {
      // Token is invalid, clear everything
      commit('LOGOUT');
      commit('SET_LOADING', false);
      
      return { success: false };
    }
  },
  
  /**
   * Clear any auth errors
   */
  clearError({ commit }) {
    commit('CLEAR_ERROR');
  },
};

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions,
};
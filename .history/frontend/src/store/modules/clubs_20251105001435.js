import { getClubProfiles } from '../../services/profileService';
import { getFollowsByUserId, createFollow, deleteFollowByIds } from '../../services/followService';
import { getAllClubCategories } from '../../services/clubCategoryService';
import { getAllEvents } from '../../services/eventService';

const getDefaultState = () => ({
  clubs: [],
  followersCount: {},
  followingClubIds: [],
  categoriesById: {},
  sortOption: 'newest',
  filters: {
    searchQuery: '',
    categoryId: 'all',
    followStatus: 'all'
  },
  events: [],
  loading: false,
  error: null
});

export default {
  namespaced: true,
  state: getDefaultState,
  getters: {
    clubs: (s) => s.clubs,
    sortOption: (s) => s.sortOption,
    followersCount: (s) => (clubId) => s.followersCount[clubId] || 0,
    followingClubIds: (s) => s.followingClubIds,
    isFollowing: (s) => (clubId) => s.followingClubIds.includes(clubId),
    categoryNameById: (s) => (id) => s.categoriesById[id] || null,
    categoryOptions: (s) => Object.entries(s.categoriesById)
      .map(([id, name]) => ({ id: Number(id), name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    eventsByOwnerId: (s) => {
      const map = new Map();
      const events = Array.isArray(s.events) ? s.events : []; 
      for (const ev of events) {
        const possibleOwner = ev.ownerId != null ? ev.ownerId : ev.owner_id;
        const key = possibleOwner != null ? Number(possibleOwner) : null;
        if (key == null || Number.isNaN(key)) continue;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(ev);
      }
      return map;
    },
    filteredClubs: (s, g) => {
      const q = (s.filters.searchQuery || '').trim().toLowerCase();
      const catId = s.filters.categoryId;
      const followStatus = s.filters.followStatus;

      return s.clubs.filter(club => {
        const username = (club.username || '').toLowerCase();
        const displayName = (club.name || '').toLowerCase();
        const matchesName = q ? (username.includes(q) || displayName.includes(q)) : true;
        const byCat = catId === 'all' ? true : Number(club.club_category_id) === Number(catId);
        if (!matchesName || !byCat) return false;

        // Filter by follow status
        if (followStatus === 'followed') {
          if (!g.isFollowing(club.id)) return false;
        } else if (followStatus === 'unfollowed') {
          if (g.isFollowing(club.id)) return false;
        }
        // 'all' shows all clubs

        return true;
      });
    },
    resultsCount: (s, g) => g.filteredClubs.length,
  },
  mutations: {
    RESET_STATE(state) {
      Object.assign(state, getDefaultState());
    },
    setLoading(state, val) { state.loading = val; },
    setError(state, err) { state.error = err; },
    setClubs(state, clubs) {
      const normalized = Array.isArray(clubs)
        ? clubs.map((club) => ({
            ...club,
            follower_count: Number(club?.follower_count ?? 0),
            event_count: Number(club?.event_count ?? 0),
            created_at: club?.created_at || club?.createdAt || null
          }))
        : [];
      state.clubs = normalized;
      const followerMap = {};
      normalized.forEach((club) => {
        if (club && club.id != null) {
          followerMap[club.id] = club.follower_count;
        }
      });
      state.followersCount = followerMap;
    },
    setFollowersCount(state, { clubId, count }) {
      state.followersCount = { ...state.followersCount, [clubId]: count };
      const idx = state.clubs.findIndex((club) => club.id === clubId);
      if (idx !== -1) {
        const updated = { ...state.clubs[idx], follower_count: count };
        state.clubs.splice(idx, 1, updated);
      }
    },
    setFollowing(state, clubIds) { state.followingClubIds = clubIds; },
    addFollowing(state, clubId) { if (!state.followingClubIds.includes(clubId)) state.followingClubIds.push(clubId); },
    removeFollowing(state, clubId) { state.followingClubIds = state.followingClubIds.filter(id => id !== clubId); },
    setCategories(state, categories) { state.categoriesById = categories.reduce((acc, c) => { acc[c.id] = c.name; return acc; }, {}); },
    SET_CLUB_SEARCH_QUERY(state, query) { state.filters.searchQuery = query; },
    SET_CLUB_CATEGORY_FILTER(state, categoryId) { state.filters.categoryId = categoryId; },
    SET_FOLLOW_STATUS(state, status) { state.filters.followStatus = status; },
    RESET_CLUB_FILTERS(state) { state.filters = { searchQuery: '', categoryId: 'all', followStatus: 'all' }; },
    setEvents(state, events) { state.events = events || []; },
    SET_SORT_OPTION(state, option) {
      state.sortOption = option || 'newest';
    }
  },
  actions: {
    async loadClubs({ state, commit }, { sortOption, force = false } = {}) {
      commit('setLoading', true); commit('setError', null);
      const effectiveSort = (sortOption || state.sortOption || 'newest').toLowerCase();
      commit('SET_SORT_OPTION', effectiveSort);
      try {
        if (force || Object.keys(state.categoriesById).length === 0) {
          try {
            const catRes = await getAllClubCategories();
            commit('setCategories', catRes.data || []);
          } catch (_) {
            commit('setCategories', []);
          }
        }

        const res = await getClubProfiles(effectiveSort);
        const clubs = Array.isArray(res.data) ? res.data : [];
        commit('setClubs', clubs);

        if (force || !Array.isArray(state.events) || state.events.length === 0) {
          try {
            const evRes = await getAllEvents();
            const eventsPayload = evRes?.data?.events || [];
            commit('setEvents', eventsPayload);
          } catch (_) {
            commit('setEvents', []);
          }
        }
      } catch (err) {
        commit('setError', err?.message || 'Failed to load clubs');
      } finally {
        commit('setLoading', false);
      }
    },

    async loadFollowing({ rootGetters, commit }) {
      const userId = rootGetters['auth/currentUser']?.id;
      if (!userId) return;
      try {
        const res = await getFollowsByUserId(userId);
        const clubIds = (res.data || []).map(f => f.followed_club_id);
        commit('setFollowing', clubIds);
      } catch (_) {  }
    },

    async toggleFollow({ getters, commit, rootGetters }, clubId) {
      const userId = rootGetters['auth/currentUser']?.id;
      if (!userId) return;
      const following = getters.isFollowing(clubId);
      try {
        if (following) {
          await deleteFollowByIds(userId, clubId);
          commit('removeFollowing', clubId);
          const nextCount = Math.max(0, getters.followersCount(clubId) - 1);
          commit('setFollowersCount', { clubId, count: nextCount });
        } else {
          await createFollow({ follower_id: userId, followed_club_id: clubId });
          commit('addFollowing', clubId);
          commit('setFollowersCount', { clubId, count: getters.followersCount(clubId) + 1 });
        }
      } catch (err) {
      }
    },

    async updateSortOption({ dispatch, commit }, sortOption) {
      const normalized = typeof sortOption === 'string' ? sortOption.toLowerCase() : 'newest';
      commit('SET_SORT_OPTION', normalized);
      await dispatch('loadClubs', { sortOption: normalized, force: false });
    },

    // Filters API
    updateClubSearch({ commit }, query) { commit('SET_CLUB_SEARCH_QUERY', query); },
    updateClubCategoryFilter({ commit }, categoryId) { commit('SET_CLUB_CATEGORY_FILTER', categoryId); },
    setFollowStatus({ commit }, status) { commit('SET_FOLLOW_STATUS', status); },
    resetClubFilters({ commit }) { commit('RESET_CLUB_FILTERS'); },

    // Ensure categories present for search dropdown
    async ensureCategories({ state, commit }) {
      if (Object.keys(state.categoriesById).length > 0) return;
      try {
        const catRes = await getAllClubCategories();
        commit('setCategories', catRes.data || []);
      } catch (_) { commit('setCategories', []); }
    },

    async ensureEvents({ state, commit }, { force = false } = {}) {
      if (!force && state.events && state.events.length > 0) {
        return;
      }
      try {
        const evRes = await getAllEvents();
        const eventsPayload = evRes?.data?.events || [];
        commit('setEvents', eventsPayload);
      } catch {
        if (force) {
          commit('setEvents', []);
        }
      }
    },

  
    async ensureEventsAndTags({ dispatch }) {
      await dispatch('ensureEvents');
    }
  }
};

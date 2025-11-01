import { getClubProfiles } from '../../services/profileService';
import { getFollowersByClubId, getFollowsByUserId, createFollow, deleteFollowByIds } from '../../services/followService';
import { getAllClubCategories } from '../../services/clubCategoryService';
import { getAllEvents } from '../../services/eventService';

export default {
  namespaced: true,
  state: () => ({
    clubs: [], 
    followersCount: {}, 
    followingClubIds: [], 
    categoriesById: {}, 
    filters: {
      searchQuery: '',
      categoryId: 'all', 
      onlyWithUpcoming: false,
    },
    events: [], 
    loading: false,
    error: null,
  }),
  getters: {
    clubs: (s) => s.clubs,
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
        const key = ev.ownerId != null ? Number(ev.ownerId) : null;
        if (key == null || Number.isNaN(key)) continue;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(ev);
      }
      return map;
    },
    filteredClubs: (s, g) => {
      const q = (s.filters.searchQuery || '').trim().toLowerCase();
      const catId = s.filters.categoryId;
      const onlyUpcoming = !!s.filters.onlyWithUpcoming;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return s.clubs.filter(club => {
        const username = (club.username || '').toLowerCase();
        const displayName = (club.name || '').toLowerCase();
        const matchesName = q ? (username.includes(q) || displayName.includes(q)) : true;
        const byCat = catId === 'all' ? true : Number(club.club_category_id) === Number(catId);
        if (!matchesName || !byCat) return false;

       
        const clubIdNum = Number(club.id);
        const clubEvents = g.eventsByOwnerId.get(clubIdNum) || [];

     
        if (onlyUpcoming) {
          const hasUpcoming = clubEvents.some(ev => {
            if (!ev.date) return false;
            const d = new Date(ev.date);
            d.setHours(0, 0, 0, 0);
            return d >= today;
          });
          if (!hasUpcoming) return false;
        }

        return true;
      });
    },
    resultsCount: (s, g) => g.filteredClubs.length,
  },
  mutations: {
    setLoading(state, val) { state.loading = val; },
    setError(state, err) { state.error = err; },
    setClubs(state, clubs) { state.clubs = clubs; },
    setFollowersCount(state, { clubId, count }) { state.followersCount = { ...state.followersCount, [clubId]: count }; },
    setFollowing(state, clubIds) { state.followingClubIds = clubIds; },
    addFollowing(state, clubId) { if (!state.followingClubIds.includes(clubId)) state.followingClubIds.push(clubId); },
    removeFollowing(state, clubId) { state.followingClubIds = state.followingClubIds.filter(id => id !== clubId); },
    setCategories(state, categories) { state.categoriesById = categories.reduce((acc, c) => { acc[c.id] = c.name; return acc; }, {}); },
    SET_CLUB_SEARCH_QUERY(state, query) { state.filters.searchQuery = query; },
    SET_CLUB_CATEGORY_FILTER(state, categoryId) { state.filters.categoryId = categoryId; },
    SET_ONLY_WITH_UPCOMING(state, val) { state.filters.onlyWithUpcoming = !!val; },
    RESET_CLUB_FILTERS(state) { state.filters = { searchQuery: '', categoryId: 'all', onlyWithUpcoming: false }; },
    setEvents(state, events) { state.events = events || []; },
  },
  actions: {
    async loadClubs({ commit, dispatch }) {
      commit('setLoading', true); commit('setError', null);
      try {
       
        try {
          const catRes = await getAllClubCategories();
          commit('setCategories', catRes.data || []);
        } catch (_) { commit('setCategories', []); }

        const res = await getClubProfiles();
        const clubs = res.data || [];
        commit('setClubs', clubs);

       
        try {
          const evRes = await getAllEvents();
          commit('setEvents', evRes.data || []);
        } catch (_) { commit('setEvents', []); }

        await Promise.all(clubs.map(async (club) => {
          try {
            const followers = await getFollowersByClubId(club.id);
            commit('setFollowersCount', { clubId: club.id, count: (followers.data || []).length });
          } catch (_) { commit('setFollowersCount', { clubId: club.id, count: 0 }); }
        }));
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
          commit('setFollowersCount', { clubId, count: Math.max(0, (getters.followersCount(clubId) - 1)) });
        } else {
          await createFollow({ follower_id: userId, followed_club_id: clubId });
          commit('addFollowing', clubId);
          commit('setFollowersCount', { clubId, count: getters.followersCount(clubId) + 1 });
        }
      } catch (err) {
      }
    },

    // Filters API
    updateClubSearch({ commit }, query) { commit('SET_CLUB_SEARCH_QUERY', query); },
    updateClubCategoryFilter({ commit }, categoryId) { commit('SET_CLUB_CATEGORY_FILTER', categoryId); },
    resetClubFilters({ commit }) { commit('RESET_CLUB_FILTERS'); },
    setOnlyWithUpcoming({ commit }, val) { commit('SET_ONLY_WITH_UPCOMING', val); },

    // Ensure categories present for search dropdown
    async ensureCategories({ state, commit }) {
      if (Object.keys(state.categoriesById).length > 0) return;
      try {
        const catRes = await getAllClubCategories();
        commit('setCategories', catRes.data || []);
      } catch (_) { commit('setCategories', []); }
    },

    async ensureEvents({ state, commit }) {
      if (!state.events || state.events.length === 0) {
        try { const evRes = await getAllEvents(); commit('setEvents', evRes.data || []); } catch { /* ignore */ }
      }
    },

  
    async ensureEventsAndTags({ dispatch }) {
      await dispatch('ensureEvents');
    }
  }
};

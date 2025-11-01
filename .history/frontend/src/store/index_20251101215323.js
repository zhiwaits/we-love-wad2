import auth from './modules/auth';
import { createStore } from 'vuex';
import { getAllEvents } from "../services/eventService.js";
import { getAllEventCategories } from '../services/eventCategoryService.js';
import { getAllEventVenues } from '../services/eventVenueService.js';
import { getAllTags } from '../services/tagService.js';
import { getAllEventTags } from '../services/eventTagService.js';
import { getSavedByUserId } from '../services/savedEventsService.js';
import clubs from './modules/clubs';

let toastTimer = null;


const COLOR_PALETTE = [
  '#1f77b4',
  '#ff7f0e',
  '#2ca02c',
  '#d62728',
  '#9467bd',
  '#8c564b',
  '#e377c2',
  '#7f7f7f',
  '#bcbd22',
  '#17becf',
  '#393b79', '#637939', '#8ca252', '#b5cf6b', '#6b6ecf', '#9c9ede', '#cedb9c', '#e7ba52', '#bd9e39', '#ad494a', '#a55194', '#6b6ecf', '#9c9ede', '#e7cb94'
];

function pickColorByName(name) {
  if (!name) return COLOR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[idx];
}

function assignPalette(items) {
  const paletteLen = COLOR_PALETTE.length;
  let nextIdx = 0;
  return items.map((it, i) => {
    const name = (it && typeof it === 'string') ? it : (it && it.name) ? it.name : '';
    const provided = it && typeof it === 'object' ? (it.color || it.color_hex || it.hex || it.hex_code || null) : null;
    const color = provided || COLOR_PALETTE[nextIdx % paletteLen];
    if (!provided) nextIdx++;
    return { name, color };
  });
}

export default createStore({

  state: {
    // All events from your EventsGrid
    allEvents: [],

    // Pagination state
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalEvents: 0,
      eventsPerPage: 6,
      hasNextPage: false,
      hasPreviousPage: false
    },

    userStats: {
      upcomingRSVPs: 5,
      totalAttended: 12,
      savedCount: 3,
      clubsFollowed: 8
    },

    clubStats: {
      upcomingEvents: 0,
      totalEvents: 0,
      currentRSVPs: 0,
      followers: 0
    },

    userRSVPs: [], // Will hold full RSVP objects (with event_id, status, etc.)
  savedEvents: [4, 5], // Will hold event IDs user has saved

    clubRSVPs: [], // Will hold RSVPs for events owned by the club

    // Filters state
    filters: {
      searchQuery: '',
      selectedCategories: [],
      selectedTags: [],
      priceFilter: 'all', // 'all', 'paid', 'free', 'range'
      priceRange: {
        min: null,
        max: null
      },teFilter: 'all', // 'all', 'today', 'this-week', 'this-month', 'specific'
      dateFilter: 'all', // 'all', 'today', 'this-week', 'this-month', 'specific'
      specificDate: null,
      venueFilter: 'all',
      locationQuery: '',',
      eventStatus: 'both',
      statusFilter: {,
        rsvped: false,se,
        notRsvped: false,
        saved: false,se
        notSaved: false
      },ubFilter: {
      clubFilter: { 'all',
        categoryId: 'all',e
        followedOnly: false
      }
    },
    // Club event filters (for managing club's own events)
    // Club event filters (for managing club's own events)
    clubEventFilters: {
      searchQuery: '',,
      selectedTags: [],',
      priceFilter: 'all',
      dateFilter: 'all',,
      venueFilter: 'all',
      locationQuery: '','
      eventStatus: 'both'
    },
    categories: [],
    categories: [],
    venues: [],
    availableTags: [],
    availableTags: [],
    toast: {
    toast: {e: '',
      message: '',,
      type: 'info',e
      visible: false
    }
  },
  getters: {
  getters: {
    currentUser: (state, getters, rootState) => rootState.auth.user,
    currentUser: (state, getters, rootState) => rootState.auth.user,
    allEvents(state) {
    allEvents(state) {Events;
      return state.allEvents;
    }, Get filtered events based on current filters
    // Get filtered events based on current filters{
    filteredEvents: (state, getters, rootState) => {
      const filters = state.filters;rs.statusFilter || {};
      const statusSelections = filters.statusFilter || {};d: 'all', followedOnly: false };
      const clubFilter = filters.clubFilter || { categoryId: 'all', followedOnly: false };
      const priceRange = filters.priceRange || { min: null, max: null };
      const priceRangeActive = priceRange.min != null || priceRange.max != null;
      const priceRangeActive = priceRange.min != null || priceRange.max != null;
      const statusActive = Object.values(statusSelections).some(Boolean);ter.followedOnly;
      const clubFilterActive = clubFilter.categoryId !== 'all' || clubFilter.followedOnly;te;
      const specificDateActive = filters.dateFilter === 'specific' && !!filters.specificDate;
      const noFiltersActive =
      const noFiltersActive =&&
        !filters.searchQuery &&ies.length === 0 &&
        filters.selectedCategories.length === 0 &&
        filters.selectedTags.length === 0 &&
        !priceRangeActive &&== 'all' &&
        filters.dateFilter === 'all' &&
        !specificDateActive &&= 'all' &&
        filters.venueFilter === 'all' &&
        !filters.locationQuery &&both' &&
        filters.eventStatus === 'both' &&
        !statusActive &&e;
        !clubFilterActive;
      if (noFiltersActive) {
      if (noFiltersActive) {ts;
        return state.allEvents;
      }
      const parsePriceValue = (event) => {
      const parsePriceValue = (event) => {umber' && !Number.isNaN(event.priceValue)) {
        if (typeof event.priceValue === 'number' && !Number.isNaN(event.priceValue)) {
          return event.priceValue;
        }f (typeof event.price === 'string') {
        if (typeof event.price === 'string') {oUpperCase();
          const trimmed = event.price.trim().toUpperCase();
          if (trimmed === 'FREE') {
            return 0;
          }onst numeric = Number(event.price.replace(/[^0-9.]/g, ''));
          const numeric = Number(event.price.replace(/[^0-9.]/g, ''));
          return Number.isNaN(numeric) ? null : numeric;
        }f (event.price != null) {
        if (event.price != null) {vent.price);
          const numeric = Number(event.price);: numeric;
          return Number.isNaN(numeric) ? null : numeric;
        }eturn null;
        return null;
      };
      const rsvpEventIds = new Set(
      const rsvpEventIds = new Set(
        (state.userRSVPs || [])p && rsvp.event_id != null && (rsvp.status || '').toLowerCase() !== 'cancelled')
          .filter((rsvp) => rsvp && rsvp.event_id != null && (rsvp.status || '').toLowerCase() !== 'cancelled')
          .map((rsvp) => Number(rsvp.event_id))
      );
      const savedEventIds = new Set((state.savedEvents || []).map((id) => Number(id)));
      const savedEventIds = new Set((state.savedEvents || []).map((id) => Number(id)));id) => Number(id)));
      const followingClubIds = new Set((rootState?.clubs?.followingClubIds || []).map((id) => Number(id)));
      let filtered = [...state.allEvents];
      let filtered = [...state.allEvents];
      // Search filter (searches in title, organiser, description)
      // Search filter (searches in title, organiser, description)
      if (filters.searchQuery) {archQuery.toLowerCase();
        const query = filters.searchQuery.toLowerCase();
        filtered = filtered.filter(event =>s(query) ||
          event.title.toLowerCase().includes(query) ||) ||
          event.organiser.toLowerCase().includes(query) ||
          event.description.toLowerCase().includes(query)
        );
      }
      // Category filter
      // Category filteredCategories.length > 0) {
      if (filters.selectedCategories.length > 0) {
        filtered = filtered.filter(event =>es(event.category)
          filters.selectedCategories.includes(event.category)
        );
      }
      // Tag filter
      // Tag filterelectedTags.length > 0) {
      if (filters.selectedTags.length > 0) {
        filtered = filtered.filter(event =>event.tags.includes(tag))
          filters.selectedTags.some(tag => event.tags.includes(tag))
        );
      }
      // Price range filter
      // Price filter {
      if (filters.priceFilter === 'paid') {ilter(event => {
        filtered = filtered.filter(event => {);
          const value = parsePriceValue(event);
          return value != null && value > 0;
        });
      } else if (filters.priceFilter === 'free') {f (priceRange.min != null && value < Number(priceRange.min)) {
        filtered = filtered.filter(event => {
          const value = parsePriceValue(event);
          return value == null || value === 0;f (priceRange.max != null && value > Number(priceRange.max)) {
        });
      } else if (filters.priceFilter === 'range') {
        const priceRangeActive = filters.priceRange?.min != null || filters.priceRange?.max != null;eturn true;
        if (priceRangeActive) {
          filtered = filtered.filter(event => {
            const value = parsePriceValue(event);
            if (value == null) {      // Date filter
              return false;new Date();
            });
            if (filters.priceRange.min != null && value < Number(filters.priceRange.min)) {
              return false;      if (filters.dateFilter === 'today') {
            } {
            if (filters.priceRange.max != null && value > Number(filters.priceRange.max)) {te);
              return false;
            }today.getTime();
            return true;
          });e if (filters.dateFilter === 'this-week') {
        }
      }ate() + 7);

      // Date filterte);
      const today = new Date();<= weekFromNow;
      today.setHours(0, 0, 0, 0);
e if (filters.dateFilter === 'this-month') {
      if (filters.dateFilter === 'today') {
        filtered = filtered.filter(event => {te);
          const eventDate = new Date(event.date);etMonth() &&
          eventDate.setHours(0, 0, 0, 0);
          return eventDate.getTime() === today.getTime();
        });e if (filters.dateFilter === 'specific' && filters.specificDate) {
      } else if (filters.dateFilter === 'this-week') {
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7); => {
        filtered = filtered.filter(event => {te);
          const eventDate = new Date(event.date);
          return eventDate >= today && eventDate <= weekFromNow;targetDate.getTime();
        });
      } else if (filters.dateFilter === 'this-month') {
        filtered = filtered.filter(event => {
          const eventDate = new Date(event.date);      // Venue filter
          return eventDate.getMonth() === today.getMonth() &&ueFilter !== 'all') {
            eventDate.getFullYear() === today.getFullYear();>
        });er
      } else if (filters.dateFilter === 'specific' && filters.specificDate) {
        const targetDate = new Date(filters.specificDate);
        targetDate.setHours(0, 0, 0, 0);
        filtered = filtered.filter(event => {      // Location search
          const eventDate = new Date(event.date);onQuery) {
          eventDate.setHours(0, 0, 0, 0);ocationQuery.toLowerCase();
          return eventDate.getTime() === targetDate.getTime();
        });udes(locQuery) ||
      }

      // Venue filter
      if (filters.venueFilter !== 'all') {
        filtered = filtered.filter(event =>      // RSVP / Saved status filter
          event.venue === filters.venueFilter
        );ed.filter(event => {
      }
(eventId);
      // Location search
      if (filters.locationQuery) {
        const locQuery = filters.locationQuery.toLowerCase();          let rsvpPass = true;
        filtered = filtered.filter(event =>.rsvped && !statusSelections.notRsvped) {
          event.location.toLowerCase().includes(locQuery) ||
          event.venue.toLowerCase().includes(locQuery)ctions.rsvped && statusSelections.notRsvped) {
        );
      }

      // RSVP / Saved status filter          let savedPass = true;
      if (statusActive) {saved && !statusSelections.notSaved) {
        filtered = filtered.filter(event => {
          const eventId = Number(event.id);ctions.saved && statusSelections.notSaved) {
          const isRsvped = rsvpEventIds.has(eventId);
          const isSaved = savedEventIds.has(eventId);

          let rsvpPass = true;          return rsvpPass && savedPass;
          if (statusSelections.rsvped && !statusSelections.notRsvped) {
            rsvpPass = isRsvped;
          } else if (!statusSelections.rsvped && statusSelections.notRsvped) {
            rsvpPass = !isRsvped;      // Club-based filtering
          }Id !== 'all') {
{
          let savedPass = true;bCategoryId != null ? Number(event.clubCategoryId) : null;
          if (statusSelections.saved && !statusSelections.notSaved) {
            savedPass = isSaved;
          } else if (!statusSelections.saved && statusSelections.notSaved) {
            savedPass = !isSaved;
          }      if (clubFilter.followedOnly) {
vent => followingClubIds.has(Number(event.ownerId)));
          return rsvpPass && savedPass;
        });
      }      // Event status filter (upcoming / past)

      // Club-based filtering === 'upcoming') {
      if (clubFilter.categoryId !== 'all') { Date(event.date) > now);
        filtered = filtered.filter(event => {
          const eventClubCategory = event.clubCategoryId != null ? Number(event.clubCategoryId) : null;te(event.date) <= now);
          return eventClubCategory === Number(clubFilter.categoryId);
        });
      }      return filtered;

      if (clubFilter.followedOnly) {
        filtered = filtered.filter(event => followingClubIds.has(Number(event.ownerId)));    // Get all unique tags
      }
Set();
      // Event status filter (upcoming / past)vent => {
      const now = new Date();.add(tag));
      if (filters.eventStatus === 'upcoming') {
        filtered = filtered.filter(event => new Date(event.date) > now);urn Array.from(tagSet).sort();
      } else if (filters.eventStatus === 'past') {
        filtered = filtered.filter(event => new Date(event.date) <= now);
      }    // Category names (for backwards-compatible v-for loops)

      return filtered;e.categories)
    },c === 'string' ? c : c.name)).filter(Boolean)

    // Get all unique tags
    allTags: (state) => {
      const tagSet = new Set();    // Map of category name -> color (if provided)
      state.allEvents.forEach(event => {
        event.tags.forEach(tag => tagSet.add(tag));
      });ray(state.categories)) return map;
      return Array.from(tagSet).sort();
    },
peof c === 'string' ? c : c.name;
    // Category names (for backwards-compatible v-for loops)
    categoryNames: (state) => {'string') color = pickColorByName(c);
      return Array.isArray(state.categories)
        ? state.categories.map(c => (typeof c === 'string' ? c : c.name)).filter(Boolean)
        : [];
    },urn map;

    // Map of category name -> color (if provided)
    categoryColorMap: (state) => {    // Get unique venues
      const map = {};> {
      if (!Array.isArray(state.categories)) return map;tate.venues.length > 0) {
      state.categories.forEach(c => {
        if (!c) return;
        const name = typeof c === 'string' ? c : c.name;onst venueSet = new Set();
        let color = null;nt => {
        if (typeof c === 'string') color = pickColorByName(c);
        else color = c.color || pickColorByName(name);nt.venue);
        if (name) map[name] = color;
      });
      return map;urn Array.from(venueSet).sort();
    },

    // Get unique venues    // Get results count
    allVenues: (state) => {, getters) => {
      if (state.venues && state.venues.length > 0) {gth;
        return state.venues;
      }
      const venueSet = new Set();    // Check if event is saved by user
      state.allEvents.forEach(event => { => {
        if (event.venue) {ntId);
          venueSet.add(event.venue);
        }
      });    // Club Events - filtered by club owner and filters
      return Array.from(venueSet).sort();{
    },
tUser:', currentUser);
    // Get results count
    resultsCount: (state, getters) => { currentUser or id, returning []');
      return getters.filteredEvents.length;
    },

    // Check if event is saved by user      // First, filter events owned by this club
    isEventSaved: (state) => (eventId) => {ent => event.ownerId === currentUser.id);
      return state.savedEvents.includes(eventId);
    },d):', clubEvents);

    // Club Events - filtered by club owner and filters      // Check if any filters are active
    filteredClubEvents: (state, getters, rootState) => {
      const currentUser = rootState.auth.user;rs.searchQuery &&
      console.log('filteredClubEvents - currentUser:', currentUser);ngth === 0 &&
      if (!currentUser || !currentUser.id) {
        console.log('filteredClubEvents - no currentUser or id, returning []');
        return [];&
      }
both';
      // First, filter events owned by this club
      let clubEvents = state.allEvents.filter(event => event.ownerId === currentUser.id);      if (noFiltersActive) {
      console.log('filteredClubEvents - allEvents:', state.allEvents);
      console.log('filteredClubEvents - clubEvents (filtered by ownerId):', clubEvents);

      // Check if any filters are active      let filtered = [...clubEvents];
      const noFiltersActive =
        !state.clubEventFilters.searchQuery &&      // Search filter
        state.clubEventFilters.selectedTags.length === 0 &&entFilters.searchQuery) {
        state.clubEventFilters.priceFilter === 'all' &&archQuery.toLowerCase();
        state.clubEventFilters.dateFilter === 'all' &&
        state.clubEventFilters.venueFilter === 'all' &&s(query) ||
        !state.clubEventFilters.locationQuery &&ry)
        state.clubEventFilters.eventStatus === 'both';

      if (noFiltersActive) {
        return clubEvents;      // Tag filter
      }bEventFilters.selectedTags.length > 0) {

      let filtered = [...clubEvents];gs.some(tag => event.tags.includes(tag))

      // Search filter
      if (state.clubEventFilters.searchQuery) {
        const query = state.clubEventFilters.searchQuery.toLowerCase();      // Price filter
        filtered = filtered.filter(event =>ventFilters.priceFilter === 'free') {
          event.title.toLowerCase().includes(query) ||= 'FREE');
          event.description.toLowerCase().includes(query)
        );');
      }

      // Tag filter      // Date filter
      if (state.clubEventFilters.selectedTags.length > 0) {new Date();
        filtered = filtered.filter(event =>);
          state.clubEventFilters.selectedTags.some(tag => event.tags.includes(tag))
        );      if (state.clubEventFilters.dateFilter === 'today') {
      }
te);
      // Price filter
      if (state.clubEventFilters.priceFilter === 'free') {today.getTime();
        filtered = filtered.filter(event => event.price === 'FREE');
      } else if (state.clubEventFilters.priceFilter === 'paid') {e if (state.clubEventFilters.dateFilter === 'this-week') {
        filtered = filtered.filter(event => event.price !== 'FREE');
      }ate() + 7);

      // Date filterte);
      const today = new Date();<= weekFromNow;
      today.setHours(0, 0, 0, 0);
e if (state.clubEventFilters.dateFilter === 'this-month') {
      if (state.clubEventFilters.dateFilter === 'today') {
        filtered = filtered.filter(event => {te);
          const eventDate = new Date(event.date);etMonth() &&
          eventDate.setHours(0, 0, 0, 0);
          return eventDate.getTime() === today.getTime();
        });
      } else if (state.clubEventFilters.dateFilter === 'this-week') {
        const weekFromNow = new Date(today);      // Venue filter
        weekFromNow.setDate(weekFromNow.getDate() + 7);ventFilters.venueFilter !== 'all') {
        filtered = filtered.filter(event => {
          const eventDate = new Date(event.date);lters.venueFilter
          return eventDate >= today && eventDate <= weekFromNow;
        });
      } else if (state.clubEventFilters.dateFilter === 'this-month') {
        filtered = filtered.filter(event => {      // Location search
          const eventDate = new Date(event.date);tFilters.locationQuery) {
          return eventDate.getMonth() === today.getMonth() &&ocationQuery.toLowerCase();
            eventDate.getFullYear() === today.getFullYear();
        });udes(locQuery) ||
      }

      // Venue filter
      if (state.clubEventFilters.venueFilter !== 'all') {
        filtered = filtered.filter(event =>      // Event status filter
          event.venue === state.clubEventFilters.venueFilter;
        );ers.eventStatus === 'upcoming') {
      }e) > now);

      // Location search<= now);
      if (state.clubEventFilters.locationQuery) {
        const locQuery = state.clubEventFilters.locationQuery.toLowerCase();
        filtered = filtered.filter(event =>      return filtered;
          event.location.toLowerCase().includes(locQuery) ||
          event.venue.toLowerCase().includes(locQuery)
        );    // Get all unique tags from club events
      }
ubEvents || [];
      // Event status filter
      const now = new Date();=> {
      if (state.clubEventFilters.eventStatus === 'upcoming') {forEach(tag => tagSet.add(tag));
        filtered = filtered.filter(event => new Date(event.date) > now);
      } else if (state.clubEventFilters.eventStatus === 'past') {urn Array.from(tagSet).sort();
        filtered = filtered.filter(event => new Date(event.date) <= now);
      }
    // Get unique venues from club events
      return filtered;rootState) => {
    },
urn state.venues || [];
    // Get all unique tags from club events
    allClubEventTags: (state, getters) => {      const clubEvents = state.allEvents.filter(event => event.ownerId === currentUser.id);
      const clubEvents = getters.filteredClubEvents || [];
      const tagSet = new Set(); {
      clubEvents.forEach(event => {dd(event.venue);
        if (event.tags) event.tags.forEach(tag => tagSet.add(tag));
      });st clubVenues = Array.from(venueSet).sort();
      return Array.from(tagSet).sort();ate.venues || []);
    },

    // Get unique venues from club events    // Club events results count
    allClubEventVenues: (state, getters, rootState) => {te, getters) => {
      const currentUser = rootState.auth.user;
      if (!currentUser || !currentUser.id) return state.venues || [];

      const clubEvents = state.allEvents.filter(event => event.ownerId === currentUser.id);    // Dashboard-specific getters
      const venueSet = new Set();> {
      clubEvents.forEach(event => {med RSVPs (show ALL confirmed, not just future)
        if (event.venue) venueSet.add(event.venue);
      });)
      const clubVenues = Array.from(venueSet).sort();
      return clubVenues.length > 0 ? clubVenues : (state.venues || []);
    },// Filter events where user has confirmed RSVP and sort by date

    // Club events results countfirmedRsvpEventIds.includes(event.id))
    clubEventsResultsCount: (state, getters) => {
      return getters.filteredClubEvents.length;time or date field, whichever is available
    },

    // Dashboard-specific getters
    upcomingUserEvents: (state) => {
      // Get the event IDs of confirmed RSVPs (show ALL confirmed, not just future)lice(0, 6); // Show max 6 events
      const confirmedRsvpEventIds = state.userRSVPs
        .filter(rsvp => rsvp.status === 'confirmed')
        .map(rsvp => rsvp.event_id);    recommendedEvents: (state) => {
      ter out events user already RSVP'd to
      // Filter events where user has confirmed RSVP and sort by date
      return state.allEvents
        .filter(event => confirmedRsvpEventIds.includes(event.id))vpedEventIds.includes(event.id))
        .sort((a, b) => {
          // Sort by datetime or date field, whichever is available
          const dateA = new Date(a.datetime || a.date);
          const dateB = new Date(b.datetime || b.date);    userSavedEvents: (state) => {
          return dateA - dateB;
        })te.savedEvents.includes(event.id));
        .slice(0, 6); // Show max 6 events
    },
    // Get count of RSVPs for upcoming events owned by the current user (club)
    recommendedEvents: (state) => {
      // Simple recommendation: filter out events user already RSVP'd to
      const rsvpedEventIds = state.userRSVPs.map(rsvp => rsvp.event_id);urn 0;
      return state.allEvents
        .filter(event => !rsvpedEventIds.includes(event.id))      const now = new Date();
        .slice(0, 6); // Show 6 recommendationsowned by this club
    },s.filter(event =>
 > now
    userSavedEvents: (state) => {
      return state.allEvents
        .filter(event => state.savedEvents.includes(event.id));      // Count RSVPs for these events
    },Ps.filter(rsvp =>
rsvp.event_id)
    // Get count of RSVPs for upcoming events owned by the current user (club)
    clubRsvpCount: (state, getters, rootState) => {
      const currentUser = rootState.auth.user;      return rsvpCount;
      if (!currentUser || !currentUser.id) return 0;

      const now = new Date();    // Get upcoming events owned by the current user (club)
      // Get upcoming events owned by this club
      const upcomingClubEvents = state.allEvents.filter(event =>
        event.ownerId === currentUser.id && new Date(event.date) > nowurn [];
      );
      const now = new Date();
      // Count RSVPs for these eventsfilter(event =>
      const rsvpCount = state.clubRSVPs.filter(rsvp =>new Date(event.date) > now
        upcomingClubEvents.some(event => event.id === rsvp.event_id)
      ).length;

      return rsvpCount;    toast: (state) => state.toast
    },

    // Get upcoming events owned by the current user (club)  mutations: {
    upcomingClubEvents: (state, getters, rootState) => {
      const currentUser = rootState.auth.user;    setAllEvents(state, events) {
      if (!currentUser || !currentUser.id) return [];

      const now = new Date();
      return state.allEvents.filter(event =>    SET_PAGINATION(state, paginationData) {
        event.ownerId === currentUser.id && new Date(event.date) > now
      ).sort((a, b) => new Date(a.date) - new Date(b.date));n,
    },

    toast: (state) => state.toast
  },
    SET_CURRENT_PAGE(state, page) {
  mutations: {= page;

    setAllEvents(state, events) {
      state.allEvents = events;    SET_EVENT_CATEGORIES(state, categories) {
    },

    SET_PAGINATION(state, paginationData) {
      state.pagination = {
        ...state.pagination,
        ...paginationData      const normalized = categories.map(item => {
      };
    },ring') return item.trim();
me || '').trim();
    SET_CURRENT_PAGE(state, page) {hex_code || null;
      state.pagination.currentPage = page;
    },

    SET_EVENT_CATEGORIES(state, categories) {      normalized.sort((a, b) => {
      if (!Array.isArray(categories)) {string' ? a : a.name || '';
        state.categories = [];
        return;
      }

      const normalized = categories.map(item => {      const assigned = assignPalette(normalized);
        if (!item) return null;e: c.name, color: c.color }));
        if (typeof item === 'string') return item.trim();
        const name = (item.name || item.label || item?.Name || '').trim();
        const provided = item.color || item.color_hex || item.hex || item.hex_code || null;    SET_EVENT_VENUES(state, venues) {
        return { name, color: provided || null };
      }).filter(Boolean);

      normalized.sort((a, b) => {    SET_AVAILABLE_TAGS(state, tags) {
        const na = typeof a === 'string' ? a : a.name || '';rray(tags) ? tags : [];
        const nb = typeof b === 'string' ? b : b.name || '';
        return na.localeCompare(nb);
      });    // Update search query
, query) {
      const assigned = assignPalette(normalized);ery;
      state.categories = assigned.map(c => ({ name: c.name, color: c.color }));
    },
    SET_USER_STATS(state, stats) {
    SET_EVENT_VENUES(state, venues) {
      state.venues = venues;
    },
    SET_CLUB_STATS(state, stats) {
    SET_AVAILABLE_TAGS(state, tags) {
      state.availableTags = Array.isArray(tags) ? tags : [];
    },
    SET_USER_RSVPS(state, rsvps) {
    // Update search queryray(rsvps) ? rsvps : [];
    SET_SEARCH_QUERY(state, query) {
      state.filters.searchQuery = query;
    },    SET_CLUB_RSVPS(state, rsvps) {

    SET_USER_STATS(state, stats) {
      state.userStats = stats;
    },    SET_SAVED_EVENTS(state, savedEventIds) {
EventIds)
    SET_CLUB_STATS(state, stats) {
      state.clubStats = stats;> Number(id))
    },isNaN(id))

    SET_USER_RSVPS(state, rsvps) {avedEvents = normalized;
      state.userRSVPs = Array.isArray(rsvps) ? rsvps : [];
    },
    ADD_SAVED_EVENT(state, eventId) {
    SET_CLUB_RSVPS(state, rsvps) {d);
      state.clubRSVPs = rsvps;
    },

    SET_SAVED_EVENTS(state, savedEventIds) {f (!state.savedEvents.includes(numericId)) {
      const normalized = Array.isArray(savedEventIds)
        ? savedEventIds
            .map((id) => Number(id))
            .filter((id) => !Number.isNaN(id))
        : [];    REMOVE_SAVED_EVENT(state, eventId) {
      state.savedEvents = normalized;
    },nts.filter(id => id !== numericId);

    ADD_SAVED_EVENT(state, eventId) {
      const numericId = Number(eventId);    // Toggle category selection
      if (Number.isNaN(numericId)) {ory) {
        return;ctedCategories.indexOf(category);
      }
      if (!state.savedEvents.includes(numericId)) {electedCategories.splice(index, 1);
        state.savedEvents.push(numericId);
      }filters.selectedCategories.push(category);
    },

    REMOVE_SAVED_EVENT(state, eventId) {
      const numericId = Number(eventId);    // Toggle tag selection
      state.savedEvents = state.savedEvents.filter(id => id !== numericId);{
    },lters.selectedTags.indexOf(tag);

    // Toggle category selectionelectedTags.splice(index, 1);
    TOGGLE_CATEGORY(state, category) {
      const index = state.filters.selectedCategories.indexOf(category);filters.selectedTags.push(tag);
      if (index > -1) {
        state.filters.selectedCategories.splice(index, 1);
      } else {
        state.filters.selectedCategories.push(category);    // Update price range filter
      } = {}) {
    },
= null || value === undefined) {
    // Toggle tag selection
    TOGGLE_TAG(state, tag) {
      const index = state.filters.selectedTags.indexOf(tag);onst numeric = Number(value);
      if (index > -1) {
        state.filters.selectedTags.splice(index, 1);
      } else {
        state.filters.selectedTags.push(tag);eturn numeric < 0 ? 0 : numeric;
      }
    },
      state.filters.priceRange = {
    // Update price range filter
    SET_PRICE_RANGE(state, range = {}) {
      const normalize = (value) => {
        if (value === '' || value === null || value === undefined) {
          return null;
        }    // Set date filter
        const numeric = Number(value);ateFilter) {
        if (Number.isNaN(numeric)) {r;
          return null;
        } null;
        return numeric < 0 ? 0 : numeric;
      };

      state.filters.priceRange = {ECIFIC_DATE(state, date) {
        min: normalize(range.min),tate.filters.specificDate = date || null;
        max: normalize(range.max)
      };
    },r

    // Set price filter mode
    SET_PRICE_FILTER(state, priceFilter) {
      state.filters.priceFilter = priceFilter;
      if (priceFilter !== 'range') {Set location query
        state.filters.priceRange = {T_LOCATION_QUERY(state, query) {
          min: null,      state.filters.locationQuery = query;
          max: null
        };
      } Set event status
    },    SET_EVENT_STATUS(state, status) {
ntStatus = status;
    // Set date filter
    SET_DATE_FILTER(state, dateFilter) {
      state.filters.dateFilter = dateFilter;GGLE_STATUS_FILTER(state, option) {
      if (dateFilter !== 'specific') {      if (!state.filters.statusFilter || !(option in state.filters.statusFilter)) {
        state.filters.specificDate = null;
      }
    },
  ...state.filters.statusFilter,
    SET_SPECIFIC_DATE(state, date) {        [option]: !state.filters.statusFilter[option]
      state.filters.specificDate = date || null;
    },

    // Set venue filterT_STATUS_FILTER(state, updates = {}) {
    SET_VENUE_FILTER(state, venue) {      state.filters.statusFilter = {
      state.filters.venueFilter = venue;
    },

    // Set location query
    SET_LOCATION_QUERY(state, query) {
      state.filters.locationQuery = query;tegoryId) {
    },d;

    // Set event status
    SET_EVENT_STATUS(state, status) {    SET_CLUB_FILTER_FOLLOWED(state, followedOnly) {
      state.filters.eventStatus = status;= !!followedOnly;
    },

    TOGGLE_STATUS_FILTER(state, option) {ilters
      if (!state.filters.statusFilter || !(option in state.filters.statusFilter)) {T_FILTERS(state) {
        return;state.filters = {
      }        searchQuery: '',
      state.filters.statusFilter = {
        ...state.filters.statusFilter,
        [option]: !state.filters.statusFilter[option]  priceRange: {
      };          min: null,
    },

    SET_STATUS_FILTER(state, updates = {}) {  dateFilter: 'all',
      state.filters.statusFilter = {        specificDate: null,
        ...state.filters.statusFilter,l',
        ...updates
      };oth',
    },

    SET_CLUB_FILTER_CATEGORY(state, categoryId) {e,
      state.filters.clubFilter.categoryId = categoryId;
    },alse

    SET_CLUB_FILTER_FOLLOWED(state, followedOnly) { {
      state.filters.clubFilter.followedOnly = !!followedOnly;categoryId: 'all',
    },lse

    // Reset all filters
    RESET_FILTERS(state) {
      state.filters = {
        searchQuery: '',r Mutations
        selectedCategories: [],H_QUERY(state, query) {
        selectedTags: [],s.searchQuery = query;
        priceFilter: 'all',
        priceRange: {
          min: null,_CLUB_EVENT_TAG(state, tag) {
          max: nulltate.clubEventFilters.selectedTags.indexOf(tag);
        },
        dateFilter: 'all',s.selectedTags.splice(index, 1);
        specificDate: null,lse {
        venueFilter: 'all',state.clubEventFilters.selectedTags.push(tag);
        locationQuery: '',}
        eventStatus: 'both',    },
        statusFilter: {
          rsvped: false,ter) {
          notRsvped: false,ilter;
          saved: false,
          notSaved: false
        },ateFilter) {
        clubFilter: {
          categoryId: 'all',
          followedOnly: false
        }VENT_VENUE_FILTER(state, venue) {
      };
    },

    // Club Event Filter Mutations    SET_CLUB_EVENT_LOCATION_QUERY(state, query) {
    SET_CLUB_EVENT_SEARCH_QUERY(state, query) {
      state.clubEventFilters.searchQuery = query;
    },
    SET_CLUB_EVENT_STATUS(state, status) {
    TOGGLE_CLUB_EVENT_TAG(state, tag) {
      const index = state.clubEventFilters.selectedTags.indexOf(tag);
      if (index > -1) {
        state.clubEventFilters.selectedTags.splice(index, 1);    RESET_CLUB_EVENT_FILTERS(state) {
      } else {
        state.clubEventFilters.selectedTags.push(tag);
      }  selectedTags: [],
    },        priceFilter: 'all',

    SET_CLUB_EVENT_PRICE_FILTER(state, priceFilter) {
      state.clubEventFilters.priceFilter = priceFilter;  locationQuery: '',
    },        eventStatus: 'both'

    SET_CLUB_EVENT_DATE_FILTER(state, dateFilter) {
      state.clubEventFilters.dateFilter = dateFilter;
    },    SHOW_TOAST(state, { message, type }) {

    SET_CLUB_EVENT_VENUE_FILTER(state, venue) {
      state.clubEventFilters.venueFilter = venue;e = true;
    },

    SET_CLUB_EVENT_LOCATION_QUERY(state, query) {
      state.clubEventFilters.locationQuery = query; false;
    },= '';
nfo';
    SET_CLUB_EVENT_STATUS(state, status) {
      state.clubEventFilters.eventStatus = status;
    },

    RESET_CLUB_EVENT_FILTERS(state) {
      state.clubEventFilters = {({ state, commit }) {
        searchQuery: '', > 0) {
        selectedTags: [],  return;
        priceFilter: 'all',      }
        dateFilter: 'all',
        venueFilter: 'all',AllEventCategories();
        locationQuery: '',ay(response.data) ? response.data : [];
        eventStatus: 'both' returns objects with name and color use them; if it returns strings, keep as strings
      };   const normalized = raw.map(item => {
    },      if (!item) return null;
          if (typeof item === 'string') return item.trim();
    SHOW_TOAST(state, { message, type }) { prefer explicit fields
      state.toast.message = message;          return {
      state.toast.type = type;rim(),
      state.toast.visible = true;lor_hex || item.hex || item.hex_code || null
    },
 }).filter(Boolean);
    HIDE_TOAST(state) {Sort by name
      state.toast.visible = false;
      state.toast.message = '';
      state.toast.type = 'info';
    }
  },

  actions: {
ror('Failed to load event categories', error);
    async fetchEventCategories({ state, commit }) {
      if (state.categories.length > 0) {
        return;
      }
      try {ues({ state, commit }) {
        const response = await getAllEventCategories();{
        const raw = Array.isArray(response.data) ? response.data : [];
        // Normalize: if backend returns objects with name and color use them; if it returns strings, keep as strings
        const normalized = raw.map(item => {
          if (!item) return null;st response = await getAllEventVenues();
          if (typeof item === 'string') return item.trim();ata) ? response.data : [];
          // prefer explicit fieldsNT_VENUES', venuesData);
          return {
            name: (item.name || item.label || '').trim(), venues', error);
            color: item.color || item.color_hex || item.hex || item.hex_code || null commit('SET_EVENT_VENUES', []);
          };}
        }).filter(Boolean);    },
        // Sort by name
        normalized.sort((a, b) => {, commit }, { force = false } = {}) {
          const na = typeof a === 'string' ? a : a.name || '';e && Array.isArray(state.availableTags) && state.availableTags.length > 0) {
          const nb = typeof b === 'string' ? b : b.name || ''; return;
          return na.localeCompare(nb);
        });
        commit('SET_EVENT_CATEGORIES', normalized);
      } catch (error) {a) ? response.data : [];
        console.error('Failed to load event categories', error);s = tags
        commit('SET_EVENT_CATEGORIES', []);
      }
    },     if (typeof item === 'string') return { id: null, tag_name: item.trim() };
      return {
    async fetchEventVenues({ state, commit }) {              id: item.id,
      if (state.venues.length > 0) {
        return;
      }
      try {   .filter(Boolean);
        const response = await getAllEventVenues();Objects.sort((a, b) => a.tag_name.localeCompare(b.tag_name));
        const venuesData = Array.isArray(response.data) ? response.data : [];cts);
        commit('SET_EVENT_VENUES', venuesData);
      } catch (error) {o load event tags', error);
        console.error('Failed to load event venues', error);
        commit('SET_EVENT_VENUES', []);S', []);
      }
    },

    async fetchAvailableTags({ state, commit }, { force = false } = {}) {
      if (!force && Array.isArray(state.availableTags) && state.availableTags.length > 0) {hAllEvents({ commit, state }, page = 1) {
        return;
      }se, eventTagsResponse, tagsResponse] = await Promise.all([
      try {
        const response = await getAllTags();
        const tags = Array.isArray(response.data) ? response.data : [];
        const tagObjects = tags
          .map((item) => {
            if (!item) return null;tsResponse.data;
            if (typeof item === 'string') return { id: null, tag_name: item.trim() };onst eventTags = eventTagsResponse.data;
            return { const tags = tagsResponse.data;
              id: item.id,
              tag_name: (item.tag_name || item.name || '').trim()        // Update pagination metadata
            };
          })
          .filter(Boolean);
        tagObjects.sort((a, b) => a.tag_name.localeCompare(b.tag_name));
        commit('SET_AVAILABLE_TAGS', tagObjects);{
      } catch (error) {d] = tag.tag_name;
        console.error('Failed to load event tags', error);
        if (force) {
          commit('SET_AVAILABLE_TAGS', []);
        }
      }
    },          if (!eventTagMap[et.event_id]) {
= [];
    async fetchAllEvents({ commit, state }, page = 1) {
      try {          const tagName = tagMap[et.tag_id];
        const [eventsResponse, eventTagsResponse, tagsResponse] = await Promise.all([
          getAllEvents(page, state.pagination.eventsPerPage),.event_id].push(tagName);
          getAllEventTags(),
          getAllTags()
        ]);
        // Assign tags and normalise numeric fields on events
        const { events, pagination } = eventsResponse.data;
        const eventTags = eventTagsResponse.data;Map[event.id] || [];
        const tags = tagsResponse.data;

        // Update pagination metadatariceValue);
        commit('SET_PAGINATION', pagination); event.priceValue = Number.isNaN(numeric) ? null : numeric;

        // Create a map of tag_id to tag_name
        const tagMap = {};
        tags.forEach(tag => { const numericCategory = Number(event.clubCategoryId);
          tagMap[tag.id] = tag.tag_name; event.clubCategoryId = Number.isNaN(numericCategory) ? null : numericCategory;
        });          }

        // Create a map of event_id to array of tag_names
        const eventTagMap = {};ags:', events);
        eventTags.forEach(et => {        commit('setAllEvents', events);
          if (!eventTagMap[et.event_id]) {
            eventTagMap[et.event_id] = [];r);
          }
          const tagName = tagMap[et.tag_id];
          if (tagName) {
            eventTagMap[et.event_id].push(tagName);{
          }
        });
st response = await getUserStats(userId);
        // Assign tags and normalise numeric fields on eventsmit('SET_USER_STATS', response.data);
        events.forEach(event => {      } catch (error) {
          event.tags = eventTagMap[event.id] || [];

          if (event.priceValue != null) {
            const numeric = Number(event.priceValue);
            event.priceValue = Number.isNaN(numeric) ? null : numeric;nc fetchClubStats({ commit }, clubId) {
          }try {
        const { getClubStats } = await import('../services/statsService');
          if (event.clubCategoryId != null) {ubId);
            const numericCategory = Number(event.clubCategoryId);mit('SET_CLUB_STATS', response.data);
            event.clubCategoryId = Number.isNaN(numericCategory) ? null : numericCategory;
          }error);
        });

        console.log('fetchAllEvents - events with tags:', events);
        commit('setAllEvents', events);nc fetchUserRSVPs({ commit }, userId) {
      } catch (error) {if (!userId) return;
        console.error('fetchAllEvents - error:', error);      try {
      }ort('../services/rsvpService');
    },st response = await getRsvpsByUserId(userId);

    async fetchUserStats({ commit }, userId) {
      try {
        const { getUserStats } = await import('../services/statsService');Error fetching user RSVPs:', error);
        const response = await getUserStats(userId);
        commit('SET_USER_STATS', response.data);
      } catch (error) {
        console.error('Error fetching user stats:', error);
      }t }) {
    },etters['auth/currentUser']?.id;
userId) return;
    async fetchClubStats({ commit }, clubId) {
      try {
        const { getClubStats } = await import('../services/statsService');
        const response = await getClubStats(clubId);Ids);
        commit('SET_CLUB_STATS', response.data);
      } catch (error) {;
        console.error('Error fetching club stats:', error);
      }
    },
    async toggleSaveEvent({ getters, commit, rootGetters, dispatch }, eventId) {
    async fetchUserRSVPs({ commit }, userId) {?.id;
      if (!userId) return;
      try {s.isEventSaved(eventId);
        const { getRsvpsByUserId } = await import('../services/rsvpService');
        const response = await getRsvpsByUserId(userId);
        const rsvps = Array.isArray(response.data) ? response.data : [];Saved }) => 
        commit('SET_USER_RSVPS', rsvps);
      } catch (error) {
        console.error('Error fetching user RSVPs:', error);
        commit('SET_USER_RSVPS', []); } else {
      }    await import('../services/savedEventsService').then(({ createSaved }) => 
    },            createSaved({ event_id: eventId, user_id: userId })

    async loadSavedEvents({ rootGetters, commit }) {
      const userId = rootGetters['auth/currentUser']?.id;
      if (!userId) return;eration
      try {it dispatch('fetchUserStats', userId);
        const res = await getSavedByUserId(userId);) {
        const eventIds = (res.data || []).map(saved => saved.event_id);
        commit('SET_SAVED_EVENTS', eventIds);
      } catch (error) {
        console.error('Error loading saved events:', error);
      }arch query
    },

    async toggleSaveEvent({ getters, commit, rootGetters, dispatch }, eventId) {
      const userId = rootGetters['auth/currentUser']?.id;
      if (!userId) return;tion to toggle category
      const saved = getters.isEventSaved(eventId);
      try {
        if (saved) {
          await import('../services/savedEventsService').then(({ deleteSaved }) => 
            deleteSaved(eventId, userId)Action to toggle tag
          );ggleTag({ commit }, tag) {
          commit('REMOVE_SAVED_EVENT', eventId);      commit('TOGGLE_TAG', tag);
        } else {
          await import('../services/savedEventsService').then(({ createSaved }) => 
            createSaved({ event_id: eventId, user_id: userId }){
          );commit('SET_PRICE_RANGE', range);
          commit('ADD_SAVED_EVENT', eventId);    },
        }
        // Refresh user stats after save/unsave operation
        await dispatch('fetchUserStats', userId);
      } catch (error) {
        console.error('Error toggling save event:', error);
      }t }, date) {
    },, date);

    // Update search query
    updateSearch({ commit }, query) {    updateVenueFilter({ commit }, venue) {
      commit('SET_SEARCH_QUERY', query);
    },

    // Action to toggle category    updateLocationQuery({ commit }, query) {
    toggleCategory({ commit }, category) {
      commit('TOGGLE_CATEGORY', category);
    },
    updateEventStatus({ commit }, status) {
    // Action to toggle tag);
    toggleTag({ commit }, tag) {
      commit('TOGGLE_TAG', tag);
    },    toggleStatusFilter({ commit }, option) {
n);
    updatePriceRange({ commit }, range) {
      commit('SET_PRICE_RANGE', range);
    },    setStatusFilter({ commit }, payload) {

    updateDateFilter({ commit }, filter) {
      commit('SET_DATE_FILTER', filter);
    },    updateClubCategoryFilter({ commit }, categoryId) {
tegoryId);
    setSpecificDate({ commit }, date) {
      commit('SET_SPECIFIC_DATE', date);
    },    updateClubFollowedFilter({ commit }, followedOnly) {
lowedOnly);
    updateVenueFilter({ commit }, venue) {
      commit('SET_VENUE_FILTER', venue);
    },    resetFilters({ commit }) {

    updateLocationQuery({ commit }, query) {
      commit('SET_LOCATION_QUERY', query);
    },    // Club Event Filter Actions

    updateEventStatus({ commit }, status) {
      commit('SET_EVENT_STATUS', status);
    },

    toggleStatusFilter({ commit }, option) {
      commit('TOGGLE_STATUS_FILTER', option);
    },
({ commit }, filter) {
    setStatusFilter({ commit }, payload) {RICE_FILTER', filter);
      commit('SET_STATUS_FILTER', payload);
    },
commit }, filter) {
    updateClubCategoryFilter({ commit }, categoryId) {ter);
      commit('SET_CLUB_FILTER_CATEGORY', categoryId);
    },
    updateClubEventVenueFilter({ commit }, venue) {
    updateClubFollowedFilter({ commit }, followedOnly) {', venue);
      commit('SET_CLUB_FILTER_FOLLOWED', followedOnly);
    },
    updateClubEventLocationQuery({ commit }, query) {
    resetFilters({ commit }) {;
      commit('RESET_FILTERS');
    },
    updateClubEventStatus({ commit }, status) {
    // Club Event Filter Actions
    updateClubEventSearch({ commit }, query) {
      commit('SET_CLUB_EVENT_SEARCH_QUERY', query);
    },    resetClubEventFilters({ commit }) {

    toggleClubEventTag({ commit }, tag) {
      commit('TOGGLE_CLUB_EVENT_TAG', tag);
    },    showToast({ commit }, { message, type = 'info', duration = 3000 } = {}) {

    updateClubEventPriceFilter({ commit }, filter) {
      commit('SET_CLUB_EVENT_PRICE_FILTER', filter);toastTimer = setTimeout(() => {
    },        commit('HIDE_TOAST');

    updateClubEventDateFilter({ commit }, filter) {
      commit('SET_CLUB_EVENT_DATE_FILTER', filter);
    },

    updateClubEventVenueFilter({ commit }, venue) {
      commit('SET_CLUB_EVENT_VENUE_FILTER', venue);  clearTimeout(toastTimer);
    },        toastTimer = null;

    updateClubEventLocationQuery({ commit }, query) {
      commit('SET_CLUB_EVENT_LOCATION_QUERY', query);
    },

    updateClubEventStatus({ commit }, status) {
      commit('SET_CLUB_EVENT_STATUS', status);
    },ubs,
  }
    resetClubEventFilters({ commit }) {
      commit('RESET_CLUB_EVENT_FILTERS');    },    showToast({ commit }, { message, type = 'info', duration = 3000 } = {}) {      if (toastTimer) clearTimeout(toastTimer);      commit('SHOW_TOAST', { message, type });      toastTimer = setTimeout(() => {        commit('HIDE_TOAST');        toastTimer = null;      }, duration);    },    hideToast({ commit }) {      if (toastTimer) {
        clearTimeout(toastTimer);
        toastTimer = null;
      }
      commit('HIDE_TOAST');
    }
  },

  modules: {
    auth,
    clubs,
  }
});

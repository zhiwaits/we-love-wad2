import auth from './modules/auth';
import { createStore } from 'vuex';
import { getAllEvents, getRecommendedEvents } from "../services/eventService.js";
import { getAllEventCategories } from '../services/eventCategoryService.js';
import { getAllEventVenues } from '../services/eventVenueService.js';
import { getAllTags } from '../services/tagService.js';
import { getAllEventTags } from '../services/eventTagService.js';
import { getAllSaved, getSavedByUserId, getSavedByEventId, createSaved, deleteSaved } from '../services/savedEventsService.js';
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

const EVENTS_PER_PAGE = 6;

const buildEventTagMap = (eventTags = [], tags = []) => {
  const tagNameMap = {};
  tags.forEach((tag) => {
    if (!tag || tag.id == null) return;
    const rawName = tag.tag_name || tag.name || '';
    const name = typeof rawName === 'string' ? rawName.trim() : '';
    if (!name) return;
    tagNameMap[tag.id] = name;
  });

  const eventTagMap = {};
  eventTags.forEach((relation) => {
    if (!relation) return;
    const eventId = relation.event_id;
    const tagId = relation.tag_id;
    if (eventId == null || tagId == null) return;
    const tagName = tagNameMap[tagId];
    if (!tagName) return;
    const key = String(eventId);
    if (!eventTagMap[key]) {
      eventTagMap[key] = [];
    }
    eventTagMap[key].push(tagName);
  });

  return eventTagMap;
};

const normalizeEventRecord = (rawEvent = {}, eventTagMap = {}) => {
  const event = { ...rawEvent };

  if (event.id != null) {
    const numericId = Number(event.id);
    if (!Number.isNaN(numericId)) {
      event.id = numericId;
    }
  }

  if (event.ownerId != null) {
    const numericOwner = Number(event.ownerId);
    if (!Number.isNaN(numericOwner)) {
      event.ownerId = numericOwner;
    }
  } else if (event.owner_id != null) {
    const numericOwner = Number(event.owner_id);
    if (!Number.isNaN(numericOwner)) {
      event.ownerId = numericOwner;
    }
  }

  const eventKey = event.id != null ? String(event.id) : null;
  if (eventKey && eventTagMap[eventKey]) {
    event.tags = [...eventTagMap[eventKey]];
  } else {
    event.tags = Array.isArray(event.tags) ? event.tags : [];
  }

  if (event.priceValue != null) {
    const numeric = Number(event.priceValue);
    event.priceValue = Number.isNaN(numeric) ? null : numeric;
  }

  if (event.clubCategoryId != null) {
    const numericCategory = Number(event.clubCategoryId);
    event.clubCategoryId = Number.isNaN(numericCategory) ? null : numericCategory;
  }

  return event;
};

const normalizeEventsWithMetadata = (events = [], eventTagMap = {}) => {
  if (!Array.isArray(events)) {
    return [];
  }
  return events.map((event) => normalizeEventRecord(event, eventTagMap));
};

const getNumericOwnerId = (event) => {
  if (!event) return null;
  const candidates = [
    event.ownerId,
    event.owner_id,
    event.ownerID,
    event.owner?.id
  ];
  for (const candidate of candidates) {
    if (candidate == null) continue;
    const numeric = Number(candidate);
    if (!Number.isNaN(numeric)) {
      return numeric;
    }
  }
  return null;
};

const getClubEventSource = (state) => {
  if (Array.isArray(state.clubOwnedEvents) && state.clubOwnedEvents.length > 0) {
    return state.clubOwnedEvents;
  }
  return Array.isArray(state.allEvents) ? state.allEvents : [];
};

const generateRandomSortMap = (events = []) => {
  if (!Array.isArray(events)) return {};
  const map = {};
  events.forEach((event) => {
    if (!event || event.id == null) return;
    map[String(event.id)] = Math.random();
  });
  return map;
};

const pruneRandomSortMap = (map = {}, events = []) => {
  if (!map || typeof map !== 'object') return {};
  if (!Array.isArray(events)) return {};
  const allowed = new Set(
    events
      .map((event) => (event && event.id != null ? String(event.id) : null))
      .filter(Boolean)
  );
  const next = {};
  Object.keys(map).forEach((key) => {
    if (allowed.has(key)) {
      next[key] = map[key];
    }
  });
  return next;
};

const createDefaultFilters = () => ({
  searchQuery: '',
  selectedCategories: [],
  selectedTags: [],
  priceFilter: 'all',
  priceRange: {
    min: null,
    max: null
  },
  dateFilter: 'all',
  specificDate: null,
  dateRange: {
    start: null,
    end: null
  },
  venueFilter: 'all',
  locationQuery: '',
  eventStatus: 'both',
  statusFilter: {
    rsvped: false,
    notRsvped: false,
    saved: false,
    notSaved: false
  },
  clubFilter: {
    categoryId: 'all',
    followedOnly: false
  },
  sortOption: 'preference'
});

const createDefaultClubEventFilters = () => ({
  searchQuery: '',
  selectedTags: [],
  priceFilter: 'all',
  priceRange: {
    min: null,
    max: null
  },
  dateFilter: 'all',
  specificDate: null,
  dateRange: {
    start: null,
    end: null
  },
  venueFilter: 'all',
  locationQuery: '',
  eventStatus: 'both'
});

const createDefaultToast = () => ({
  message: '',
  type: 'info',
  visible: false
});

const getDefaultRootState = () => ({
  allEvents: [],
  clubOwnedEvents: [],
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalEvents: 0,
    eventsPerPage: EVENTS_PER_PAGE,
    hasNextPage: false,
    hasPreviousPage: false
  },
  userStats: {
    upcomingRSVPs: 0,
    totalAttended: 0,
    savedCount: 0,
    clubsFollowed: 0
  },
  clubStats: {
    upcomingEvents: 0,
    totalEvents: 0,
    currentRSVPs: 0,
    followers: 0
  },
  userRSVPs: [],
  savedEvents: [],
  clubRSVPs: [],
  clubFollowers: [],
  randomSortMap: {},
  filters: createDefaultFilters(),
  clubEventFilters: createDefaultClubEventFilters(),
  categories: [],
  venues: [],
  availableTags: [],
  toast: createDefaultToast()
});

const clearToastTimer = () => {
  if (toastTimer) {
    clearTimeout(toastTimer);
    toastTimer = null;
  }
};

export default createStore({

  state: {
    // All events (unfiltered) - used by dashboard
    allEvents: [],

    // Browse events (filtered) - used by browse events page
    browseEvents: [],

    // Recommended events - used when viewing recommendations
    recommendedEvents: [],

    // Show recommended toggle
    showRecommended: false,

    // Pagination state
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalEvents: 0,
      eventsPerPage: EVENTS_PER_PAGE,
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
    filters: createDefaultFilters(),

  randomSortMap: {},

    // Club event filters (for managing club's own events)
    clubEventFilters: createDefaultClubEventFilters(),

    categories: [],
    venues: [],

    availableTags: [],

    toast: {
      message: '',
      type: 'info',
      visible: false
    }
  },

  getters: {

    currentUser: (state, getters, rootState) => rootState.auth.user,

    allEvents(state) {
      return state.allEvents;
    },
    // Get filtered events based on current filters
    filteredEvents: (state, getters, rootState) => {
      const baseEvents = state.showRecommended ? state.recommendedEvents : state.browseEvents;
      let filtered = Array.isArray(baseEvents) ? [...baseEvents] : [];

      const filters = state.filters || createDefaultFilters();

      const now = new Date();
      if (filters.eventStatus === 'upcoming') {
        filtered = filtered.filter((event) => {
          const dateValue = event?.date || event?.datetime || event?.start_time;
          const eventDate = dateValue ? new Date(dateValue) : null;
          return eventDate ? eventDate > now : true;
        });
      } else if (filters.eventStatus === 'past') {
        filtered = filtered.filter((event) => {
          const dateValue = event?.date || event?.datetime || event?.start_time;
          const eventDate = dateValue ? new Date(dateValue) : null;
          return eventDate ? eventDate <= now : false;
        });
      }

      if (Array.isArray(filters.selectedTags) && filters.selectedTags.length > 0) {
        filtered = filtered.filter((event) => {
          const eventTags = Array.isArray(event?.tags) ? event.tags : [];
          return filters.selectedTags.some((tag) => eventTags.includes(tag));
        });
      }

      const statusFilter = filters.statusFilter || {};
      if (statusFilter.rsvped || statusFilter.notRsvped || statusFilter.saved || statusFilter.notSaved) {
        const rsvpedIds = new Set(state.userRSVPs.map((rsvp) => rsvp.event_id));
        const savedIds = Array.isArray(state.savedEvents) ? new Set(state.savedEvents) : new Set();

        filtered = filtered.filter((event) => {
          const isRsvped = rsvpedIds.has(event?.id);
          const isSaved = savedIds.has(event?.id);

          if (statusFilter.rsvped && !isRsvped) return false;
          if (statusFilter.notRsvped && isRsvped) return false;
          if (statusFilter.saved && !isSaved) return false;
          if (statusFilter.notSaved && isSaved) return false;
          return true;
        });
      }

      const clubFilter = filters.clubFilter || { categoryId: 'all', followedOnly: false };
      if (clubFilter.categoryId && clubFilter.categoryId !== 'all') {
        const desiredId = Number(clubFilter.categoryId);
        filtered = filtered.filter((event) => {
          const categoryId = event?.clubCategoryId ?? event?.club_category_id;
          return Number(categoryId) === desiredId;
        });
      }

      if (clubFilter.followedOnly) {
        const followedClubIds = Array.isArray(state.clubFollowers)
          ? new Set(
              state.clubFollowers
                .map((entry) => entry?.club_id ?? entry?.following_id ?? entry?.id)
                .filter((value) => value != null)
                .map((value) => Number(value))
            )
          : new Set();
        if (followedClubIds.size > 0) {
          filtered = filtered.filter((event) => followedClubIds.has(Number(event?.ownerId ?? event?.owner_id)));
        }
      }

      const searchQuery = filters.searchQuery?.trim().toLowerCase();
      if (searchQuery) {
        filtered = filtered.filter((event) => {
          const title = event?.title?.toLowerCase() || '';
          const description = event?.description?.toLowerCase() || '';
          const organiser = event?.organiser?.toLowerCase() || '';
          const location = event?.location?.toLowerCase() || '';
          return (
            title.includes(searchQuery) ||
            description.includes(searchQuery) ||
            organiser.includes(searchQuery) ||
            location.includes(searchQuery)
          );
        });
      }

      const buildTimestamp = (event) => {
        if (!event) return 0;
        const candidateFields = [
          event.created_at,
          event.createdAt,
          event.date_created,
          event.dateCreated,
          event.datetime,
          event.date
        ];
        for (const field of candidateFields) {
          if (!field) continue;
          const parsed = new Date(field);
          if (!Number.isNaN(parsed.getTime())) {
            return parsed.getTime();
          }
        }
        return 0;
      };

      const tieBreaker = (a, b) => buildTimestamp(b) - buildTimestamp(a);

      const getEventDate = (event) => {
        if (!event) return null;
        const dateValue = event.datetime || event.date || event.start_time || event.startDate;
        if (!dateValue) return null;
        const parsed = new Date(dateValue);
        return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
      };

      const getEventPrice = (event) => {
        if (!event) return 0;
        if (typeof event.priceValue === 'number' && !Number.isNaN(event.priceValue)) {
          return event.priceValue;
        }
        if (typeof event.price === 'number') {
          return Number.isNaN(event.price) ? 0 : event.price;
        }
        if (typeof event.price === 'string') {
          const trimmed = event.price.trim().toUpperCase();
          if (trimmed === 'FREE') {
            return 0;
          }
          const numeric = Number(trimmed.replace(/[^0-9.]/g, ''));
          return Number.isNaN(numeric) ? 0 : numeric;
        }
        return 0;
      };

      const getRandomWeight = (event) => {
        if (!event || event.id == null) return Math.random();
        const map = state.randomSortMap || {};
        const key = String(event.id);
        if (map[key] != null) {
          return map[key];
        }
        return Math.random();
      };

      const user = rootState.auth?.user || null;

      const buildPreferenceScorer = () => {
        if (!user) return null;

        const categoryPrefs = Array.isArray(user.categoryPreferences) ? user.categoryPreferences : [];
        const clubCategoryPrefs = Array.isArray(user.clubCategoryPreferences) ? user.clubCategoryPreferences : [];
        const tagPreferences = Array.isArray(user.tagPreferences) ? user.tagPreferences : [];

        const preferredCategories = new Set();
        const availableCategories = Array.isArray(state.categories) ? state.categories : [];
        const categoryIdToName = new Map();
        availableCategories.forEach((category) => {
          if (!category) return;
          const id = Number(category.id);
          const name = (typeof category === 'string' ? category : category.name)?.toString().trim().toLowerCase();
          if (Number.isFinite(id) && name) {
            categoryIdToName.set(id, name);
          }
        });

        categoryPrefs.forEach((value) => {
          if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            if (normalized) {
              preferredCategories.add(normalized);
            }
            const numeric = Number(value);
            if (Number.isFinite(numeric) && categoryIdToName.has(numeric)) {
              preferredCategories.add(categoryIdToName.get(numeric));
            }
          } else if (Number.isFinite(Number(value))) {
            const numeric = Number(value);
            if (categoryIdToName.has(numeric)) {
              preferredCategories.add(categoryIdToName.get(numeric));
            }
          }
        });

        const preferredClubCategoryIds = new Set(
          clubCategoryPrefs
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value))
        );

        const preferredClubCategoryNames = new Set(
          clubCategoryPrefs
            .map((value) => (typeof value === 'string' ? value.trim().toLowerCase() : null))
            .filter(Boolean)
        );

        const availableTags = Array.isArray(state.availableTags) ? state.availableTags : [];
        const tagIdToName = new Map();
        availableTags.forEach((tag) => {
          if (!tag) return;
          const id = Number(tag.id);
          if (Number.isFinite(id)) {
            const name = (tag.tag_name || tag.name || '').trim().toLowerCase();
            if (name) {
              tagIdToName.set(id, name);
            }
          }
        });

        const preferredTagNames = new Set();
        tagPreferences.forEach((value) => {
          const numeric = Number(value);
          if (Number.isFinite(numeric) && tagIdToName.has(numeric)) {
            preferredTagNames.add(tagIdToName.get(numeric));
          } else if (typeof value === 'string') {
            preferredTagNames.add(value.trim().toLowerCase());
          }
        });

        const hasPrefs =
          preferredCategories.size > 0 ||
          preferredClubCategoryIds.size > 0 ||
          preferredClubCategoryNames.size > 0 ||
          preferredTagNames.size > 0;

        if (!hasPrefs) return null;

        return (event) => {
          let score = 0;

          const category = event?.category?.toString().trim().toLowerCase();
          if (category && preferredCategories.has(category)) {
            score += 1;
          }

          const eventTags = Array.isArray(event?.tags)
            ? event.tags.map((tag) => tag?.toString().trim().toLowerCase()).filter(Boolean)
            : [];

          let preferredTagCounter = 0;
          eventTags.forEach((tagName) => {
            if (preferredTagNames.has(tagName)) {
              score += 0.3 + 0.1 * preferredTagCounter;
              preferredTagCounter += 1;
            } else if (preferredTagNames.size > 0) {
              score -= 0.02;
            }
          });

          const clubCategoryId = event?.clubCategoryId ?? event?.club_category_id;
          const clubCategoryName = event?.clubCategoryName ?? event?.club_category_name;
          let appliedMultiplier = false;

          if (Number.isFinite(Number(clubCategoryId)) && preferredClubCategoryIds.has(Number(clubCategoryId))) {
            score += 0.4;
            appliedMultiplier = true;
          } else if (typeof clubCategoryName === 'string' && preferredClubCategoryNames.has(clubCategoryName.trim().toLowerCase())) {
            score += 0.4;
            appliedMultiplier = true;
          }

          if (appliedMultiplier) {
            score *= 1.25;
          }

          return score;
        };
      };

      const preferenceScorer = buildPreferenceScorer();

      const sortByPreference = () => {
        if (!preferenceScorer) {
          return sortByNewest();
        }
        const scored = filtered.map((event) => ({
          event,
          score: preferenceScorer(event)
        }));
        scored.sort((a, b) => {
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          return tieBreaker(a.event, b.event);
        });
        return scored.map((item) => item.event);
      };

      const sortByNewest = () => {
        const sorted = [...filtered];
        sorted.sort((a, b) => tieBreaker(a, b));
        return sorted;
      };

      const sortByEarliestDate = () => {
        const sorted = [...filtered];
        sorted.sort((a, b) => {
          const aDate = getEventDate(a);
          const bDate = getEventDate(b);
          if (aDate != null && bDate != null && aDate !== bDate) {
            return aDate - bDate;
          }
          if (aDate == null && bDate != null) return 1;
          if (aDate != null && bDate == null) return -1;
          return tieBreaker(a, b);
        });
        return sorted;
      };

      const sortByLatestDate = () => {
        const sorted = [...filtered];
        sorted.sort((a, b) => {
          const aDate = getEventDate(a);
          const bDate = getEventDate(b);
          if (aDate != null && bDate != null && aDate !== bDate) {
            return bDate - aDate;
          }
          if (aDate == null && bDate != null) return 1;
          if (aDate != null && bDate == null) return -1;
          return tieBreaker(a, b);
        });
        return sorted;
      };

      const sortByHighestPrice = () => {
        const sorted = [...filtered];
        sorted.sort((a, b) => {
          const priceDiff = getEventPrice(b) - getEventPrice(a);
          if (priceDiff !== 0) return priceDiff;
          return tieBreaker(a, b);
        });
        return sorted;
      };

      const sortByLowestPrice = () => {
        const sorted = [...filtered];
        sorted.sort((a, b) => {
          const priceDiff = getEventPrice(a) - getEventPrice(b);
          if (priceDiff !== 0) return priceDiff;
          return tieBreaker(a, b);
        });
        return sorted;
      };

      const sortByRandom = () => {
        const sorted = [...filtered];
        sorted.sort((a, b) => {
          const diff = getRandomWeight(a) - getRandomWeight(b);
          if (diff !== 0) return diff;
          return tieBreaker(a, b);
        });
        return sorted;
      };

      const option = filters.sortOption || 'preference';
      switch (option) {
        case 'newest':
          return sortByNewest();
        case 'earliest-date':
        case 'earliest_date':
        case 'earliestDate':
          return sortByEarliestDate();
        case 'latest-date':
        case 'latest_date':
        case 'latestDate':
          return sortByLatestDate();
        case 'highest-price':
        case 'highest_price':
        case 'highestPrice':
          return sortByHighestPrice();
        case 'lowest-price':
        case 'lowest_price':
        case 'lowestPrice':
          return sortByLowestPrice();
        case 'random':
          return sortByRandom();
        case 'preference':
        default:
          return sortByPreference();
      }
    },

    // Get all unique tags
    allTags: (state) => {
      if (!Array.isArray(state.availableTags)) return [];
      return state.availableTags.map(tag => tag.tag_name || tag.name || '').filter(Boolean).sort();
    },

    // Category names (for backwards-compatible v-for loops)
    categoryNames: (state) => {
      return Array.isArray(state.categories)
        ? state.categories.map(c => (typeof c === 'string' ? c : c.name)).filter(Boolean)
        : [];
    },

    // Map of category name -> color (if provided)
    categoryColorMap: (state) => {
      const map = {};
      if (!Array.isArray(state.categories)) return map;
      state.categories.forEach(c => {
        if (!c) return;
        const name = typeof c === 'string' ? c : c.name;
        let color = null;
        if (typeof c === 'string') color = pickColorByName(c);
        else color = c.color || pickColorByName(name);
        if (name) map[name] = color;
      });
      return map;
    },

    // Get unique venues
    allVenues: (state) => {
      if (state.venues && state.venues.length > 0) {
        return state.venues;
      }
      const venueSet = new Set();
      state.allEvents.forEach(event => {
        if (event.venue) {
          venueSet.add(event.venue);
        }
      });
      return Array.from(venueSet).sort();
    },

    // Check if an event is saved by the current user
    isEventSaved: (state) => (eventId) => {
      return state.savedEvents && state.savedEvents.includes(eventId);
    },

    // Get results count
    resultsCount: (state, getters) => {
      return getters.filteredEvents.length;
    },

    // Club Events - filtered by club owner and filters
    filteredClubEvents: (state, getters, rootState) => {
      const currentUser = rootState.auth.user;
      if (!currentUser || !currentUser.id) {
        return [];
      }

      const ownerId = Number(currentUser.id);
      if (!Number.isFinite(ownerId)) {
        return [];
      }

      const sourceEvents = getClubEventSource(state);
      let clubEvents = sourceEvents.filter(event => getNumericOwnerId(event) === ownerId);

      // Check if any filters are active
      const clubPriceRangeActive =
        state.clubEventFilters.priceFilter === 'range' &&
        ((state.clubEventFilters.priceRange?.min ?? null) !== null || (state.clubEventFilters.priceRange?.max ?? null) !== null);
      const clubSpecificDateActive =
        state.clubEventFilters.dateFilter === 'specific' && !!state.clubEventFilters.specificDate;
      const clubRangeActive =
        state.clubEventFilters.dateFilter === 'range' &&
        !!state.clubEventFilters.dateRange?.start && !!state.clubEventFilters.dateRange?.end;

      const noFiltersActive =
        !state.clubEventFilters.searchQuery &&
        state.clubEventFilters.selectedTags.length === 0 &&
        state.clubEventFilters.priceFilter === 'all' &&
        !clubPriceRangeActive &&
        state.clubEventFilters.dateFilter === 'all' &&
        !clubSpecificDateActive &&
        !clubRangeActive &&
        state.clubEventFilters.venueFilter === 'all' &&
        !state.clubEventFilters.locationQuery &&
        state.clubEventFilters.eventStatus === 'both';

      if (noFiltersActive) {
        return clubEvents;
      }

      let filtered = [...clubEvents];

      // Search filter
      if (state.clubEventFilters.searchQuery) {
        const query = state.clubEventFilters.searchQuery.toLowerCase();
        filtered = filtered.filter(event =>
          event.title.toLowerCase().includes(query) ||
          event.description.toLowerCase().includes(query)
        );
      }

      // Tag filter
      if (state.clubEventFilters.selectedTags.length > 0) {
        filtered = filtered.filter(event => {
          if (!Array.isArray(event.tags) || event.tags.length === 0) {
            return false;
          }
          return state.clubEventFilters.selectedTags.some(tag => event.tags.includes(tag));
        });
      }

      // Price filter
      if (state.clubEventFilters.priceFilter === 'free') {
        filtered = filtered.filter(event => event.price === 'FREE');
      } else if (state.clubEventFilters.priceFilter === 'paid') {
        filtered = filtered.filter(event => event.price !== 'FREE');
      }

      // Date filter
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (state.clubEventFilters.dateFilter === 'today') {
        filtered = filtered.filter(event => {
          const eventDate = new Date(event.date);
          eventDate.setHours(0, 0, 0, 0);
          return eventDate.getTime() === today.getTime();
        });
      } else if (state.clubEventFilters.dateFilter === 'this-week') {
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        filtered = filtered.filter(event => {
          const eventDate = new Date(event.date);
          return eventDate >= today && eventDate <= weekFromNow;
        });
      } else if (state.clubEventFilters.dateFilter === 'this-month') {
        const monthFromNow = new Date(today);
        monthFromNow.setDate(monthFromNow.getDate() + 30);
        filtered = filtered.filter(event => {
          const eventDate = new Date(event.date);
          return eventDate >= today && eventDate <= monthFromNow;
        });
      } else if (state.clubEventFilters.dateFilter === 'specific' && state.clubEventFilters.specificDate) {
        const target = new Date(state.clubEventFilters.specificDate);
        target.setHours(0, 0, 0, 0);
        filtered = filtered.filter(event => {
          const eventDate = new Date(event.date);
          eventDate.setHours(0, 0, 0, 0);
          return eventDate.getTime() === target.getTime();
        });
      } else if (state.clubEventFilters.dateFilter === 'range') {
        const startRaw = state.clubEventFilters.dateRange?.start;
        const endRaw = state.clubEventFilters.dateRange?.end;
        if (startRaw && endRaw) {
          const startDate = new Date(startRaw);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(endRaw);
          endDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(event => {
            const eventDate = new Date(event.date);
            eventDate.setHours(0, 0, 0, 0);
            return eventDate >= startDate && eventDate <= endDate;
          });
        }
      }

      // Venue filter
      if (state.clubEventFilters.venueFilter !== 'all') {
        filtered = filtered.filter(event =>
          event.venue === state.clubEventFilters.venueFilter
        );
      }

      // Location search
      if (state.clubEventFilters.locationQuery) {
        const locQuery = state.clubEventFilters.locationQuery.toLowerCase();
        filtered = filtered.filter(event =>
          event.location.toLowerCase().includes(locQuery) ||
          event.venue.toLowerCase().includes(locQuery)
        );
      }

      // Event status filter
      const now = new Date();
      if (state.clubEventFilters.eventStatus === 'upcoming') {
        filtered = filtered.filter(event => new Date(event.date) > now);
      } else if (state.clubEventFilters.eventStatus === 'past') {
        filtered = filtered.filter(event => new Date(event.date) <= now);
      }

      return filtered;
    },

    // Get all unique tags from club events
    allClubEventTags: (state, getters) => {
      const clubEvents = getters.filteredClubEvents || [];
      const tagSet = new Set();
      clubEvents.forEach(event => {
        if (event.tags) event.tags.forEach(tag => tagSet.add(tag));
      });
      return Array.from(tagSet).sort();
    },

    // Get unique venues from club events
    allClubEventVenues: (state, getters, rootState) => {
      const currentUser = rootState.auth.user;
      if (!currentUser || !currentUser.id) return state.venues || [];

      const ownerId = Number(currentUser.id);
      if (!Number.isFinite(ownerId)) return state.venues || [];

  const clubEvents = getClubEventSource(state).filter(event => getNumericOwnerId(event) === ownerId);
      const venueSet = new Set();
      clubEvents.forEach(event => {
        if (event.venue) venueSet.add(event.venue);
      });
      const clubVenues = Array.from(venueSet).sort();
      return clubVenues.length > 0 ? clubVenues : (state.venues || []);
    },

    // Club events results count
    clubEventsResultsCount: (state, getters) => {
      return getters.filteredClubEvents.length;
    },

    // Dashboard-specific getters
    upcomingUserEvents: (state) => {
      // Get the event IDs of confirmed RSVPs
      const confirmedRsvpEventIds = state.userRSVPs
        .filter(rsvp => rsvp.status === 'confirmed')
        .map(rsvp => rsvp.event_id);

      const now = new Date();

      // Filter events where user has confirmed RSVP AND event is in the future
      return state.allEvents
        .filter(event => {
          if (!confirmedRsvpEventIds.includes(event.id)) return false;
          const eventDate = new Date(event.datetime || event.date);
          return eventDate > now; // Only upcoming events
        })
        .sort((a, b) => {
          // Sort by datetime or date field, whichever is available
          const dateA = new Date(a.datetime || a.date);
          const dateB = new Date(b.datetime || b.date);
          return dateA - dateB;
        })
        .slice(0, 6); // Show max 6 events
    },

    recommendedEvents: (state) => {
      // Simple recommendation: filter out events user already RSVP'd to
      const rsvpedEventIds = state.userRSVPs.map(rsvp => rsvp.event_id);
      return state.allEvents
        .filter(event => !rsvpedEventIds.includes(event.id))
        .slice(0, 6); // Show 6 recommendations
    },

    userSavedEvents: (state) => {
      return state.allEvents
        .filter(event => state.savedEvents.includes(event.id));
    },

    // Get count of RSVPs for upcoming events owned by the current user (club)
    clubRsvpCount: (state, getters, rootState) => {
      const currentUser = rootState.auth.user;
      if (!currentUser || !currentUser.id) return 0;

      const ownerId = Number(currentUser.id);
      if (!Number.isFinite(ownerId)) return 0;

      const now = new Date();
      // Get upcoming events owned by this club
      const upcomingClubEvents = getClubEventSource(state).filter(event =>
        getNumericOwnerId(event) === ownerId && new Date(event.date) > now
      );

      // Count RSVPs for these events
      const rsvpCount = state.clubRSVPs.filter(rsvp =>
        upcomingClubEvents.some(event => event.id === rsvp.event_id)
      ).length;

      return rsvpCount;
    },

    // Get upcoming events owned by the current user (club)
    upcomingClubEvents: (state, getters, rootState) => {
      const currentUser = rootState.auth.user;
      if (!currentUser || !currentUser.id) return [];

      const ownerId = Number(currentUser.id);
      if (!Number.isFinite(ownerId)) return [];

      const now = new Date();
      return getClubEventSource(state).filter(event =>
        getNumericOwnerId(event) === ownerId && new Date(event.date) > now
      ).sort((a, b) => new Date(a.date) - new Date(b.date));
    },

    // Get total RSVP count for club events
    clubRsvpCount: (state) => {
      return Array.isArray(state.clubRSVPs) ? state.clubRSVPs.length : 0;
    },

    toast: (state) => state.toast
  },

  mutations: {

    RESET_ROOT_STATE(state) {
      clearToastTimer();
      Object.assign(state, getDefaultRootState());
    },

    setAllEvents(state, events) {
      state.allEvents = events;
    },

    setBrowseEvents(state, events) {
      state.browseEvents = Array.isArray(events) ? events : [];
      const activeEvents = state.showRecommended ? state.recommendedEvents : state.browseEvents;
      if ((state.filters?.sortOption || 'preference') === 'random') {
        state.randomSortMap = generateRandomSortMap(activeEvents);
      } else {
        state.randomSortMap = pruneRandomSortMap(state.randomSortMap, activeEvents);
      }
    },

    setRecommendedEvents(state, events) {
      state.recommendedEvents = Array.isArray(events) ? events : [];
      const activeEvents = state.showRecommended ? state.recommendedEvents : state.browseEvents;
      if ((state.filters?.sortOption || 'preference') === 'random') {
        state.randomSortMap = generateRandomSortMap(activeEvents);
      } else {
        state.randomSortMap = pruneRandomSortMap(state.randomSortMap, activeEvents);
      }
    },

    setShowRecommended(state, value) {
      state.showRecommended = value;
      const activeEvents = value ? state.recommendedEvents : state.browseEvents;
      if ((state.filters?.sortOption || 'preference') === 'random') {
        state.randomSortMap = generateRandomSortMap(activeEvents);
      } else {
        state.randomSortMap = pruneRandomSortMap(state.randomSortMap, activeEvents);
      }
    },

    setClubOwnedEvents(state, events) {
      state.clubOwnedEvents = Array.isArray(events) ? events : [];
    },

    SET_PAGINATION(state, paginationData) {
      state.pagination = {
        ...state.pagination,
        ...paginationData
      };
    },

    SET_CURRENT_PAGE(state, page) {
      state.pagination.currentPage = page;
    },

    SET_EVENT_CATEGORIES(state, categories) {
      if (!Array.isArray(categories)) {
        state.categories = [];
        return;
      }

      const normalized = categories.map(item => {
        if (!item) return null;
        if (typeof item === 'string') return item.trim();
        const name = (item.name || item.label || item?.Name || '').trim();
        const provided = item.color || item.color_hex || item.hex || item.hex_code || null;
        return { name, color: provided || null };
      }).filter(Boolean);

      normalized.sort((a, b) => {
        const na = typeof a === 'string' ? a : a.name || '';
        const nb = typeof b === 'string' ? b : b.name || '';
        return na.localeCompare(nb);
      });

      const assigned = assignPalette(normalized);
      state.categories = assigned.map(c => ({ name: c.name, color: c.color }));
    },

    SET_EVENT_VENUES(state, venues) {
      state.venues = venues;
    },

    SET_AVAILABLE_TAGS(state, tags) {
      state.availableTags = Array.isArray(tags) ? tags : [];
    },

    // Update search query
    SET_SEARCH_QUERY(state, query) {
      state.filters.searchQuery = query;
    },

    SET_USER_STATS(state, stats) {
      state.userStats = stats;
    },

    SET_CLUB_STATS(state, stats) {
      state.clubStats = stats;
    },

    SET_USER_RSVPS(state, rsvps) {
      state.userRSVPs = rsvps;
    },

    SET_CLUB_RSVPS(state, rsvps) {
      state.clubRSVPs = rsvps;
    },

    SET_CLUB_FOLLOWERS(state, followers) {
      state.clubFollowers = Array.isArray(followers) ? followers : [];
    },

    SET_SAVED_EVENTS(state, savedEventIds) {
      const normalized = Array.isArray(savedEventIds)
        ? savedEventIds
            .map((id) => Number(id))
            .filter((id) => !Number.isNaN(id))
        : [];
      state.savedEvents = normalized;
    },

    // Toggle category selection
    TOGGLE_CATEGORY(state, category) {
      const index = state.filters.selectedCategories.indexOf(category);
      if (index > -1) {
        state.filters.selectedCategories.splice(index, 1);
      } else {
        state.filters.selectedCategories.push(category);
      }
    },

    // Toggle tag selection
    TOGGLE_TAG(state, tag) {
      const index = state.filters.selectedTags.indexOf(tag);
      if (index > -1) {
        state.filters.selectedTags.splice(index, 1);
      } else {
        state.filters.selectedTags.push(tag);
      }
    },

    // Set price filter
    SET_PRICE_FILTER(state, priceFilter) {
      state.filters.priceFilter = priceFilter;
    },

    SET_PRICE_RANGE(state, range = {}) {
      const min = range?.min;
      const max = range?.max;
      state.filters.priceRange = {
        min: min === '' ? null : (min != null ? Number(min) : null),
        max: max === '' ? null : (max != null ? Number(max) : null)
      };
    },

    // Set date filter
    SET_DATE_FILTER(state, dateFilter) {
      state.filters.dateFilter = dateFilter;
    },

    SET_SPECIFIC_DATE(state, date) {
      state.filters.specificDate = date || null;
    },

    SET_DATE_RANGE(state, range = {}) {
      const start = range?.start || null;
      const end = range?.end || null;
      state.filters.dateRange = {
        start,
        end
      };
    },

    // Set venue filter
    SET_VENUE_FILTER(state, venue) {
      state.filters.venueFilter = venue;
    },

    // Set location query
    SET_LOCATION_QUERY(state, query) {
      state.filters.locationQuery = query;
    },

    // Set event status
    SET_EVENT_STATUS(state, status) {
      state.filters.eventStatus = status;
    },

    // Toggle status filter (for RSVP/Saved filters)
    TOGGLE_STATUS_FILTER(state, option) {
      if (state.filters.statusFilter && state.filters.statusFilter[option] !== undefined) {
        state.filters.statusFilter[option] = !state.filters.statusFilter[option];
      }
    },

    // Update club category filter
    UPDATE_CLUB_CATEGORY_FILTER(state, { categoryId, followedOnly }) {
      if (!state.filters.clubFilter) {
        state.filters.clubFilter = { categoryId: 'all', followedOnly: false };
      }
      if (categoryId !== undefined) {
        state.filters.clubFilter.categoryId = categoryId;
      }
      if (followedOnly !== undefined) {
        state.filters.clubFilter.followedOnly = followedOnly;
      }
    },

    // Reset all filters
    RESET_FILTERS(state) {
      state.filters = createDefaultFilters();
    },

    // Club Event Filter Mutations
    SET_CLUB_EVENT_SEARCH_QUERY(state, query) {
      state.clubEventFilters.searchQuery = query;
    },

    TOGGLE_CLUB_EVENT_TAG(state, tag) {
      const index = state.clubEventFilters.selectedTags.indexOf(tag);
      if (index > -1) {
        state.clubEventFilters.selectedTags.splice(index, 1);
      } else {
        state.clubEventFilters.selectedTags.push(tag);
      }
    },

    SET_CLUB_EVENT_PRICE_FILTER(state, priceFilter) {
      state.clubEventFilters.priceFilter = priceFilter;
    },

    SET_CLUB_EVENT_PRICE_RANGE(state, range = {}) {
      const min = range?.min;
      const max = range?.max;
      state.clubEventFilters.priceRange = {
        min: min === '' ? null : (min != null ? Number(min) : null),
        max: max === '' ? null : (max != null ? Number(max) : null)
      };
    },

    SET_CLUB_EVENT_DATE_FILTER(state, dateFilter) {
      state.clubEventFilters.dateFilter = dateFilter;
    },

    SET_CLUB_EVENT_SPECIFIC_DATE(state, date) {
      state.clubEventFilters.specificDate = date || null;
    },

    SET_CLUB_EVENT_DATE_RANGE(state, range = {}) {
      const start = range?.start || null;
      const end = range?.end || null;
      state.clubEventFilters.dateRange = {
        start,
        end
      };
    },

    SET_CLUB_EVENT_VENUE_FILTER(state, venue) {
      state.clubEventFilters.venueFilter = venue;
    },

    SET_CLUB_EVENT_LOCATION_QUERY(state, query) {
      state.clubEventFilters.locationQuery = query;
    },

    SET_CLUB_EVENT_STATUS(state, status) {
      state.clubEventFilters.eventStatus = status;
    },

    RESET_CLUB_EVENT_FILTERS(state) {
      state.clubEventFilters = createDefaultClubEventFilters();
    },

    SHOW_TOAST(state, { message, type }) {
      clearToastTimer();
      state.toast = {
        message,
        type,
        visible: true
      };
    },

    HIDE_TOAST(state) {
      clearToastTimer();
      state.toast = createDefaultToast();
    }
  },

  actions: {

    resetAppState({ commit }) {
      commit('RESET_ROOT_STATE');
      commit('clubs/RESET_STATE', null, { root: true });
    },

    async initializeAppData({ dispatch }, { force = false } = {}) {
      try {
        await Promise.all([
          dispatch('fetchEventCategories', { force }),
          dispatch('fetchEventVenues', { force }),
          dispatch('fetchAvailableTags', { force }),
          dispatch('fetchAllEvents', { force })
        ]);
      } catch (error) {
        console.error('initializeAppData - error:', error);
      }
    },

    async fetchEventCategories({ state, commit }, { force = false } = {}) {
      if (!force && state.categories.length > 0) {
        return;
      }
      try {
        const response = await getAllEventCategories();
        const raw = Array.isArray(response.data) ? response.data : [];
        // Normalize: if backend returns objects with name and color use them; if it returns strings, keep as strings
        const normalized = raw.map(item => {
          if (!item) return null;
          if (typeof item === 'string') return item.trim();
          // prefer explicit fields
          return {
            name: (item.name || item.label || '').trim(),
            color: item.color || item.color_hex || item.hex || item.hex_code || null
          };
        }).filter(Boolean);
        // Sort by name
        normalized.sort((a, b) => {
          const na = typeof a === 'string' ? a : a.name || '';
          const nb = typeof b === 'string' ? b : b.name || '';
          return na.localeCompare(nb);
        });
        commit('SET_EVENT_CATEGORIES', normalized);
      } catch (error) {
        console.error('Failed to load event categories', error);
        commit('SET_EVENT_CATEGORIES', []);
      }
    },

    async fetchEventVenues({ state, commit }, { force = false } = {}) {
      if (!force && state.venues.length > 0) {
        return;
      }
      try {
        const response = await getAllEventVenues();
        const venuesData = Array.isArray(response.data) ? response.data : [];
        commit('SET_EVENT_VENUES', venuesData);
      } catch (error) {
        console.warn('Failed to load event venues, continuing without them:', error.message);
        commit('SET_EVENT_VENUES', []);
      }
    },

  async fetchAvailableTags({ state, commit }, { force = false } = {}) {
      if (!force && Array.isArray(state.availableTags) && state.availableTags.length > 0) {
        return;
      }
      try {
        const response = await getAllTags();
        const tags = Array.isArray(response.data) ? response.data : [];
        const tagObjects = tags
          .map((item) => {
            if (!item) return null;
            if (typeof item === 'string') return { id: null, tag_name: item.trim() };
            return {
              id: item.id,
              tag_name: (item.tag_name || item.name || '').trim()
            };
          })
          .filter(Boolean);
        tagObjects.sort((a, b) => a.tag_name.localeCompare(b.tag_name));
        commit('SET_AVAILABLE_TAGS', tagObjects);
      } catch (error) {
        console.warn('Failed to load event tags, continuing without them:', error.message);
        commit('SET_AVAILABLE_TAGS', []);
      }
    },
    
    async fetchAllEvents({ commit, state }, options = {}) {
      const normalizedOptions = typeof options === 'number' ? { page: options } : (options || {});
      const requestedPage = typeof normalizedOptions.page === 'number' ? normalizedOptions.page : null;

      try {
        const [eventsResponse, eventTagsResponse, tagsResponse] = await Promise.all([
          getAllEvents(1, 'all', state.filters),
          getAllEventTags(),
          getAllTags()
        ]);

        const events = Array.isArray(eventsResponse.data?.events) ? eventsResponse.data.events : [];
        const eventTags = Array.isArray(eventTagsResponse.data) ? eventTagsResponse.data : [];
        const tags = Array.isArray(tagsResponse.data) ? tagsResponse.data : [];

        const eventTagMap = buildEventTagMap(eventTags, tags);
        const normalizedEvents = normalizeEventsWithMetadata(events, eventTagMap);

        const tagMap = {};
        tags.forEach(tag => {
          tagMap[tag.id] = tag.tag_name || tag.name || '';
        });

        const eventTagsMap = {};
        eventTags.forEach(et => {
          if (!eventTagsMap[et.event_id]) {
            eventTagsMap[et.event_id] = [];
          }
          const tagName = tagMap[et.tag_id];
          if (tagName) {
            eventTagsMap[et.event_id].push(tagName);
          }
        });

        normalizedEvents.forEach(event => {
          event.tags = eventTagsMap[event.id] || [];
        });

        const totalEventsCount = normalizedEvents.length;
        const totalPages = Math.max(1, Math.ceil(totalEventsCount / EVENTS_PER_PAGE));
        let currentPage = state.pagination.currentPage || 1;
        if (requestedPage != null) {
          currentPage = requestedPage;
        }
        currentPage = Math.min(Math.max(currentPage, 1), totalPages);

        commit('SET_PAGINATION', {
          currentPage,
          totalPages,
          totalEvents: totalEventsCount,
          eventsPerPage: EVENTS_PER_PAGE,
          hasNextPage: currentPage < totalPages,
          hasPreviousPage: currentPage > 1
        });

        console.log('fetchAllEvents - events with tags:', normalizedEvents);
        commit('setBrowseEvents', normalizedEvents);
      } catch (error) {
        console.error('fetchAllEvents - error:', error);
      }
    },

    changeEventsPage({ commit, state }, page) {
      const totalPages = state.pagination.totalPages || 1;
      const numericPage = Number(page);
      const candidate = Number.isFinite(numericPage) ? Math.floor(numericPage) : 1;
      const safePage = Math.min(Math.max(candidate > 0 ? candidate : 1, 1), totalPages);

      commit('SET_CURRENT_PAGE', safePage);
      commit('SET_PAGINATION', {
        currentPage: safePage,
        hasNextPage: safePage < totalPages,
        hasPreviousPage: safePage > 1
      });
    },

    // Fetch ALL events without filters - for dashboard use
    async fetchAllEventsUnfiltered({ commit, state }) {
      try {
        const [eventsResponse, eventTagsResponse, tagsResponse] = await Promise.all([
          getAllEvents(1, 'all', {}),
          getAllEventTags(),
          getAllTags()
        ]);

        const events = Array.isArray(eventsResponse.data?.events) ? eventsResponse.data.events : [];
        const eventTags = Array.isArray(eventTagsResponse.data) ? eventTagsResponse.data : [];
        const tags = Array.isArray(tagsResponse.data) ? tagsResponse.data : [];

        const eventTagMap = buildEventTagMap(eventTags, tags);
        const normalizedEvents = normalizeEventsWithMetadata(events, eventTagMap);

        // Create a map of event_id to array of tag_names
        const tagMap = {};
        tags.forEach(tag => {
          tagMap[tag.id] = tag.tag_name || tag.name || '';
        });

        const eventTagsMap = {};
        eventTags.forEach(et => {
          if (!eventTagsMap[et.event_id]) {
            eventTagsMap[et.event_id] = [];
          }
          const tagName = tagMap[et.tag_id];
          if (tagName) {
            eventTagsMap[et.event_id].push(tagName);
          }
        });

        // Assign tags to events
        normalizedEvents.forEach(event => {
          event.tags = eventTagsMap[event.id] || [];
        });

        console.log('fetchAllEventsUnfiltered - events with tags:', normalizedEvents);
        // Store ALL unfiltered events for dashboard
        commit('setAllEvents', normalizedEvents);
      } catch (error) {
        console.error('fetchAllEventsUnfiltered - error:', error);
      }
    },

    // Fetch recommended events for a user
    async fetchRecommendedEvents({ commit, rootGetters }, userId) {
      try {
        const effectiveUserId = userId || rootGetters['auth/currentUser']?.id;
        if (!effectiveUserId) {
          console.warn('Cannot fetch recommended events: no user ID');
          commit('setRecommendedEvents', []);
          return;
        }

        const [eventsResponse, eventTagsResponse, tagsResponse] = await Promise.all([
          getRecommendedEvents(effectiveUserId),
          getAllEventTags(),
          getAllTags()
        ]);

        const events = Array.isArray(eventsResponse.data?.events) ? eventsResponse.data.events : [];
        const eventTags = Array.isArray(eventTagsResponse.data) ? eventTagsResponse.data : [];
        const tags = Array.isArray(tagsResponse.data) ? tagsResponse.data : [];

        const eventTagMap = buildEventTagMap(eventTags, tags);
        const normalizedEvents = normalizeEventsWithMetadata(events, eventTagMap);

        // Create a map of event_id to array of tag_names
        const tagMap = {};
        tags.forEach(tag => {
          tagMap[tag.id] = tag.tag_name || tag.name || '';
        });

        const eventTagsMap = {};
        eventTags.forEach(et => {
          if (!eventTagsMap[et.event_id]) {
            eventTagsMap[et.event_id] = [];
          }
          const tagName = tagMap[et.tag_id];
          if (tagName) {
            eventTagsMap[et.event_id].push(tagName);
          }
        });

        // Assign tags to events
        normalizedEvents.forEach(event => {
          event.tags = eventTagsMap[event.id] || [];
        });

        console.log('fetchRecommendedEvents - recommended events with tags:', normalizedEvents);
        commit('setRecommendedEvents', normalizedEvents);
      } catch (error) {
        console.error('fetchRecommendedEvents - error:', error);
        commit('setRecommendedEvents', []);
      }
    },

    // Toggle showing recommended events
    async toggleRecommended({ commit, dispatch, state, rootGetters }) {
      const newValue = !state.showRecommended;
      commit('setShowRecommended', newValue);

      // If turning on recommended, fetch them
      if (newValue) {
        const userId = rootGetters['auth/currentUser']?.id;
        await dispatch('fetchRecommendedEvents', userId);
      }
    },

    // Set recommended view (without toggle)
    async setRecommendedView({ commit, dispatch, rootGetters }, show) {
      commit('setShowRecommended', show);
      if (show) {
        const userId = rootGetters['auth/currentUser']?.id;
        await dispatch('fetchRecommendedEvents', userId);
      }
    },

    async fetchClubOwnedEvents({ state, commit, rootGetters }, { force = false } = {}) {
      const currentUser = rootGetters['auth/currentUser'];
      const role = currentUser?.role || currentUser?.account_type;
      const numericOwnerId = Number(currentUser?.id);

      if (role !== 'club' || !Number.isFinite(numericOwnerId)) {
        if (force) {
          commit('setClubOwnedEvents', []);
        }
        return;
      }

      if (!force && Array.isArray(state.clubOwnedEvents) && state.clubOwnedEvents.length > 0) {
        const hasOwnedEvents = state.clubOwnedEvents.some(event => getNumericOwnerId(event) === numericOwnerId);
        if (hasOwnedEvents) {
          return;
        }
      }

      try {
        const [eventsResponse, eventTagsResponse, tagsResponse] = await Promise.all([
          getAllEvents(1, 'all'),
          getAllEventTags(),
          getAllTags()
        ]);

        const aggregatedEvents = Array.isArray(eventsResponse.data?.events) ? eventsResponse.data.events : [];

        const eventTagMap = buildEventTagMap(
          Array.isArray(eventTagsResponse.data) ? eventTagsResponse.data : [],
          Array.isArray(tagsResponse.data) ? tagsResponse.data : []
        );

        const normalizedEvents = normalizeEventsWithMetadata(aggregatedEvents, eventTagMap);
        const ownedEvents = normalizedEvents.filter(event => getNumericOwnerId(event) === numericOwnerId);

        commit('setClubOwnedEvents', ownedEvents);
      } catch (error) {
        console.error('fetchClubOwnedEvents - error:', error);
        if (force) {
          commit('setClubOwnedEvents', []);
        }
      }
    },

    async fetchUserStats({ commit }, userId) {
      try {
        const { getUserStats } = await import('../services/statsService');
        const response = await getUserStats(userId);
        commit('SET_USER_STATS', response.data);
      } catch (error) {
        console.error('Error fetching user stats:', error);
      }
    },

    async fetchClubStats({ commit }, clubId) {
      try {
        const { getClubStats } = await import('../services/statsService');
        const response = await getClubStats(clubId);
        commit('SET_CLUB_STATS', response.data);
      } catch (error) {
        console.error('Error fetching club stats:', error);
      }
    },

    async fetchClubRSVPs({ commit, state, dispatch, rootGetters }, clubId) {
      const ownerIdRaw = clubId ?? rootGetters['auth/currentUser']?.id;
      const ownerId = Number(ownerIdRaw);
      if (!Number.isFinite(ownerId)) {
        commit('SET_CLUB_RSVPS', []);
        return;
      }

      try {
        // Fetch club events first if not already loaded
        if (!Array.isArray(state.clubOwnedEvents) || state.clubOwnedEvents.length === 0) {
          await dispatch('fetchClubOwnedEvents', { force: true });
        }

        const ownedEvents = (state.clubOwnedEvents || []).filter((event) => getNumericOwnerId(event) === ownerId);

        if (ownedEvents.length === 0) {
          commit('SET_CLUB_RSVPS', []);
          return;
        }

        const { getRsvpsByEventId } = await import('../services/rsvpService');
        const aggregated = [];

        for (const event of ownedEvents) {
          if (!event || event.id == null) {
            continue;
          }
          try {
            const eventResponse = await getRsvpsByEventId(event.id);
            const eventRsvps = Array.isArray(eventResponse.data) ? eventResponse.data : [];
            const augmented = eventRsvps.map((rsvp) => ({
              ...rsvp,
              event_id: Number(event.id),
              event_title: event.title || '',
              event_date: event.date || event.datetime || null,
              event_time: event.time || event.start_time || event.startTime || null,
              venue: event.venue || event.location || null
            }));
            aggregated.push(...augmented);
          } catch (innerError) {
            console.error(`Error fetching RSVPs for event ${event.id}:`, innerError);
          }
        }

        commit('SET_CLUB_RSVPS', aggregated);
      } catch (error) {
        console.error('Error fetching club RSVPs:', error);
        commit('SET_CLUB_RSVPS', []);
      }
    },

    async fetchClubFollowers({ commit, rootGetters }, clubId) {
      const ownerIdRaw = clubId ?? rootGetters['auth/currentUser']?.id;
      const ownerId = Number(ownerIdRaw);
      if (!Number.isFinite(ownerId)) {
        commit('SET_CLUB_FOLLOWERS', []);
        return;
      }

      try {
        const { getFollowersByClubId } = await import('../services/followService');
        const response = await getFollowersByClubId(ownerId);
        const followers = Array.isArray(response.data) ? response.data : [];
        commit('SET_CLUB_FOLLOWERS', followers);
      } catch (error) {
        console.error('Error fetching club followers:', error);
        commit('SET_CLUB_FOLLOWERS', []);
      }
    },

    async fetchUserRSVPs({ commit }, userId) {
      try {
        const { getRsvpsByUserId } = await import('../services/rsvpService');
        const response = await getRsvpsByUserId(userId);
        // Store the full RSVP objects
        commit('SET_USER_RSVPS', response.data);
      } catch (error) {
        console.error('Error fetching user RSVPs:', error);
      }
    },

    async fetchClubRSVPs({ commit, state, dispatch, rootGetters }, clubId) {
      const ownerIdRaw = clubId ?? rootGetters['auth/currentUser']?.id;
      const ownerId = Number(ownerIdRaw);
      if (!Number.isFinite(ownerId)) {
        commit('SET_CLUB_RSVPS', []);
        return;
      }

      try {
        // Fetch club events first if not already loaded
        if (!Array.isArray(state.clubOwnedEvents) || state.clubOwnedEvents.length === 0) {
          await dispatch('fetchClubOwnedEvents', { force: true });
        }

        const ownedEvents = (state.clubOwnedEvents || []).filter((event) => getNumericOwnerId(event) === ownerId);

        if (ownedEvents.length === 0) {
          commit('SET_CLUB_RSVPS', []);
          return;
        }

        const { getRsvpsByEventId } = await import('../services/rsvpService');
        const aggregated = [];

        for (const event of ownedEvents) {
          if (!event || event.id == null) {
            continue;
          }
          try {
            const eventResponse = await getRsvpsByEventId(event.id);
            const eventRsvps = Array.isArray(eventResponse.data) ? eventResponse.data : [];
            const augmented = eventRsvps.map((rsvp) => ({
              ...rsvp,
              event_id: Number(event.id),
              event_title: event.title || '',
              event_date: event.date || event.datetime || null,
              event_time: event.time || event.start_time || event.startTime || null,
              venue: event.venue || event.location || null
            }));
            aggregated.push(...augmented);
          } catch (innerError) {
            console.error(`Error fetching RSVPs for event ${event.id}:`, innerError);
          }
        }

        commit('SET_CLUB_RSVPS', aggregated);
      } catch (error) {
        console.error('Error fetching club RSVPs:', error);
        commit('SET_CLUB_RSVPS', []);
      }
    },

    async loadSavedEvents({ rootGetters, commit }) {
      const userId = rootGetters['auth/currentUser']?.id;
      if (!userId) return;
      try {
        const res = await getSavedByUserId(userId);
        const eventIds = (res.data || []).map(saved => saved.event_id);
        commit('SET_SAVED_EVENTS', eventIds);
      } catch (error) {
        console.error('Error loading saved events:', error);
      }
    },

    async toggleSaveEvent({ state, rootGetters, dispatch, getters }, eventId) {
      const userId = rootGetters['auth/currentUser']?.id;
      if (!userId || !eventId) return;

      const isCurrentlySaved = getters.isEventSaved(eventId);

      try {
        if (isCurrentlySaved) {
          // Unsave the event
          await deleteSaved(eventId, userId);
          dispatch('showToast', { message: 'Event unsaved', type: 'success' });
        } else {
          // Save the event
          await createSaved({ event_id: eventId, user_id: userId });
          dispatch('showToast', { message: 'Event saved', type: 'success' });
        }

        // Refresh the saved events list
        await dispatch('loadSavedEvents');
      } catch (error) {
        console.error('Error toggling save event:', error);
        const action = isCurrentlySaved ? 'unsaving' : 'saving';
        dispatch('showToast', { message: `Error ${action} event`, type: 'error' });
      }
    },

    // Action to update search
    async updateSearch({ commit, dispatch }, query) {
      commit('SET_SEARCH_QUERY', query);
      await dispatch('fetchAllEvents');
      await dispatch('changeEventsPage', 1);
    },

    // Action to toggle category
    async toggleCategory({ commit, dispatch }, category) {
      commit('TOGGLE_CATEGORY', category);
      await dispatch('fetchAllEvents');
      await dispatch('changeEventsPage', 1);
    },

    // Action to toggle tag (client-side only, no refetch needed)
    toggleTag({ commit }, tag) {
      commit('TOGGLE_TAG', tag);
    },

    // Action to update price filter
    async updatePriceFilter({ commit, dispatch }, filter) {
      commit('SET_PRICE_FILTER', filter);
      if (filter !== 'range') {
        commit('SET_PRICE_RANGE', { min: null, max: null });
      }
      await dispatch('fetchAllEvents');
      await dispatch('changeEventsPage', 1);
    },

    async updatePriceRange({ commit, state, dispatch }, range = {}) {
      const startRange = {
        min: range?.min ?? state.filters.priceRange?.min ?? null,
        max: range?.max ?? state.filters.priceRange?.max ?? null
      };
      commit('SET_PRICE_RANGE', startRange);
      await dispatch('fetchAllEvents');
      await dispatch('changeEventsPage', 1);
    },

    // Action to update date filter
    async updateDateFilter({ commit, dispatch }, filter) {
      commit('SET_DATE_FILTER', filter);
      const today = new Date();
      const todayIso = today.toISOString().slice(0, 10);

      if (filter === 'today') {
        commit('SET_SPECIFIC_DATE', todayIso);
        commit('SET_DATE_RANGE', { start: null, end: null });
      } else if (filter === 'this-week') {
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        const weekFromNowIso = weekFromNow.toISOString().slice(0, 10);
        commit('SET_DATE_RANGE', { start: todayIso, end: weekFromNowIso });
        commit('SET_SPECIFIC_DATE', null);
      } else if (filter === 'this-month') {
        const monthFromNow = new Date(today);
        monthFromNow.setDate(monthFromNow.getDate() + 30);
        const monthFromNowIso = monthFromNow.toISOString().slice(0, 10);
        commit('SET_DATE_RANGE', { start: todayIso, end: monthFromNowIso });
        commit('SET_SPECIFIC_DATE', null);
      } else if (filter === 'specific') {
        commit('SET_SPECIFIC_DATE', null);
        commit('SET_DATE_RANGE', { start: null, end: null });
      } else if (filter === 'range') {
        commit('SET_DATE_RANGE', { start: todayIso, end: todayIso });
        commit('SET_SPECIFIC_DATE', null);
      } else {
        commit('SET_SPECIFIC_DATE', null);
        commit('SET_DATE_RANGE', { start: null, end: null });
      }
      await dispatch('fetchAllEvents');
      await dispatch('changeEventsPage', 1);
    },

    async setSpecificDate({ commit, dispatch }, date) {
      commit('SET_SPECIFIC_DATE', date);
      await dispatch('fetchAllEvents');
      await dispatch('changeEventsPage', 1);
    },

    async setDateRange({ commit, state, dispatch }, range = {}) {
      let start = range?.start ?? state.filters.dateRange?.start ?? null;
      let end = range?.end ?? state.filters.dateRange?.end ?? null;
      if (start && end && start > end) {
        end = start;
      }
      commit('SET_DATE_RANGE', { start, end });
      await dispatch('fetchAllEvents');
      await dispatch('changeEventsPage', 1);
    },

    // Action to update venue filter
    async updateVenueFilter({ commit, dispatch }, venue) {
      commit('SET_VENUE_FILTER', venue);
      await dispatch('fetchAllEvents');
      await dispatch('changeEventsPage', 1);
    },

    // Action to update location query
    async updateLocationQuery({ commit, dispatch }, query) {
      commit('SET_LOCATION_QUERY', query);
      await dispatch('fetchAllEvents');
      await dispatch('changeEventsPage', 1);
    },

    // Action to update event status
    async updateEventStatus({ commit, dispatch }, status) {
      commit('SET_EVENT_STATUS', status);
      await dispatch('fetchAllEvents');
      await dispatch('changeEventsPage', 1);
    },

    // Action to toggle status filter (RSVP/Saved filters - client-side only, no refetch)
    toggleStatusFilter({ commit }, option) {
      commit('TOGGLE_STATUS_FILTER', option);
    },

    // Action to update club category filter
    async updateClubCategoryFilter({ commit, dispatch }, payload) {
      commit('UPDATE_CLUB_CATEGORY_FILTER', payload);
      await dispatch('fetchAllEvents');
      await dispatch('changeEventsPage', 1);
    },

    // Action to reset filters
    async resetFilters({ commit, dispatch }) {
      commit('RESET_FILTERS');
      await dispatch('fetchAllEvents');
      await dispatch('changeEventsPage', 1);
    },

    // Club Event Filter Actions
    updateClubEventSearch({ commit }, query) {
      commit('SET_CLUB_EVENT_SEARCH_QUERY', query);
    },

    toggleClubEventTag({ commit }, tag) {
      commit('TOGGLE_CLUB_EVENT_TAG', tag);
    },

    updateClubEventPriceFilter({ commit }, filter) {
      commit('SET_CLUB_EVENT_PRICE_FILTER', filter);
      if (filter !== 'range') {
        commit('SET_CLUB_EVENT_PRICE_RANGE', { min: null, max: null });
      }
    },

    updateClubEventPriceRange({ commit, state }, range = {}) {
      const nextRange = {
        min: range?.min ?? state.clubEventFilters.priceRange?.min ?? null,
        max: range?.max ?? state.clubEventFilters.priceRange?.max ?? null
      };
      commit('SET_CLUB_EVENT_PRICE_RANGE', nextRange);
    },

    updateClubEventDateFilter({ commit }, filter) {
      commit('SET_CLUB_EVENT_DATE_FILTER', filter);
      const today = new Date();
      const todayIso = today.toISOString().slice(0, 10);

      if (filter === 'today') {
        commit('SET_CLUB_EVENT_SPECIFIC_DATE', todayIso);
        commit('SET_CLUB_EVENT_DATE_RANGE', { start: null, end: null });
      } else if (filter === 'this-week') {
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        const weekFromNowIso = weekFromNow.toISOString().slice(0, 10);
        commit('SET_CLUB_EVENT_DATE_RANGE', { start: todayIso, end: weekFromNowIso });
        commit('SET_CLUB_EVENT_SPECIFIC_DATE', null);
      } else if (filter === 'this-month') {
        const monthFromNow = new Date(today);
        monthFromNow.setDate(monthFromNow.getDate() + 30);
        const monthFromNowIso = monthFromNow.toISOString().slice(0, 10);
        commit('SET_CLUB_EVENT_DATE_RANGE', { start: todayIso, end: monthFromNowIso });
        commit('SET_CLUB_EVENT_SPECIFIC_DATE', null);
      } else if (filter === 'specific') {
        commit('SET_CLUB_EVENT_SPECIFIC_DATE', null);
        commit('SET_CLUB_EVENT_DATE_RANGE', { start: null, end: null });
      } else if (filter === 'range') {
        commit('SET_CLUB_EVENT_DATE_RANGE', { start: todayIso, end: todayIso });
        commit('SET_CLUB_EVENT_SPECIFIC_DATE', null);
      } else {
        commit('SET_CLUB_EVENT_SPECIFIC_DATE', null);
        commit('SET_CLUB_EVENT_DATE_RANGE', { start: null, end: null });
      }
    },

    setClubEventSpecificDate({ commit }, date) {
      commit('SET_CLUB_EVENT_SPECIFIC_DATE', date);
    },

    setClubEventDateRange({ commit, state }, range = {}) {
      let start = range?.start ?? state.clubEventFilters.dateRange?.start ?? null;
      let end = range?.end ?? state.clubEventFilters.dateRange?.end ?? null;
      if (start && end && start > end) {
        end = start;
      }
      commit('SET_CLUB_EVENT_DATE_RANGE', { start, end });
    },

    updateClubEventVenueFilter({ commit }, venue) {
      commit('SET_CLUB_EVENT_VENUE_FILTER', venue);
    },

    updateClubEventLocationQuery({ commit }, query) {
      commit('SET_CLUB_EVENT_LOCATION_QUERY', query);
    },

    updateClubEventStatus({ commit }, status) {
      commit('SET_CLUB_EVENT_STATUS', status);
    },

    resetClubEventFilters({ commit }) {
      commit('RESET_CLUB_EVENT_FILTERS');
    },

    showToast({ commit }, { message, type = 'info', duration = 3000 } = {}) {
      clearToastTimer();
      commit('SHOW_TOAST', { message, type });
      toastTimer = setTimeout(() => {
        commit('HIDE_TOAST');
      }, duration);
    },

    hideToast({ commit }) {
      clearToastTimer();
      commit('HIDE_TOAST');
    }
  },

  modules: {
    auth,
    clubs,
  }
});

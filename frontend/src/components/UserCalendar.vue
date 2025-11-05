<template>
  <div class="user-calendar">
    <div class="calendar-header">
      <h3>My Event Calendar</h3>
      <div class="calendar-header-actions">
        <div class="calendar-legend" v-show="!showAllEvents">
          <span class="legend-item rsvp">
            <span class="legend-dot"></span>
            RSVP'd Events
          </span>
          <span class="legend-item saved">
            <span class="legend-dot"></span>
            Saved Events
          </span>
        </div>
        <label class="all-events-toggle">
          <input type="checkbox" v-model="showAllEvents" aria-label="Toggle all events" />
          <span class="toggle-track">
            <span class="toggle-thumb"></span>
          </span>
          <span class="toggle-label">All Events</span>
        </label>
      </div>
    </div>

    <FullCalendar :options="calendarOptions" />

    <!-- Event Detail Modal -->
    <EventDetailModal
      :event="selectedEvent"
      :visible="isModalVisible"
      @close="closeEventModal"
      @tag-click="handleTagFromModal"
      @rsvp-created="handleRsvpCreated"
      @share="handleShare"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useStore } from 'vuex';
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import EventDetailModal from './EventDetailModal.vue';
import { shareEventLink } from '../utils/shareEvent';

const store = useStore();

// Get events from store
const allEvents = computed(() => store.state.allEvents);
const userRSVPs = computed(() => store.state.userRSVPs);
const savedEvents = computed(() => store.state.savedEvents);
const showAllEvents = ref(false);
const categoryColorMap = computed(() => store.getters.categoryColorMap || {});
const normalizedCategoryColors = computed(() => {
  const entries = {};
  const map = categoryColorMap.value;
  if (!map || typeof map !== 'object') {
    return entries;
  }
  Object.keys(map).forEach((name) => {
    if (!name) {
      return;
    }
    const key = String(name).toLowerCase();
    if (!entries[key]) {
      entries[key] = map[name];
    }
  });
  return entries;
});

const selectedEvent = ref(null);
const isModalVisible = ref(false);

// Transform events for FullCalendar
const resolveEventStartDate = (event) => {
  if (!event) return null;
  return (
    event.date ||
    event.datetime ||
    event.start_datetime ||
    event.startDateTime ||
    event.startDate ||
    null
  );
};

const calendarEvents = computed(() => {
  if (showAllEvents.value) {
    const normalizedColors = normalizedCategoryColors.value;
    const events = [];
    allEvents.value.forEach((event) => {
      if (!event) {
        return;
      }
      const eventId = event.id != null ? event.id : event.event_id;
      const startDate = resolveEventStartDate(event);
      if (eventId == null || !startDate) {
        return;
      }
      const categoryName = typeof event.category === 'string' ? event.category : '';
      const colorKey = categoryName ? categoryName.toLowerCase() : '';
      const color = normalizedColors[colorKey] || '#2563eb';
      events.push({
        id: `all-${eventId}`,
        title: event.title,
        start: startDate,
        className: 'event-category',
        backgroundColor: color,
        borderColor: color,
        textColor: '#ffffff',
        extendedProps: {
          eventId,
          eventType: 'all',
          description: event.description,
          venue: event.venue || event.location,
          category: event.category,
          time: event.time,
          imageUrl: event.image,
          organiser: event.organiser
        }
      });
    });
    return events;
  }

  const events = [];
  console.log('=== CALENDAR DEBUG ===');
  console.log('All Events:', allEvents.value.length);
  console.log('User RSVPs:', userRSVPs.value);
  console.log('Saved Events:', savedEvents.value);

  // Add events that are both saved and RSVP'd (special gradient styling)
  allEvents.value.forEach(event => {
    const eventId = Number(event.id);
    const isRsvp = userRSVPs.value.some(rsvp => Number(rsvp.event_id || rsvp) === eventId);
    const isSaved = savedEvents.value.some(saved => Number(saved.event_id || saved) === eventId);
    const startDate = resolveEventStartDate(event);

    if (isRsvp && isSaved && startDate) {
      console.log('Found BOTH event:', eventId, event.title);
      events.push({
        id: `both-${event.id}`,
        title: event.title,
        start: startDate,
        className: 'event-both',
        extendedProps: {
          eventId: event.id,
          eventType: 'both',
          description: event.description,
          venue: event.venue || event.location,
          category: event.category,
          time: event.time,
          imageUrl: event.image,
          organiser: event.organiser
        }
      });
    }
  });

  // Add RSVP'd events (only those not already added as both)
  allEvents.value.forEach(event => {
    const eventId = Number(event.id);
    const isRsvp = userRSVPs.value.some(rsvp => Number(rsvp.event_id || rsvp) === eventId);
    const isSaved = savedEvents.value.some(saved => Number(saved.event_id || saved) === eventId);
    const startDate = resolveEventStartDate(event);

    if (isRsvp && !isSaved && startDate) {
      console.log('Found RSVP-only event:', eventId, event.title);
      events.push({
        id: `rsvp-${event.id}`,
        title: event.title,
        start: startDate,
        className: 'event-rsvp',
        extendedProps: {
          eventId: event.id,
          eventType: 'rsvp',
          description: event.description,
          venue: event.venue || event.location,
          category: event.category,
          time: event.time,
          imageUrl: event.image,
          organiser: event.organiser
        }
      });
    }
  });

  // Add saved events (only those not already added as both or RSVP'd)
  allEvents.value.forEach(event => {
    const eventId = Number(event.id);
    const isRsvp = userRSVPs.value.some(rsvp => Number(rsvp.event_id || rsvp) === eventId);
    const isSaved = savedEvents.value.some(saved => Number(saved.event_id || saved) === eventId);
    const startDate = resolveEventStartDate(event);

    if (isSaved && !isRsvp && startDate) {
      console.log('Found SAVED-only event:', eventId, event.title);
      events.push({
        id: `saved-${event.id}`,
        title: event.title,
        start: startDate,
        className: 'event-saved',
        extendedProps: {
          eventId: event.id,
          eventType: 'saved',
          description: event.description,
          venue: event.venue || event.location,
          category: event.category,
          time: event.time,
          imageUrl: event.image,
          organiser: event.organiser
        }
      });
    }
  });

  console.log('Final calendar events:', events.length);
  console.log('=== END CALENDAR DEBUG ===');
  return events;
});

// Calendar configuration
const calendarOptions = ref({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
  initialView: 'dayGridMonth',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,listWeek'
  },
  events: [], // Start with empty array, will be updated by watch
  eventClick: handleEventClick,
  editable: false,
  selectable: true,
  selectMirror: true,
  dayMaxEvents: true,
  weekends: true,
  height: 'auto',
  eventDisplay: 'block',
  displayEventTime: false,
  eventTimeFormat: {
    hour: '2-digit',
    minute: '2-digit',
    meridiem: 'short'
  }
});

// Watch for events changes and update calendar
watch(calendarEvents, (newEvents) => {
  calendarOptions.value.events = newEvents;
}, { deep: true, immediate: true });

// Handle event click
function handleEventClick(info) {
  // Find the full event object from allEvents using the eventId from extendedProps
  const eventId = info.event.extendedProps.eventId;
  const fullEvent = allEvents.value.find(event => Number(event.id) === Number(eventId));
  
  selectedEvent.value = fullEvent || info.event.extendedProps;
  isModalVisible.value = true;
  
  // Load fresh user data when modal opens
  const userId = store.getters['auth/currentUser']?.id;
  if (userId) {
    store.dispatch('fetchUserRSVPs', userId);
    store.dispatch('loadSavedEvents');
  }
}

// Close modal
function closeEventModal() {
  isModalVisible.value = false;
  selectedEvent.value = null;
}

// Handle tag click from modal
function handleTagFromModal(tag) {
  // For calendar, we might not need to toggle tags like in EventsGrid
  // But we should close the modal as expected
  closeEventModal();
}

// Handle RSVP creation
async function handleRsvpCreated(rsvpData) {
  console.log('RSVP Created from calendar:', rsvpData);
  
  // Refresh the events data to get updated attendee counts
  await store.dispatch('fetchAllEvents');
  
  // Update the selected event with the new attendee count if needed
  if (selectedEvent.value) {
    const updatedEvent = allEvents.value.find(e => e.id === selectedEvent.value.id);
    if (updatedEvent) {
      selectedEvent.value = { ...selectedEvent.value, ...updatedEvent };
    }
  }
}

// Handle share event
async function handleShare() {
  if (!selectedEvent.value) return;

  try {
    await shareEventLink(selectedEvent.value);
    store.dispatch('showToast', {
      message: 'Event link copied to your clipboard.',
      type: 'success'
    });
  } catch (error) {
    console.error('Unable to share event', error);
    store.dispatch('showToast', {
      message: 'Unable to share this event. Please try again.',
      type: 'error'
    });
  }
}

// Format date for display
function formatEventDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
</script>

<style scoped>
.user-calendar {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.calendar-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.calendar-header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  flex-wrap: wrap;
}

.all-events-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  user-select: none;
  font-size: 14px;
  color: #1f2937;
}

.all-events-toggle input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-track {
  width: 44px;
  height: 24px;
  background: #d1d5db;
  border-radius: 9999px;
  position: relative;
  transition: background 0.2s ease;
  flex-shrink: 0;
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 2px 4px rgba(15, 23, 42, 0.2);
  transition: transform 0.2s ease;
}

.all-events-toggle input:checked + .toggle-track {
  background: #3788d8;
}

.all-events-toggle input:checked + .toggle-track .toggle-thumb {
  transform: translateX(20px);
}

.toggle-label {
  font-weight: 500;
  color: #1f2937;
}

.calendar-legend {
  display: flex;
  gap: 20px;
  align-items: center;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #6b7280;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}

.legend-item.rsvp .legend-dot {
  background-color: #3788d8;
}

.legend-item.saved .legend-dot {
  background-color: #fb923c;
}

/* FullCalendar Overrides */
:deep(.fc) {
  font-family: inherit;
}

:deep(.fc .fc-button) {
  background-color: #3788d8;
  border-color: #3788d8;
  text-transform: capitalize;
  padding: 8px 16px;
  font-weight: 500;
}

:deep(.fc .fc-button:hover) {
  background-color: #2563eb;
  border-color: #2563eb;
}

:deep(.fc .fc-button:disabled) {
  opacity: 0.5;
}

:deep(.fc .fc-toolbar-title) {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

:deep(.fc-theme-standard td),
:deep(.fc-theme-standard th) {
  border-color: #e5e7eb;
}

:deep(.fc-daygrid-day-number) {
  color: #374151;
  font-weight: 500;
}

:deep(.fc-day-today) {
  background-color: #eff6ff !important;
}

:deep(.fc-event) {
  cursor: pointer;
  border-radius: 4px;
  padding: 2px 4px;
  font-size: 13px;
  font-weight: 500;
  transition: transform 0.2s, box-shadow 0.2s;
}

:deep(.fc-event:hover) {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

:deep(.fc-list-event-title) {
  color: #1f2937;
}

:deep(.fc-event.event-both),
:deep(.fc-event.event-both:hover),
:deep(.fc-event.event-both:focus) {
  background: linear-gradient(45deg, #3788d8 50%, #fb923c 50%) !important;
  border: 1px solid #2563eb !important;
  color: #ffffff !important;
  background-image: linear-gradient(45deg, #3788d8 50%, #fb923c 50%) !important;
}

:deep(.fc-event.event-rsvp),
:deep(.fc-event.event-rsvp:hover),
:deep(.fc-event.event-rsvp:focus) {
  background-color: #3788d8 !important;
  border-color: #2563eb !important;
  color: #ffffff !important;
}

:deep(.fc-event.event-saved),
:deep(.fc-event.event-saved:hover),
:deep(.fc-event.event-saved:focus) {
  background-color: #fb923c !important;
  border-color: #f97316 !important;
  color: #ffffff !important;
}

/* Event Modal */
.event-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.event-modal {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.1);
  color: #1f2937;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  z-index: 10;
}

.modal-close-btn:hover {
  background: rgba(0, 0, 0, 0.2);
}

.modal-content {
  display: flex;
  flex-direction: column;
}

.event-image {
  width: 100%;
  height: 250px;
  overflow: hidden;
  border-radius: 12px 12px 0 0;
}

.event-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.event-details {
  padding: 24px;
}

.event-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 12px;
}

.event-badge.rsvp {
  background-color: #dbeafe;
  color: #1e40af;
}

.event-badge.saved {
  background-color: #fed7aa;
  color: #c2410c;
}

.event-badge.both {
  background: linear-gradient(45deg, #dbeafe 50%, #fed7aa 50%);
  color: #1e40af;
}

.event-details h2 {
  margin: 0 0 16px 0;
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
}

.event-meta {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: #4b5563;
}

.meta-row .icon {
  font-size: 18px;
}

.event-description {
  margin-bottom: 24px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.event-description p {
  margin: 0;
  color: #6b7280;
  line-height: 1.6;
}

.event-actions {
  display: flex;
  gap: 12px;
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  text-decoration: none;
  display: inline-block;
  transition: all 0.2s;
  border: none;
  cursor: pointer;
}

.btn-primary {
  background-color: #3788d8;
  color: white;
}

.btn-primary:hover {
  background-color: #2563eb;
  transform: translateY(-1px);
}

/* Modal animations */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .user-calendar {
    padding: 16px;
  }

  .calendar-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .calendar-header-actions {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    gap: 12px;
  }

  .calendar-legend {
    width: 100%;
    justify-content: flex-start;
  }

  :deep(.fc .fc-toolbar) {
    flex-direction: column;
    gap: 12px;
  }

  :deep(.fc .fc-toolbar-chunk) {
    display: flex;
    justify-content: center;
  }

  .event-modal {
    margin: 10px;
  }

  .event-details {
    padding: 16px;
  }
}
</style>

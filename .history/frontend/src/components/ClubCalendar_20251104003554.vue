<template>
  <div class="club-calendar">
    <div class="calendar-header">
      <h3>Club Events Calendar</h3>
      <div class="calendar-legend">
        <span class="legend-item upcoming">
          <span class="legend-dot"></span>
          Upcoming Events
        </span>
        <span class="legend-item past">
          <span class="legend-dot"></span>
          Past Events
        </span>
      </div>
    </div>

    <FullCalendar :options="calendarOptions" :events="calendarEvents" />

    <!-- Debug: Show events data -->
    <div style="margin-top: 20px; padding: 10px; background: #f0f0f0; border: 1px solid #ccc;">
      <h4>Debug: Events Data</h4>
      <p>Club Events Count: {{ clubEvents.length }}</p>
      <p>Calendar Events Count: {{ calendarEvents.length }}</p>
      <div v-if="calendarEvents.length > 0">
        <h5>Calendar Events:</h5>
        <ul>
          <li v-for="event in calendarEvents" :key="event.id">
            {{ event.title }} - {{ event.start }} ({{ event.extendedProps.eventStatus }})
          </li>
        </ul>
      </div>
    </div>

    <!-- Event Detail Modal -->
    <transition name="modal-fade">
      <div v-if="selectedEvent" class="event-modal-overlay" @click.self="closeEventModal">
        <div class="event-modal">
          <button class="modal-close-btn" @click="closeEventModal">×</button>

          <div class="modal-content">
            <div class="event-image" v-if="selectedEvent.extendedProps.imageUrl">
              <img :src="selectedEvent.extendedProps.imageUrl" :alt="selectedEvent.title" />
            </div>

            <div class="event-details">
              <span class="event-badge" :class="selectedEvent.extendedProps.eventStatus">
                {{ selectedEvent.extendedProps.eventStatus === 'upcoming' ? 'Upcoming' : 'Past' }}
              </span>

              <h2>{{ selectedEvent.title }}</h2>

              <div class="event-stats">
                <div class="stat-item">
                  <span class="stat-icon">👥</span>
                  <div class="stat-content">
                    <span class="stat-value">{{ selectedEvent.extendedProps.rsvpCount || 0 }}</span>
                    <span class="stat-label">RSVPs</span>
                  </div>
                </div>
                <div class="stat-item">
                  <span class="stat-icon">🎫</span>
                  <div class="stat-content">
                    <span class="stat-value">{{ selectedEvent.extendedProps.capacity || 'Unlimited' }}</span>
                    <span class="stat-label">Capacity</span>
                  </div>
                </div>
              </div>

              <div class="event-meta">
                <div class="meta-row">
                  <span class="icon">📅</span>
                  <span>{{ formatEventDate(selectedEvent.start) }}</span>
                </div>
                <div class="meta-row" v-if="selectedEvent.extendedProps.time">
                  <span class="icon">⏰</span>
                  <span>{{ selectedEvent.extendedProps.time }}</span>
                </div>
                <div class="meta-row" v-if="selectedEvent.extendedProps.venue">
                  <span class="icon">📍</span>
                  <span>{{ selectedEvent.extendedProps.venue }}</span>
                </div>
                <div class="meta-row" v-if="selectedEvent.extendedProps.category">
                  <span class="icon">🏷️</span>
                  <span>{{ selectedEvent.extendedProps.category }}</span>
                </div>
                <div class="meta-row" v-if="selectedEvent.extendedProps.price">
                  <span class="icon">💰</span>
                  <span>{{ selectedEvent.extendedProps.price }}</span>
                </div>
              </div>

              <div class="event-description" v-if="selectedEvent.extendedProps.description">
                <p>{{ selectedEvent.extendedProps.description }}</p>
              </div>

              <div class="event-actions">
                <router-link
                  :to="`/events/edit`"
                  class="btn btn-secondary"
                >
                  Edit Event
                </router-link>
                <router-link
                  :to="`/events/${selectedEvent.extendedProps.eventId}`"
                  class="btn btn-primary"
                >
                  View Full Details
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useStore } from 'vuex';
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';

const store = useStore();

// Get events from store
const allEvents = computed(() => store.state.allEvents);
const clubOwnedEvents = computed(() => store.state.clubOwnedEvents);
const currentUser = computed(() => store.getters['auth/currentUser']);
const clubRSVPs = computed(() => store.state.clubRSVPs);

const selectedEvent = ref(null);

// Load events on mount
onMounted(async () => {
  console.log('ClubCalendar onMounted - currentUser:', currentUser.value);
  console.log('ClubCalendar onMounted - clubOwnedEvents length:', clubOwnedEvents.value.length);
  
  // Ensure club owned events are loaded
  if (clubOwnedEvents.value.length === 0) {
    console.log('ClubCalendar - fetching club owned events');
    await store.dispatch('fetchClubOwnedEvents');
    console.log('ClubCalendar - after fetch, clubOwnedEvents length:', clubOwnedEvents.value.length);
  }

  // Log final calendar events after everything is loaded
  await nextTick();
  console.log('ClubCalendar onMounted - final calendarEvents:', calendarEvents.value);
});

// Get club's events only
const clubEvents = computed(() => {
  console.log('ClubCalendar clubEvents - clubOwnedEvents:', clubOwnedEvents.value);
  return clubOwnedEvents.value;
});

// Transform events for FullCalendar
const calendarEvents = computed(() => {
  console.log('ClubCalendar calendarEvents - clubEvents:', clubEvents.value);
  const events = [];
  const now = new Date();

  clubEvents.value.forEach(event => {
    console.log('Processing event:', event.id, event.title, event.date, event.datetime);
    // Use datetime if available, otherwise use date
    const dateToUse = event.datetime || event.date;
    const eventDate = new Date(dateToUse);
    console.log('Using date:', dateToUse, 'parsed as:', eventDate, 'is valid date:', !isNaN(eventDate.getTime()));
    
    // Ensure we have a valid date
    if (isNaN(eventDate.getTime())) {
      console.error('Invalid date for event:', event.id, dateToUse);
      return; // Skip this event
    }
    
    const isUpcoming = eventDate > now;
    console.log('Event date parsed:', eventDate, 'isUpcoming:', isUpcoming, 'now:', now);

    // Count RSVPs for this event
    const rsvpCount = clubRSVPs.value.filter(rsvp => rsvp.event_id === event.id).length;

    const calendarEvent = {
      id: `event-${event.id}`,
      title: event.title,
      start: eventDate, // Pass Date object directly to FullCalendar
      backgroundColor: isUpcoming ? '#10b981' : '#6b7280',
      borderColor: isUpcoming ? '#059669' : '#4b5563',
      textColor: '#ffffff',
      extendedProps: {
        eventId: event.id,
        eventStatus: isUpcoming ? 'upcoming' : 'past',
        description: event.description,
        venue: event.venue || event.location,
        category: event.category,
        time: event.time,
        imageUrl: event.image,
        price: event.price,
        capacity: event.capacity || event.maxAttendees,
        rsvpCount: rsvpCount
      }
    };

    console.log('Created calendar event:', calendarEvent);
    events.push(calendarEvent);
  });

  console.log('ClubCalendar calendarEvents - final events array:', events);
  return [...events]; // Return a new array to ensure reactivity
});

// Force calendar update when events change
watch(calendarEvents, (newEvents) => {
  console.log('Calendar events changed, new events:', newEvents);
}, { deep: true });

// Calendar configuration
const calendarOptions = ref({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin],
  initialView: 'dayGridMonth',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,listWeek'
  },
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

// Handle event click
function handleEventClick(info) {
  selectedEvent.value = info.event;
}

// Close modal
function closeEventModal() {
  selectedEvent.value = null;
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
.club-calendar {
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

.legend-item.upcoming .legend-dot {
  background-color: #10b981;
}

.legend-item.past .legend-dot {
  background-color: #6b7280;
}

/* FullCalendar Overrides */
:deep(.fc) {
  font-family: inherit;
}

:deep(.fc .fc-button) {
  background-color: #10b981;
  border-color: #10b981;
  text-transform: capitalize;
  padding: 8px 16px;
  font-weight: 500;
}

:deep(.fc .fc-button:hover) {
  background-color: #059669;
  border-color: #059669;
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
  background-color: #ecfdf5 !important;
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

.event-badge.upcoming {
  background-color: #d1fae5;
  color: #065f46;
}

.event-badge.past {
  background-color: #e5e7eb;
  color: #374151;
}

.event-details h2 {
  margin: 0 0 16px 0;
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
}

.event-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px;
  background-color: #f9fafb;
  border-radius: 8px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-icon {
  font-size: 24px;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
  text-transform: uppercase;
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
  flex-wrap: wrap;
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
  text-align: center;
}

.btn-primary {
  background-color: #10b981;
  color: white;
}

.btn-primary:hover {
  background-color: #059669;
  transform: translateY(-1px);
}

.btn-secondary {
  background-color: #6b7280;
  color: white;
}

.btn-secondary:hover {
  background-color: #4b5563;
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
  .club-calendar {
    padding: 16px;
  }

  .calendar-header {
    flex-direction: column;
    align-items: flex-start;
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

  .event-stats {
    grid-template-columns: 1fr;
  }

  .event-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>

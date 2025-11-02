<template>
  <div class="user-calendar">
    <div class="calendar-header">
      <h3>My Event Calendar</h3>
      <div class="calendar-legend">
        <span class="legend-item rsvp">
          <span class="legend-dot"></span>
          RSVP'd Events
        </span>
        <span class="legend-item saved">
          <span class="legend-dot"></span>
          Saved Events
        </span>
        <span class="legend-item both">
          <span class="legend-dot"></span>
          Saved & RSVP'd
        </span>
      </div>
    </div>

    <FullCalendar :options="calendarOptions" />

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
              <span class="event-badge" :class="selectedEvent.extendedProps.eventType">
                {{ selectedEvent.extendedProps.eventType === 'rsvp' ? 'RSVP\'d' : 
                   selectedEvent.extendedProps.eventType === 'saved' ? 'Saved' : 
                   'Saved & RSVP\'d' }}
              </span>

              <h2>{{ selectedEvent.title }}</h2>

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
              </div>

              <div class="event-description" v-if="selectedEvent.extendedProps.description">
                <p>{{ selectedEvent.extendedProps.description }}</p>
              </div>

              <div class="event-actions">
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
import { ref, computed, watch } from 'vue';
import { useStore } from 'vuex';
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';

const store = useStore();

// Get events from store
const allEvents = computed(() => store.state.allEvents);
const userRSVPs = computed(() => store.state.userRSVPs);
const savedEvents = computed(() => store.state.savedEvents);

const selectedEvent = ref(null);

// Transform events for FullCalendar
const calendarEvents = computed(() => {
  const events = [];

  // Add events that are both saved and RSVP'd (special gradient styling)
  allEvents.value.forEach(event => {
    if (userRSVPs.value.includes(event.id) && savedEvents.value.includes(event.id)) {
      events.push({
        id: `both-${event.id}`,
        title: event.title,
        start: event.date,
        backgroundColor: 'linear-gradient(45deg, #3788d8 50%, #fb923c 50%)',
        borderColor: '#2563eb',
        textColor: '#ffffff',
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
    if (userRSVPs.value.includes(event.id) && !savedEvents.value.includes(event.id)) {
      events.push({
        id: `rsvp-${event.id}`,
        title: event.title,
        start: event.date,
        backgroundColor: '#3788d8',
        borderColor: '#2563eb',
        textColor: '#ffffff',
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
    if (savedEvents.value.includes(event.id) && !userRSVPs.value.includes(event.id)) {
      events.push({
        id: `saved-${event.id}`,
        title: event.title,
        start: event.date,
        backgroundColor: '#fb923c',
        borderColor: '#f97316',
        textColor: '#ffffff',
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
  events: calendarEvents,
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
}, { deep: true });

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

.legend-item.both .legend-dot {
  background: linear-gradient(45deg, #3788d8 50%, #fb923c 50%);
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

:deep(.fc-event.event-both) {
  background: linear-gradient(45deg, #3788d8 50%, #fb923c 50%) !important;
  border-color: #2563eb !important;
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

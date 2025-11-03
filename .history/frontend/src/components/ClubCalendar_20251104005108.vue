<template>
  <div class="club-calendar">
    <div class="calendar-header">
      <h3>Club Events Calendar</h3>
    </div>

    <FullCalendar :options="calendarOptions" />

    <!-- Debug: Show events data -->
    <div style="margin-top: 20px; padding: 10px; background: #f0f0f0; border: 1px solid #ccc;">
      <h4>Debug: Events Data</h4>
      <p>Club Events Count: {{ clubEvents.length }}</p>
      <p>Calendar Events Count: {{ calendarEvents.length }}</p>
      <div v-if="calendarEvents.length > 0">
        <h5>Calendar Events:</h5>
        <ul>
          <li v-for="event in calendarEvents" :key="event.id">
            {{ event.title }} - {{ event.start }}
          </li>
        </ul>
      </div>
    </div>

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
import { ref, computed, onMounted, watch, nextTick } from 'vue';
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
const clubOwnedEvents = computed(() => store.state.clubOwnedEvents);
const currentUser = computed(() => store.getters['auth/currentUser']);
const clubRSVPs = computed(() => store.state.clubRSVPs);

const selectedEvent = ref(null);
const isModalVisible = ref(false);

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
  const events = [];
  console.log('=== CLUB CALENDAR DEBUG ===');
  console.log('Club Events:', clubEvents.value.length);

  clubEvents.value.forEach(event => {
    console.log('Processing club event:', event.id, event.title, event.date);
    const eventDate = new Date(event.datetime || event.date);
    
    if (isNaN(eventDate.getTime())) {
      console.error('Invalid date for event:', event.id, event.date);
      return;
    }

    events.push({
      id: `club-${event.id}`,
      title: event.title,
      start: event.date,
      extendedProps: {
        eventId: event.id,
        eventType: 'club',
        description: event.description,
        venue: event.venue || event.location,
        category: event.category,
        time: event.time,
        imageUrl: event.image,
        organiser: event.organiser,
        price: event.price,
        capacity: event.capacity || event.maxAttendees,
        rsvpCount: 0 // Club events don't need RSVP count in calendar
      }
    });
  });

  console.log('Final club calendar events:', events.length);
  console.log('=== END CLUB CALENDAR DEBUG ===');
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
  // Find the full event object from clubEvents using the eventId from extendedProps
  const eventId = info.event.extendedProps.eventId;
  const fullEvent = clubEvents.value.find(event => Number(event.id) === Number(eventId));
  
  selectedEvent.value = fullEvent || info.event.extendedProps;
  isModalVisible.value = true;
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
  console.log('RSVP Created from club calendar:', rsvpData);
  
  // Refresh the club events data to get updated attendee counts
  await store.dispatch('fetchClubOwnedEvents');
  
  // Update the selected event with the new attendee count if needed
  if (selectedEvent.value) {
    const updatedEvent = clubEvents.value.find(e => e.id === selectedEvent.value.id);
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
}
</style>

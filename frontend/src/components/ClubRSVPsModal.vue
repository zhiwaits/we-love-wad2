<script setup>
import { computed, defineEmits, defineProps } from 'vue';
import { formatSingaporeDate, formatSingaporeDateTime } from '../utils/dateTime';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  groups: {
    type: Array,
    default: () => []
  },
  busyKey: {
    type: String,
    default: null
  }
});

const emit = defineEmits(['close', 'remove-rsvp']);

const hasGroups = computed(() => Array.isArray(props.groups) && props.groups.length > 0);

const formatEventMeta = (dateValue, timeValue, venueValue) => {
  const parts = [];
  if (dateValue) {
    const formattedDate = formatSingaporeDate(dateValue, { dateStyle: 'medium' });
    if (formattedDate) {
      parts.push(formattedDate);
    }
  }
  if (timeValue) {
    parts.push(timeValue);
  }
  if (venueValue) {
    parts.push(venueValue);
  }
  return parts.join(' • ');
};

const formatRsvpTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const formatted = formatSingaporeDateTime(timestamp, { dateStyle: 'medium', timeStyle: 'short' });
  return formatted || timestamp;
};

const rowBusy = (eventId, userId) => props.busyKey === `single:${eventId}:${userId}`;

const toCsvValue = (value) => {
  const str = value == null ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
};

const downloadCsv = (rows, filename) => {
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const handleExport = (group) => {
  if (!group || !Array.isArray(group.rsvps) || group.rsvps.length === 0) {
    return;
  }
  const header = ['Attendee Name', 'Attendee Email', 'Status', 'RSVP Date'];
  const rows = group.rsvps.map((rsvp) => [
    toCsvValue(rsvp.attendee_name || rsvp.name || 'Unknown'),
    toCsvValue(rsvp.attendee_email || rsvp.email || ''),
    toCsvValue(rsvp.status || ''),
    toCsvValue(formatRsvpTimestamp(rsvp.created_at))
  ].join(','));
  const safeTitle = (group.eventTitle || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const filename = safeTitle ? `${safeTitle}-rsvps.csv` : 'event-rsvps.csv';
  downloadCsv([header.join(','), ...rows], filename);
};

const handleRemoveSingle = (group, rsvp) => {
  const eventId = group?.eventId;
  const userId = rsvp?.user_id ?? rsvp?.userId;
  if (!eventId || !userId) {
    return;
  }
  emit('remove-rsvp', { eventId, userId });
};

const handleClose = () => emit('close');
</script>

<template>
  <transition name="modal-fade">
    <div v-if="visible" class="modal-overlay" role="dialog" aria-modal="true" aria-label="Club RSVP Manager" @click.self="handleClose">
      <div class="modal-panel modal-panel--wide">
        <header class="modal-header">
          <div>
            <h2 class="modal-title">Event RSVPs</h2>
            <p class="modal-subtitle">Review attendees for each upcoming event and manage RSVP lists.</p>
          </div>
        </header>

        <section v-if="!hasGroups" class="modal-empty">
          <p>No RSVPs recorded for your events yet.</p>
        </section>

        <section v-else class="rsvp-groups">
          <article v-for="group in groups" :key="group.eventId" class="rsvp-group">
            <header class="rsvp-group__header">
              <div>
                <h3 class="rsvp-group__title">{{ group.eventTitle }}</h3>
                <p v-if="group.eventDate || group.eventTime || group.venue" class="rsvp-group__meta">
                  {{ formatEventMeta(group.eventDate, group.eventTime, group.venue) }}
                </p>
                <p class="rsvp-group__count">
                  {{ group.rsvps.length }} RSVP{{ group.rsvps.length === 1 ? '' : 's' }}
                </p>
              </div>
              <div class="rsvp-group__actions">
                <button
                  type="button"
                  class="btn btn-outline"
                  :disabled="group.rsvps.length === 0"
                  @click="handleExport(group)"
                >
                  Export CSV
                </button>
              </div>
            </header>

            <div v-if="group.rsvps.length === 0" class="rsvp-group__empty">No confirmed RSVPs yet.</div>

            <div v-else class="rsvp-table-wrapper">
              <table class="rsvp-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col" class="rsvp-table__actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="rsvp in group.rsvps" :key="`${group.eventId}-${rsvp.user_id ?? rsvp.userId}`">
                    <td>{{ rsvp.attendee_name || rsvp.name || 'Unknown' }}</td>
                    <td>{{ rsvp.attendee_email || rsvp.email || 'N/A' }}</td>
                    <td class="rsvp-table__actions">
                      <button
                        type="button"
                        class="btn btn-outline btn-outline-danger"
                        :disabled="rowBusy(group.eventId, rsvp.user_id ?? rsvp.userId)"
                        @click="handleRemoveSingle(group, rsvp)"
                      >
                        {{ rowBusy(group.eventId, rsvp.user_id ?? rsvp.userId) ? 'Removing…' : 'Remove' }}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>
        </section>

        <div class="modal-footer">
          <button class="btn btn-outline" type="button" @click="$emit('refresh')">Refresh</button>
          <button class="btn btn-outline" type="button" @click="$emit('close')">Close</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 4rem 1.5rem;
  z-index: 1050;
}

.modal-panel {
  width: min(960px, 100%);
  background: var(--color-surface, #fff);
  border-radius: var(--radius-xl, 16px);
  box-shadow: var(--shadow-lg, 0 20px 40px rgba(15, 23, 42, 0.25));
  overflow: hidden;
  max-height: calc(100vh - 8rem);
  display: flex;
  flex-direction: column;
}

.modal-panel--wide {
  width: min(1100px, 100%);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1.75rem 2rem 1.25rem;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.25rem 0;
}

.modal-subtitle {
  margin: 0;
  color: var(--color-text-secondary, #64748b);
  font-size: 0.95rem;
}

.modal-empty {
  padding: 3rem;
  text-align: center;
  color: var(--color-text-secondary, #64748b);
}

.rsvp-groups {
  padding: 1.5rem 2rem 2rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.rsvp-group {
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-lg, 14px);
  padding: 1.5rem;
  background: var(--color-background, #f8fafc);
}

.rsvp-group__header {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
}

.rsvp-group__title {
  margin: 0 0 0.25rem 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.rsvp-group__meta {
  margin: 0;
  color: var(--color-text-secondary, #64748b);
  font-size: 0.95rem;
}

.rsvp-group__count {
  margin: 0.5rem 0 0 0;
  font-size: 0.9rem;
  color: var(--color-text-secondary, #64748b);
}

.rsvp-group__actions {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.rsvp-group__empty {
  padding: 1rem;
  background: #fff;
  border-radius: var(--radius-md, 10px);
  border: 1px dashed var(--color-border, #e2e8f0);
  color: var(--color-text-secondary, #64748b);
  text-align: center;
}

.rsvp-table-wrapper {
  border-radius: var(--radius-md, 10px);
  overflow: hidden;
  border: 1px solid var(--color-border, #e2e8f0);
  background: #fff;
}

.rsvp-table {
  width: 100%;
  border-collapse: collapse;
}

.rsvp-table thead {
  background: var(--color-surface-strong, #f1f5f9);
}

.rsvp-table th,
.rsvp-table td {
  padding: 0.85rem 1rem;
  text-align: left;
  font-size: 0.95rem;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

.rsvp-table__actions {
  text-align: right;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem 2rem;
  border-top: 1px solid var(--color-border, #e2e8f0);
}

@media (max-width: 768px) {
  .modal-panel {
    padding: 0;
  }

  .modal-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .rsvp-group {
    padding: 1.25rem;
  }

  .rsvp-group__actions {
    width: 100%;
    justify-content: flex-end;
  }

  .rsvp-table-wrapper {
    overflow-x: auto;
  }
}
</style>

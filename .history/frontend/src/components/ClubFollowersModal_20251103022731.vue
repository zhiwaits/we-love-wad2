<script setup>
import { computed, defineEmits, defineProps } from 'vue';

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  followers: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['close', 'refresh']);

const hasFollowers = computed(() => Array.isArray(props.followers) && props.followers.length > 0);

const formatFollowedAt = (value) => {
  if (!value) {
    return '--';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString('en-SG', { dateStyle: 'medium', timeStyle: 'short' });
};

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

const handleExport = () => {
  if (!hasFollowers.value) {
    return;
  }
  const header = ['Name', 'Email'];
  const rows = props.followers.map((follower) => [
    toCsvValue(follower.name || follower.attendee_name || 'Unknown'),
    toCsvValue(follower.email || follower.attendee_email || '')
  ].join(','));
  downloadCsv([header.join(','), ...rows], 'club-followers.csv');
};

const handleClose = () => emit('close');
const handleRefresh = () => emit('refresh');
</script>

<template>
  <transition name="modal-fade">
    <div v-if="visible" class="modal-overlay" role="dialog" aria-modal="true" aria-label="Club Followers" @click.self="handleClose">
      <div class="modal-panel">
        <header class="modal-header">
          <div>
            <h2 class="modal-title">Club Followers</h2>
            <p class="modal-subtitle">See who is keeping up with your club and export the list for outreach.</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-outline" @click="handleRefresh">Refresh</button>
            <button type="button" class="btn btn-primary" :disabled="!hasFollowers" @click="handleExport">Export CSV</button>
          </div>
        </header>

        <section v-if="!hasFollowers" class="modal-empty">
          <p>Your club does not have any followers yet.</p>
        </section>

        <section v-else class="followers-list">
          <table class="followers-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="follower in followers" :key="follower.id || follower.user_id">
                <td>{{ follower.name || follower.attendee_name || 'Unknown' }}</td>
                <td>{{ follower.email || follower.attendee_email || 'N/A' }}</td>
              </tr>
            </tbody>
          </table>
        </section>
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
  width: min(720px, 100%);
  background: var(--color-surface, #fff);
  border-radius: var(--radius-xl, 16px);
  box-shadow: var(--shadow-lg, 0 20px 40px rgba(15, 23, 42, 0.25));
  overflow: hidden;
  max-height: calc(100vh - 8rem);
  display: flex;
  flex-direction: column;
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

.modal-actions {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.modal-empty {
  padding: 3rem;
  text-align: center;
  color: var(--color-text-secondary, #64748b);
}

.followers-list {
  padding: 1.5rem 2rem 2rem;
  overflow-y: auto;
}

.followers-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-lg, 14px);
  overflow: hidden;
}

.followers-table thead {
  background: var(--color-surface-strong, #f1f5f9);
}

.followers-table th,
.followers-table td {
  padding: 0.85rem 1rem;
  text-align: left;
  font-size: 0.95rem;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
}

@media (max-width: 768px) {
  .modal-panel {
    padding: 0;
  }

  .modal-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .modal-actions {
    width: 100%;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .followers-list {
    padding: 1.25rem;
  }

  .followers-table {
    overflow-x: auto;
  }
}
</style>

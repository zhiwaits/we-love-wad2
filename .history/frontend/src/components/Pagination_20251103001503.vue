<template>
  <div class="pagination" v-if="totalPages > 1">
    <button
      class="pagination-btn"
      :disabled="currentPage === 1"
      @click="$emit('page-change', currentPage - 1)"
      aria-label="Previous page"
    >
      ← Previous
    </button>

    <div class="pagination-numbers">
      <button
        v-for="page in visiblePages"
        :key="page"
        class="pagination-number"
        :class="{ active: page === currentPage, ellipsis: page === '...' }"
        :disabled="page === '...'"
        @click="page !== '...' && $emit('page-change', page)"
      >
        {{ page }}
      </button>
    </div>

    <button
      class="pagination-btn"
      :disabled="currentPage === totalPages"
      @click="$emit('page-change', currentPage + 1)"
      aria-label="Next page"
    >
      Next →
    </button>
  </div>

  <div class="pagination-info" v-if="totalEvents > 0">
    Showing {{ startItem }}-{{ endItem }} of {{ totalEvents }} {{ itemLabel }}
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  currentPage: {
    type: Number,
    required: true,
    default: 1
  },
  totalPages: {
    type: Number,
    required: true
  },
  totalEvents: {
    type: Number,
    required: true
  },
  eventsPerPage: {
    type: Number,
    default: 6
  },
  itemLabel: {
    type: String,
    default: 'events'
  }
});

defineEmits(['page-change']);

// Calculate visible page numbers with ellipsis
const visiblePages = computed(() => {
  const pages = [];
  const maxVisible = 7; // Show max 7 page numbers
  const sidePages = 2; // Pages to show on each side of current

  if (props.totalPages <= maxVisible) {
    // Show all pages
    for (let i = 1; i <= props.totalPages; i++) {
      pages.push(i);
    }
  } else {
    // Always show first page
    pages.push(1);

    // Calculate range around current page
    let start = Math.max(2, props.currentPage - sidePages);
    let end = Math.min(props.totalPages - 1, props.currentPage + sidePages);

    // Add ellipsis after first page if needed
    if (start > 2) {
      pages.push('...');
    }

    // Add pages around current
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    // Add ellipsis before last page if needed
    if (end < props.totalPages - 1) {
      pages.push('...');
    }

    // Always show last page
    pages.push(props.totalPages);
  }

  return pages;
});

// Calculate item range for display
const startItem = computed(() => {
  return (props.currentPage - 1) * props.eventsPerPage + 1;
});

const endItem = computed(() => {
  return Math.min(props.currentPage * props.eventsPerPage, props.totalEvents);
});
</script>

<style scoped>
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-8, 8px);
  margin: var(--space-32, 32px) 0;
}

.pagination-btn {
  padding: var(--space-8, 8px) var(--space-16, 16px);
  background-color: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-md, 8px);
  color: var(--color-text, #1f2937);
  font-weight: var(--font-weight-medium, 500);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: var(--font-size-sm, 14px);
}

.pagination-btn:hover:not(:disabled) {
  background-color: var(--color-primary, #3788d8);
  color: white;
  border-color: var(--color-primary, #3788d8);
}

.pagination-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pagination-numbers {
  display: flex;
  gap: var(--space-4, 4px);
}

.pagination-number {
  min-width: 40px;
  height: 40px;
  padding: var(--space-8, 8px);
  background-color: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-md, 8px);
  color: var(--color-text, #1f2937);
  font-weight: var(--font-weight-medium, 500);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: var(--font-size-sm, 14px);
}

.pagination-number:hover:not(:disabled):not(.active) {
  background-color: var(--color-bg-1, #f3f4f6);
  border-color: var(--color-primary, #3788d8);
}

.pagination-number.active {
  background-color: var(--color-primary, #3788d8);
  color: white;
  border-color: var(--color-primary, #3788d8);
  font-weight: var(--font-weight-bold, 700);
}

.pagination-number.ellipsis {
  border: none;
  background: transparent;
  cursor: default;
  font-weight: var(--font-weight-bold, 700);
}

.pagination-number:disabled {
  cursor: not-allowed;
}

.pagination-info {
  text-align: center;
  color: var(--color-text-secondary, #6b7280);
  font-size: var(--font-size-sm, 14px);
  margin-top: var(--space-16, 16px);
}

/* Responsive */
@media (max-width: 768px) {
  .pagination {
    flex-wrap: wrap;
    gap: var(--space-4, 4px);
  }

  .pagination-btn {
    padding: var(--space-6, 6px) var(--space-12, 12px);
    font-size: var(--font-size-xs, 12px);
  }

  .pagination-number {
    min-width: 36px;
    height: 36px;
    padding: var(--space-6, 6px);
    font-size: var(--font-size-xs, 12px);
  }

  .pagination-numbers {
    order: 3;
    width: 100%;
    justify-content: center;
    margin-top: var(--space-8, 8px);
  }
}

@media (max-width: 480px) {
  .pagination-number {
    min-width: 32px;
    height: 32px;
  }

  /* Hide some page numbers on very small screens */
  .pagination-numbers {
    gap: var(--space-2, 2px);
  }
}
</style>

<script setup>
import { computed, defineEmits, defineProps } from 'vue';

const props = defineProps({
  icon: {
    type: String,
    required: true
  },
  value: {
    type: [Number, String],
    required: true
  },
  label: {
    type: String,
    required: true
  },
  color: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'success', 'warning', 'info'].includes(value)
  },
  clickable: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['click']);

const cardClasses = computed(() => {
  const classes = [`stat-card--${props.color}`];
  if (props.clickable) {
    classes.push('stat-card--interactive');
  }
  return classes;
});

const handleClick = (event) => {
  if (!props.clickable) {
    return;
  }
  emit('click', event);
};

const handleKeyUp = (event) => {
  if (!props.clickable) {
    return;
  }
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    emit('click', event);
  }
};
</script>

<template>
  <div
    class="stat-card"
    :class="cardClasses"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? '0' : undefined"
    @click="handleClick"
    @keyup="handleKeyUp"
  >
    <div class="stat-icon">{{ icon }}</div>
    <div class="stat-value">{{ value }}</div>
    <div class="stat-label">{{ label }}</div>
  </div>
</template>

<style scoped>
.stat-card {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--space-24);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-card-border);
  transition: all var(--duration-normal) var(--ease-standard);
  text-align: center;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--color-primary);
  transform: scaleX(0);
  transition: transform var(--duration-normal) var(--ease-standard);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary);
}

.stat-card:hover::before {
  transform: scaleX(1);
}

.stat-card--primary::before {
  background: var(--color-primary);
}

.stat-card--success::before {
  background: var(--color-success);
}

.stat-card--warning::before {
  background: var(--color-warning);
}

.stat-card--info::before {
  background: var(--color-info);
}

.stat-card--interactive {
  cursor: pointer;
}

.stat-card--interactive:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}

.stat-icon {
  font-size: 2.5rem;
  margin-bottom: var(--space-12);
  opacity: 0.9;
}

.stat-value {
  font-size: 2.5rem;
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--space-8);
  color: var(--color-text);
  line-height: 1;
}

.stat-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Remove the old color hover effects */
.stat-card--primary:hover,
.stat-card--success:hover,
.stat-card--warning:hover,
.stat-card--info:hover {
  background-color: var(--color-surface);
  color: inherit;
}
</style>
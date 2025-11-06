<script setup>
import { computed, ref } from 'vue';

const numberFormatter = new Intl.NumberFormat();

const formatNumber = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '0';
  }
  return numberFormatter.format(numeric);
};

const formatAverage = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '0.0';
  }
  return numeric.toFixed(1);
};

const formatDateLabel = (value, includeYear) => {
  if (!value) {
    return 'N/A';
  }
  const parsed = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'N/A';
  }
  const options = { month: 'short', day: 'numeric' };
  if (includeYear) {
    options.year = 'numeric';
  }
  return parsed.toLocaleDateString(undefined, options);
};

function createRangeDefaults() {
  return {
    startDate: null,
    endDate: null,
    newFollowers: 0,
    netChange: 0,
    averagePerDay: 0
  };
}

const props = defineProps({
  tabs: {
    type: Array,
    default: () => []
  },
  activeTab: {
    type: String,
    default: ''
  },
  eventAnalytics: {
    type: Array,
    default: () => []
  },
  attendanceAnalytics: {
    type: Array,
    default: () => []
  },
  followerAnalytics: {
    type: Object,
    default: () => ({})
  },
  preferenceAnalytics: {
    type: Object,
    default: () => ({})
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  }
});

const emit = defineEmits(['update:activeTab', 'retry']);

const followerRange = ref('30');
const followerRangeOptions = [
  { id: '30', label: '1M', days: 30 },
  { id: '180', label: '6M', days: 180 },
  { id: '365', label: '1Y', days: 365 }
];
const followerRangeDays = {
  '30': 30,
  '180': 180,
  '365': 365
};

const hasEventAnalytics = computed(() => Array.isArray(props.eventAnalytics) && props.eventAnalytics.length > 0);
const hasAttendanceAnalytics = computed(
  () => Array.isArray(props.attendanceAnalytics) && props.attendanceAnalytics.length > 0
);

const normalizedFollowerTimeline = computed(() => {
  const timeline = Array.isArray(props.followerAnalytics?.timeline) ? props.followerAnalytics.timeline : [];
  return timeline
    .map((entry) => ({
      date: entry?.date || null,
      newFollowers: Number(entry?.newFollowers) || 0,
      totalFollowers: Number(entry?.totalFollowers) || 0
    }))
    .filter((entry) => typeof entry.date === 'string')
    .sort((a, b) => a.date.localeCompare(b.date));
});

const filteredFollowerTimeline = computed(() => {
  const timeline = normalizedFollowerTimeline.value;
  if (timeline.length === 0) {
    return [];
  }
  const days = followerRangeDays[followerRange.value] || 30;
  const startIndex = Math.max(timeline.length - days, 0);
  return timeline.slice(startIndex);
});

const hasFollowerTimelineData = computed(() => filteredFollowerTimeline.value.length > 0);

const followerRangeSummary = computed(() => {
  const summary = props.followerAnalytics?.ranges?.[followerRange.value];
  if (summary && typeof summary === 'object') {
    return {
      startDate: summary.startDate || null,
      endDate: summary.endDate || null,
      newFollowers: Number(summary.newFollowers) || 0,
      netChange: Number(summary.netChange) || 0,
      averagePerDay: Number(summary.averagePerDay) || 0
    };
  }
  return createRangeDefaults();
});

const followerRangeLabel = computed(() => {
  const match = followerRangeOptions.find((option) => option.id === followerRange.value);
  return match ? match.label : '';
});

const showYearInRange = computed(() => followerRange.value !== '30');

const followerRangeDates = computed(() => ({
  start: formatDateLabel(followerRangeSummary.value.startDate, showYearInRange.value),
  end: formatDateLabel(followerRangeSummary.value.endDate, showYearInRange.value)
}));

const followerSummary = computed(() => {
  const totalFollowers = Number(props.followerAnalytics?.totalFollowers) || 0;
  return {
    totalFollowers,
    totalFollowersLabel: formatNumber(totalFollowers),
    netChange: followerRangeSummary.value.netChange,
    netChangeLabel: formatNumber(followerRangeSummary.value.netChange),
    newFollowersLabel: formatNumber(followerRangeSummary.value.newFollowers),
    averagePerDayLabel: formatAverage(followerRangeSummary.value.averagePerDay),
    startLabel: followerRangeDates.value.start,
    endLabel: followerRangeDates.value.end
  };
});

const followerTrendIsPositive = computed(() => followerSummary.value.netChange >= 0);

const buildChartCoordinates = (points) => {
  if (!Array.isArray(points) || points.length === 0) {
    return { line: '', area: '' };
  }
  const totals = points.map((point) => point.totalFollowers);
  const max = Math.max(...totals);
  const min = Math.min(...totals);
  const range = max - min;
  const denominator = points.length > 1 ? points.length - 1 : 1;

  const lineCoordinates = [];
  const areaCoordinates = [];

  points.forEach((point, index) => {
    const x = denominator === 0 ? 0 : (index / denominator) * 100;
    const normalized = range === 0 ? 0.5 : (point.totalFollowers - min) / (range === 0 ? 1 : range);
    const y = (1 - normalized) * 100;
    const coordinate = `${x.toFixed(2)},${y.toFixed(2)}`;
    lineCoordinates.push(coordinate);
    areaCoordinates.push(coordinate);
  });

  areaCoordinates.push('100,100', '0,100');

  return {
    line: lineCoordinates.join(' '),
    area: areaCoordinates.join(' ')
  };
};

const followerChartCoordinateSet = computed(() => buildChartCoordinates(filteredFollowerTimeline.value));
const followerChartPoints = computed(() => followerChartCoordinateSet.value.line);
const followerAreaPoints = computed(() => followerChartCoordinateSet.value.area);

const followerAxisLabels = computed(() => {
  const totals = filteredFollowerTimeline.value.map((point) => point.totalFollowers);
  if (totals.length === 0) {
    return {
      minLabel: '0',
      maxLabel: '0'
    };
  }
  const min = Math.min(...totals);
  const max = Math.max(...totals);
  return {
    minLabel: formatNumber(min),
    maxLabel: formatNumber(max)
  };
});

const categoryPreferences = computed(() => {
  const categories = Array.isArray(props.preferenceAnalytics?.topCategories) ? props.preferenceAnalytics.topCategories : [];
  if (categories.length === 0) {
    return [];
  }
  const explicitMax = Number(props.preferenceAnalytics?.maxCategoryCount) || 0;
  const fallbackMax = categories.reduce((max, item) => Math.max(max, Number(item?.followerCount) || 0), 0);
  const maxCount = Math.max(explicitMax, fallbackMax);
  const totalFollowers = Number(props.preferenceAnalytics?.totalFollowers) || 0;

  return categories.map((item, index) => {
    const count = Number(item?.followerCount) || 0;
    const visualShare = maxCount > 0 ? Math.min(count / maxCount, 1) : 0;
    const followerShare = totalFollowers > 0 ? (count / totalFollowers) * 100 : 0;

    return {
      key: item?.key ?? item?.name ?? `category-${index}`,
      name: item?.name || 'Unspecified',
      followerCountLabel: formatNumber(count),
      followerShareLabel: `${Number.isFinite(followerShare) ? followerShare.toFixed(1) : '0.0'}%`,
      visualSharePercent: Number.isFinite(visualShare) ? Math.round(visualShare * 100) : 0,
      rank: index + 1
    };
  });
});

const tagPreferences = computed(() => {
  const tags = Array.isArray(props.preferenceAnalytics?.topTags) ? props.preferenceAnalytics.topTags : [];
  if (tags.length === 0) {
    return [];
  }
  const explicitMax = Number(props.preferenceAnalytics?.maxTagCount) || 0;
  const fallbackMax = tags.reduce((max, item) => Math.max(max, Number(item?.followerCount) || 0), 0);
  const maxCount = Math.max(explicitMax, fallbackMax);
  const totalFollowers = Number(props.preferenceAnalytics?.totalFollowers) || 0;

  return tags.map((item, index) => {
    const count = Number(item?.followerCount) || 0;
    const visualShare = maxCount > 0 ? Math.min(count / maxCount, 1) : 0;
    const followerShare = totalFollowers > 0 ? (count / totalFollowers) * 100 : 0;

    return {
      key: item?.id ?? item?.name ?? `tag-${index}`,
      name: item?.name || 'Unspecified',
      followerCountLabel: formatNumber(count),
      followerShareLabel: `${Number.isFinite(followerShare) ? followerShare.toFixed(1) : '0.0'}%`,
      visualSharePercent: Number.isFinite(visualShare) ? Math.round(visualShare * 100) : 0,
      rank: index + 1
    };
  });
});

const hasPreferenceData = computed(() => categoryPreferences.value.length > 0 || tagPreferences.value.length > 0);

const preferenceBaseCount = computed(() => Number(props.preferenceAnalytics?.totalFollowers) || 0);
const preferenceBaseCountLabel = computed(() => formatNumber(preferenceBaseCount.value));

const handleSelectTab = (tabId) => {
  emit('update:activeTab', tabId);
};

const handleRetry = () => {
  emit('retry');
};
</script>

<template>
  <section class="analytics-section">
    <div class="section-header">
      <h2 class="section-title">Club Analytics</h2>
    </div>

    <div class="analytics-tabs" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="analytics-tab"
        :class="{ 'analytics-tab--active': activeTab === tab.id }"
        role="tab"
        :aria-selected="activeTab === tab.id"
        @click="handleSelectTab(tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="analytics-content">
      <template v-if="activeTab === 'event'">
        <div v-if="loading" class="analytics-state analytics-state--loading">
          Loading event analytics...
        </div>
        <div v-else-if="error" class="analytics-state analytics-state--error">
          <p>{{ error }}</p>
          <button type="button" class="btn btn-sm" @click="handleRetry">Try again</button>
        </div>
        <div v-else-if="!hasEventAnalytics" class="analytics-state">
          <p>No upcoming events with analytics yet.</p>
        </div>
        <div v-else class="analytics-event-list">
          <article v-for="event in eventAnalytics" :key="event.eventId || event.id" class="analytics-card">
            <div class="analytics-card-header">
              <div>
                <h3 class="analytics-card-title">{{ event.title }}</h3>
                <p class="analytics-card-subtitle">
                  {{ event.progressStageLabel }} · Timeline {{ event.progressPercentText }}
                </p>
              </div>
              <span class="insight-badge" :class="`insight-badge--${event.insightColor || 'gray'}`">
                {{ event.insightLabel || 'Insight' }}
              </span>
            </div>

            <div class="analytics-card-metrics">
              <div class="metric">
                <span class="metric-label">Capacity filled</span>
                <span class="metric-value">
                  <template v-if="event.capacityFillPercentage !== null">
                    {{ event.capacityFillPercentText }} · {{ event.confirmedAttendees }} /
                    {{ event.capacity != null ? event.capacity : 'N/A' }}
                  </template>
                  <template v-else>
                    Not available
                  </template>
                </span>
              </div>
              <div class="metric">
                <span class="metric-label">Start</span>
                <span class="metric-value">{{ event.startDateTimeText }}</span>
              </div>
            </div>

            <div
              class="progress-bar"
              role="progressbar"
              :aria-valuenow="event.capacityFillPercentage ?? 0"
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <div
                class="progress-bar__fill"
                :style="{ width: `${event.capacityFillWidth}%` }"
              ></div>
            </div>

            <p class="insight-description">{{ event.insightDescription }}</p>
          </article>
        </div>
      </template>
      <template v-else-if="activeTab === 'attendance'">
        <div v-if="loading" class="analytics-state analytics-state--loading">
          Loading attendance analytics...
        </div>
        <div v-else-if="error" class="analytics-state analytics-state--error">
          <p>{{ error }}</p>
          <button type="button" class="btn btn-sm" @click="handleRetry">Try again</button>
        </div>
        <div v-else-if="!hasAttendanceAnalytics" class="analytics-state">
          <p>No past events with attendance data yet.</p>
        </div>
        <div v-else class="analytics-event-list">
          <article v-for="event in attendanceAnalytics" :key="event.eventId || event.id" class="analytics-card">
            <div class="analytics-card-header">
              <div>
                <h3 class="analytics-card-title">{{ event.title }}</h3>
                <p class="analytics-card-subtitle">
                  {{ event.startDateTimeText }} · Capacity {{ event.capacityLabel }}
                </p>
              </div>
              <span class="insight-badge" :class="`insight-badge--${event.insightColor || 'gray'}`">
                {{ event.insightLabel || 'Insight' }}
              </span>
            </div>

            <div class="analytics-card-metrics">
              <div class="metric">
                <span class="metric-label">Attendance rate</span>
                <span class="metric-value">
                  <template v-if="event.attendancePercent != null">
                    {{ event.attendancePercentText }} · {{ event.confirmedAttendeesLabel }} /
                    {{ event.capacityLabel }}
                  </template>
                  <template v-else>
                    Unknown · {{ event.confirmedAttendeesLabel }} attendees
                  </template>
                </span>
              </div>
              <div class="metric">
                <span class="metric-label">Confirmed attendees</span>
                <span class="metric-value">{{ event.confirmedAttendeesLabel }}</span>
              </div>
            </div>

            <div
              class="progress-bar"
              role="progressbar"
              :aria-valuenow="event.attendancePercent ?? 0"
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <div
                class="progress-bar__fill"
                :style="{ width: `${event.attendanceWidth}%` }"
              ></div>
            </div>

            <p v-if="event.insightDescription" class="insight-description">{{ event.insightDescription }}</p>
          </article>
        </div>
      </template>
      <template v-else-if="activeTab === 'audience'">
        <div class="analytics-audience">
          <div class="audience-controls" role="radiogroup" aria-label="Follower range">
            <button
              v-for="option in followerRangeOptions"
              :key="option.id"
              type="button"
              class="range-button"
              :class="{ 'range-button--active': followerRange === option.id }"
              role="radio"
              :aria-checked="followerRange === option.id"
              @click="followerRange = option.id"
            >
              {{ option.label }}
            </button>
          </div>

          <div class="audience-summary">
            <div class="audience-metric">
              <span class="audience-metric__label">Total followers</span>
              <span class="audience-metric__value">{{ followerSummary.totalFollowersLabel }}</span>
              <span
                class="audience-metric__delta"
                :class="followerTrendIsPositive ? 'audience-metric__delta--positive' : 'audience-metric__delta--negative'"
              >
                <span aria-hidden="true">{{ followerTrendIsPositive ? '▲' : '▼' }}</span>
                {{ followerSummary.netChangeLabel }}
              </span>
            </div>
            <div class="audience-metric">
              <span class="audience-metric__label">New in {{ followerRangeLabel }}</span>
              <span class="audience-metric__value">{{ followerSummary.newFollowersLabel }}</span>
              <span class="audience-metric__hint">Net change {{ followerSummary.netChangeLabel }}</span>
            </div>
            <div class="audience-metric">
              <span class="audience-metric__label">Average per day</span>
              <span class="audience-metric__value">{{ followerSummary.averagePerDayLabel }}</span>
              <span class="audience-metric__hint">Across {{ followerRangeLabel }}</span>
            </div>
          </div>

          <div class="audience-chart">
            <div class="chart-header">
              <h3 class="chart-title">Follower Growth</h3>
              <span class="chart-subtitle">{{ followerSummary.startLabel }} – {{ followerSummary.endLabel }}</span>
            </div>
            <div class="chart-wrapper">
              <svg
                v-if="hasFollowerTimelineData"
                class="chart-svg"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                role="img"
                aria-label="Follower growth line chart"
              >
                <defs>
                  <linearGradient id="followerGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.45" />
                    <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0" />
                  </linearGradient>
                </defs>
                <polygon class="chart-area" :points="followerAreaPoints" fill="url(#followerGradient)" />
                <polyline class="chart-line" :points="followerChartPoints" />
              </svg>
              <div v-else class="chart-empty">
                <p>No follower activity recorded for this range yet.</p>
              </div>
            </div>
            <div class="chart-axis">
              <span>{{ followerAxisLabels.minLabel }} followers</span>
              <span>{{ followerAxisLabels.maxLabel }} followers</span>
            </div>
          </div>
        </div>
      </template>
      <template v-else-if="activeTab === 'engagement'">
        <div class="analytics-engagement">
          <div class="preference-card">
            <div class="preference-card__header">
              <h3 class="preference-card__title">Top Categories</h3>
              <span class="preference-card__subtitle" aria-hidden="true">Top 5</span>
            </div>
            <div v-if="categoryPreferences.length === 0" class="analytics-state">
              <p>No follower category preferences yet.</p>
            </div>
            <ul v-else class="preference-list">
              <li v-for="item in categoryPreferences" :key="item.key" class="preference-item">
                <div class="preference-item__header">
                  <span class="preference-rank">#{{ item.rank }}</span>
                  <div class="preference-label">
                    <span class="preference-name">{{ item.name }}</span>
                    <span class="preference-meta">{{ item.followerCountLabel }} followers · {{ item.followerShareLabel }}</span>
                  </div>
                </div>
                <div class="preference-progress" role="presentation">
                  <div class="preference-progress__fill" :style="{ width: `${item.visualSharePercent}%` }"></div>
                </div>
              </li>
            </ul>
          </div>

          <div class="preference-card">
            <div class="preference-card__header">
              <h3 class="preference-card__title">Top Tags</h3>
              <span class="preference-card__subtitle" aria-hidden="true">Top 10</span>
            </div>
            <div v-if="tagPreferences.length === 0" class="analytics-state">
              <p>No follower tag preferences yet.</p>
            </div>
            <ul v-else class="preference-list">
              <li v-for="item in tagPreferences" :key="item.key" class="preference-item">
                <div class="preference-item__header">
                  <span class="preference-rank">#{{ item.rank }}</span>
                  <div class="preference-label">
                    <span class="preference-name">{{ item.name }}</span>
                    <span class="preference-meta">{{ item.followerCountLabel }} followers · {{ item.followerShareLabel }}</span>
                  </div>
                </div>
                <div class="preference-progress" role="presentation">
                  <div class="preference-progress__fill" :style="{ width: `${item.visualSharePercent}%` }"></div>
                </div>
              </li>
            </ul>
          </div>
        </div>
        <p v-if="hasPreferenceData && preferenceBaseCount > 0" class="preference-footnote">
          Based on {{ preferenceBaseCountLabel }} follower{{ preferenceBaseCount === 1 ? '' : 's' }} with saved preferences.
        </p>
      </template>
      <template v-else>
        <div class="analytics-state analytics-state--placeholder">
          <p>Insights coming soon.</p>
        </div>
      </template>
    </div>

    <div class="preferences-actions">
      <button
        type="button"
        class="btn btn-outline"
        @click="$emit('open-preferences')"
      >
        Update Preferences
      </button>
    </div>
  </section>
</template>

<style scoped>
.analytics-section {
  margin-bottom: var(--space-56);
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-32);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-24);
  padding-bottom: var(--space-16);
  border-bottom: 2px solid var(--color-border);
}

.section-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  margin: 0;
  color: var(--color-text);
}

.analytics-tabs {
  display: flex;
  gap: var(--space-12);
  margin-bottom: var(--space-24);
  flex-wrap: wrap;
}

.analytics-tab {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-secondary);
  padding: var(--space-8) var(--space-16);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  transition: all var(--duration-fast);
}

.analytics-tab:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.analytics-tab--active {
  background: var(--color-primary);
  color: var(--color-white);
  border-color: var(--color-primary);
}

.analytics-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-20);
  max-height: 600px;
  overflow-y: auto;
}

.analytics-state {
  background: var(--color-surface-alt, rgba(15, 23, 42, 0.04));
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-24);
  text-align: center;
  color: var(--color-text-secondary);
}

.analytics-state--error {
  border-color: var(--color-danger, #f87171);
  color: var(--color-danger, #f87171);
}

.analytics-event-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-20);
}

.analytics-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-24);
  background: var(--color-surface-strong, var(--color-surface));
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
}

.analytics-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-16);
}

.analytics-card-title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}

.analytics-card-subtitle {
  margin: var(--space-4) 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.insight-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4) var(--space-12);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #0f172a;
  background: var(--color-border);
}

.insight-badge--yellow { background: #facc15; }
.insight-badge--green { background: #22c55e; }
.insight-badge--blue { background: #3b82f6; color: #f8fafc; }
.insight-badge--orange { background: #fb923c; }
.insight-badge--red { background: #f87171; }
.insight-badge--gray { background: #94a3b8; }

.analytics-card-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-16);
}

.metric {
  display: flex;
  flex-direction: column;
}

.metric-label {
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary);
}

.metric-value {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text);
}

.progress-bar {
  position: relative;
  height: 10px;
  background: var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-bar__fill {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  background: var(--color-primary);
  border-radius: var(--radius-full);
  transition: width var(--duration-normal) var(--ease-standard);
}

.insight-description {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

.analytics-state--placeholder {
  color: var(--color-text-secondary);
}

.analytics-audience {
  display: flex;
  flex-direction: column;
  gap: var(--space-24);
}

.audience-controls {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--space-8);
}

.range-button {
  border: 1px solid var(--color-border);
  background: var(--color-surface-alt, rgba(15, 23, 42, 0.05));
  color: var(--color-text-secondary);
  padding: var(--space-8) var(--space-16);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  transition: all var(--duration-fast);
}

.range-button:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.range-button--active {
  background: var(--color-primary);
  color: var(--color-white);
  border-color: var(--color-primary);
}

.audience-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-16);
}

.audience-metric {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-16);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  background: var(--color-surface-strong, var(--color-surface));
}

.audience-metric__label {
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary);
}

.audience-metric__value {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}

.audience-metric__delta {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  display: inline-flex;
  align-items: center;
  gap: var(--space-6);
}

.audience-metric__delta--positive {
  color: var(--color-success, #22c55e);
}

.audience-metric__delta--negative {
  color: var(--color-danger, #ef4444);
}

.audience-metric__hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.audience-chart {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-20);
  background: var(--color-surface-strong, var(--color-surface));
  display: flex;
  flex-direction: column;
  gap: var(--space-12);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-12);
}

.chart-title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

.chart-subtitle {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.chart-wrapper {
  position: relative;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  overflow: hidden;
}

.chart-svg {
  width: 100%;
  height: 220px;
  display: block;
}

.chart-line {
  fill: none;
  stroke: var(--color-primary);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.chart-area {
  stroke: none;
}

.chart-axis {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.chart-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-24);
  min-height: 180px;
  color: var(--color-text-secondary);
}

.analytics-engagement {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-24);
}

.preference-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface-strong, var(--color-surface));
  padding: var(--space-24);
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
}

.preference-card__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-12);
}

.preference-card__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

.preference-card__subtitle {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.preference-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-16);
}

.preference-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
}

.preference-item__header {
  display: flex;
  gap: var(--space-12);
  align-items: flex-start;
}

.preference-rank {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary);
}

.preference-label {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.preference-name {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-medium);
}

.preference-meta {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

.preference-progress {
  height: 8px;
  background: var(--color-border);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.preference-progress__fill {
  height: 100%;
  background: var(--color-primary);
  border-radius: var(--radius-full);
  transition: width var(--duration-normal) var(--ease-standard);
}

.preference-footnote {
  margin: var(--space-12) 0 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
}

@media (max-width: 768px) {
  .analytics-section {
    padding: var(--space-24);
  }

  .analytics-card {
    padding: var(--space-20);
  }

  .analytics-card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-12);
  }

  .analytics-tabs {
    gap: var(--space-8);
  }

  .audience-summary {
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  }

  .analytics-engagement {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .analytics-section {
    padding: var(--space-20);
  }

  .analytics-card {
    padding: var(--space-16);
  }

  .audience-controls {
    width: 100%;
  }

  .range-button {
    flex: 1 1 30%;
    text-align: center;
  }
}
</style>

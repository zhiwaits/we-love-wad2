const DEFAULT_SINGAPORE_LOCALE = 'en-SG';
const DEFAULT_SINGAPORE_TIME_ZONE = 'Asia/Singapore';

const hasExplicitOffset = (value) => /[zZ]$/.test(value) || /[+\-]\d{2}:?\d{2}$/.test(value);

const ensureTimePortion = (value) => {
  if (/T\d{2}/.test(value)) {
    return value;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T00:00:00`;
  }
  return value;
};

const trimExtraMilliseconds = (value) => value.replace(/(\.\d{3})\d+$/, '$1');

const buildCandidateStrings = (raw) => {
  const candidates = new Set();
  if (typeof raw !== 'string') {
    return candidates;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return candidates;
  }

  candidates.add(trimmed);

  const spaceNormalized = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T');
  const base = trimExtraMilliseconds(ensureTimePortion(spaceNormalized));
  candidates.add(base);

  if (!hasExplicitOffset(base)) {
    candidates.add(`${base}+08:00`);
    candidates.add(`${base}Z`);
  }

  return candidates;
};

const ensureDate = (value) => {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? null : new Date(time);
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return null;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'string') {
    const candidates = buildCandidateStrings(value);
    for (const candidate of candidates) {
      const parsed = Date.parse(candidate);
      if (!Number.isNaN(parsed)) {
        return new Date(parsed);
      }
    }
    return null;
  }

  return null;
};

const withSingaporeTimezone = (options = {}) => ({
  ...options,
  timeZone: DEFAULT_SINGAPORE_TIME_ZONE
});

const formatWith = (value, formatter, options = {}, locale) => {
  const date = ensureDate(value);
  if (!date) {
    return '';
  }
  const resolvedLocale = locale || DEFAULT_SINGAPORE_LOCALE;
  return formatter.call(date, resolvedLocale, withSingaporeTimezone(options));
};

export const formatSingaporeDate = (value, options = {}, locale) =>
  formatWith(value, Date.prototype.toLocaleDateString, options, locale);

export const formatSingaporeTime = (value, options = {}, locale) =>
  formatWith(value, Date.prototype.toLocaleTimeString, options, locale);

export const formatSingaporeDateTime = (value, options = {}, locale) =>
  formatWith(value, Date.prototype.toLocaleString, options, locale);

export const parseSingaporeDate = (value) => ensureDate(value);

export { DEFAULT_SINGAPORE_LOCALE, DEFAULT_SINGAPORE_TIME_ZONE };

/** CRM Time Control option sets (no geo-fencing). */

export const TIMEZONE_OPTIONS = [
  { value: 'Asia/Karachi', label: 'Karachi', offset: 'UTC+05:00' },
  { value: 'Asia/Dubai', label: 'Dubai', offset: 'UTC+04:00' },
  { value: 'Asia/Kolkata', label: 'Kolkata', offset: 'UTC+05:30' },
  { value: 'Asia/Singapore', label: 'Singapore', offset: 'UTC+08:00' },
  { value: 'Europe/London', label: 'London', offset: 'UTC+00:00' },
  { value: 'Europe/Berlin', label: 'Berlin', offset: 'UTC+01:00' },
  { value: 'America/New_York', label: 'New York', offset: 'UTC-05:00' },
  { value: 'America/Chicago', label: 'Chicago', offset: 'UTC-06:00' },
  { value: 'America/Los_Angeles', label: 'Los Angeles', offset: 'UTC-08:00' },
  { value: 'Australia/Sydney', label: 'Sydney', offset: 'UTC+10:00' },
];

export const LATE_MARK_OPTIONS = [5, 10, 15, 30, 45];
export const CLOCK_IN_CUTOFF_OPTIONS = [30, 45, 60, 90, 120];
export const GRACE_BEFORE_START_OPTIONS = [0, 5, 10, 15, 30];
export const MINIMUM_WORKING_HOURS_OPTIONS = [4, 6, 7, 8];
export const AUTO_CHECKOUT_HOURS_OPTIONS = [8, 10, 12, 14, 16];
export const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];
export const DEFAULT_WORK_WEEK_DAYS = [1, 2, 3, 4, 5];

export function todayDateInput() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function minutesToBreakInput(minutes) {
  const m = Math.max(0, Math.min(Math.floor(Number(minutes) || 0), 24 * 60));
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function breakInputToMinutes(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return 0;
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = Number.parseInt(match[1], 10);
  const min = Number.parseInt(match[2], 10);
  if (Number.isNaN(h) || Number.isNaN(min) || min > 59) return null;
  return Math.min(24 * 60, h * 60 + min);
}

export function formatBreakDurationLabel(hhmm) {
  const minutes = breakInputToMinutes(hhmm);
  if (minutes == null) return hhmm;
  if (minutes === 0) return 'No break';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

export function timezoneLabel(tz) {
  const opt = TIMEZONE_OPTIONS.find((o) => o.value === tz);
  if (!opt) return tz || '—';
  return `${opt.offset} · ${opt.label}`;
}

export function normalizeShiftPayload(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw.data && typeof raw.data === 'object' ? raw.data : raw;
  return row;
}

export function weekdayLongLabel(dateIso) {
  const d = new Date(`${String(dateIso).slice(0, 10)}T12:00:00`);
  if (!Number.isFinite(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { weekday: 'long' });
}

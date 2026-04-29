// Delivery slot definitions (six 2-hour windows, 9 AM – 9 PM).
// Slots are derived; only their disabled-state is stored in the DB.

const SLOT_DEFS = [
  { start: '09:00', end: '11:00', label: '9:00 AM – 11:00 AM' },
  { start: '11:00', end: '13:00', label: '11:00 AM – 1:00 PM' },
  { start: '13:00', end: '15:00', label: '1:00 PM – 3:00 PM' },
  { start: '15:00', end: '17:00', label: '3:00 PM – 5:00 PM' },
  { start: '17:00', end: '19:00', label: '5:00 PM – 7:00 PM' },
  { start: '19:00', end: '21:00', label: '7:00 PM – 9:00 PM' },
];

export const ALL_SLOTS = SLOT_DEFS;

// Cut-off: the slot is hidden once we're within this many minutes of its
// start (gives the shop a buffer to actually pack & dispatch).
const CUTOFF_MINUTES = 30;

export const formatDateLabel = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = (target - today) / 86400000;
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return target.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

export const isoDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const minutesOfDay = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// Returns the list of slots eligible for the given date, with disabled flag
// applied. For "today", auto-hides slots that have already started (within
// CUTOFF_MINUTES). Disabled slots returned with `disabled: true` so the UI
// can render them as such (instead of vanishing them, which is confusing).
export const getSlotsForDate = (date, disabledSet = new Set()) => {
  const now = new Date();
  const isToday = isoDate(date) === isoDate(now);
  const nowMins = isToday ? now.getHours() * 60 + now.getMinutes() : -1;

  return SLOT_DEFS.filter((s) => {
    if (!isToday) return true;
    return minutesOfDay(s.start) - CUTOFF_MINUTES > nowMins;
  }).map((s) => {
    const key = `${isoDate(date)}|${s.start}`;
    return { ...s, disabled: disabledSet.has(key) };
  });
};

// Build the date carousel — today + tomorrow.
export const getAvailableDates = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return [today, tomorrow];
};

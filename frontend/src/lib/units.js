// Single source of truth for all product unit handling.
// Supported: kg | dzn | piece. Anything else is normalized to 'piece'.
//
// Usage:
//   import { UNITS, normalizeUnit, presetsFor, formatQty, calcSubtotal } from '../lib/units';

export const UNITS = ['kg', 'dzn', 'piece'];

// Visible labels used everywhere (price suffix, dropdowns, cart rows).
export const UNIT_LABEL = {
  kg: 'kg',
  dzn: 'dozen',
  piece: 'piece',
};

// Short suffix shown next to ₹price (e.g. "₹260 /kg", "₹120 /dzn", "₹15 /piece")
export const UNIT_SHORT = {
  kg: 'kg',
  dzn: 'dzn',
  piece: 'pc',
};

// Map historical/legacy unit strings to the canonical set.
// Allows graceful migration without breaking old DB rows.
export const normalizeUnit = (raw) => {
  if (!raw) return 'kg';
  const u = String(raw).toLowerCase().trim();
  if (u === 'kg' || u === 'kgs' || u === 'kilogram' || u === 'kilo') return 'kg';
  if (u === 'dzn' || u === 'dozen' || u === 'doz') return 'dzn';
  if (u === 'piece' || u === 'pc' || u === 'pcs' || u === 'each' || u === 'unit') return 'piece';
  return 'piece';
};

export const isValidUnit = (u) => UNITS.includes(normalizeUnit(u));

// Quantity preset chips per unit. Each entry: { value, label }.
// Step / min are used by +/- buttons in cart drawer.
const PRESET_CONFIG = {
  kg: {
    step: 0.25,
    min: 0.25,
    options: [
      { value: 0.25, label: '250g' },
      { value: 0.5, label: '500g' },
      { value: 1, label: '1 kg' },
      { value: 2, label: '2 kg' },
    ],
  },
  dzn: {
    step: 0.5,
    min: 0.5,
    options: [
      { value: 0.5, label: '6 (½ dzn)' },
      { value: 1, label: '12 (1 dzn)' },
      { value: 2, label: '24 (2 dzn)' },
    ],
  },
  piece: {
    step: 1,
    min: 1,
    options: [
      { value: 1, label: '1 pc' },
      { value: 2, label: '2 pcs' },
      { value: 6, label: '6 pcs' },
      { value: 12, label: '12 pcs' },
    ],
  },
};

export const presetsFor = (rawUnit) => {
  const unit = normalizeUnit(rawUnit);
  return { unit, ...PRESET_CONFIG[unit] };
};

// Human-friendly quantity formatting. Used in cart rows, WhatsApp messages,
// product cards. Always returns a tidy string.
export const formatQty = (qty, rawUnit) => {
  const unit = normalizeUnit(rawUnit);
  const n = Number(qty) || 0;
  if (unit === 'kg') {
    if (n < 1) return `${(n * 1000).toFixed(0)}g`;
    return `${+n.toFixed(2)} kg`;
  }
  if (unit === 'dzn') {
    const pieces = Math.round(n * 12);
    return n === 1 ? '1 dozen' : `${pieces} pcs`;
  }
  return `${n} pc${n === 1 ? '' : 's'}`;
};

// Price math: kg → price * qty; dzn → price * qty (price is per dozen);
// piece → price * qty (price is per piece). Single line, but centralised
// so the formula never gets out of sync between Shop / Cart / WhatsApp.
export const calcSubtotal = (price, qty) => {
  const p = Number(price) || 0;
  const q = Number(qty) || 0;
  return Math.round(p * q);
};

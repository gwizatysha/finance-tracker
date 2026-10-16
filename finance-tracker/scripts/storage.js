// storage.js — localStorage persistence with defensive parsing.

const KEYS = {
  data: 'sft:records',
  settings: 'sft:settings',
};

export const DEFAULT_SETTINGS = {
  baseCurrency: 'USD',
  currencies: [
    { code: 'USD', rate: 1 },
    { code: 'EUR', rate: 0.92 },
    { code: 'RWF', rate: 1450 },
  ],
  categories: ['Food', 'Books', 'Transport', 'Entertainment', 'Fees', 'Other'],
  cap: 0,
  displayCurrency: 'USD',
  theme: 'light',
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false; // quota exceeded or storage disabled
  }
}

export const loadRecords = () => {
  const d = read(KEYS.data, null);
  return Array.isArray(d) ? d : null; // null => first run, caller seeds
};
export const saveRecords = (records) => write(KEYS.data, records);

export const loadSettings = () => ({ ...DEFAULT_SETTINGS, ...read(KEYS.settings, {}) });
export const saveSettings = (s) => write(KEYS.settings, s);

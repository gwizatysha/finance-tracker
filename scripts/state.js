// state.js — single source of truth. UI subscribes; every mutation auto-saves.

import { loadRecords, saveRecords, loadSettings, saveSettings } from './storage.js';
import { validateRecord } from './validators.js';

const listeners = new Set();
let records = [];
let settings = loadSettings();

export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach((fn) => fn());

export const getRecords = () => records;
export const getSettings = () => settings;

export async function init(seedUrl = 'seed.json') {
  const stored = loadRecords();
  if (stored) {
    records = stored;
  } else {
    try {
      const res = await fetch(seedUrl);
      const seed = await res.json();
      records = Array.isArray(seed) ? seed : [];
    } catch {
      records = [];
    }
    saveRecords(records);
  }
  emit();
}

function nextId() {
  const nums = records.map((r) => Number(String(r.id).replace(/^\D+/, ''))).filter(Number.isFinite);
  const n = (nums.length ? Math.max(...nums) : 0) + 1;
  return `txn_${String(n).padStart(4, '0')}`;
}

export function addRecord({ description, amount, category, date }) {
  const now = new Date().toISOString();
  const rec = { id: nextId(), description, amount: Number(amount), category, date, createdAt: now, updatedAt: now };
  records = [...records, rec];
  saveRecords(records);
  emit();
  return rec;
}

export function updateRecord(id, patch) {
  records = records.map((r) =>
    r.id === id ? { ...r, ...patch, amount: Number(patch.amount ?? r.amount), updatedAt: new Date().toISOString() } : r
  );
  saveRecords(records);
  emit();
}

export function deleteRecord(id) {
  records = records.filter((r) => r.id !== id);
  saveRecords(records);
  emit();
}

export function updateSettings(patch) {
  settings = { ...settings, ...patch };
  saveSettings(settings);
  emit();
}

export function exportJSON() {
  return JSON.stringify(records, null, 2);
}

/** Validate structure before replacing state. Returns { ok, error?, count? }. */
export function importJSON(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'File is not valid JSON.' };
  }
  if (!Array.isArray(data)) return { ok: false, error: 'Expected a JSON array of records.' };
  const seen = new Set();
  for (let i = 0; i < data.length; i++) {
    const err = validateRecord(data[i]);
    if (err) return { ok: false, error: `Record ${i + 1}: ${err}` };
    if (seen.has(data[i].id)) return { ok: false, error: `Record ${i + 1}: duplicate id "${data[i].id}".` };
    seen.add(data[i].id);
  }
  records = data.map((r) => ({ ...r, amount: Number(r.amount) }));
  saveRecords(records);
  emit();
  return { ok: true, count: records.length };
}

export function resetToSeed() {
  records = [];
  saveRecords(null);
  try { localStorage.removeItem('sft:records'); } catch { /* ignore */ }
  return init();
}

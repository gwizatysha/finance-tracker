// main.js — wires events to state and UI.

import * as state from './state.js';
import { compileRegex } from './search.js';
import { recordMatches } from './search.js';
import {
  validateDescription, validateAmount, validateDate, validateCategory, validateRate, RULES,
} from './validators.js';
import {
  announce, setFieldError, sortRecords, renderRecords, updateSortIndicators, renderDashboard,
  renderSettingsForm, confirmDelete, download, toCSV,
} from './ui.js';

const $ = (sel) => document.querySelector(sel);
const ROUTES = ['dashboard', 'records', 'form', 'settings', 'about'];

const view = { field: 'date', dir: 'desc', editingId: null };

/* ---------- Routing ---------- */

function route() {
  const name = ROUTES.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'dashboard';
  ROUTES.forEach((r) => { $('#' + r).hidden = r !== name; });
  document.querySelectorAll('[data-route]').forEach((a) => {
    if (a.dataset.route === name) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  document.title = `${name[0].toUpperCase() + name.slice(1)} · Student Finance Tracker`;
  $('#' + name + ' h1').focus({ preventScroll: false });
}

/* ---------- Rendering ---------- */

function currentRegex() {
  const input = $('#search-input').value;
  const flags = $('#search-ci').checked ? 'i' : '';
  const re = compileRegex(input, flags);
  const msg = $('#search-msg');
  if (input && !re) {
    $('#search-input').setAttribute('aria-invalid', 'true');
    msg.textContent = 'Invalid regular expression.';
  } else {
    $('#search-input').setAttribute('aria-invalid', 'false');
  }
  return re;
}

function render() {
  const settings = state.getSettings();
  const all = state.getRecords();
  const re = currentRegex();
  const filtered = sortRecords(all.filter((r) => recordMatches(r, re)), view.field, view.dir);

  renderRecords({
    records: filtered, settings, re, editingId: view.editingId,
    handlers: { edit: startEdit, cancel: cancelEdit, save: saveEdit, delete: askDelete },
  });
  updateSortIndicators(view.field, view.dir);

  const input = $('#search-input').value;
  if (!input || re) {
    $('#search-msg').textContent = input
      ? `${filtered.length} of ${all.length} records match.`
      : `${all.length} records.`;
  }

  renderDashboard(all, settings);
}

/* ---------- Search & sort ---------- */

$('#search-form').addEventListener('submit', (e) => e.preventDefault());
$('#search-input').addEventListener('input', render);
$('#search-ci').addEventListener('change', render);
$('#sort-field').addEventListener('change', (e) => { view.field = e.target.value; render(); });
$('#sort-dir').addEventListener('change', (e) => { view.dir = e.target.value; render(); });

document.querySelectorAll('.th-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const f = btn.dataset.sort;
    view.dir = view.field === f && view.dir === 'asc' ? 'desc' : 'asc';
    view.field = f;
    $('#sort-field').value = f;
    $('#sort-dir').value = view.dir;
    render();
    announce(`Sorted by ${f}, ${view.dir === 'asc' ? 'ascending' : 'descending'}.`);
  });
});

/* ---------- Add form ---------- */

const FORM_FIELDS = [
  ['f-desc', 'e-desc', validateDescription],
  ['f-amount', 'e-amount', validateAmount],
  ['f-cat', 'e-cat', validateCategory],
  ['f-date', 'e-date', validateDate],
];

FORM_FIELDS.forEach(([id, errId, fn]) => {
  $('#' + id).addEventListener('blur', () => setFieldError(id, errId, fn($('#' + id).value)));
});

$('#txn-form').addEventListener('submit', (e) => {
  e.preventDefault();
  let firstBad = null;
  for (const [id, errId, fn] of FORM_FIELDS) {
    const msg = fn($('#' + id).value);
    setFieldError(id, errId, msg);
    if (msg && !firstBad) firstBad = id;
  }
  if (firstBad) {
    $('#' + firstBad).focus();
    announce('The form has errors. Please fix them and try again.');
    return;
  }
  state.addRecord({
    description: $('#f-desc').value,
    amount: $('#f-amount').value,
    category: $('#f-cat').value,
    date: $('#f-date').value,
  });
  e.target.reset();
  FORM_FIELDS.forEach(([id, errId]) => setFieldError(id, errId, ''));
  announce('Transaction saved.');
  location.hash = '#records';
});

$('#txn-form').addEventListener('reset', () => {
  FORM_FIELDS.forEach(([id, errId]) => setFieldError(id, errId, ''));
});

/* ---------- Inline edit / delete ---------- */

function startEdit(id) {
  view.editingId = id;
  render();
  $('#ed-desc')?.focus();
}

function cancelEdit() {
  const id = view.editingId;
  view.editingId = null;
  render();
  document.querySelector(`tr[data-id="${id}"] [data-act="edit"]`)?.focus();
}

function saveEdit(id) {
  const patch = {
    date: $('#ed-date').value,
    description: $('#ed-desc').value,
    category: $('#ed-cat').value,
    amount: $('#ed-amt').value,
  };
  const err = validateDate(patch.date) || validateDescription(patch.description)
    || validateCategory(patch.category) || validateAmount(patch.amount);
  if (err) {
    $('#ed-err').textContent = err;
    return;
  }
  state.updateRecord(id, patch);
  view.editingId = null;
  render();
  announce('Record updated.');
  document.querySelector(`tr[data-id="${id}"] [data-act="edit"]`)?.focus();
}

async function askDelete(id) {
  const rec = state.getRecords().find((r) => r.id === id);
  if (!rec) return;
  if (await confirmDelete(rec)) {
    state.deleteRecord(id);
    announce('Record deleted.');
    $('#records-h').focus();
  } else {
    document.querySelector(`tr[data-id="${id}"] [data-act="delete"]`)?.focus();
  }
}

/* ---------- Settings ---------- */

$('#settings-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const s = state.getSettings();

  const capRaw = $('#s-cap').value.trim();
  const capErr = capRaw === '0' ? '' : validateAmount(capRaw);
  setFieldError('s-cap', 'e-cap', capErr);

  const codes = ['c0-code', 'c1-code', 'c2-code'].map((id) => $('#' + id).value.trim().toUpperCase());
  const rates = [1, $('#c1-rate').value.trim(), $('#c2-rate').value.trim()];
  let ratesErr = '';
  if (!codes.every((c) => /^[A-Z]{3}$/.test(c))) ratesErr = 'Currency codes must be 3 letters.';
  else if (new Set(codes).size !== 3) ratesErr = 'Currency codes must be different.';
  else ratesErr = validateRate(rates[1]) || validateRate(rates[2]);
  $('#e-rates').textContent = ratesErr;

  const cats = $('#s-cats').value.split(',').map((c) => c.trim()).filter(Boolean);
  const badCat = cats.find((c) => !RULES.category.test(c));
  const catsErr = !cats.length ? 'Add at least one category.' : badCat ? `Invalid category: "${badCat}". Letters, spaces, hyphens only.` : '';
  setFieldError('s-cats', 'e-cats', catsErr);

  if (capErr || ratesErr || catsErr) {
    announce('Settings have errors.');
    return;
  }

  const currencies = codes.map((code, i) => ({ code, rate: Number(rates[i]) }));
  let display = $('#s-display').value;
  if (!codes.includes(display)) display = codes[0];
  state.updateSettings({ cap: Number(capRaw), currencies, categories: cats, baseCurrency: codes[0], displayCurrency: display });
  renderSettingsForm(state.getSettings());
  announce('Settings saved.');
});

$('#s-display').addEventListener('change', (e) => {
  state.updateSettings({ displayCurrency: e.target.value });
});

/* ---------- Import / export ---------- */

$('#export-json').addEventListener('click', () => {
  download('finance-records.json', state.exportJSON(), 'application/json');
  announce('JSON exported.');
});

$('#export-csv').addEventListener('click', () => {
  download('finance-records.csv', toCSV(state.getRecords()), 'text/csv');
  announce('CSV exported.');
});

$('#import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const msg = $('#import-msg');
  const res = state.importJSON(await file.text());
  msg.textContent = res.ok ? `Imported ${res.count} records.` : `Import failed: ${res.error} Nothing was changed.`;
  e.target.value = '';
});

$('#reset-data').addEventListener('click', async () => {
  await state.resetToSeed();
  $('#import-msg').textContent = 'Seed data restored.';
});

/* ---------- Theme ---------- */

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const btn = $('#theme-toggle');
  btn.setAttribute('aria-pressed', String(theme === 'dark'));
  btn.textContent = theme === 'dark' ? 'Light theme' : 'Dark theme';
}

$('#theme-toggle').addEventListener('click', () => {
  const next = state.getSettings().theme === 'dark' ? 'light' : 'dark';
  state.updateSettings({ theme: next });
});

/* ---------- Boot ---------- */

let lastTheme = null;
state.subscribe(() => {
  const s = state.getSettings();
  if (s.theme !== lastTheme) { lastTheme = s.theme; applyTheme(s.theme); }
  render();
  if (!document.activeElement || !['s-cap', 'c0-code', 'c1-code', 'c1-rate', 'c2-code', 'c2-rate', 's-cats'].includes(document.activeElement.id)) {
    renderSettingsForm(s);
  }
});

window.addEventListener('hashchange', route);
await state.init();
route();

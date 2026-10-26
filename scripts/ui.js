// ui.js — rendering and DOM helpers. No state mutation happens here except via callbacks.

import { highlight } from './search.js';
import { formatMoney, last7Days, sum, topCategory, capStatus, convert, localISODate } from './stats.js';

const $ = (sel, root = document) => root.querySelector(sel);

export function announce(msg) {
  const el = $('#status');
  el.textContent = '';
  // re-set on next tick so identical messages are re-announced
  setTimeout(() => { el.textContent = msg; }, 30);
}

export function setFieldError(inputId, errId, msg) {
  const input = $('#' + inputId);
  const err = $('#' + errId);
  err.textContent = msg;
  if (input) input.setAttribute('aria-invalid', msg ? 'true' : 'false');
}

export function sortRecords(list, field, dir) {
  const mul = dir === 'asc' ? 1 : -1;
  return [...list].sort((a, b) => {
    let c;
    if (field === 'amount') c = a.amount - b.amount;
    else if (field === 'description') c = a.description.localeCompare(b.description, undefined, { sensitivity: 'base' });
    else c = a.date.localeCompare(b.date);
    return (c || a.id.localeCompare(b.id)) * mul;
  });
}

/* ---------- Records table ---------- */

export function renderRecords({ records, settings, re, editingId, handlers }) {
  const body = $('#records-body');
  body.replaceChildren();
  $('#empty').hidden = records.length > 0;

  for (const r of records) {
    const tr = document.createElement('tr');
    tr.dataset.id = r.id;

    if (r.id === editingId) {
      tr.innerHTML = `
        <td data-label="Date"><label class="sr-only" for="ed-date">Date</label><input id="ed-date" type="text" value="${attr(r.date)}" aria-describedby="ed-err"></td>
        <td data-label="Description"><label class="sr-only" for="ed-desc">Description</label><input id="ed-desc" type="text" value="${attr(r.description)}"></td>
        <td data-label="Category"><label class="sr-only" for="ed-cat">Category</label><input id="ed-cat" type="text" value="${attr(r.category)}"></td>
        <td data-label="Amount" class="num"><label class="sr-only" for="ed-amt">Amount</label><input id="ed-amt" type="text" inputmode="decimal" value="${attr(String(r.amount))}"></td>
        <td class="row-actions">
          <button type="button" class="btn btn-small" data-act="save">Save</button>
          <button type="button" class="btn btn-small btn-ghost" data-act="cancel">Cancel</button>
          <span id="ed-err" class="error" role="alert"></span>
        </td>`;
    } else {
      tr.innerHTML = `
        <td data-label="Date">${highlight(r.date, re)}</td>
        <td data-label="Description">${highlight(r.description, re)}</td>
        <td data-label="Category">${highlight(r.category, re)}</td>
        <td data-label="Amount" class="num">${highlight(r.amount.toFixed(2), re)}${settings.displayCurrency !== settings.currencies[0].code ? `<br><small class="muted">${formatMoney(r.amount, settings)}</small>` : ''}</td>
        <td class="row-actions">
          <button type="button" class="btn btn-small btn-ghost" data-act="edit" aria-label="Edit ${attr(r.description)}">Edit</button>
          <button type="button" class="btn btn-small btn-danger" data-act="delete" aria-label="Delete ${attr(r.description)}">Delete</button>
        </td>`;
    }
    body.append(tr);
  }

  body.onclick = (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = btn.closest('tr').dataset.id;
    handlers[btn.dataset.act]?.(id);
  };
}

function attr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function updateSortIndicators(field, dir) {
  document.querySelectorAll('#records-table th[aria-sort]').forEach((th) => {
    const f = th.querySelector('[data-sort]')?.dataset.sort;
    th.setAttribute('aria-sort', f === field ? (dir === 'asc' ? 'ascending' : 'descending') : 'none');
  });
}

/* ---------- Dashboard ---------- */

export function renderDashboard(records, settings) {
  $('#stat-count').textContent = String(records.length);
  const total = sum(records);
  $('#stat-sum').textContent = formatMoney(total, settings);
  const top = topCategory(records);
  $('#stat-top').textContent = top ? top.category : '–';

  // Cap
  const base = settings.currencies[0].code;
  const cs = capStatus(total, Number(settings.cap));
  const polite = $('#cap-polite');
  const assertive = $('#cap-assertive');
  const fill = $('#cap-fill');
  const label = $('#cap-meter-label');
  if (!cs.enabled) {
    label.textContent = 'No cap set. Add one in Settings.';
    fill.style.width = '0%';
    fill.classList.remove('over');
    polite.textContent = '';
    assertive.textContent = '';
  } else {
    label.textContent = `Cap: ${formatMoney(Number(settings.cap), settings)} (stored in ${base})`;
    fill.style.width = `${cs.pct}%`;
    fill.classList.toggle('over', cs.over);
    if (cs.over) {
      polite.textContent = '';
      assertive.textContent = `Over budget by ${formatMoney(Math.abs(cs.remaining), settings)}.`;
    } else {
      assertive.textContent = '';
      polite.textContent = `${formatMoney(cs.remaining, settings)} remaining under your cap.`;
    }
  }

  renderTrend(records, settings);
}

function renderTrend(records, settings) {
  const days = last7Days(records, localISODate());
  const max = Math.max(...days.map((d) => d.total), 0);
  const trend = $('#trend');
  trend.replaceChildren();
  const tbody = $('#trend-table tbody');
  tbody.replaceChildren();

  for (const d of days) {
    const col = document.createElement('div');
    col.className = 'bar-col';
    const val = document.createElement('span');
    val.className = 'bar-val';
    val.textContent = d.total ? convert(d.total, settings).toFixed(0) : '';
    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.height = '0px';
    const lbl = document.createElement('span');
    lbl.className = 'bar-lbl';
    lbl.textContent = d.date.slice(5);
    col.append(val, bar, lbl);
    trend.append(col);
    // animate to height next frame
    requestAnimationFrame(() => { bar.style.height = max ? `${Math.max(2, (d.total / max) * 100)}px` : '2px'; });

    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${d.date}</td><td>${formatMoney(d.total, settings)}</td>`;
    tbody.append(tr);
  }
}

/* ---------- Settings / form helpers ---------- */

export function renderSettingsForm(settings) {
  const [c0, c1, c2] = settings.currencies;
  $('#s-cap').value = settings.cap ? String(settings.cap) : '0';
  $('#c0-code').value = c0.code;
  $('#c1-code').value = c1.code;
  $('#c1-rate').value = String(c1.rate);
  $('#c2-code').value = c2.code;
  $('#c2-rate').value = String(c2.rate);
  $('#s-cats').value = settings.categories.join(', ');
  const sel = $('#s-display');
  sel.replaceChildren(...settings.currencies.map((c) => new Option(c.code, c.code, false, c.code === settings.displayCurrency)));
  document.querySelectorAll('.base-code').forEach((el) => { el.textContent = c0.code; });
  $('#cat-list').replaceChildren(...settings.categories.map((c) => new Option(c)));
}

export function confirmDelete(rec) {
  const dlg = $('#confirm-dialog');
  $('#confirm-text').textContent = `"${rec.description}" (${rec.amount.toFixed(2)}) will be removed.`;
  return new Promise((resolve) => {
    dlg.addEventListener('close', () => resolve(dlg.returnValue === 'ok'), { once: true });
    dlg.returnValue = 'cancel';
    dlg.showModal();
  });
}

export function download(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** RFC 4180-style escaping. */
export function toCSV(records) {
  const esc = (v) => {
    const s = String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ['id', 'description', 'amount', 'category', 'date', 'createdAt', 'updatedAt'];
  return [head.join(','), ...records.map((r) => head.map((k) => esc(r[k])).join(','))].join('\r\n');
}

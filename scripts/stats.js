// stats.js — pure functions: no DOM access, easy to test.

export function rateFor(settings, code) {
  const c = settings.currencies.find((x) => x.code === code);
  return c ? Number(c.rate) || 1 : 1;
}

/** Records are stored in the base currency; convert for display. */
export function convert(amountBase, settings) {
  return amountBase * rateFor(settings, settings.displayCurrency);
}

export function formatMoney(amountBase, settings) {
  const v = convert(amountBase, settings);
  return `${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${settings.displayCurrency}`;
}

export function localISODate(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function sum(records) {
  // work in cents to avoid float drift
  return records.reduce((acc, r) => acc + Math.round(r.amount * 100), 0) / 100;
}

export function topCategory(records) {
  const totals = new Map();
  for (const r of records) totals.set(r.category, (totals.get(r.category) || 0) + r.amount);
  let best = null;
  for (const [cat, t] of totals) if (!best || t > best.total) best = { category: cat, total: t };
  return best;
}

/** Spending per day for the 7 days ending on `todayISO` (inclusive). */
export function last7Days(records, todayISO = localISODate()) {
  const [y, m, d] = todayISO.split('-').map(Number);
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(y, m - 1, d - i);
    days.push({ date: localISODate(dt), total: 0 });
  }
  const idx = new Map(days.map((x, i) => [x.date, i]));
  for (const r of records) {
    if (idx.has(r.date)) days[idx.get(r.date)].total += r.amount;
  }
  days.forEach((x) => { x.total = Math.round(x.total * 100) / 100; });
  return days;
}

/** cap is in base currency. cap <= 0 means disabled. */
export function capStatus(totalBase, cap) {
  if (!(cap > 0)) return { enabled: false };
  const remaining = Math.round((cap - totalBase) * 100) / 100;
  return { enabled: true, over: remaining < 0, remaining, pct: Math.min(100, (totalBase / cap) * 100) };
}

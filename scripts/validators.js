// validators.js — all regex rules live here so they can be tested and documented in one place.

export const RULES = {
  // No leading/trailing whitespace.
  description: /^\S(?:.*\S)?$/,
  // 0 or a non-zero-leading integer, optional 1–2 decimals.
  amount: /^(0|[1-9]\d*)(\.\d{1,2})?$/,
  // YYYY-MM-DD with month 01–12 and day 01–31 (real-calendar check done separately).
  date: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  // Letters, with single spaces or hyphens between words.
  category: /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/,
  // ADVANCED (back-reference): the same word twice in a row.
  duplicateWord: /\b(\w+)\s+\1\b/i,
  // ADVANCED (lookahead): rate with 2+ decimals precision, e.g. 0.0012 — at least one digit after the dot.
  rate: /^(?=.*[1-9])(0|[1-9]\d*)(\.\d{1,6})?$/,
  // Collapse check: two or more consecutive spaces.
  doubleSpace: /\s{2,}/,
};

export function isRealDate(str) {
  if (!RULES.date.test(str)) return false;
  const [y, m, d] = str.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Each validator returns '' when valid, otherwise a human-readable error. */
export function validateDescription(v) {
  if (!v) return 'Description is required.';
  if (!RULES.description.test(v)) return 'Remove leading or trailing spaces.';
  if (RULES.doubleSpace.test(v)) return 'Use single spaces between words.';
  const dup = v.match(RULES.duplicateWord);
  if (dup) return `Repeated word detected: "${dup[1]}". Please check for a typo.`;
  return '';
}

export function validateAmount(v) {
  if (v === '' || v == null) return 'Amount is required.';
  if (!RULES.amount.test(String(v))) return 'Use digits with up to 2 decimals (e.g. 12.50). No leading zeros.';
  return '';
}

export function validateDate(v) {
  if (!v) return 'Date is required.';
  if (!RULES.date.test(v)) return 'Use the format YYYY-MM-DD.';
  if (!isRealDate(v)) return 'That date does not exist on the calendar.';
  return '';
}

export function validateCategory(v) {
  if (!v) return 'Category is required.';
  if (!RULES.category.test(v)) return 'Letters, spaces and hyphens only.';
  return '';
}

export function validateRate(v) {
  if (v === '' || v == null) return 'Rate is required.';
  if (!RULES.rate.test(String(v))) return 'Enter a positive number (up to 6 decimals).';
  return '';
}

/** Validate a whole record object (used by the form and by JSON import). */
export function validateRecord(r) {
  if (!r || typeof r !== 'object') return 'Record is not an object.';
  if (typeof r.id !== 'string' || !r.id) return 'Missing id.';
  if (typeof r.description !== 'string') return 'Missing description.';
  const checks = [
    validateDescription(r.description).replace(/^Repeated word.*$/, ''), // duplicate words are a warning, not a hard import error
    validateAmount(r.amount),
    validateDate(r.date),
    validateCategory(r.category),
  ].filter(Boolean);
  if (checks.length) return checks[0];
  if (typeof r.createdAt !== 'string' || typeof r.updatedAt !== 'string') return 'Missing timestamps.';
  return '';
}

// search.js — safe regex compilation and accessible highlighting.

export function compileRegex(input, flags = 'i') {
  try {
    return input ? new RegExp(input, flags) : null;
  } catch {
    return null;
  }
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * Highlight matches with <mark>. Text is escaped first and matches are
 * wrapped piecewise so user content can never inject HTML.
 */
export function highlight(text, re) {
  const str = String(text);
  if (!re) return escapeHtml(str);
  const g = re.global ? re : new RegExp(re.source, re.flags + 'g');
  let out = '';
  let last = 0;
  let guard = 0;
  for (const m of str.matchAll(g)) {
    if (m[0] === '') { if (++guard > 1000) break; continue; } // skip zero-length matches
    out += escapeHtml(str.slice(last, m.index)) + '<mark>' + escapeHtml(m[0]) + '</mark>';
    last = m.index + m[0].length;
  }
  return out + escapeHtml(str.slice(last));
}

/** A record matches when the regex hits its description, category, date or amount. */
export function recordMatches(rec, re) {
  if (!re) return true;
  return [rec.description, rec.category, rec.date, String(rec.amount)].some((f) => {
    re.lastIndex = 0;
    return re.test(f);
  });
}

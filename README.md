# Student Finance Tracker

**Theme:** Student Finance Tracker (budgets, transactions, regex search)
**Live site (GitHub Pages):** https://YOUR-USERNAME.github.io/finance-tracker**

An accessible, responsive, framework-free app built with vanilla HTML, CSS and JavaScript (ES modules).

## Features

- Pages: Dashboard, Records, Add transaction, Settings, About (hash-routed, one visible at a time)
- Add / inline-edit / delete (with confirmation dialog); `updatedAt` refreshed on edit
- Regex validation on every form field (6 rules, 2 advanced)
- Live regex search with case-insensitive toggle, safe compiler (try/catch) and `<mark>` highlighting
- Sort by date, description (A–Z) or amount, via header buttons or the Sort controls
- Dashboard: total records, total spent, top category, last-7-days bar chart, spending cap meter
- Cap messages: `aria-live="polite"` while under the cap, `role="alert"` (assertive) when exceeded
- Currencies: base + 2 others with manual rates; display currency switch
- localStorage auto-save; JSON import (validated) and export; CSV export (RFC 4180 escaping)
- Light/dark theme toggle (persisted)
- Table becomes cards below 768px

## Regex catalog

| Purpose | Pattern | Matches | Rejects |
|---|---|---|---|
| Description (no edge spaces) | `/^\S(?:.*\S)?$/` | `Lunch at cafeteria` | ` Lunch`, `Lunch ` |
| Collapse doubles | `/\s{2,}/` (flagged) | – | `Lunch  at` |
| Amount | `/^(0\|[1-9]\d*)(\.\d{1,2})?$/` | `0`, `12`, `12.50` | `01`, `1.234`, `-5` |
| Date | `/^\d{4}-(0[1-9]\|1[0-2])-(0[1-9]\|[12]\d\|3[01])$/` | `2026-10-12` | `2026-13-01`, `2026-4-1` |
| Real calendar date | pattern above + `Date.UTC` round-trip | `2024-02-29` | `2025-02-29` |
| Category | `/^[A-Za-z]+(?:[ -][A-Za-z]+)*$/` | `Part-time work` | `Food2`, `Food--Drink` |
| **Advanced: back-reference** | `/\b(\w+)\s+\1\b/i` | `tea tea` | `tea and coffee` |
| **Advanced: lookahead** (currency rate) | `/^(?=.*[1-9])(0\|[1-9]\d*)(\.\d{1,6})?$/` | `0.92`, `1450` | `0`, `0.000` |

### Handy search patterns

| Pattern | Finds |
|---|---|
| `\.\d{2}\b` | amounts with cents |
| `(coffee\|tea)` | beverage keywords |
| `\b(\w+)\s+\1\b` | duplicated words |
| `^Lab` | descriptions starting with "Lab" |
| `^2026-10` | October 2026 |

Search runs against description, category, date and amount. Invalid patterns show a message instead of throwing.

## Keyboard map

| Key | Action |
|---|---|
| `Tab` / `Shift+Tab` | Move between controls |
| `Enter` on the first Tab stop | "Skip to main content" |
| `Enter` / `Space` | Activate links, buttons, column sort |
| `Esc` | Close the delete confirmation dialog (cancels) |
| Arrow keys | Change select values (sort, display currency) |

After navigating to a page the page heading receives focus, so screen-reader users hear where they are.

## Accessibility notes

- Landmarks: header, nav, main, footer; one `h1` per view
- All inputs have bound `<label>`s; errors are linked with `aria-describedby` and `aria-invalid`
- Live regions: global `role="status"`, search result count, cap messages (polite/assertive), import result
- Visible 3px focus ring; skip link; 44px touch targets
- Native `<dialog>` for delete confirmation (focus trapped, returns focus on close)
- Trend chart has a visually hidden data table equivalent
- `prefers-reduced-motion` disables animations
- Colours chosen for WCAG AA contrast in both themes (verify with your own audit)

## Data model

```json
{ "id": "txn_0001", "description": "Lunch at cafeteria", "amount": 12.5,
  "category": "Food", "date": "2026-10-11",
  "createdAt": "2026-10-11T12:30:00.000Z", "updatedAt": "2026-10-11T12:30:00.000Z" }
```

Amounts are stored in the base currency; other currencies are display-only conversions.

## Running

ES modules and `fetch('seed.json')` need a web server (opening `index.html` via `file://` will not work):

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Running tests

Open `http://localhost:8000/tests.html`. It runs assertions for validators, search/highlight, stats and import validation, and shows pass/fail counts.

## Structure

```
index.html
tests.html
seed.json
styles/main.css
scripts/{main,state,storage,ui,validators,search,stats}.js
```

## Deploying to GitHub Pages

Push to a public repo → Settings → Pages → Deploy from branch `main` / root. Put the resulting URL at the top of this file.

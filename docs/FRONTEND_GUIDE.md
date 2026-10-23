# LifeOrbit frontend team guide

**Read this before building a page.** Three contributors should produce one coherent product.

## Run the demo

The app intentionally has **no build dependencies**. It uses native ES modules,
so do not open index.html with a file:// URL.

From the repository root, run:

```bash
python3 -m http.server 8000
```

Open http://localhost:8000 and navigate with the sidebar. Python 3 is required.
No backend, real login, sync or hosted preview has been configured.

## Structure

```text
index.html                  Entry point
src/styles.css              Design tokens, responsive styles and primitives
src/main.js                 SINGLE shared shell, sidebar, account and theme controls
src/state.js                Local demo state / persistence (not production auth)
src/icons.js                Shared outline icon set
src/pages/login.js          Demo login
src/pages/dashboard.js      Overview
src/pages/notes.js          Notes
src/pages/tasks.js          Planner
src/pages/calendar.js       Monthly calendar
src/pages/subscriptions.js  Manual recurring plans
src/pages/challenges.js     Challenges
src/pages/settings.js       Account and appearance
```

Every page exports `render()` returning HTML, and optionally `mount(refresh)`
to attach event listeners after rendering. Use only state functions from
`src/state.js`; always escape user-supplied strings using `escapeHTML`.
Do not insert untrusted input as raw markup.

## Non-negotiable UI rules

- One sidebar, one topbar, one theme implementation: **src/main.js**.
- No per-page navbar, duplicate layout or one-off colours.
- Use the CSS variables in `src/styles.css`: `--bg`, `--surface`,
  `--text`, `--muted`, `--line`, `--accent`, `--accent-soft`.
- Light palette: warm off-white #f7f8f6, white #ffffff, ink #24312e,
  muted #78817c, subtle border #e6ebe6, evergreen #397f6a.
- Dark palette: forest charcoal #151b19, surface #1d2522, text #ebf1ec,
  border #334139, mint accent #8fd5b4.
- Corners typically 10–16px; restrained borders/shadows; no glowing gradients,
  glassmorphism, neon, floating decorations, excessive emoji or oversized hero art.
- Use consistent outline icons via `icon()` from `src/icons.js`.
- Keep spacing, typography, field and card styles consistent.
- Focus states, readable contrast and reduced-motion are mandatory.
- Every view supports desktop and mobile, including empty and error states.

## Contributor ownership suggestion

- Contributor A: Notes and Tasks (`src/pages/notes.js`, `tasks.js`)
- Contributor B: Calendar and subscriptions (`calendar.js`, `subscriptions.js`)
- Contributor C: Dashboard, challenges and accounts (`dashboard.js`,
  `challenges.js`, `settings.js`)

Agree on changes to **shared files** (`src/main.js`, `src/styles.css`,
`src/state.js`, `src/icons.js`) before editing. Use small PRs, review each
other's changes and update `CHANGELOG.md` on every user-visible change.

## Current boundaries

This is a **frontend prototype**. Display names are not accounts. Data lives
in the browser's localStorage, is not private against other users of the same
browser profile, and is not synced or backed up. No production personal data,
banking credentials or secrets should be entered.

Next architecture decision: agree on a real application framework and backend
before implementing authentication, collaboration, reminders or AI.

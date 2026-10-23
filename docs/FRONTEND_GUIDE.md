# LifeOrbit frontend guide

This guide is the shared agreement for all three contributors.

## Run the demo

LifeOrbit currently uses **standard HTML, CSS and JavaScript modules**.
No npm dependencies, build step, database or backend is required.

From the repository root, run:

```bash
python3 -m http.server 8000
```

Open http://localhost:8000/ in a browser. Python 3 is the only requirement
for this command. Do **not** open index.html via file:// because ES modules
may be blocked by browser security settings.

All changes are live after reloading the page. Data is persisted with
localStorage under `lifeorbit:` keys in the current browser only.

## Project structure

```text
index.html
assets/icon.svg               Brand icon
src/
  main.js                     One shared sidebar, header, theme and router
  styles.css                  Single source of truth for design tokens
  lib.js                      HTML escaping, reusable helpers/icons
  data.js                     Demo-only persistence and example records
  pages/
    login.js                  Visual sign-in placeholder (no authentication)
    dashboard.js              Summary of all demo sections
    notes.js                  Note CRUD
    tasks.js                  Open/completed tasks
    calendar.js               Events; day/week/month views later
    subscriptions.js          Manual subscriptions
    challenges.js             Local challenge progress
    account.js                Demo profile and reset
docs/FRONTEND_GUIDE.md         This guide
CHANGELOG.md                  Every meaningful change
```

## Ownership across three developers

Suggested division to minimise merge conflicts:

- **Developer A:** Dashboard, notes and planner.
- **Developer B:** Calendar, subscription tracking and reminders.
- **Developer C:** Challenges, account experience and future authentication.

Agree on owners in issues before starting. **Only one person should modify
`src/main.js`, `src/styles.css`, `src/lib.js` or `src/data.js` at a time.**
Cross-cutting changes require team review. Everyone imports the shared shell.
Never recreate a sidebar or theme switch inside individual pages.

## Adding a page

1. Create `src/pages/example.js` exporting a `render()` function.
2. Optionally export `mount(root)` to register event handlers after render.
3. Import the module into `src/main.js` and add a route and sidebar link.
4. Use shared classes such as `.panel`, `.page-header`, `.button` and
   `.stack-form` before adding new CSS.
5. Write a one-line comment at the top explaining the page responsibility.
6. Add a changelog entry in `CHANGELOG.md` under Unreleased.
7. Test desktop, mobile, both themes, keyboard and the browser console.

`render()` returns markup. Use `escapeHtml()` on any user-controlled text;
use `mount(root)` for interactions and never add inline JavaScript handlers.
Data changes through `write/insert/update/remove` automatically trigger a
shared rerender.

## Design contract

| Token | Light | Dark |
| --- | --- | --- |
| Canvas | `#f8f9f7` | `#141a18` |
| Surface | `#ffffff` | `#1d2521` |
| Primary text | `#202924` | `#edf2ed` |
| Secondary text | `#7b8580` | `#9baa9f` |
| Border | `#e5eae5` | `#303d34` |
| Accent | `#3e8068` | `#83c4a3` |

- Corner radius: 15px cards, 10px controls.
- Layout: 252px shared sidebar, 77px header, 22px grid gaps.
- Type: system sans, measured hierarchy, short labels.
- Shadows: very subtle. No gradient backgrounds, glassmorphism, glowing
  blobs, random bright colours or ornamental animations.
- Hover: subtle background shifts and at most 2px movement.
- Dark mode is token-driven via `data-theme` on the root element.
- Support keyboard focus, accessible labels and reduced motion.
- Only shared design tokens in `src/styles.css` control app colours.

## Demo limitations and security

This demo is **not a real login service**. The account name/email are just
local preferences. There is no password handling, authentication,
authorisation, backend persistence, notification delivery or sync. Do not
enter sensitive personal data or claim that it is privately stored online.

Before production: choose a backend, protect every user-scoped API,
create data migrations and tests, implement real sessions and storage,
validate input server-side, secure uploaded images, and verify privacy.

## Definition of done

A new page must have its own module, use the shared layout/tokens, work
in both themes and on small screens, handle empty states, protect rendered
user text, and include a meaningful Unreleased changelog entry.

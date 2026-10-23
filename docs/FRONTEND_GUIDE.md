# LifeOrbit frontend team guide

Three developers, one shared React UI.

## Start

Install Node.js 20.19+ or 22.12+ and npm, then:

```bash
npm ci
npm run dev
```

Check types with `npm run typecheck`, build with `npm run build`.
Do not use the old `python3 -m http.server` command: React uses Vite.

## Files

- `src/react/components/Layout.tsx` is the **only** sidebar, header,
  account shortcut and theme toggle.
- `src/react/components/UI.tsx` contains shared heading/card/empty components.
- `src/react/pages/*.tsx` contains **one page per feature**.
- `src/react/types.ts` contains shared domain types.
- `src/react/context/AppContext.tsx` owns shared demo state.
- `src/react/data/storage.ts` persists browser-local demo data.
- `src/react/data/api.ts` is the future Python HTTP integration point.
- `src/styles.css` owns global design tokens and primitives.

## Design contract

Light: background #f7f8f6, surface #ffffff, ink #24312e,
evergreen #397f6a, border #e6ebe6.
Dark: background #151b19, surface #1d2522, ink #ebf1ec,
mint #8fd5b4, border #334139.

Use CSS variables exclusively, 10–16px rounded corners, subtle border
and hover animation. Avoid glassmorphism, gradients, neon, complex card
shadows or decorative clutter. Accessibility, keyboard focus, mobile
layout and reduced-motion matter. Never duplicate the navigation.

## Suggested ownership

- Developer A: Notes + Planner.
- Developer B: Calendar + Subscriptions.
- Developer C: Dashboard + Challenges + Account.

Agree changes to layout, state, types or CSS with the other two first.

## Page pattern

```tsx
// Owner: your feature. Implement feature logic here only.
import { Heading, Card } from "../components/UI";

export default function Example() {
  return (
    <>
      <Heading eyebrow="Category" title="Example" description="Helpful subtitle." />
      <div className="grid">
        <Card title="Feature" span={6}>Your content</Card>
      </div>
    </>
  );
}
```

## Python boundary

The demo uses localStorage, NOT real authentication, syncing or a database.
When a Python backend is ready, add typed service functions in
`src/react/data/api.ts` and progressively migrate data operations.
See [React architecture](REACT_ARCHITECTURE.md).

## Change discipline

Open separate PRs, run typecheck/build, update `CHANGELOG.md` for each
user-facing change, and follow the PR checklist.

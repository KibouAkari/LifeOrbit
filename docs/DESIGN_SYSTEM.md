# Frontend, interaction and visual standards

## Code ownership and boundaries

| File | Responsibility |
| --- | --- |
| `src/react/App.tsx` | Route selection, authentication state and page shell |
| `src/react/components/Layout.tsx` | Shared navigation, header, notifications, theme toggle |
| `src/react/components/UI.tsx` | Reusable UI primitives |
| `src/react/pages/` | Dashboard, tasks, calendar, notes, challenges, settings and sign-in pages |
| `src/react/context/AppContext.tsx` | Account workspace state, updates and hydration |
| `src/react/data/api.ts` | Same-origin HTTP requests and session handling |
| `src/react/services/realtime.ts` | Optional hosted realtime client configuration |
| `src/react/components/NativeSharedNotebooks.tsx` | Native autosave and Yjs HTTP synchronization in PR #73 |
| `src/react/components/LiveSharedNotebooks.tsx` | Liveblocks/Yjs collaborative editor, feature-flagged |
| `src/styles.css` | CSS variables, themes, responsive layout and component styling |

Do not duplicate navigation or treat local React state as a security boundary. The FastAPI backend must enforce authorization independently.

## Visual language

LifeOrbit uses a quiet, legible interface and a simple orbital planet icon. The **current** implementation's CSS tokens in `src/styles.css` are authoritative; earlier speculative palette documents are retired.

Core light theme: canvas `#F8F8FA`, surface `#FFFFFF`, primary text `#202127`, muted `#777984`, accent `#7263D5`.
Dark theme: canvas `#18191C`, surface `#24252A`, text `#F4F3F8`, accent `#B7AFFF`.

Keep pages consistent in typography, spacing, controls, error states and loading feedback. Prefer functional clarity over purely decorative effects.

## Interaction and accessibility

- Test at narrow mobile widths and wide desktop viewports, as well as keyboard-only navigation and screen readers.
- Label every form field, including icon-only buttons. Indicate status without relying on color alone.
- Use visible focus indicators and respect `prefers-reduced-motion`; animations should clarify changes, not distract.
- Personal workspace updates and concurrent notebook edits must show whether content is saving, saved or blocked.
- Avoid displaying cached private notebook content when a fresh access check fails.
- Calendar interactions need mouse, touch, Firefox and Chromium regression tests. Use accessible explicit edit actions alongside drag gestures.
- Treat private calendar links, account names and notes as sensitive. Use synthetic content for screenshots.

## Development

Run `npm run typecheck` and `npm run build` before review. See [Contributing](../CONTRIBUTING.md) and [Architecture](ARCHITECTURE.md) for backend contracts. Use new components only when necessary and keep layout and shared domain types centralized.

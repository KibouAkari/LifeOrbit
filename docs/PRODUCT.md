# LifeOrbit product scope

## Purpose

LifeOrbit helps people organize everyday commitments without switching between separate planners for notes, events, tasks, subscriptions and personal goals. Collaboration should be intentional and understandable; productivity should never depend on public competition or surveillance.

## Users and design principles

The initial audience is individuals and small groups who want a private, mobile-friendly personal organizer.

- Privacy by default: tasks, notes, calendars and settings are user-owned.
- Explicit collaboration: only accepted friends with a specific invitation can edit shared notebooks.
- Clear feedback: autosave indicates whether a write is pending, confirmed or unavailable.
- Accessibility: keyboard navigation, visible focus, readable contrast and reduced-motion support.
- Predictable progress: community leaderboard visibility requires an affirmative opt-in; accepted friends have a separate private comparison scope.
- Portability: data export exists; account deletion and full collaborative-document export still require work.

## What exists

Dashboard, tasks, editable calendar, manual iCalendar imports/subscriptions, notes, shared notebooks, friend requests, notifications, subscriptions, challenges and authenticated profiles are implemented in the codebase.

The autosave, account recovery and private friends-ranking implementation from [PR #73](https://github.com/KibouAkari/LifeOrbit/pull/73) was merged into main. Native Yjs syncing does not require a hosted realtime provider; it uses HTTP polling. Password recovery still requires verified Resend delivery. [PR #74](https://github.com/KibouAkari/LifeOrbit/pull/74) proposes a one-time welcome email using the same sender for newly created accounts. Merged code is not proof of real-world end-to-end verification.

## Not implemented or not verified

- True websocket collaboration without separately configured and tested Liveblocks.
- Background calendar synchronization and calendar provider account permissions.
- Guaranteed notifications while the application is closed.
- Rich-text collaborative editing, images and complete offline editing.
- Secure email address changes, account deletion, selective per-device session management and independently tested recovery.
- A complete globally ranked anti-cheat scoring system. Challenge scores are user-reported.

For detailed feature contracts see [Social and calendar](SOCIAL_AND_CALENDAR.md). For current delivery priorities see [Roadmap](ROADMAP.md).

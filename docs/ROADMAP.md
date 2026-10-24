# LifeOrbit roadmap

> Historical hackathon plan. The original MVP priorities below are retained as planning context. For implemented functionality, see the [README](../README.md); for incomplete or blocked areas, use the status section below.

## MVP · seven priorities

The team has identified seven core implementation blocks:

| Priority | Area | MVP acceptance criteria |
| --- | --- | --- |
| P0 | Notes | Create, view, edit and delete multiple notes with text; support images if capacity allows. |
| P0 | Calendar | Create and view events in a clean monthly interface; day/week views can be iterated. |
| P0 | Task planner | Create tasks, mark complete and clearly distinguish open from completed items. |
| P0 | Dashboard | Show an at-a-glance view of upcoming events, open tasks, recent notes and challenges. |
| P1 | Notifications / Focus | Basic in-app reminders and an optional distraction-reduced focus view. |
| P1 | Challenges / Leaderboard | Daily, weekly and monthly challenges with points; leaderboard only for consenting participants. |
| P1 | Subscription overview | Manually track active subscriptions, amount, currency and renewal cadence. |

## Foundation

- Friendly login and account experience, private user data and sign-out.
- Reusable layout, navigation, forms and mobile-friendly components.
- Accessible states for empty/loading/error/success.
- Validation, safe defaults and timezone-aware dates.
- Changelog updates on every user-visible change.

## Stretch goals · seven optional blocks

Only begin these after the MVP works end-to-end:

1. External calendar synchronization.
2. AI life manager / assistant, with explicit user control.
3. Automated daily and weekly plans.
4. Additional animations, hover effects and page transitions.
5. Automated alarm manager.
6. Customisable dashboard, appearance and preferences.
7. Multiuser shared planning and collaboration.

## Suggested build sequence

1. App shell, login, navigation and data model.
2. Notes and tasks, including persistence.
3. Calendar and day/week/month views.
4. Dashboard connecting data from existing features.
5. Subscriptions, reminders and focus mode.
6. Challenges, points and optional leaderboard.
7. Polish, mobile, accessibility, testing and demo.
8. Only then stretch goals.

## Definition of done

A feature is done only when it works with real persisted data, is usable
on mobile, handles errors and empty states, respects account permissions,
and has its changelog entry and basic validation documented.

This roadmap is a team proposal, not a promise or shipped feature list.


## Current status (October 2026)

Implemented foundations include authenticated account workspaces, dashboard, task deadlines, calendar views and iCal feed imports, chapter-based notes, shared notebooks, subscriptions, challenge selection, friends and event invitations. Calendar providers are not connected by two-way OAuth synchronization, and notification delivery is currently foreground-only. Editing collaboration is polling-based without conflict-free multi-user writes.

### Priority follow-ups

- Complete two-account authorization and cross-browser interaction tests.
- Improve password recovery, email verification, session revocation, account deletion and rate limiting.
- Implement safe database concurrency/version checks for shared notebooks and multi-device settings.
- Add automatic calendar feed scheduling and robust timezone/recurrence handling.
- Introduce real background push only with explicit permission and reliable server scheduling.
- Capture new, genuine, privacy-safe screenshots for the README.

# Product refinement and minimal design directions

Status: design proposals only, not a claim that the application interface has changed. Captured baseline screenshots are in [README](../README.md).

## Product principles

1. **One clear action** per screen. Prefer plain language and useful defaults over multiple nested controls.
2. **Data privacy by default.** Show sharing, retention and public ranking clearly without silently changing permissions.
3. **Fast, reversible interactions.** Provide immediate save feedback, usable keyboard focus and undo for non-destructive changes.
4. **Work well without motion or images.** Honor reduced-motion and light/dark preferences and meet WCAG AA contrast.
5. **Clarity before novelty.** Do not add gradients, glossy cards, fake statistics, animations or decorative icons without a specific purpose.

## Login design directions

### A. Calm centered form (recommended)

A single, centered 440 px form on a warm light-neutral background. Show the original blue LifeOrbit planet (no rebranding), LifeOrbit wordmark, a simple **Welcome back** heading, email and password fields, one strong primary button, a small Google option separated by **or**, and a modest password-reset link. An unobtrusive **Create account** option sits under the form. No split panel, oversized slogan or feature carousel. Keep the form fully above the fold on laptops and mobile.

Light: canvas `#F8F8FA`, surface `#FFFFFF`, text `#29273A`, muted `#606071`, purple accent `#6254BC`; 8–12 px corner radii, consistent 48 px inputs, visible focus ring. Dark uses accessible deep plum-neutral colors.

### B. Quiet two-column editorial

Retain the current split layout, but reduce the left slogan to **Your days, simply organised.** and a single short supporting sentence. Shift the left column to a subtly tinted solid surface. The form on the right gets stronger label contrast, more whitespace, a simpler one-step sign-in experience and no unnecessary extra click to reveal email fields. The logo appears once per viewport. Best if keeping continuity with the existing visual identity is more important than maximum simplicity.

### C. Compact utility

A narrower 400 px email/password form with the logo and a single heading. Place sign-in and registration on separate routes, each with a small cross-link. Google login is secondary. This is most information-dense and distraction-free, but feels less welcoming on the first visit.

## Transactional email design directions

### A. Personal letter (recommended)

A narrow 520 px white message with a 36–44 px blue planet, black text wordmark, one personal salutation, two short paragraphs, one purple button and a quiet reason-for-receipt footer. Plain-text version mirrors the HTML exactly. Avoid badges, feature grids, repeating brand slogans, oversized gradients and excessive tracking. The existing welcome email PR is moving in this direction.

### B. Almost plain text

Brand wordmark without illustrations; one paragraph, one underlined link rather than a filled button, then a closing signature and help address. Excellent for account security and password recovery messages. This removes image dependencies altogether.

### C. Soft product card

Thin 1 px border around the message, neutral background, small header and one compact context panel such as an invitation or event summary. Reserve this for messages requiring structured information, not for welcomes.

## Recommended type scale and behavior

* Screen heading 28–32 px on desktop, 24 px on mobile; body 15–16 px; minimum 14 px for interactive labels.
* Use one accent tone for primary actions only; use neutral surfaces and 1 px separators for grouping.
* Keep every sign-in state keyboard navigable with clearly associated labels, visible errors and focus, autofill and password-manager support.
* Do not hide required fields behind animations; any progressive disclosure should preserve Google sign-in and email paths.
* For all emails, test dark mode rendering, alt text, sender and reply-to, accessible link text and authentic SPF/DKIM/DMARC status.

## Product improvements beyond mail and login

| Priority | Improvement | Why it matters |
| --- | --- | --- |
| P0 | Native shared-notebook two-user concurrency and revocation end-to-end tests | Avoid lost edits and unauthorized access |
| P0 | Reliable retention scheduler, account deletion and external provider/backup cleanup | Privacy guarantees must match actual system behavior |
| P0 | Revision-aware workspace persistence | Avoid cross-device overwrite of notes and settings |
| P1 | Account email verification and step-up authentication for account deletion | Prevent account takeover and unauthorized deletion |
| P1 | Unified quick-add for task, event and note | Make daily capture faster without clutter |
| P1 | Global search across notes, tasks and events with indexed server-side authorization | Find information quickly |
| P1 | Recurring tasks and timezone-aware recurring events | Support practical daily planning |
| P1 | Calendar and task undo/restore window (without compromising scheduled retention) | Recover from accidental user actions |
| P1 | Offline drafts and explicit sync/conflict status | Increase reliability during short outages |
| P2 | Keyboard shortcuts and a command palette | Faster interaction for frequent users |
| P2 | Optional weekly digest, disabled by default | Useful without notification overload |
| P2 | Read-only calendar feed auto-refresh with conservative quotas | Reduce manual work |
| P2 | Accessible mobile refinements, screen-reader tests and performance budgets | Simple experience on every device |
| P2 | Notification preferences for invitations, comments and reminders | Reduce unnecessary interruptions |

Avoid introducing AI assistants, public leaderboards, badges, social feeds or extra navigation as default features unless they solve a validated usability problem. Each new feature should preserve the current privacy-first core.

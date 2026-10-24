# Reproducible LifeOrbit demonstration

**Purpose:** Demonstrate a working prototype and the **prototype developed from the initial hackathon idea**. Do not expose personal or employer data.

## Preparation

- Use two dedicated, non-personal demonstration accounts, named for their roles (organizer and invitee).
- Seed only invented appointments, notes and tasks.
- Confirm test users can log in, access MongoDB and refresh the same-origin API.
- Pre-check a real permitted public .ics fixture for calendar tests.
- Have a screen recording or screenshots from the actual build as a connectivity backup.
- Keep the initial Miro planning board, first commits and final code history ready to show the development sequence.
- Avoid live environment-secret screens and private calendar URLs.

## Suggested live walkthrough

| Step | Action | What the audience should see | Pass/fail |
| --- | --- | --- | --- |
| 1 | Sign in to organizer account | Private workspace and dashboard load | Record during demo |
| 2 | Add a task with a deadline | Task appears; relevant dashboard/task views update | Record |
| 3 | Create a calendar event and open its actions | Event appears, edit/share/delete choices usable | Record |
| 4 | Invite the second test account | Invitation becomes available to invitee | Record |
| 5 | Accept or decline invitation | RSVP updates without permitting guest edits | Record |
| 6 | Create/edit shared notebook content | Only confirmed members can access and see updates | Record |
| 7 | Show your **new hackathon increment** | Before/after behaviour is observable | Record |
| 8 | Open relevant PR/changelog | Chronology, ownership and tests are traceable | Record |

Do not imply every feature is part of the 24-hour deliverable. Clearly identify the team's **actual work from ideation to implementation**.

## Acceptance criteria

1. User A cannot read user B's private tasks, notes, account settings or calendar feeds.
2. An invited guest can respond, but cannot alter the organizer's event.
3. Sharing permissions remain effective after refresh and across two sessions.
4. A rejected or malformed feed URL yields a controlled error, not a 500 or secret disclosure.
5. The prototype built during the hackathon solves the selected goal with a visible change and evidence.
6. Error and loading states are understandable on a typical phone screen.
7. The full walkthrough can run inside the allotted pitch without complex recovery.

These are **test criteria**, not passed test results.

## Fallbacks

If Google sign-in fails, use an approved local demo account. If the cloud deployment fails, use a previously prepared local environment or a clearly labelled **real recording** of a prior successful test. Explain the outage and never pretend a recording is live.

## Evidence

Fill the [evidence index](EVIDENCE.md) with video filename, commit, test date, pass/fail and device/browser. Avoid including account passwords or private personal data.

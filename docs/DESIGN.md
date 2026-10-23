# Design direction

## Personality

Warm, tidy, optimistic and quietly playful. LifeOrbit should feel like a supportive workspace, not a scorecard judging the user's productivity.

## Brand

The logo combines a soft planet, a visible orbit and a small star. Its expression makes the brand approachable while the circular motion suggests that the pieces of life belong together.

![LifeOrbit wordmark](../assets/logo.svg)

## Suggested palette

| Role | Hex | Intended use |
| --- | --- | --- |
| Deep ink | `#203A4B` | Headlines and primary text |
| Orbit teal | `#439E9A` | Primary accent |
| Soft mint | `#6FE0BE` | Positive visual elements |
| Sky blue | `#65A8F5` | Secondary accent |
| Warm gold | `#F8C96A` | Friendly highlight |
| Canvas | `#F8FAFA` | Light surfaces |

These are brand starting points, not accessibility-approved text/background pairs. Check contrast before implementation.

## UI principles

1. Prioritise useful information over decorative metrics.
2. Keep interactions predictable; provide clear feedback after every action.
3. Use consistent spacing, legible type and calm empty states.
4. Make mobile and keyboard experiences first-class.
5. Celebrate progress lightly; never punish missed days.
6. Design for real human schedules, including busy and low-energy days.

## Suggested dashboard composition

```text
┌─────────────────────────────────────────────────────┐
│ Good morning 👋                     Friday, 23 Oct   │
│ Here's what matters today.                         │
├────────────────────────┬────────────────────────────┤
│ Today                  │ Coming up                  │
│ Tasks and priorities   │ Calendar and reminders     │
├────────────────────────┼────────────────────────────┤
│ Quick notes            │ Subscription renewals      │
├────────────────────────┴────────────────────────────┤
│ This week's progress · gentle daily challenges     │
└─────────────────────────────────────────────────────┘
```

The example date and greeting are illustrative only.

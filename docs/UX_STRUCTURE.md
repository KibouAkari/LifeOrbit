# LifeOrbit experience

Landing on the site opens the demo login. Both the name form and guest link trigger a short, reduced-motion-aware brand reveal, then the dashboard.

The dashboard prioritises open tasks, upcoming events, notes and challenge points. Avoid generic decorative statistics.

Tasks use a list-first interface. Calendar opens in week view. Notes are organised into chapters and editable pages. Subscriptions emphasise recurring costs. Challenges include local progress and a clearly labelled sample leaderboard.

All screens use the shared layout and design tokens. Do not duplicate sidebars or introduce labels above every heading.

## Integration boundaries

Calendar supports **one-time ICS import**, including files exported from Google, Outlook or Apple Calendar; this is not an OAuth or CalDAV connection. Real provider sync belongs to Python with proper tokens and user consent. Notes and chapters are local-only for now. Real leaderboard data must be opt-in and authorized on the backend.

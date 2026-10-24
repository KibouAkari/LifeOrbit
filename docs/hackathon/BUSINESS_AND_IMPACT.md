# Business, value and future development

## Intended user value

LifeOrbit aims to reduce fragmented planning and make small-group commitments easier to manage. The business and impact hypotheses below are **not validated customer demand or financial forecasts**.

## Alternatives

A user may already combine Google Calendar, Apple Notes, Microsoft To Do, Notion or other tools. Those products provide mature ecosystems. LifeOrbit's hypothesis is that its integrated daily overview, lightweight sharing and approachable UI can be attractive to a narrower audience who values simplicity.

## Possible development model

| Option | Potential benefit | Open questions |
| --- | --- | --- |
| Free open-source self-hosting | Transparency and developer contributions | Installation/support complexity |
| Hosted free tier | Low adoption friction | Infrastructure, spam and abuse costs |
| Optional paid personal features | Sustainable hosting | Willingness to pay, customer support, feature differentiation |
| Small-group/team tier | Shared planning for communities | Privacy, permissions, multiuser consistency |
| Sponsorship / partnerships | Community support | Independence and data-use expectations |

**Recommendation to validate:** keep the open-source core easy to try, estimate actual per-user infrastructure cost, and ask potential users which workflows justify a hosted service. Do not introduce paywalls or subscriptions solely for hackathon judging.

## Cost and operating assumptions to collect

- Vercel usage and bandwidth
- MongoDB Atlas storage/operation tier
- Authentication and outbound mail/push infrastructure, if later added
- Monitoring, backups, incident response and support time
- Domain and any paid external API charges

Do not publish invented CHF figures, conversion rates, retention metrics or projected revenue.

## Risks and responsible expansion

- Data protection, account deletion and security requirements before public onboarding
- Mobile UX and calendar correctness across browsers and time zones
- API/rate-limit abuse and external calendar-link handling
- Multiuser editing conflicts and notifications at scale
- Accessible UI and low-cognitive-load product design

## Next development milestones

**Near-term:** complete a verifiable hackathon increment, improve cross-browser reliability, run user testing and close high-priority security gaps.

**Mid-term:** account recovery and verification, concurrency-safe shared pages, reliable scheduled reminders and calendar feed reconciliation.

**Long-term:** carefully scoped direct Google/Microsoft calendar integrations, optional host plans and validated collaboration features.

## Jury connection

The provided rubric gives **25%** to Business-Potenzial, but its description also expressly considers development during the hackathon, individual contribution and achieved results. Demonstrate all of these with evidence rather than treating the category as a sales forecast exercise.

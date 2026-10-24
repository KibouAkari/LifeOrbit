# Planning and Development

## Initial idea collection

The project started with a two-person discussion about the application we wanted to create. After choosing LifeOrbit, we used a shared Miro board to collect possible features and explore the scope of a personal life manager.

This initial stage focused on understanding the product before writing code.

## Feature structure

We organised the collected ideas into related areas and described their responsibilities more precisely. The resulting application includes a dashboard, tasks, calendar, notes, subscriptions and challenges.

Planning these sections helped establish how the navigation and application data should fit together.

## Division of work

After outlining the functionality, we divided the development work between the **two team members**. The work required frontend implementation, backend endpoints, data persistence, design and integration.

The precise ownership of individual features should be derived from the original Miro board and commit history rather than inferred retrospectively.

## Technology decisions

Before implementation, we determined the overall structure and selected the technologies used in the project.

| Layer | Implemented technology |
| --- | --- |
| Frontend | React, TypeScript and Vite |
| Styling | CSS and Lucide icons |
| Backend | Python and FastAPI |
| Database | MongoDB Atlas |
| Hosting | Vercel |
| Authentication | Email/password and Google Sign-In |
| Planning | Miro |

The table documents the actual stack. It does not claim particular selection criteria or rejected alternatives without the corresponding planning records.

## Implementation

Once the technical foundation was clear, we developed LifeOrbit from scratch. The application uses reusable React components, a Python API and persistent data storage.

Work extended beyond the initial layout to user accounts, task and calendar management, personal and shared notes, subscriptions, challenges and account-specific preferences.

Several areas required refinement after implementation, including calendar interactions across browsers, sharing permissions, notification refresh behaviour and mobile layouts.

## Integration and technical observations

Bringing the different functions together required careful coordination between frontend state, backend validation and database persistence. Account-specific data must stay isolated, while intentionally shared resources need separate permission checks.

The development also highlighted practical differences between an interface that appears complete and one that works reliably after refresh, between accounts and across devices.

## Source history

The repository's commits and pull requests provide the detailed development history. The main [CHANGELOG](../../CHANGELOG.md) contains a feature-oriented record. The original Miro planning material provides context for the decisions made before implementation.

Exact task assignments, dates and measured results are not reconstructed where supporting evidence is unavailable.

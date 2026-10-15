# TRACE//FIN

TRACE//FIN is a browser-based financial threat intelligence demonstrator for identifying and investigating suspicious advertisements for bank accounts, credentials, payment accounts, crypto wallets, and money-mule activity.

## Problem statement

Financial crime indicators are often distributed across social platforms and underground forums. Analysts need a fast way to review suspicious listings, understand why a listing is risky, track related investigations, and communicate findings. TRACE//FIN demonstrates that workflow using explainable local analysis, synthetic data, and an optional PostgreSQL-backed local workspace. No external service credentials are required.

## Features

- Dashboard with threat KPIs, risk distribution, detection trends, category charts, and recent alerts.
- Advertisement Analysis with search, filters, sorting, risk scores, seller details, risk-factor explanations, source links, and status actions.
- Investigation workspace for creating, editing, deleting, and persisting analyst investigations and notes.
- Linking advertisements to existing or new investigations with duplicate-link protection.
- Reports with summary statistics, risk/category visualizations, expandable findings, and print-friendly export.
- CSV export for filtered advertisement records.
- Optional Node.js API with PostgreSQL persistence for imported advertisements, investigations, evidence, alerts, and advertisement status overrides.
- Responsive navigation with a desktop sidebar and mobile drawer.

## Application routes

| Route | Purpose |
| --- | --- |
| `/` | Dashboard overview |
| `/advertisements` | Advertisement search, analysis, status updates, linking, and CSV export |
| `/investigations` | Investigation records, notes, statuses, links, and deletion |
| `/reports` | Threat intelligence summaries and print/save-as-PDF export |

## Technology stack

- React and React DOM
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Recharts
- Lucide React
- Sonner notifications
- Node.js `node:http` and PostgreSQL via `pg` for the optional backend

## Installation and development

Requirements: Node.js 22.9+, npm, and PostgreSQL 14+.

```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal, normally `http://localhost:5173`.

Configure PostgreSQL in a local `.env` file using `.env.example`, initialize the schema, and use two terminals:

```bash
npm run db:init

# Terminal 1
npm run server

# Terminal 2
npm run dev
```

The API listens at `http://localhost:4000`. Check it with `http://localhost:4000/api/health`. Vite proxies `/api` requests to the API. If the API is unavailable, the application continues using its existing browser `localStorage` persistence for the session.

## Production build and preview

```bash
npm run build
npm run preview
```

The build command runs the TypeScript project build and then creates the Vite production bundle.

## Risk engine

The local rule-based engine in `src/lib/riskEngine.ts` computes a score from 0 to 100. It evaluates category severity, platform risk, suspicious keyword density, seller activity, explicit pricing, and contact method. Each factor produces a weighted contribution and an explanation that is shown in the advertisement detail panel. Risk levels are derived from the total score: critical, high, medium, or low.

Risk analysis is intended for demonstration and analyst review. It is not a machine-learning model or a final fraud determination.

## Demonstration data and persistence

The application uses a static synthetic advertisement dataset and seeded investigation records. No real social-media feed is queried. Advertisement risk scores and explanations are generated locally from the synthetic records.

When the backend is running, imported advertisements, investigations, evidence, alerts, and advertisement status overrides are synchronized to PostgreSQL. The static synthetic dataset remains part of the frontend and is not duplicated into the database. Browser `localStorage` remains the fallback and is scoped to the browser origin. Malformed investigation storage is ignored safely without automatically overwriting the original raw value; valid records are preserved and invalid records are discarded during normalization.

## Hackathon demonstration workflow

1. Start the app and show the Dashboard risk distribution and recent detections.
2. Open an advertisement and walk through the risk meter and factor explanations.
3. Change its status to Confirmed Threat, Dismissed, or Under Review.
4. Link the advertisement to an existing investigation or create a new one.
5. Open Investigations, edit the status and analyst notes, then refresh to demonstrate persistence.
6. Return to Advertisements to show the status and linked investigation remain consistent.
7. Filter the advertisement list and export the filtered records as CSV.
8. Finish on Reports and use “Print / Save as PDF” for a presentation-ready summary.

## Backend limitations

The included backend is a single-workspace local demonstration API. It has no authentication, authorization, multi-user conflict handling, migrations, backups, or production deployment hardening. Do not expose it to the public internet without adding those controls.

## Available npm scripts

```bash
npm run dev      # Start the Vite frontend
npm run server   # Start the Node.js API and PostgreSQL backend
npm run db:init   # Create PostgreSQL tables and indexes
npm run db:migrate:sqlite # One-time, explicit SQLite import
npm run build    # Type-check and create a production build
npm run lint     # Run Oxlint
npm run preview  # Preview the production build locally
```

## Known limitations

- Advertisements are synthetic demonstration records; there is no real-time social-media or dark-web monitoring.
- The backend is a single-workspace local API without authentication, authorization, or multi-user conflict handling.
- `localStorage` persistence is local to one browser profile and can be cleared by the user or browser policies.
- The rule-based score is explainable but simplified and should not be treated as a production fraud decision system.
- External source URLs are illustrative links and are not guaranteed to be available.
- Browser/device smoke testing should be completed before a live presentation.

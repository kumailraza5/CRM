# ClientHunter CRM

## Overview

A full-stack Freelancer Lead Management CRM for a solo web developer who finds clients on LinkedIn. Built as a premium SaaS-style web application.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS (artifacts/clienthunter-crm)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Theme**: next-themes (dark/light/system)
- **Routing**: Wouter

## Features

1. **Authentication** — Mock auth with localStorage (email + any password)
2. **Dashboard** — KPI cards, pipeline overview, monthly chart, activity feed
3. **Lead Management** — Full CRUD with 18 fields, search + filters
4. **Kanban Pipeline** — Drag-and-drop between 9 statuses
5. **Follow-up Center** — Today / Overdue / Upcoming tabs
6. **Outreach Templates** — 5 pre-seeded templates, one-click copy
7. **Revenue Tracker** — Won deals table with payment status
8. **Reports & Analytics** — Conversion rate, by country, by industry, weekly leads
9. **AI Lead Score** — Algorithmic scoring (0-100) with tips and follow-up suggestions
10. **Settings** — Theme switcher, profile settings

## Project Structure

```
artifacts/
├── api-server/           # Express 5 API (all backend routes)
│   └── src/routes/
│       ├── leads.ts      # Lead CRUD + follow-ups + AI scoring
│       ├── notes.ts      # Lead timeline notes
│       ├── templates.ts  # Outreach templates
│       ├── deals.ts      # Won deals
│       ├── dashboard.ts  # Dashboard + activities
│       └── reports.ts    # Analytics
├── clienthunter-crm/     # React + Vite frontend (preview at /)
└── mockup-sandbox/       # Design prototyping sandbox

lib/
├── api-spec/openapi.yaml  # OpenAPI contract (source of truth)
├── api-client-react/      # Generated React Query hooks
├── api-zod/               # Generated Zod validators
└── db/src/schema/
    ├── leads.ts
    ├── notes.ts
    ├── templates.ts
    ├── deals.ts
    └── activities.ts
```

## Database Tables

- `leads` — Lead records with full contact + status info
- `lead_notes` — Timeline notes per lead
- `templates` — Outreach message templates
- `deals` — Won deals / revenue tracker
- `activities` — Activity feed log

## Key Commands

- `pnpm run typecheck` — full typecheck
- `pnpm run --filter @workspace/api-spec codegen` — regenerate API hooks
- `pnpm --filter @workspace/db run push` — push DB schema changes
- `pnpm --filter @workspace/api-server run dev` — run API server
- `pnpm --filter @workspace/clienthunter-crm run dev` — run frontend

## Demo Login

Any email + any password works (mock auth). Click "Sign in" on the login page.

## Lead Statuses

New Lead → Profile Checked → Contacted → Follow-up Sent → Replied → Meeting Scheduled → Proposal Sent → Won / Lost
